// Generate a short URL-safe token used in the chef's inbound invoice email
// address (e.g. `invoices+a1b2c3d4@palateandpen.co.uk`). 10 chars from a
// reduced alphabet (no 0/1/l/i/o) so it's easy to read in an email client.

const TOKEN_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function generateInboxToken(): string {
  const arr = new Uint8Array(10);
  (globalThis.crypto as Crypto).getRandomValues(arr);
  let s = '';
  for (let i = 0; i < 10; i++) s += TOKEN_ALPHABET[arr[i] % TOKEN_ALPHABET.length];
  return s;
}

// Extract the token from any address that looks like `local+token@domain`.
// Returns null if no `+token@` pattern is found.
export function extractInboxToken(addr: string): string | null {
  if (!addr) return null;
  const m = addr.match(/\+([a-z0-9]+)@/i);
  return m ? m[1].toLowerCase() : null;
}
