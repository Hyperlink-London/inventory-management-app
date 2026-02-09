'use client';

import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { ensureOverdueNotifications } from '@/lib/ensure-overdue-notifications';

/**
 * When the user is logged in: keeps the in-app notification inbox in sync (overdue and due-tomorrow
 * reminders for their checkouts). Runs on load, when the app comes to foreground, and when data refreshes.
 * No push or local native notifications (removed for compatibility).
 */
export function NotificationScheduleProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, userProfileId } = useAuthContext();
  const { refreshKey } = useDataRefresh();

  useEffect(() => {
    if (!isLoggedIn || !userProfileId) return;
    ensureOverdueNotifications(userProfileId);
  }, [isLoggedIn, userProfileId, refreshKey]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && userProfileId) {
        ensureOverdueNotifications(userProfileId);
      }
    });
    return () => sub.remove();
  }, [isLoggedIn, userProfileId]);

  return <>{children}</>;
}
