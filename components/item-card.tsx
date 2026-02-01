import type { ItemWithTags } from '@/types';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  item: ItemWithTags;
  onPress: () => void;
  onCheckout?: () => void;
};

export function ItemCard({ item, onPress }: Props) {
  const available = item.quantity;
  const total = item.quantity + item.checked_out_quantity;
  const isLow = available < 5;
  const isOut = available === 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        {item.image_URL ? (
          <Image source={{ uri: item.image_URL }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Feather name="package" size={24} color="#999" />
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.item_name}
        </Text>
        <Text style={[styles.qty, isOut && styles.qtyOut, isLow && !isOut && styles.qtyLow]}>
          {available} / {total} available
        </Text>
        {item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 2).map((t) => (
              <View key={t.id} style={styles.tag}>
                <Text style={styles.tagText}>{t.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  pressed: { opacity: 0.9 },
  imageWrap: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  qty: { fontSize: 14, color: '#444', marginTop: 2 },
  qtyOut: { color: '#dc2626', fontWeight: '600' },
  qtyLow: { color: '#ca8a04', fontWeight: '600' },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6 },
  tag: { backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 12, color: '#555' },
});
