import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { fetchCheckoutCounts, fetchCheckouts } from '@/lib/data';
import { log } from '@/lib/logger';
import type { CheckoutItem } from '@/types';
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CheckoutCard } from '@/components/checkout-card';

type ViewMode = 'yours' | 'everyone' | 'returned';

const TAB_CONFIG: { key: ViewMode; label: string; icon: 'user' | 'users' | 'check-circle' }[] = [
  { key: 'yours', label: 'Yours', icon: 'user' },
  { key: 'everyone', label: 'Everyone', icon: 'users' },
  { key: 'returned', label: 'Returned', icon: 'check-circle' },
];

export default function CheckoutsScreen() {
  const colors = useThemeColors();
  const { userProfileId, isLoggedIn, isLoading: authLoading } = useAuthContext();
  const [checkouts, setCheckouts] = useState<CheckoutItem[]>([]);
  const [counts, setCounts] = useState({ active: 0, overdue: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('yours');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    log.ui('Checkouts: load start', viewMode, userProfileId);
    try {
      const [checkoutData, countData] = await Promise.all([
        fetchCheckouts({
          view: viewMode,
          userProfileId,
          from: 0,
          to: 49,
        }),
        fetchCheckoutCounts(userProfileId),
      ]);
      log.ui('Checkouts: load done', checkoutData.checkouts.length, 'checkouts');
      setCheckouts(checkoutData.checkouts);
      setCounts(countData);
    } catch (err) {
      log.ui('Checkouts: load error', err);
      setCheckouts([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode, userProfileId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    log.ui('Checkouts: auth ready, starting load');
    setLoading(true);
    load();
  }, [authLoading, isLoggedIn, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isEmpty = checkouts.length === 0;
  const emptyTitle =
    viewMode === 'returned' ? 'No returned checkouts' : 'No active checkouts';
  const emptySubtitle =
    viewMode === 'returned'
      ? 'Returned items will appear here'
      : 'Checked out items will appear here';

  if (authLoading || loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Checkouts</Text>
        {(counts.active > 0 || counts.overdue > 0) && (
          <View style={styles.activeBadge}>
            <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.activeBadgeText, { color: colors.success }]}>{counts.active} Active</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        {TAB_CONFIG.map(({ key, label, icon }) => {
          const isActive = viewMode === key;
          return (
            <Pressable
              key={key}
              onPress={() => setViewMode(key)}
              style={[styles.tab, isActive && { backgroundColor: colors.muted }]}
            >
              <Feather
                name={icon}
                size={18}
                color={isActive ? colors.text : colors.mutedForeground}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.text : colors.mutedForeground },
                  isActive && styles.tabTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={checkouts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => <CheckoutCard checkout={item} onCheckIn={load} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="corner-down-right" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>{emptySubtitle}</Text>
          </View>
        }
        contentContainerStyle={isEmpty ? styles.listEmpty : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  tabIcon: { marginRight: 6 },
  tabText: {
    fontSize: 14,
  },
  tabTextActive: {
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmpty: { flexGrow: 1 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
  },
});
