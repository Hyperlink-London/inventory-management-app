import { useAuthContext } from '@/hooks/use-auth-context';
import { fetchCheckoutCounts, fetchCheckouts } from '@/lib/data';
import { log } from '@/lib/logger';
import type { CheckoutItem } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CheckoutCard } from '@/components/checkout-card';

type ViewMode = 'yours' | 'everyone' | 'returned';

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
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{counts.active} Active</Text>
            </View>
            <View style={[styles.badge, styles.badgeOverdue]}>
              <Text style={[styles.badgeText, styles.badgeOverdueText]}>
                {counts.overdue} Overdue
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        {(['yours', 'everyone', 'returned'] as const).map((v) => (
          <Text
            key={v}
            onPress={() => setViewMode(v)}
            style={[
              styles.tab,
              viewMode === v && styles.tabActive,
              viewMode === v && styles.tabActiveText,
            ]}
          >
            {v === 'yours' ? 'Yours' : v === 'everyone' ? 'Everyone' : 'Returned'}
          </Text>
        ))}
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
            <Text style={styles.emptyText}>
              {viewMode === 'returned'
                ? 'No returned checkouts'
                : 'No active checkouts'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  badges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOverdue: { backgroundColor: 'rgba(220, 38, 38, 0.2)' },
  badgeText: { fontSize: 13, color: '#16a34a', fontWeight: '500' },
  badgeOverdueText: { color: '#dc2626' },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 14,
    color: '#666',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabActiveText: {
    color: '#fff',
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
});
