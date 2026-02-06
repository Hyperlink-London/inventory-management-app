'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { fetchActiveCheckoutsForNotifications } from '@/lib/data';
import { registerPushToken } from '@/lib/team-push';
import { ensureOverdueNotifications } from '@/lib/ensure-overdue-notifications';
import { isExpoGo } from '@/lib/expo-go';
import {
  requestNotificationPermissions,
  scheduleCheckoutNotifications,
  setupNotificationChannel,
} from '@/lib/notifications';

/**
 * When the user is logged in: requests notification permission, sets up the Android channel,
 * registers this device's push token for team notifications, and schedules "due tomorrow" /
 * "overdue" local notifications for active checkouts. Re-schedules when checkouts refresh or app comes to foreground.
 */
export function NotificationScheduleProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, userProfileId } = useAuthContext();
  const { refreshKey, subscribe } = useDataRefresh();
  const scheduledRef = useRef(false);

  const schedule = useCallback(async () => {
    if (Platform.OS === 'web' || isExpoGo()) return;
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await setupNotificationChannel();
    if (userProfileId) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData?.data;
        if (token) await registerPushToken(userProfileId, token);
      } catch {
        // Push token may fail on simulator or without proper config
      }
      await ensureOverdueNotifications(userProfileId);
    }
    const checkouts = await fetchActiveCheckoutsForNotifications();
    await scheduleCheckoutNotifications(checkouts);
    scheduledRef.current = true;
  }, [userProfileId]);

  useEffect(() => {
    if (!isLoggedIn || !userProfileId) {
      scheduledRef.current = false;
      return;
    }
    ensureOverdueNotifications(userProfileId);
    schedule();
  }, [isLoggedIn, userProfileId, refreshKey, schedule]);

  useEffect(() => {
    if (!isLoggedIn || Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') schedule();
    });
    return () => sub.remove();
  }, [isLoggedIn, schedule]);

  useEffect(() => {
    const unsub = subscribe(() => {
      if (isLoggedIn && scheduledRef.current) schedule();
    });
    return unsub;
  }, [isLoggedIn, subscribe, schedule]);

  return <>{children}</>;
}
