import { useAuthContext } from '@/hooks/use-auth-context';
import { fetchCheckoutCounts, fetchItems } from '@/lib/data';
import type { ItemWithTags } from '@/types';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { ItemCard } from '@/components/item-card';

const logUi = (...args: unknown[]) => __DEV__ && console.log('[UI]', ...args);

const HOME_ITEMS_LIMIT = 10;

export default function DashboardScreen() {
  const { isLoggedIn, isLoading: authLoading, userProfileId } = useAuthContext();
  const router = useRouter();
  const [items, setItems] = useState<ItemWithTags[]>([]);
  const [counts, setCounts] = useState({ active: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    logUi('Dashboard: load start');
    try {
      const [itemsData, countData] = await Promise.all([
        fetchItems(),
        fetchCheckoutCounts(userProfileId),
      ]);
      logUi('Dashboard: load done', itemsData.length, 'items');
      setItems(itemsData);
      setCounts(countData);
    } catch (err) {
      logUi('Dashboard: load error', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userProfileId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    logUi('Dashboard: auth ready, starting load');
    setLoading(true);
    const timeout = setTimeout(() => {
      logUi('Dashboard: load timeout (8s)');
      setLoading(false);
    }, 8000);
    load();
    return () => clearTimeout(timeout);
  }, [authLoading, isLoggedIn, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pageItems = items.slice(0, HOME_ITEMS_LIMIT);
  const hasMoreItems = items.length > HOME_ITEMS_LIMIT;

  const renderStatusSection = () => (
    <View style={styles.statusSection}>
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Feather name="shopping-bag" size={22} color="#2563eb" />
            <Text style={styles.statusValue}>{counts.active}</Text>
            <Text style={styles.statusLabel}>Active</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Feather name="alert-circle" size={22} color={counts.overdue > 0 ? '#dc2626' : '#666'} />
            <Text style={[styles.statusValue, counts.overdue > 0 && styles.statusValueOverdue]}>
              {counts.overdue}
            </Text>
            <Text style={styles.statusLabel}>Overdue</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/checkouts')}
          style={({ pressed }) => [styles.statusLink, pressed && styles.statusLinkPressed]}
        >
          <Text style={styles.statusLinkText}>View checkouts</Text>
          <Feather name="chevron-right" size={18} color="#2563eb" />
        </Pressable>
      </View>
    </View>
  );

  if (authLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pageItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderStatusSection}
        ListFooterComponent={
          hasMoreItems ? (
            <Pressable
              style={styles.viewAll}
              onPress={() => router.push('/(tabs)/items')}
            >
              <Text style={styles.viewAllText}>View all {items.length} items</Text>
              <Feather name="chevron-right" size={18} color="#2563eb" />
            </Pressable>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => router.push(`/item/${item.id}`)}
            onCheckout={() => router.push(`/item/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items in inventory</Text>
          </View>
        }
        contentContainerStyle={pageItems.length === 0 ? styles.listEmpty : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusSection: { marginBottom: 20 },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#eee',
  },
  statusValue: { fontSize: 22, fontWeight: '700', color: '#111', marginTop: 4 },
  statusValueOverdue: { color: '#dc2626' },
  statusLabel: { fontSize: 13, color: '#666', marginTop: 2 },
  statusLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 4,
  },
  statusLinkPressed: { opacity: 0.8 },
  statusLinkText: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  listEmpty: { flexGrow: 1 },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewAllText: { fontSize: 16, color: '#2563eb', fontWeight: '600' },
});
