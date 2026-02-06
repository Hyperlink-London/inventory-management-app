import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { CheckoutForNotification } from './data';

const NOTIFICATION_HOUR = 9;
const NOTIFICATION_MINUTE = 0;
const PREFIX_DUE = 'due-';
const PREFIX_OVERDUE = 'overdue-';
const ANDROID_CHANNEL_ID = 'checkout-reminders';

/** How to show notifications when app is in foreground. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Create Android channel for checkout reminders. Call once on app init. */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Checkout reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

/**
 * Request notification permissions. Call once when user is logged in.
 * No-op on web.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Build a date at 9:00 AM local time for the given calendar date.
 */
function dateAtNine(date: Date): Date {
  const d = new Date(date);
  d.setHours(NOTIFICATION_HOUR, NOTIFICATION_MINUTE, 0, 0);
  return d;
}

/**
 * Cancel all scheduled notifications that we created for checkouts.
 */
async function cancelCheckoutNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter(
    (n) =>
      (n.identifier.startsWith(PREFIX_DUE) || n.identifier.startsWith(PREFIX_OVERDUE))
  );
  for (const n of ours) {
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
}

/**
 * Schedule local notifications for "due tomorrow" and "overdue" for each checkout.
 * Call after fetching active checkouts (e.g. on app load and when checkouts refresh).
 */
export async function scheduleCheckoutNotifications(
  checkouts: CheckoutForNotification[]
): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelCheckoutNotifications();

  const now = new Date();

  for (const c of checkouts) {
    const expected = new Date(c.expected_return_date);
    const expectedDateOnly = new Date(expected.getFullYear(), expected.getMonth(), expected.getDate());

    // Due tomorrow: fire at 9 AM on the day before expected return
    const dayBefore = new Date(expectedDateOnly);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dueTomorrowTime = dateAtNine(dayBefore);
    if (dueTomorrowTime > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX_DUE}${c.id}`,
        content: {
          title: 'Due tomorrow',
          body: `"${c.item_name}" is due back tomorrow.`,
          ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dueTomorrowTime,
          ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
        },
      });
    }

    // Overdue: fire at 9 AM on the day after expected return (first day it's overdue)
    const dayAfter = new Date(expectedDateOnly);
    dayAfter.setDate(dayAfter.getDate() + 1);
    let overdueTime = dateAtNine(dayAfter);
    if (overdueTime <= now) {
      // Already past that date; fire in 1 minute so user still gets notified
      overdueTime = new Date(now.getTime() + 60 * 1000);
    }
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX_OVERDUE}${c.id}`,
      content: {
        title: 'Overdue',
        body: `"${c.item_name}" was due back and is now overdue.`,
        ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: overdueTime,
        ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
      },
    });
  }
}
