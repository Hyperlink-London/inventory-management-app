import { useAuthContext } from '@/hooks/use-auth-context';
import { fetchItems } from '@/lib/data';
import type { ItemWithTags } from '@/types';
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

import { AddItemButton } from '@/components/add-item-button';
import { ItemCard } from '@/components/item-card';

const logUi = (...args: unknown[]) => __DEV__ && console.log('[UI]', ...args);

export default function DashboardScreen() {
  const { userProfileId } = useAuthContext();
  const router = useRouter();
  const [items, setItems] = useState<ItemWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    logUi('Dashboard: load start');
    try {
      const data = await fetchItems();
      logUi('Dashboard: load done', data.length, 'items');
      setItems(data);
    } catch (err) {
      logUi('Dashboard: load error', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    logUi('Dashboard: mount, starting load');
    const timeout = setTimeout(() => {
      logUi('Dashboard: load timeout (8s)');
      setLoading(false);
    }, 8000);
    load();
    return () => clearTimeout(timeout);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <AddItemButton onSuccess={load} />
      </View>

      <FlatList
        data={items.slice(0, 10)}
        keyExtractor={(item) => item.id}
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
      />

      {items.length > 10 && (
        <Pressable
          style={styles.viewAll}
          onPress={() => router.push('/(tabs)/items')}
        >
          <Text style={styles.viewAllText}>View All Items →</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  viewAll: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewAllText: { fontSize: 16, color: '#2563eb', fontWeight: '500' },
});
