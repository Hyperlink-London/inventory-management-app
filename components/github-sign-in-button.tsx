import { setSessionFromUrl, type SetSessionResult } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

/**
 * GitHub OAuth configuration (Expo Go with auth proxy):
 * - Supabase Redirect URLs must include the Expo proxy URL:
 *   https://auth.expo.io/@<expo-username>/<app-slug>
 *   (from AuthSession.getRedirectUrl(), e.g. https://auth.expo.io/@anonymous/inventory-management-app)
 * - GitHub OAuth App "Authorization callback URL" is configured in Supabase, not here.
 * - Sign in with Expo account (not anonymous) for a stable proxy URL.
 */
export function GitHubSignInButton() {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      let redirectTo: string;

      if (Platform.OS === 'web') {
        // Web: use makeRedirectUri (unchanged behavior)
        redirectTo = AuthSession.makeRedirectUri({ path: 'auth/callback' });
      } else {
        // Mobile (Expo Go): use Expo auth proxy so OAuth redirect returns to app
        try {
          redirectTo = AuthSession.getRedirectUrl();
        } catch {
          // Fallback: build proxy URL from app.json owner/slug when getRedirectUrl throws
          const owner = Constants.expoConfig?.owner ?? 'rohanzm';
          const slug = Constants.expoConfig?.slug ?? 'inventory-management-app';
          redirectTo = `https://auth.expo.io/@${owner}/${slug}`;
        }
        if (__DEV__) {
          console.log('[Auth] Expo proxy redirect (add to Supabase):', redirectTo);
        }
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo,
          scopes: 'read:org read:user user:email',
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (!data?.url) {
        Alert.alert('Error', 'Could not get login URL');
        return;
      }

      let result: WebBrowser.WebBrowserAuthSessionResult;

      const authSessionOptions = {
        // Use ephemeral session so the browser doesn't reuse cookies from the previous sign-in.
        // Without this, signing out then signing in again can fail (cached redirect / stale code).
        preferEphemeralSession: true,
      };
      if (Platform.OS === 'web') {
        result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, authSessionOptions);
      } else {
        // Expo Go: open via proxy so redirect returns to app
        const proxyStartUrl = `${redirectTo}/start?${new URLSearchParams({
          authUrl: data.url,
          returnUrl: AuthSession.getDefaultReturnUrl(),
        }).toString()}`;
        result = await WebBrowser.openAuthSessionAsync(
          proxyStartUrl,
          AuthSession.getDefaultReturnUrl(),
          authSessionOptions
        );
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      if (result.type !== 'success' || !result.url) {
        Alert.alert('Error', 'Sign in was not completed');
        return;
      }

      if (__DEV__) {
        const hasCode = result.url.includes('code=');
        const hasHash = result.url.includes('#');
        console.log('[Auth] Redirect URL received - has code param:', hasCode, 'has hash:', hasHash);
      }

      const sessionResult: SetSessionResult = await setSessionFromUrl(result.url);

      if (sessionResult.success) {
        // Ensure client has session, then give AuthProvider time to process onAuthStateChange
        // so the dashboard has session/profile when it mounts and data loads correctly.
        await supabase.auth.getSession();
        await new Promise((r) => setTimeout(r, 250));
        router.replace('/(tabs)');
        return;
      }

      switch (sessionResult.error) {
        case 'user_cancelled':
          return;
        case 'state_mismatch':
          Alert.alert('Error', 'Security verification failed. Please try again.');
          break;
        case 'missing_tokens':
        case 'exchange_failed':
          Alert.alert('Error', sessionResult.message ?? 'Failed to complete sign in');
          break;
        default:
          Alert.alert('Error', 'An error occurred during sign in');
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'An error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        loading && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>Sign in with GitHub</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#24292F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 220,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
