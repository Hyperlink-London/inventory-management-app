import { fetchItemById } from '@/lib/data';
import type { ItemWithTags } from '@/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const logUi = (...args: unknown[]) => __DEV__ && console.log('[UI]', ...args);

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ItemWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    logUi('ItemDetail: load start', id);
    try {
      const data = await fetchItemById(id);
      logUi('ItemDetail: load done', data ? 'found' : 'not found');
      setItem(data);
    } catch (err) {
      logUi('ItemDetail: load error', err);
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleted = () => {
    router.back();
  };

  const handleUpdated = (updated: ItemWithTags) => {
    setItem(updated);
  };

  if (loading || !id) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Item not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <ItemDetailView
          item={item}
          onEdit={() => setEditModalVisible(true)}
          onCheckout={() => setCheckoutModalVisible(true)}
        />
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
