import { useThemeColors } from '@/hooks/use-theme-colors';
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
  const colors = useThemeColors();
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
          <View style={[styles.placeholder, { backgroundColor: colors.muted }]}>
            <Feather name="package" size={48} color={colors.mutedForeground} />
            <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>No image</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.name, { color: colors.text }]}>{item.item_name}</Text>
        <View style={styles.statusRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Status</Text>
          <Text
            style={[
              styles.statusText,
              { color: colors.text },
              isOut && { color: colors.destructive },
              isLow && !isOut && { color: colors.warning },
            ]}
          >
            {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Quantity (available / total)</Text>
          <Text
            style={[
              styles.qtyText,
              { color: colors.text },
              isOut && { color: colors.destructive },
              isLow && !isOut && { color: colors.warning },
            ]}
          >
            {available} / {total}
          </Text>
        </View>
      </View>

      {item.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Tags</Text>
          <View style={styles.tags}>
            {item.tags.map((t) => (
              <View key={t.id} style={[styles.tag, { backgroundColor: colors.muted }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{t.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {item.notes && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
          <Text style={[styles.notes, { color: colors.mutedForeground }]}>{item.notes}</Text>
        </View>
      )}

      {item.created_by_name && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Logged by</Text>
          <Text style={[styles.creator, { color: colors.mutedForeground }]}>{item.created_by_name}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.btn,
            styles.btnOutline,
            { borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.btnOutlineText, { color: colors.text }]}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onCheckout}
          disabled={isOut}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.primary },
            isOut && styles.btnDisabled,
            pressed && !isOut && styles.pressed,
          ]}
        >
          <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>Checkout</Text>
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
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { marginTop: 8, fontSize: 14 },
  section: { marginBottom: 20 },
  name: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 14 },
  statusText: { fontSize: 14, fontWeight: '500' },
  qtyText: { fontSize: 14, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 14 },
  notes: { fontSize: 14, marginTop: 4 },
  creator: { fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnOutline: {
    borderWidth: 1,
  },
  btnOutlineText: { fontSize: 16, fontWeight: '600' },
  btnPrimaryText: { fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
});
