/**
 * Cookie names for the impersonation flow. Lives in its own file so
 * the constants can be imported from both server actions (where
 * `'use server'` only permits async exports) and from server
 * components (e.g. ImpersonationBanner) without crossing that
 * boundary.
 */

export const IMPERSONATION_FLAG_COOKIE = 'palatable_impersonating';
export const IMPERSONATION_LABEL_COOKIE = 'palatable_impersonate_label';
