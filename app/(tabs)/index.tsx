import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
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

const INITIAL_PAGE_SIZE = 20;
const LOAD_MORE_SIZE = 20;

export default function DashboardScreen() {
  const { isLoggedIn, isLoading: authLoading, userProfileId } = useAuthContext();
  const colors = useThemeColors();
  const router = useRouter();
  const [items, setItems] = useState<ItemWithTags[]>([]);
  const [counts, setCounts] = useState({ active: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayCount, setDisplayCount] = useState(INITIAL_PAGE_SIZE);

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
      setDisplayCount(INITIAL_PAGE_SIZE);
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

  const visibleItems = items.slice(0, displayCount);
  const hasMoreItems = displayCount < items.length;

  const handleEndReached = useCallback(() => {
    if (displayCount < items.length) {
      setDisplayCount((prev) => Math.min(prev + LOAD_MORE_SIZE, items.length));
    }
  }, [displayCount, items.length]);

  const renderStatusSection = () => (
    <View style={styles.statusSection}>
      <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Feather name="shopping-bag" size={22} color={colors.tint} />
            <Text style={[styles.statusValue, { color: colors.text }]}>{counts.active}</Text>
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>Active</Text>
          </View>
          <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statusItem}>
            <Feather name="alert-circle" size={22} color={counts.overdue > 0 ? colors.destructive : colors.mutedForeground} />
            <Text style={[styles.statusValue, counts.overdue > 0 && { color: colors.destructive }]}>
              {counts.overdue}
            </Text>
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>Overdue</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/checkouts')}
          style={({ pressed }) => [styles.statusLink, { borderTopColor: colors.border }, pressed && styles.statusLinkPressed]}
        >
          <Text style={[styles.statusLinkText, { color: colors.tint }]}>View checkouts</Text>
          <Feather name="chevron-right" size={18} color={colors.tint} />
        </Pressable>
      </View>
    </View>
  );

  if (authLoading || loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderStatusSection}
        ListFooterComponent={
          hasMoreItems ? (
            <View style={styles.loadMoreFooter}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
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
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No items in inventory</Text>
          </View>
        }
        contentContainerStyle={visibleItems.length === 0 ? styles.listEmpty : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusSection: { marginBottom: 20 },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
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
  },
  statusValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  statusLabel: { fontSize: 13, marginTop: 2 },
  statusLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  statusLinkPressed: { opacity: 0.8 },
  statusLinkText: { fontSize: 15, fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16 },
  listEmpty: { flexGrow: 1 },
  loadMoreFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
