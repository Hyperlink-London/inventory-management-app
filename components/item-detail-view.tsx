import type { ItemWithTags } from '@/types';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  item: ItemWithTags;
  onEdit: () => void;
  onCheckout: () => void;
};

export function ItemDetailView({ item, onEdit, onCheckout }: Props) {
  const available = item.quantity;
  const total = item.quantity + item.checked_out_quantity;
  const isOut = available === 0;
  const isLow = available < 5 && !isOut;

  return (
    <View style={styles.container}>
      <View style={styles.imageSection}>
        {item.image_URL ? (
          <Image
            source={{ uri: item.image_URL }}
            style={styles.image}
            contentFit="contain"
          />
        ) : (
          <View style={styles.placeholder}>
            <Feather name="package" size={48} color="#999" />
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.name}>{item.item_name}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Status</Text>
          <Text
            style={[
              styles.statusText,
              isOut && styles.statusOut,
              isLow && styles.statusLow,
            ]}
          >
            {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Quantity (available / total)</Text>
          <Text
            style={[
              styles.qtyText,
              isOut && styles.qtyOut,
              isLow && styles.qtyLow,
            ]}
          >
            {available} / {total}
          </Text>
        </View>
      </View>

      {item.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tags}>
            {item.tags.map((t) => (
              <View key={t.id} style={styles.tag}>
                <Text style={styles.tagText}>{t.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {item.notes && (
        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.notes}>{item.notes}</Text>
        </View>
      )}

      {item.created_by_name && (
        <View style={styles.section}>
          <Text style={styles.label}>Logged by</Text>
          <Text style={styles.creator}>{item.created_by_name}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && styles.pressed]}
        >
          <Text style={styles.btnOutlineText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onCheckout}
          disabled={isOut}
          style={({ pressed }) => [
            styles.btn,
            styles.btnPrimary,
            isOut && styles.btnDisabled,
            pressed && !isOut && styles.pressed,
          ]}
        >
          <Text style={styles.btnPrimaryText}>Checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 200,
  },
  image: { width: '100%', height: 240, borderRadius: 12 },
  placeholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { marginTop: 8, fontSize: 14, color: '#666' },
  section: { marginBottom: 20 },
  name: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 16 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 14, color: '#666' },
  statusText: { fontSize: 14, fontWeight: '500' },
  statusOut: { color: '#dc2626' },
  statusLow: { color: '#ca8a04' },
  qtyText: { fontSize: 14, fontWeight: '600' },
  qtyOut: { color: '#dc2626' },
  qtyLow: { color: '#ca8a04' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: { backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 14, color: '#555' },
  notes: { fontSize: 14, color: '#444', marginTop: 4 },
  creator: { fontSize: 14, color: '#444', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  btnOutlineText: { fontSize: 16, fontWeight: '600', color: '#333' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
});
