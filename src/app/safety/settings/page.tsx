import { redirect } from 'next/navigation';

/**
 * Safety doesn't have its own settings surface yet — the liability ack,
 * safety_enabled flag, and team-level safety permissions all live in
 * the main /settings page. Redirect so the sidebar entry isn't a dead
 * link while we work out whether a dedicated safety-settings page is
 * worth the surface area.
 */
export default function SafetySettingsPage() {
  redirect('/settings');
}
