import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { log } from './logger';

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
 * Notify everyone in the current user's team that someone (the current user) checked out an item.
 * Call after a successful checkout. Sends to teammates only; no-op if user has no team or no teammates have tokens.
 */
export async function notifyTeamCheckout(
  checkerOuterName: string,
  itemName: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  const tokens = await getTeammatePushTokens();
  if (tokens.length === 0) return;
  await sendPushToTokens(
    tokens,
    'Team checkout',
    `${checkerOuterName} checked out "${itemName}"`
  );
}

/**
 * Notify everyone in the current user's team that someone (the current user) added a new item.
 * Call after a successful add. Sends to teammates only; no-op if user has no team or no teammates have tokens.
 */
export async function notifyTeamItemAdded(
  adderName: string,
  itemName: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  const tokens = await getTeammatePushTokens();
  if (tokens.length === 0) return;
  await sendPushToTokens(
    tokens,
    'New item added',
    `${adderName} added "${itemName}" to the inventory`
  );
}
