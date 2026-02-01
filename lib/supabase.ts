import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { log } from './logger';

// Support both EXPO_PUBLIC_ (Expo) and NEXT_PUBLIC_ (shared .env) prefixes
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__) {
  log.auth('Supabase init', supabaseUrl ? `url=${supabaseUrl.slice(0, 30)}...` : 'NO URL', supabaseAnonKey ? 'has key' : 'NO KEY');
}

// Use AsyncStorage everywhere - SecureStore has a 2048-byte limit and Supabase sessions exceed it
const storageAdapter = {
  getItem: async (key: string) => AsyncStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce', // Use PKCE so redirect has ?code=... (query) instead of #token (hash); hash is often lost in mobile OAuth redirects
  },
});
