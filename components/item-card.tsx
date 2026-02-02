import { useThemeColors } from '@/hooks/use-theme-colors';
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
  const colors = useThemeColors();
  const available = item.quantity;
  const total = item.quantity + item.checked_out_quantity;
  const isLow = available < 5;
  const isOut = available === 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageWrap}>
        {item.image_URL ? (
          <Image source={{ uri: item.image_URL }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.muted }]}>
            <Feather name="package" size={24} color={colors.mutedForeground} />
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.item_name}
        </Text>
        <Text
          style={[
            styles.qty,
            { color: colors.mutedForeground },
            isOut && { color: colors.destructive, fontWeight: '600' },
            isLow && !isOut && { color: colors.warning, fontWeight: '600' },
          ]}
        >
          {available} / {total} available
        </Text>
        {item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 2).map((t) => (
              <View key={t.id} style={[styles.tag, { backgroundColor: colors.muted }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{t.name}</Text>
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
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  pressed: { opacity: 0.9 },
  imageWrap: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  qty: { fontSize: 14, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 12 },
});
