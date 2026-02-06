import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { supabase } from '@/lib/supabase';
import { ensureOverdueNotifications } from '@/lib/ensure-overdue-notifications';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { profile } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    await ensureOverdueNotifications(profile.id);
    const { data, error } = await supabase
      .from('notification_messages')
      .select('id, type, title, body, read_at, created_at, metadata')
      .eq('recipient_profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      setNotifications([]);
    } else {
      setNotifications((data || []) as Notification[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const markAsRead = async (id: string) => {
    if (!profile?.id) return;
    await supabase
      .from('notification_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_profile_id', profile.id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const [markingAll, setMarkingAll] = useState(false);

  const markAllAsRead = async () => {
    if (!profile?.id || unreadCount === 0) return;
    setMarkingAll(true);
    await supabase
      .from('notification_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_profile_id', profile.id)
      .is('read_at', null);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setMarkingAll(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'team_checkout':
        return 'shopping-cart';
      case 'team_item_added':
        return 'package';
      case 'overdue':
      case 'overdue_reminder':
        return 'alert-triangle';
      case 'due_tomorrow':
        return 'calendar';
      default:
        return 'bell';
    }
  };

  const itemId = (n: Notification) => n.metadata?.item_id as string | undefined;

  if (!profile?.id) {
    return null;
  }

  const listHeader =
    unreadCount > 0 ? (
      <Pressable
        onPress={markAllAsRead}
        disabled={markingAll}
        style={({ pressed }) => [
          styles.markAllBar,
          { backgroundColor: colors.muted, borderBottomColor: colors.border },
          pressed && styles.markAllPressed,
        ]}
      >
        {markingAll ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : (
          <Text style={[styles.markAllText, { color: colors.tint }]}>
            Mark all as read
          </Text>
        )}
      </Pressable>
    ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Loading...
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="bell" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No notifications yet
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.mutedForeground }]}
              >
                When teammates check out or add items, you'll see them here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isUnread = !item.read_at;
          const iid = itemId(item);

          return (
            <Pressable
              onPress={() => {
                if (isUnread) markAsRead(item.id);
                if (iid) router.push(`/item/${iid}`);
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: isUnread ? colors.muted + '40' : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Feather
                  name={getIcon(item.type) as any}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.body}>
                <Text
                  style={[
                    styles.title,
                    { color: colors.text },
                    isUnread && styles.titleBold,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.summary, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {item.body}
                </Text>
                <Text
                  style={[styles.time, { color: colors.mutedForeground }]}
                >
                  {formatTimeAgo(item.created_at)}
                  {iid && ' · Tap to view item'}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  markAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  markAllPressed: { opacity: 0.8 },
  markAllText: { fontSize: 15, fontWeight: '600' },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 16 },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 15 },
  titleBold: { fontWeight: '600' },
  summary: { fontSize: 14, marginTop: 2 },
  time: { fontSize: 12, marginTop: 4 },
});
