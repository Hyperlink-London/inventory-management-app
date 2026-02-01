/**
 * Expo logging utility. In __DEV__, logs to console with prefixes.
 * In production, no-ops. Use for debugging data flow and auth.
 */
const enabled = __DEV__;

export const log = {
  auth: (...args: unknown[]) => enabled && console.log('[Auth]', ...args),
  data: (...args: unknown[]) => enabled && console.log('[Data]', ...args),
  ui: (...args: unknown[]) => enabled && console.log('[UI]', ...args),
};
