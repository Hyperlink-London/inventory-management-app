import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { checkInItem } from '@/lib/actions';
import type { CheckoutItem } from '@/types';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  checkout: CheckoutItem;
  onCheckIn: () => void;
};

export function CheckoutCard({ checkout, onCheckIn }: Props) {
  const colors = useThemeColors();
  const router = useRouter();
  const { userProfileId } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const isReturned = !!checkout.returned_date;
  // Show Check In when user is the recipient, or when profile isn't loaded (backend validates)
  const canCheckIn =
    !isReturned &&
    (userProfileId === null || checkout.recipient_id === userProfileId);
  const isOverdue =
    !isReturned &&
    !!checkout.expected_return_date &&
    new Date(checkout.expected_return_date) < new Date();

  const handleCheckIn = () => {
    if (isReturned) return;
    Alert.alert('Check In', `Return "${checkout.item_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check In',
        onPress: async () => {
          setLoading(true);
          try {
            await checkInItem(checkout.id);
            onCheckIn();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to check in');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Pressable
      onPress={() => router.push(`/item/${checkout.item_id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.imageWrap}>
          {checkout.image_URL ? (
            <Image source={{ uri: checkout.image_URL }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: colors.muted }]}>
              <Feather name="package" size={20} color={colors.mutedForeground} />
            </View>
          )}
        </View>
        <View style={styles.content}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {checkout.item_name}
          </Text>
          <Text style={[styles.recipient, { color: colors.mutedForeground }]}>{checkout.recipient_full_name}</Text>
          <Text style={[styles.qty, { color: colors.mutedForeground }]}>Qty: {checkout.quantity}</Text>
        </View>
        <View style={styles.status}>
          {isReturned ? (
            <View style={[styles.badgeReturned, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeReturnedText, { color: colors.mutedForeground }]}>Returned</Text>
            </View>
          ) : isOverdue ? (
            <View style={styles.badgeOverdue}>
              <Text style={[styles.badgeOverdueText, { color: colors.destructive }]}>Overdue</Text>
            </View>
          ) : (
            <View style={styles.badgeActive}>
              <Text style={[styles.badgeActiveText, { color: colors.success }]}>Active</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.dates}>
        <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Out: {formatDate(checkout.sign_out_date)}</Text>
        <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
          Expected: {formatDate(checkout.expected_return_date)}
        </Text>
        {checkout.returned_date && (
          <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
            Returned: {formatDate(checkout.returned_date)}
          </Text>
        )}
      </View>

      {!isReturned && canCheckIn && (
        <Pressable
          onPress={handleCheckIn}
          disabled={loading}
          style={[
            styles.checkInBtn,
            { backgroundColor: colors.primary },
            loading && styles.checkInDisabled,
          ]}
        >
          <Text style={[styles.checkInText, { color: colors.primaryForeground }]}>
            {loading ? 'Checking in...' : 'Check In'}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  pressed: { opacity: 0.95 },
  row: { flexDirection: 'row' },
  imageWrap: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  recipient: { fontSize: 14, marginTop: 2 },
  qty: { fontSize: 13, marginTop: 2 },
  status: { justifyContent: 'center' },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActiveText: { fontSize: 12, fontWeight: '500' },
  badgeOverdue: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeOverdueText: { fontSize: 12, fontWeight: '500' },
  badgeReturned: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeReturnedText: { fontSize: 12 },
  dates: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dateLabel: { fontSize: 13 },
  checkInBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkInDisabled: { opacity: 0.7 },
  checkInText: { fontSize: 14, fontWeight: '600' },
});
