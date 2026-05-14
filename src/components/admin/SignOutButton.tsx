'use client';

import { adminSignOutAction } from '@/app/admin/actions';

export function SignOutButton() {
  return (
    <form action={adminSignOutAction}>
      <button
        type="submit"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-rule text-ink-soft hover:border-gold hover:text-gold transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
