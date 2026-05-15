'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFeatureFlagAction } from '@/app/owner/team/actions';

export type PermissionCell = {
  feature_key: string;
  label: string;
  description: string;
  group: 'kitchen' | 'bar' | 'finance' | 'safety' | 'admin';
  enabled: boolean;
  source: 'role' | 'override';
};

const GROUP_LABEL: Record<PermissionCell['group'], string> = {
  kitchen: 'Kitchen',
  bar: 'Bar',
  finance: 'Finance',
  safety: 'Safety',
  admin: 'Admin',
};

const GROUP_ORDER: PermissionCell['group'][] = [
  'kitchen',
  'bar',
  'finance',
  'safety',
  'admin',
];

/**
 * Per-member permissions panel. Replaces the cross-member toggle
 * matrix that previously lived on /owner/team. Grouped by domain so
 * editing permissions feels like a checklist, not a spreadsheet.
 *
 * Tap a row to flip its override. Override badge surfaces when the
 * value differs from the role default.
 */
export function MemberPermissions({
  membershipId,
  cells,
}: {
  membershipId: string;
  cells: PermissionCell[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggle(featureKey: string, current: boolean) {
    setErrors((p) => {
      const next = { ...p };
      delete next[featureKey];
      return next;
    });
    startTransition(async () => {
      const res = await toggleFeatureFlagAction(
        membershipId,
        featureKey,
        !current,
      );
      if (!res.ok) {
        setErrors((p) => ({ ...p, [featureKey]: res.error ?? 'Failed' }));
        return;
      }
      router.refresh();
    });
  }

  const byGroup = new Map<string, PermissionCell[]>();
  for (const c of cells) {
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group)!.push(c);
  }

  return (
    <div className="bg-card border border-rule">
      <div className="px-7 py-4 border-b border-rule">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
          Permissions
        </div>
        <p className="font-serif italic text-sm text-muted mt-1">
          Tap a feature to override the role default. Overrides are remembered
          per user; everything else inherits from the role.
        </p>
      </div>

      {GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => (
        <div key={g}>
          <div className="px-7 py-3 bg-paper-warm border-b border-rule-soft font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
            {GROUP_LABEL[g]}
          </div>
          {byGroup.get(g)!.map((cell, i, list) => {
            const err = errors[cell.feature_key];
            return (
              <button
                key={cell.feature_key}
                type="button"
                onClick={() => toggle(cell.feature_key, cell.enabled)}
                disabled={pending}
                className={
                  'w-full text-left px-7 py-4 flex items-start gap-4 hover:bg-paper-warm transition-colors disabled:opacity-50 ' +
                  (i < list.length - 1 ? 'border-b border-rule-soft' : '')
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-serif font-semibold text-base text-ink">
                      {cell.label}
                    </span>
                    {cell.source === 'override' && (
                      <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 bg-gold-bg text-gold-dark border border-gold/40">
                        override
                      </span>
                    )}
                  </div>
                  <div className="font-serif italic text-sm text-muted leading-snug">
                    {cell.description}
                  </div>
                  {err && (
                    <div className="font-serif italic text-xs text-urgent mt-1.5">
                      {err}
                    </div>
                  )}
                </div>
                <div
                  className={
                    'w-12 h-7 border-2 relative flex-shrink-0 transition-colors ' +
                    (cell.enabled
                      ? 'bg-healthy border-healthy'
                      : 'bg-paper border-rule')
                  }
                >
                  <span
                    className={
                      'absolute top-[2px] w-4 h-4 transition-all ' +
                      (cell.enabled ? 'left-[24px] bg-paper' : 'left-[2px] bg-muted')
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
