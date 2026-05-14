// Generate a 35-char API key like `pk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`.
// Uses crypto.getRandomValues (browser + Node 19+) for entropy. The `pk_`
// prefix is so leaked keys are easy to grep for in logs.

const KEY_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateApiKey(): string {
  const arr = new Uint8Array(32);
  // globalThis.crypto exists in both browser and modern Node
  (globalThis.crypto as Crypto).getRandomValues(arr);
  let s = 'pk_';
  for (let i = 0; i < 32; i++) s += KEY_ALPHABET[arr[i] % KEY_ALPHABET.length];
  return s;
}

// Mask all but the last 4 chars — used in UI when the key is hidden.
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '';
  const tail = key.slice(-4);
  const dots = '•'.repeat(Math.max(8, key.length - 4 - 3));
  return key.slice(0, 3) + dots + tail;
}
