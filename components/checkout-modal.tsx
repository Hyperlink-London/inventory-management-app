import { checkoutItem } from '@/lib/actions';
import { notifyTeamCheckout } from '@/lib/team-push';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { useAuthContext } from '@/hooks/use-auth-context';
import type { ItemWithTags } from '@/types';
import { useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  item: ItemWithTags;
  onClose: () => void;
  onSuccess: () => void;
};

export function CheckoutModal({ visible, item, onClose, onSuccess }: Props) {
  const { refresh } = useDataRefresh();
  const { profile } = useAuthContext();
  const [quantity, setQuantity] = useState('1');
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Enter a valid quantity');
      return;
    }
    if (qty > item.quantity) {
      Alert.alert('Error', `Max available: ${item.quantity}`);
      return;
    }
    if (!expectedDate) {
      Alert.alert('Error', 'Select expected return date');
      return;
    }

    setSubmitting(true);
    try {
      await checkoutItem({
        item_id: item.id,
        quantity: qty,
        expected_return_date: expectedDate,
      });
      // Notify teammates (push) so everyone in the team sees "X checked out Y"
      const name = profile?.full_name || profile?.username || 'A teammate';
      await notifyTeamCheckout(name, item.item_name);
      // Trigger refresh across all screens
      refresh('all');
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={Keyboard.dismiss}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Checkout</Text>
            <Pressable onPress={Keyboard.dismiss} hitSlop={12}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.form}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Quantity (max: {item.quantity})</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="1"
            />

            <Text style={styles.label}>Expected return date</Text>
            <TextInput
              style={styles.input}
              value={expectedDate}
              onChangeText={setExpectedDate}
              placeholder="YYYY-MM-DD"
            />
          </ScrollView>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting || item.quantity === 0}
            style={[styles.submit, (submitting || item.quantity === 0) && styles.submitDisabled]}
          >
            <Text style={styles.submitText}>
              {submitting ? 'Processing...' : 'Checkout'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  cancel: { fontSize: 16, color: '#666' },
  done: { fontSize: 16, color: '#2563eb', fontWeight: '600' },
  form: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  submit: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
