/**
 * Pulls the inbox token out of a To address of the form
 *   invoices+{token}@palateandpen.co.uk
 *
 * Providers send the To header in three different shapes — plain
 * string, array of strings, array of {email, name} objects. The
 * inbound webhook normalises all three before calling this.
 *
 * Token rules:
 *   - alphanumeric, 8–40 characters
 *   - case-insensitive (we lowercase before comparing to DB)
 *   - the literal part before the + must be 'invoices'
 *
 * Returns null when no valid token is found so the caller can decide
 * whether to drop the email silently or 422.
 */
export function extractInboxToken(address: string): string | null {
  if (!address) return null;

  // Pull the email out of "Display Name <foo@bar>" forms.
  const angle = address.match(/<([^>]+)>/);
  const email = (angle ? angle[1] : address).trim().toLowerCase();

  const m = email.match(/^invoices\+([a-z0-9]{8,40})@/);
  return m ? m[1] : null;
}
