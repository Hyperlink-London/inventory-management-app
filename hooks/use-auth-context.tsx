import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type Profile = {
  id: string;
  supabase_uid: string;
  username?: string | null;
  full_name?: string | null;
  teams?: string[] | null;
};

export type AuthData = {
  session: Session | null;
  profile: Profile | null;
  userProfileId: string | null;
  userTeams: string[];
  isLoading: boolean;
  isLoggedIn: boolean;
};

export const AuthContext = createContext<AuthData>({
  session: null,
  profile: null,
  userProfileId: null,
  userTeams: [],
  isLoading: true,
  isLoggedIn: false,
});

export const useAuthContext = () => useContext(AuthContext);
