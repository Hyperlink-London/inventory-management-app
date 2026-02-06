import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { log } from './logger';
import type { OverdueCheckoutForInbox } from './data';
import { fetchOverdueCheckoutsForInbox } from './data';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Register this device's Expo push token for the given profile.
 * Call after the user is logged in and notification permission is granted.
 */
export async function registerPushToken(profileId: string, token: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { error } = await supabase.from('push_tokens').upsert(
      { profile_id: profileId, token },
      { onConflict: 'profile_id,token' }
    );
    if (error) log.data('registerPushToken error', error.message);
  } catch (e) {
    log.data('registerPushToken exception', e);
  }
}

/**
 * Fetch Expo push tokens of all users who share a team with the current user (excluding current user).
 * Requires auth; returns empty array if no teammates or on error.
 */
export async function getTeammatePushTokens(): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_teammate_push_tokens');
    if (error) {
      log.data('getTeammatePushTokens error', error.message);
      return [];
    }
    const tokens = (Array.isArray(data) ? data : []) as string[];
    return tokens.filter((t): t is string => typeof t === 'string' && t.length > 0);
  } catch (e) {
    log.data('getTeammatePushTokens exception', e);
    return [];
  }
}

/**
 * Send a push notification to the given Expo push tokens via Expo's push API.
 * No auth required for the API; tokens are the authorization.
 */
export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (tokens.length === 0) return;
  try {
    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      ...(data && { data }),
    }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const text = await res.text();
      log.data('sendPushToTokens error', res.status, text);
    }
  } catch (e) {
    log.data('sendPushToTokens exception', e);
  }
}

/**
 * Insert notification_messages for teammates (synced inbox between web and app).
 */
async function insertNotificationForTeammates(
  type: 'team_checkout' | 'team_item_added',
  title: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('supabase_uid', user.id)
      .is('deleted_at', null)
      .single();

    const senderProfileId = myProfile?.id;
    if (!senderProfileId) return;

    const { data: teammateIds, error: rpcError } = await supabase.rpc('get_teammate_profile_ids');
    if (rpcError || !teammateIds || (Array.isArray(teammateIds) ? teammateIds : [teammateIds]).length === 0) return;

    const ids = Array.isArray(teammateIds) ? teammateIds : [teammateIds];
    const rows = ids.map((recipientId: string) => ({
      recipient_profile_id: recipientId,
      sender_profile_id: senderProfileId,
      type,
      title,
      body,
      metadata: metadata || {},
    }));

    await supabase.from('notification_messages').insert(rows);
  } catch (e) {
    log.data('insertNotificationForTeammates exception', e);
  }
}

/**
 * Notify everyone in the current user's team that someone (the current user) checked out an item.
 * Inserts into notification_messages (synced inbox) and sends push. No-op on web.
 */
export async function notifyTeamCheckout(
  checkerOuterName: string,
  itemName: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  const title = 'Team checkout';
  const body = `${checkerOuterName} checked out "${itemName}"`;
  await insertNotificationForTeammates('team_checkout', title, body);
  const tokens = await getTeammatePushTokens();
  if (tokens.length > 0) {
    await sendPushToTokens(tokens, title, body);
  }
}

/**
 * Notify everyone in the current user's team that someone (the current user) added a new item.
 * Inserts into notification_messages (synced inbox) and sends push. No-op on web.
 */
export async function notifyTeamItemAdded(
  adderName: string,
  itemName: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  const title = 'New item added';
  const body = `${adderName} added "${itemName}" to the inventory`;
  await insertNotificationForTeammates('team_item_added', title, body);
  const tokens = await getTeammatePushTokens();
  if (tokens.length > 0) {
    await sendPushToTokens(tokens, title, body);
  }
}

const OVERDUE_REMINDER_TYPE = 'overdue_reminder';

/**
 * Ensure the current user's overdue checkouts appear in their notification inbox.
 * Inserts one notification_messages row per overdue checkout (if not already present).
 */
export async function ensureOverdueInInbox(profileId: string): Promise<void> {
  try {
    const overdue = await fetchOverdueCheckoutsForInbox(profileId);
    if (overdue.length === 0) return;

    const { data: existing } = await supabase
      .from('notification_messages')
      .select('metadata')
      .eq('recipient_profile_id', profileId)
      .eq('type', OVERDUE_REMINDER_TYPE);

    const existingSignoutIds = new Set(
      (existing || [])
        .map((r: { metadata?: { itemsignout_id?: string } }) => r.metadata?.itemsignout_id)
        .filter(Boolean)
    );

    const toInsert: OverdueCheckoutForInbox[] = overdue.filter((c) => !existingSignoutIds.has(c.id));
    if (toInsert.length === 0) return;

    const expectedFmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const rows = toInsert.map((c) => ({
      recipient_profile_id: profileId,
      sender_profile_id: null,
      type: OVERDUE_REMINDER_TYPE,
      title: 'Overdue',
      body: `"${c.item_name}" was due ${expectedFmt(c.expected_return_date)} and is overdue.`,
      metadata: { itemsignout_id: c.id, item_id: c.item_id },
    }));

    const { error } = await supabase.from('notification_messages').insert(rows);
    if (error) log.data('ensureOverdueInInbox insert error', error.message);
  } catch (e) {
    log.data('ensureOverdueInInbox exception', e);
  }
}
