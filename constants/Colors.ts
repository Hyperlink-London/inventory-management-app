/**
 * Theme colors aligned with software-inventory-management (dark-first).
 * Dark theme uses oklch equivalents: background ~0.145, foreground ~0.985, card ~0.205, etc.
 */
const dark = {
  text: '#fafafa',
  background: '#252525',
  tint: '#ebebeb',
  tabIconDefault: '#71717a',
  tabIconSelected: '#fafafa',
  card: '#353535',
  cardForeground: '#fafafa',
  border: 'rgba(255, 255, 255, 0.1)',
  muted: '#454545',
  mutedForeground: '#b5b5b5',
  accent: '#454545',
  accentForeground: '#fafafa',
  destructive: '#ef4444',
  primary: '#ebebeb',
  primaryForeground: '#252525',
  success: '#22c55e',
  warning: '#eab308',
};

const light = {
  text: '#171717',
  background: '#ffffff',
  tint: '#252525',
  tabIconDefault: '#a1a1aa',
  tabIconSelected: '#252525',
  card: '#ffffff',
  cardForeground: '#171717',
  border: '#e5e5e5',
  muted: '#f5f5f5',
  mutedForeground: '#737373',
  accent: '#f5f5f5',
  accentForeground: '#171717',
  destructive: '#dc2626',
  primary: '#252525',
  primaryForeground: '#fafafa',
  success: '#16a34a',
  warning: '#ca8a04',
};

export default {
  light,
  dark,
};
