import { useMemo } from 'react';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type ThemeColors = typeof Colors.dark;

/**
 * Returns the current theme's color palette. Defaults to dark to match software-inventory-management.
 */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return useMemo(
    () => Colors[scheme === 'dark' ? 'dark' : 'light'],
    [scheme]
  );
}
