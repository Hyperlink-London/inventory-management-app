import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { fetchItems } from '@/lib/data';
import type { ItemWithTags } from '@/types';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ItemCard } from '@/components/item-card';

const logUi = (...args: unknown[]) => __DEV__ && console.log('[UI]', ...args);

const INITIAL_PAGE_SIZE = 20;
const LOAD_MORE_SIZE = 20;

export default function ItemsScreen() {
  const colors = useThemeColors();
  const { isLoggedIn, isLoading: authLoading } = useAuthContext();
  const { refreshKey } = useDataRefresh();
  const router = useRouter();
  const [items, setItems] = useState<ItemWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(INITIAL_PAGE_SIZE);

  const load = useCallback(async () => {
    logUi('Items: load start');
    try {
      const data = await fetchItems();
      logUi('Items: load done', data.length, 'items');
      setItems(data);
      setDisplayCount(INITIAL_PAGE_SIZE);
    } catch (err) {
      logUi('Items: load error', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    logUi('Items: auth ready, starting load');
    setLoading(true);
    load();
  }, [authLoading, isLoggedIn, load]);

  // Refresh when screen comes into focus or when refreshKey changes
  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn && !authLoading) {
        logUi('Items: screen focused, refreshing');
        load();
      }
    }, [isLoggedIn, authLoading, load])
  );

  // Also refresh when refreshKey changes (triggered by mutations)
  useEffect(() => {
    if (isLoggedIn && !authLoading && refreshKey > 0) {
      logUi('Items: refreshKey changed, refreshing');
      load();
    }
  }, [refreshKey, isLoggedIn, authLoading, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const allTags = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    items.forEach((item) => {
      item.tags.forEach((t) => {
        if (!seen.has(t.id)) seen.set(t.id, t);
      });
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const nameMatch = item.item_name.toLowerCase().includes(q);
        const notesMatch = !!item.notes && item.notes.toLowerCase().includes(q);
        if (!nameMatch && !notesMatch) return false;
      }
      if (selectedTagId !== null && !item.tags.some((t) => t.id === selectedTagId)) return false;
      return true;
    });
  }, [items, searchQuery, selectedTagId]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, displayCount),
    [filteredItems, displayCount]
  );
  const hasMoreItems = displayCount < filteredItems.length;

  useEffect(() => {
    setDisplayCount(INITIAL_PAGE_SIZE);
  }, [searchQuery, selectedTagId]);

  const handleEndReached = useCallback(() => {
    if (displayCount < filteredItems.length) {
      setDisplayCount((prev) => Math.min(prev + LOAD_MORE_SIZE, filteredItems.length));
    }
  }, [displayCount, filteredItems.length]);

  if (authLoading || loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name or notes..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {allTags.length > 0 && (
        <View style={styles.filtersRow}>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Tag</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagChips}>
            <Pressable
              onPress={() => setSelectedTagId(null)}
              style={[
                styles.chip,
                { backgroundColor: selectedTagId === null ? colors.primary : colors.muted },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedTagId === null ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                All
              </Text>
            </Pressable>
            {allTags.map((tag) => (
              <Pressable
                key={tag.id}
                onPress={() => setSelectedTagId(tag.id)}
                style={[
                  styles.chip,
                  { backgroundColor: selectedTagId === tag.id ? colors.primary : colors.muted },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selectedTagId === tag.id ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {tag.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          hasMoreItems ? (
            <View style={styles.loadMoreFooter}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => router.push(`/item/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filteredItems.length === 0 ? 'No items match your filters' : 'No items in inventory'}
            </Text>
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
  },
  filtersRow: { marginBottom: 10 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 },
  tagChips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  chipText: { fontSize: 14, color: '#444', fontWeight: '500' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  listEmpty: { flexGrow: 1 },
  loadMoreFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
