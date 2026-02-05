import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { fetchCheckoutCounts, fetchCheckouts } from '@/lib/data';
import { log } from '@/lib/logger';
import type { CheckoutItem } from '@/types';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useMemo } from 'react';
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
  const router = useRouter();
  const { userProfileId, isLoggedIn, isLoading: authLoading } = useAuthContext();
  const { refreshKey } = useDataRefresh();
  const params = useLocalSearchParams<{ filter?: 'active' | 'overdue' }>();
  const [allCheckouts, setAllCheckouts] = useState<CheckoutItem[]>([]);
  const [counts, setCounts] = useState({ active: 0, overdue: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('yours');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter checkouts based on status filter from params
  const checkouts = useMemo(() => {
    if (!params.filter) return allCheckouts;
    
    const now = new Date();
    return allCheckouts.filter((checkout) => {
      if (checkout.returned_date) return false; // Exclude returned items
      
      if (params.filter === 'overdue') {
        // Show only overdue items
        return checkout.expected_return_date && new Date(checkout.expected_return_date) < now;
      } else if (params.filter === 'active') {
        // Show only active (non-overdue) items
        return !checkout.expected_return_date || new Date(checkout.expected_return_date) >= now;
      }
      
      return true;
    });
  }, [allCheckouts, params.filter]);

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
      setAllCheckouts(checkoutData.checkouts);
      setCounts(countData);
    } catch (err) {
      log.ui('Checkouts: load error', err);
      setAllCheckouts([]);
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

  // Refresh when screen comes into focus or when refreshKey changes
  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn && !authLoading) {
        log.ui('Checkouts: screen focused, refreshing');
        load();
      }
    }, [isLoggedIn, authLoading, load])
  );

  // Also refresh when refreshKey changes (triggered by mutations)
  useEffect(() => {
    if (isLoggedIn && !authLoading && refreshKey > 0) {
      log.ui('Checkouts: refreshKey changed, refreshing');
      load();
    }
  }, [refreshKey, isLoggedIn, authLoading, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isEmpty = checkouts.length === 0;
  const emptyTitle =
    params.filter === 'overdue'
      ? 'No overdue checkouts'
      : params.filter === 'active'
      ? 'No active checkouts'
      : viewMode === 'returned'
      ? 'No returned checkouts'
      : 'No active checkouts';
  const emptySubtitle =
    params.filter === 'overdue'
      ? 'All checkouts are on time'
      : params.filter === 'active'
      ? 'No active checkouts at this time'
      : viewMode === 'returned'
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
        {params.filter === 'active' && (
          <Pressable
            onPress={() => router.replace('/(tabs)/checkouts')}
            style={({ pressed }) => [
              styles.filterBadge,
              { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
              pressed && styles.filterBadgePressed,
            ]}
          >
            <View style={[styles.filterDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[styles.filterBadgeText, { color: '#22c55e' }]}>Active Only</Text>
            <Feather name="x" size={14} color="#22c55e" style={{ marginLeft: 4 }} />
          </Pressable>
        )}
        {params.filter === 'overdue' && (
          <Pressable
            onPress={() => router.replace('/(tabs)/checkouts')}
            style={({ pressed }) => [
              styles.filterBadge,
              { backgroundColor: 'rgba(220, 38, 38, 0.15)' },
              pressed && styles.filterBadgePressed,
            ]}
          >
            <View style={[styles.filterDot, { backgroundColor: '#dc2626' }]} />
            <Text style={[styles.filterBadgeText, { color: '#dc2626' }]}>Overdue Only</Text>
            <Feather name="x" size={14} color="#dc2626" style={{ marginLeft: 4 }} />
          </Pressable>
        )}
        {!params.filter && (counts.active > 0 || counts.overdue > 0) && (
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
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterBadgePressed: {
    opacity: 0.7,
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
