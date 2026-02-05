/**
 * Polyfill for WebCrypto crypto.subtle in React Native so Supabase PKCE uses SHA-256
 * instead of falling back to "plain" (which can cause sign-in to fail).
 * Must be imported before any Supabase auth code runs (e.g. in app/_layout.tsx after expo-crypto).
 */
import * as Crypto from 'expo-crypto';

declare global {
  // eslint-disable-next-line no-var
  var crypto: {
    getRandomValues<T extends ArrayBufferView>(array: T): T;
    randomUUID(): string;
    subtle?: SubtleCrypto;
  } | undefined;
}

interface SubtleCrypto {
  digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>;
}

/**
 * Generate a UUID v4 using getRandomValues (RFC 4122 compliant)
 */
function generateUUID(): string {
  const bytes = new Uint8Array(16);
  Crypto.getRandomValues(bytes);
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  
  // Convert to UUID string format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function polyfillWebCrypto() {
  if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = {
      getRandomValues: Crypto.getRandomValues.bind(Crypto),
      randomUUID: generateUUID,
    };
  } else {
    if (typeof globalThis.crypto.getRandomValues !== 'function') {
      globalThis.crypto.getRandomValues = Crypto.getRandomValues.bind(Crypto);
    }
    if (typeof globalThis.crypto.randomUUID !== 'function') {
      globalThis.crypto.randomUUID = generateUUID;
    }
  }
  if (typeof globalThis.crypto.subtle === 'undefined') {
    globalThis.crypto.subtle = {
      digest: async (algorithm: string, data: BufferSource): Promise<ArrayBuffer> => {
        if (algorithm !== 'SHA-256') {
          throw new Error(`expo-crypto polyfill: unsupported algorithm "${algorithm}"`);
        }
        const bytes =
          data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
      },
    };
  }
}

polyfillWebCrypto();
