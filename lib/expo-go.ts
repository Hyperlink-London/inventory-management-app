import Constants from 'expo-constants';

/**
 * True when the app is running inside Expo Go.
 * Push notifications and some expo-notifications features are not fully supported in Expo Go (SDK 53+).
 */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}
