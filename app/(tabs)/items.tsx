import { useAuthContext } from '@/hooks/use-auth-context';
import { fetchItems } from '@/lib/data';
import type { ItemWithTags } from '@/types';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

const ITEMS_PER_PAGE = 10;

type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

function getAvailable(item: ItemWithTags) {
  return item.quantity;
}

function matchesStatus(item: ItemWithTags, status: StatusFilter): boolean {
  const available = getAvailable(item);
  if (status === 'all') return true;
  if (status === 'in_stock') return available >= 5;
  if (status === 'low_stock') return available > 0 && available < 5;
  if (status === 'out_of_stock') return available === 0;
  return true;
}

export default function ItemsScreen() {
  const { isLoggedIn, isLoading: authLoading } = useAuthContext();
  const router = useRouter();
  const [items, setItems] = useState<ItemWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    logUi('Items: load start');
    try {
      const data = await fetchItems();
      logUi('Items: load done', data.length, 'items');
      setItems(data);
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
      if (!matchesStatus(item, statusFilter)) return false;
      if (selectedTagId !== null && !item.tags.some((t) => t.id === selectedTagId)) return false;
      return true;
    });
  }, [items, searchQuery, statusFilter, selectedTagId]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = useMemo(
    () => filteredItems.slice(pageStart, pageStart + ITEMS_PER_PAGE),
    [filteredItems, pageStart]
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  if (authLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or notes..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={(t) => {
            setSearchQuery(t);
            setCurrentPage(1);
          }}
        />
      </View>

      <View style={styles.filtersRow}>
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChips}>
          {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {s === 'all' ? 'All' : s === 'in_stock' ? 'In stock' : s === 'low_stock' ? 'Low stock' : 'Out'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {allTags.length > 0 && (
        <View style={styles.filtersRow}>
          <Text style={styles.filterLabel}>Tag</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagChips}>
            <Pressable
              onPress={() => {
                setSelectedTagId(null);
                setCurrentPage(1);
              }}
              style={[styles.chip, selectedTagId === null && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedTagId === null && styles.chipTextActive]}>All</Text>
            </Pressable>
            {allTags.map((tag) => (
              <Pressable
                key={tag.id}
                onPress={() => {
                  setSelectedTagId(tag.id);
                  setCurrentPage(1);
                }}
                style={[styles.chip, selectedTagId === tag.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedTagId === tag.id && styles.chipTextActive]}>{tag.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={pageItems}
        keyExtractor={(item) => item.id}
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
            <Text style={styles.emptyText}>
              {filteredItems.length === 0 ? 'No items match your filters' : 'No items in inventory'}
            </Text>
          </View>
        }
      />

      {filteredItems.length > 0 && (
        <View style={styles.pagination}>
          <Text style={styles.paginationLabel}>
            {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length}
          </Text>
          <View style={styles.paginationBtns}>
            <Pressable
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
            >
              <Text style={styles.pageBtnText}>Prev</Text>
            </Pressable>
            <Text style={styles.pageNum}>
              Page {currentPage} of {totalPages}
            </Text>
            <Pressable
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
            >
              <Text style={styles.pageBtnText}>Next</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  statusChips: { flexDirection: 'row', gap: 8 },
  tagChips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 14, color: '#444', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationLabel: { fontSize: 14, color: '#666' },
  paginationBtns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  pageNum: { fontSize: 14, color: '#666' },
});
