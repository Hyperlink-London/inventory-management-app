import { useThemeColors } from '@/hooks/use-theme-colors';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { fetchItemById, fetchCheckoutsForItem } from '@/lib/data';
import type { ItemWithTags, CheckoutItem } from '@/types';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CheckoutModal } from '@/components/checkout-modal';
import { EditItemModal } from '@/components/edit-item-modal';
import { ItemDetailView } from '@/components/item-detail-view';
import { CheckoutHistory } from '@/components/checkout-history';

const logUi = (...args: unknown[]) => __DEV__ && console.log('[UI]', ...args);

export default function ItemDetailScreen() {
  const colors = useThemeColors();
  const { refreshKey } = useDataRefresh();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ItemWithTags | null>(null);
  const [checkouts, setCheckouts] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    logUi('ItemDetail: load start', id);
    try {
      const [itemData, checkoutData] = await Promise.all([
        fetchItemById(id),
        fetchCheckoutsForItem(id),
      ]);
      logUi('ItemDetail: load done', itemData ? 'found' : 'not found');
      setItem(itemData);
      setCheckouts(checkoutData);
    } catch (err) {
      logUi('ItemDetail: load error', err);
      setItem(null);
      setCheckouts([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when screen comes into focus or when refreshKey changes
  useFocusEffect(
    useCallback(() => {
      if (id) {
        logUi('ItemDetail: screen focused, refreshing');
        load();
      }
    }, [id, load])
  );

  // Also refresh when refreshKey changes (triggered by mutations)
  useEffect(() => {
    if (id && refreshKey > 0) {
      logUi('ItemDetail: refreshKey changed, refreshing');
      load();
    }
  }, [refreshKey, id, load]);

  const handleDeleted = () => {
    router.back();
  };

  const handleUpdated = (updated: ItemWithTags) => {
    setItem(updated);
  };

  if (loading || !id) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.mutedForeground }]}>Item not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <ItemDetailView
          item={item}
          onEdit={() => setEditModalVisible(true)}
          onCheckout={() => setCheckoutModalVisible(true)}
        />
        <CheckoutHistory checkouts={checkouts} onRefresh={load} />
      </ScrollView>

      <CheckoutModal
        visible={checkoutModalVisible}
        item={item}
        onClose={() => setCheckoutModalVisible(false)}
        onSuccess={() => {
          setCheckoutModalVisible(false);
          load();
        }}
      />

      <EditItemModal
        visible={editModalVisible}
        item={item}
        onClose={() => setEditModalVisible(false)}
        onSuccess={(updated) => {
          setEditModalVisible(false);
          if (updated) setItem(updated);
          else load();
        }}
        onDeleted={handleDeleted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 16, color: '#666' },
});
