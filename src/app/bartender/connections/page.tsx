import { redirect } from 'next/navigation';

/**
 * Bar shell no longer manages integrations. Connections moved to the
 * Manager + Owner shells (Kitchen+ tier).
 */
export default function BarConnectionsRedirect() {
  redirect('/manager/connections');
}
