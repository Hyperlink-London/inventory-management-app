import { supabase } from './supabase';

export type SetSessionResult =
  | { success: true }
  | {
      success: false;
      error: 'user_cancelled' | 'state_mismatch' | 'missing_code' | 'missing_tokens' | 'exchange_failed';
      message?: string;
    };

function getParamsFromUrl(url: string): URLSearchParams {
  const hashPart = url.includes('#') ? url.split('#')[1] : '';
  const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const fragment = hashPart || queryPart;
  return new URLSearchParams(fragment);
}

/**
 * Parse OAuth redirect URL and set the session.
 * - PKCE flow: URL has ?code=... (query) - call exchangeCodeForSession
 * - Implicit flow: URL has #access_token=... (hash) - call setSession
 * Hash is often lost in mobile redirects; PKCE (configured in supabase.ts) uses query params.
 */
export async function setSessionFromUrl(url: string): Promise<SetSessionResult> {
  try {
    if (__DEV__) {
      const safe = url.replace(/[?&#][^=]*=[^&]*/g, (m) => m.split('=')[0] + '=***');
      console.log('[Auth] setSessionFromUrl received:', safe);
    }

    const params = getParamsFromUrl(url);
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    if (errorParam === 'access_denied' || errorParam === 'user_cancelled') {
      return { success: false, error: 'user_cancelled' };
    }
    if (errorParam) {
      return {
        success: false,
        error: 'exchange_failed',
        message: errorDescription || errorParam,
      };
    }

    // PKCE flow: code in query (reliable in mobile redirects)
    const code = params.get('code');
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return {
          success: false,
          error: 'exchange_failed',
          message: error.message,
        };
      }
      return data?.session ? { success: true } : { success: false, error: 'exchange_failed', message: 'No session returned' };
    }

    // Implicit flow: tokens in hash (may be lost on mobile)
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) {
      return {
        success: false,
        error: 'missing_tokens',
        message: 'No code or tokens in redirect URL. If using Expo proxy, try PKCE (flowType: "pkce" in supabase client).',
      };
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return {
        success: false,
        error: 'exchange_failed',
        message: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: 'exchange_failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
