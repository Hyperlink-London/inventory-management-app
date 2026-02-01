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
    subtle?: SubtleCrypto;
  } | undefined;
}

interface SubtleCrypto {
  digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>;
}

function polyfillWebCrypto() {
  if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = { getRandomValues: Crypto.getRandomValues.bind(Crypto) };
  } else if (typeof globalThis.crypto.getRandomValues !== 'function') {
    globalThis.crypto.getRandomValues = Crypto.getRandomValues.bind(Crypto);
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
