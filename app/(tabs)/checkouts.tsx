import { useAuthContext } from '@/hooks/use-auth-context';
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Checkouts</Text>
        {(counts.active > 0 || counts.overdue > 0) && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>{counts.active} Active</Text>
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
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Feather
                name={icon}
                size={18}
                color={isActive ? '#111' : '#888'}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
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
            <View style={styles.emptyIconWrap}>
              <Feather name="corner-down-right" size={48} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
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
    color: '#111',
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
    backgroundColor: '#16a34a',
  },
  activeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
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
  tabActive: {
    backgroundColor: '#e5e7eb',
  },
  tabIcon: { marginRight: 6 },
  tabText: {
    fontSize: 14,
    color: '#888',
  },
  tabTextActive: {
    color: '#111',
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
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#888',
  },
});
