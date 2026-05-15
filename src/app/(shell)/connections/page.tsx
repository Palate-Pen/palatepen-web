import { redirect } from 'next/navigation';

/**
 * Chef shell no longer manages integrations. Connections moved to the
 * Manager + Owner shells (Kitchen+ tier). Kept as a redirect so any
 * stale link / bookmark lands somewhere useful.
 */
export default function ConnectionsRedirect() {
  redirect('/manager/connections');
}
