import { LogBox } from 'react-native';

// Suppress expo-notifications Expo Go warnings (we no-op there; use dev build for full support)
LogBox.ignoreLogs([
  'expo-notifications',
  'Android Push notifications',
  'removed from Expo Go',
  'not fully supported in Expo Go',
  'development build',
  'dev-client',
  'expo.fyi/dev-client',
]);

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider } from '@react-navigation/native';
import 'expo-crypto';
import '@/lib/crypto-polyfill';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { SplashScreenController } from '@/components/splash-screen-controller';

// Required for OAuth: dismisses the auth browser when redirect returns to the app
WebBrowser.maybeCompleteAuthSession();
import Colors from '@/constants/Colors';
import { AppDarkTheme } from '@/constants/Theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import AuthProvider from '@/providers/auth-provider';
import { DataRefreshProvider } from '@/providers/data-refresh-provider';
import { NotificationScheduleProvider } from '@/providers/notification-schedule-provider';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <ThemeProvider value={AppDarkTheme}>
      <AuthProvider>
        <DataRefreshProvider>
          <NotificationScheduleProvider>
            <SplashScreenController />
            <ProtectedRoutes />
          </NotificationScheduleProvider>
        </DataRefreshProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ProtectedRoutes() {
  const { isLoggedIn, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <View style={authLoadingStyles.centered}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="item/[id]"
          options={{
            headerShown: true,
            title: 'Item',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: 'Settings',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            title: 'Notifications',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

const authLoadingStyles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}
