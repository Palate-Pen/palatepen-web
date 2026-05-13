// Internal/operator account allow-list. Membership in this set means two
// things:
//   1. The user is bucketed as 'admin' in the founder console (not Free) so
//      cost-of-serve and tier-mix dashboards stay honest.
//   2. Their effective tier is overridden to 'enterprise' across the app so
//      they have unrestricted access to every feature regardless of what
//      their stored account.tier / user_metadata.tier says.
//
// Used by:
// - src/context/AuthContext.tsx (client-side tier override)
// - src/app/api/palatable/*/route.ts (server-side tier override in AI routes)
// - src/app/admin/page.tsx (categorisation in the admin dashboard)
//
// Add a new email here when onboarding another operator. Keep the list
// short and audited — every entry bypasses tier enforcement entirely.

export const ADMIN_EMAILS = new Set([
  'hello@palateandpen.co.uk',
  'jack@palateandpen.co.uk',
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
