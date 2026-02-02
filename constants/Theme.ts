import type { Theme } from '@react-navigation/native';
import { DarkTheme } from '@react-navigation/native';
import Colors from './Colors';

/**
 * Navigation theme matching software-inventory-management (dark).
 */
export const AppDarkTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.destructive,
  },
};
