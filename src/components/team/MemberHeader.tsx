'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeRoleAction } from '@/app/owner/team/actions';
import {
  ASSIGNABLE_ROLES,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
} from '@/lib/roles';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export type MemberHeaderData = {
  membership_id: string;
  user_id: string;
  email: string;
  role: string;
  site_name: string;
  joined_at: string;
  last_sign_in_at: string | null;
};

export function MemberHeader({
  member,
  canChangeRole,
}: {
  member: MemberHeaderData;
  canChangeRole: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function pickRole(next: string) {
    setError(null);
    setSaved(false);
    setRole(next);
    startTransition(async () => {
      const res = await changeRoleAction(member.membership_id, next);
      if (!res.ok) {
        setError(res.error ?? 'Could not change role.');
        setRole(member.role);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-8 py-7 mb-8">
      <div className="flex items-start gap-5 flex-wrap">
        <div className="w-14 h-14 border border-gold bg-gold-bg flex items-center justify-center font-display font-semibold text-xl tracking-[0.04em] uppercase text-gold-dark flex-shrink-0">
          {(member.email || member.user_id).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="font-serif font-semibold text-2xl text-ink mb-1">
            {member.email || member.user_id.slice(0, 12)}
          </div>
          <div className="font-serif italic text-sm text-muted">
            On {member.site_name} since {dateFmt.format(new Date(member.joined_at))}
            {member.last_sign_in_at && (
              <> · last sign-in {dateFmt.format(new Date(member.last_sign_in_at))}</>
            )}
          </div>
        </div>
        <div className="min-w-[200px]">
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-1.5 block">
            Role
          </label>
          {canChangeRole ? (
            <>
              <select
                value={role}
                onChange={(e) => pickRole(e.target.value)}
                disabled={pending}
                className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2 focus:border-gold focus:outline-none"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
                {/* Render the current role even if it's a legacy key
                    (commis / bar_back / viewer) so the picker can show
                    "no change" rather than blanking the value. */}
                {!ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number]) &&
                  ROLE_LABEL[role as keyof typeof ROLE_LABEL] && (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role as keyof typeof ROLE_LABEL]}
                    </option>
                  )}
              </select>
              <p className="font-serif italic text-[11px] text-muted mt-1.5 leading-snug">
                {ROLE_DESCRIPTION[role as keyof typeof ROLE_DESCRIPTION] ?? ''}
              </p>
            </>
          ) : (
            <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold py-2">
              {ROLE_LABEL[role as keyof typeof ROLE_LABEL] ?? role}
            </div>
          )}
          {saved && (
            <span className="font-serif italic text-xs text-healthy block mt-1.5">
              ✓ Role updated.
            </span>
          )}
          {error && (
            <span className="font-serif italic text-xs text-urgent block mt-1.5">
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
