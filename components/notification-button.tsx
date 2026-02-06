import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { supabase } from '@/lib/supabase';

export function NotificationButton() {
  const colors = useThemeColors();
  const router = useRouter();
  const { profile } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!profile?.id) {
      setUnreadCount(0);
      return;
    }
    const { count, error } = await supabase
      .from('notification_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_profile_id', profile.id)
      .is('read_at', null);

    if (!error) {
      setUnreadCount(count ?? 0);
    }
  }, [profile?.id]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useFocusEffect(
    useCallback(() => {
      refreshCount();
    }, [refreshCount])
  );

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('notification_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_messages',
          filter: `recipient_profile_id=eq.${profile.id}`,
        },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (!profile?.id) return null;

  const onPress = () => router.push('/notifications');
  const badge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.trigger,
        { backgroundColor: colors.muted },
        pressed && styles.triggerPressed,
      ]}
      accessibilityLabel={badge ? `${badge} unread notifications` : 'Notifications'}
    >
      <View>
        <Feather name="bell" size={22} color={colors.tint} />
        {badge !== null && (
          <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerPressed: { opacity: 0.8 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
