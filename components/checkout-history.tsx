import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { checkInItem } from '@/lib/actions';
import type { CheckoutItem } from '@/types';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  checkouts: CheckoutItem[];
  onRefresh: () => void;
};

export function CheckoutHistory({ checkouts, onRefresh }: Props) {
  const colors = useThemeColors();
  const { userProfileId } = useAuthContext();
  const { refresh } = useDataRefresh();
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const handleCheckIn = (checkoutId: string) => {
    Alert.alert('Check In', 'Return this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check In',
        onPress: async () => {
          setCheckingIn(checkoutId);
          try {
            await checkInItem(checkoutId);
            // Trigger refresh across all screens
            refresh('all');
            onRefresh();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to check in');
          } finally {
            setCheckingIn(null);
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

  const isOverdue = (expectedReturn: string | null, returned: string | null) => {
    if (returned) return false;
    if (!expectedReturn) return false;
    return new Date(expectedReturn) < new Date();
  };

  if (checkouts.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Checkout History</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No checkouts for this item yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Checkout History</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
        {checkouts.length} {checkouts.length === 1 ? 'checkout' : 'checkouts'}
      </Text>
      {checkouts.map((checkout) => {
        const isReturned = !!checkout.returned_date;
        const overdue = isOverdue(checkout.expected_return_date, checkout.returned_date);
        const canCheckIn =
          !isReturned &&
          (userProfileId === null || checkout.recipient_id === userProfileId);

        return (
          <View
            key={checkout.id}
            style={[
              styles.checkoutCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              isReturned && styles.returnedCard,
            ]}
          >
            <View style={styles.checkoutHeader}>
              <View style={styles.checkoutInfo}>
                <Text style={[styles.recipientName, { color: colors.text }]}>
                  {checkout.recipient_full_name}
                </Text>
                <Text style={[styles.quantity, { color: colors.mutedForeground }]}>
                  Quantity: {checkout.quantity}
                </Text>
              </View>
              <View>
                {isReturned ? (
                  <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>Returned</Text>
                  </View>
                ) : overdue ? (
                  <View style={[styles.badge, { backgroundColor: 'rgba(220, 38, 38, 0.2)' }]}>
                    <Text style={[styles.badgeText, { color: colors.destructive }]}>Overdue</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                    <Text style={[styles.badgeText, { color: colors.success }]}>Active</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.datesRow}>
              <View style={styles.dateItem}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                  Out: {formatDate(checkout.sign_out_date)}
                </Text>
              </View>
              <View style={styles.dateItem}>
                <Feather name="calendar" size={14} color={overdue && !isReturned ? colors.destructive : colors.mutedForeground} />
                <Text
                  style={[
                    styles.dateLabel,
                    { color: overdue && !isReturned ? colors.destructive : colors.mutedForeground },
                  ]}
                >
                  Expected: {formatDate(checkout.expected_return_date)}
                </Text>
              </View>
              {isReturned && (
                <View style={styles.dateItem}>
                  <Feather name="check-circle" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                    Returned: {formatDate(checkout.returned_date)}
                  </Text>
                </View>
              )}
            </View>

            {canCheckIn && (
              <Pressable
                onPress={() => handleCheckIn(checkout.id)}
                disabled={checkingIn === checkout.id}
                style={[
                  styles.checkInBtn,
                  { backgroundColor: colors.primary },
                  checkingIn === checkout.id && styles.checkInDisabled,
                ]}
              >
                <Text style={[styles.checkInText, { color: colors.primaryForeground }]}>
                  {checkingIn === checkout.id ? 'Checking in...' : 'Check In'}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  checkoutCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  returnedCard: {
    opacity: 0.7,
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkoutInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 13,
  },
  checkInBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkInDisabled: {
    opacity: 0.7,
  },
  checkInText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
