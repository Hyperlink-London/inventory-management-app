import { AuthContext } from '@/hooks/use-auth-context';
import { log } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useState } from 'react';

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{
    id: string;
    supabase_uid: string;
    username?: string | null;
    full_name?: string | null;
    teams?: string[] | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    log.auth('fetchProfile: start', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, supabase_uid, username, full_name, teams')
        .eq('supabase_uid', userId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        log.auth('fetchProfile: error', error.message);
        if (error.message?.includes('column') && error.message?.includes('teams')) {
          const { data: dataWithoutTeams } = await supabase
            .from('profiles')
            .select('id, supabase_uid, username, full_name')
            .eq('supabase_uid', userId)
            .is('deleted_at', null)
            .maybeSingle();
          return dataWithoutTeams ? { ...dataWithoutTeams, teams: [] } : null;
        }
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      log.auth('init: getSession');
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      log.auth('init: session', s ? `user ${s.user?.id}` : 'none');
      setSession(s);

      if (s?.user?.id) {
        const p = await fetchProfile(s.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      log.auth('init: done, isLoading=false');
      setIsLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        const p = await fetchProfile(newSession.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const userProfileId = profile?.id ?? null;
  const userTeams = (profile?.teams ?? []).filter(Boolean);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        userProfileId,
        userTeams,
        isLoading,
        isLoggedIn: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
