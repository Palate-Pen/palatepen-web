'use client';

import { useState, useTransition } from 'react';
import type { FeatureKey } from '@/lib/features';

export type MatrixMember = {
  membership_id: string;
  user_id: string;
  email: string;
  role: ShellRole;
  site_id: string;
  site_name: string;
  /** Map of feature_key -> { enabled, source }. Computed server-side from
   *  resolveFeatureMatrix() then passed in. */
  features: Record<string, { enabled: boolean; source: 'role' | 'override' }>;
};

export type FeatureColumn = {
  key: FeatureKey;
  label: string;
  group: 'kitchen' | 'bar' | 'finance' | 'safety' | 'admin';
};

type ShellRole =
  | 'owner'
  | 'manager'
  | 'chef'
  | 'sous_chef'
  | 'commis'
  | 'bartender'
  | 'head_bartender'
  | 'bar_back'
  | 'viewer';

const ROLE_LABEL: Record<ShellRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  chef: 'Head Chef',
  sous_chef: 'Sous Chef',
  commis: 'Commis',
  bartender: 'Bartender',
  head_bartender: 'Head Bartender',
  bar_back: 'Bar Back',
  viewer: 'Viewer',
};

const GROUP_LABEL: Record<FeatureColumn['group'], string> = {
  kitchen: 'Kitchen',
  bar: 'Bar',
  finance: 'Finance',
  safety: 'Safety',
  admin: 'Admin',
};

export function TeamMatrix({
  members,
  featureColumns,
  toggleAction,
  changeRoleAction,
  canChangeRole,
  showSiteColumn,
}: {
  members: MatrixMember[];
  featureColumns: FeatureColumn[];
  toggleAction: (
    membershipId: string,
    featureKey: string,
    enabled: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  changeRoleAction: (
    membershipId: string,
    role: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  canChangeRole: boolean;
  showSiteColumn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const visibleColumns = groupFilter
    ? featureColumns.filter((c) => c.group === groupFilter)
    : featureColumns;

  function toggle(membershipId: string, featureKey: string, current: boolean) {
    const next = !current;
    const errKey = membershipId + ':' + featureKey;
    startTransition(async () => {
      const res = await toggleAction(membershipId, featureKey, next);
      if (!res.ok) {
        setErrors((p) => ({ ...p, [errKey]: res.error ?? 'Failed' }));
      } else {
        setErrors((p) => {
          const next = { ...p };
          delete next[errKey];
          return next;
        });
      }
    });
  }

  function changeRole(membershipId: string, role: string) {
    startTransition(async () => {
      await changeRoleAction(membershipId, role);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6 print-hide">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
          Filter:
        </span>
        {(['kitchen', 'bar', 'finance', 'safety', 'admin'] as const).map(
          (g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupFilter(groupFilter === g ? null : g)}
              className={
                'font-display font-semibold text-xs tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors ' +
                (groupFilter === g
                  ? 'bg-gold text-paper border-gold'
                  : 'bg-transparent text-muted border-rule hover:border-gold hover:text-gold')
              }
            >
              {GROUP_LABEL[g]}
            </button>
          ),
        )}
        {groupFilter && (
          <button
            type="button"
            onClick={() => setGroupFilter(null)}
            className="font-serif italic text-xs text-muted hover:text-ink ml-2"
          >
            clear
          </button>
        )}
      </div>

      <div className="bg-card border border-rule overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-paper-warm border-b border-rule">
              <th className="text-left px-5 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted whitespace-nowrap sticky left-0 bg-paper-warm z-10">
                Member
              </th>
              <th className="text-left px-5 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted whitespace-nowrap">
                Role
              </th>
              {showSiteColumn && (
                <th className="text-left px-5 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted whitespace-nowrap">
                  Site
                </th>
              )}
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  className="text-center px-3 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted whitespace-nowrap"
                  title={c.label}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr
                key={m.membership_id}
                className={
                  i < members.length - 1 ? 'border-b border-rule-soft' : ''
                }
              >
                <td className="px-5 py-4 font-serif text-sm text-ink whitespace-nowrap sticky left-0 bg-card z-10">
                  {m.email || m.user_id.slice(0, 8)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {canChangeRole ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.membership_id, e.target.value)}
                      disabled={pending}
                      className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-3 py-1.5 bg-paper border border-rule text-ink focus:border-gold focus:outline-none"
                    >
                      {(
                        Object.keys(ROLE_LABEL) as Array<keyof typeof ROLE_LABEL>
                      ).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                </td>
                {showSiteColumn && (
                  <td className="px-5 py-4 font-serif italic text-sm text-muted whitespace-nowrap">
                    {m.site_name}
                  </td>
                )}
                {visibleColumns.map((c) => {
                  const cell = m.features[c.key];
                  if (!cell) {
                    return (
                      <td
                        key={c.key}
                        className="px-3 py-4 text-center font-serif italic text-xs text-muted-soft"
                      >
                        —
                      </td>
                    );
                  }
                  const errKey = m.membership_id + ':' + c.key;
                  const err = errors[errKey];
                  return (
                    <td key={c.key} className="px-3 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(m.membership_id, c.key, cell.enabled)}
                        disabled={pending}
                        title={
                          cell.source === 'override'
                            ? 'Override set'
                            : 'Inherits role default'
                        }
                        className={
                          'w-10 h-6 border transition-colors relative ' +
                          (cell.enabled
                            ? 'bg-healthy border-healthy'
                            : 'bg-paper border-rule')
                        }
                      >
                        <span
                          className={
                            'absolute top-0.5 w-4 h-4 transition-all ' +
                            (cell.enabled
                              ? 'left-5 bg-paper'
                              : 'left-1 bg-muted')
                          }
                        />
                      </button>
                      {cell.source === 'override' && (
                        <div className="font-serif italic text-[10px] text-gold mt-1">
                          override
                        </div>
                      )}
                      {err && (
                        <div className="font-serif italic text-[10px] text-urgent mt-1">
                          {err}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-serif italic text-sm text-muted mt-6">
        Default state comes from each member's role. Tap a toggle to override per user — the override sticks until you tap it back to role-default by toggling twice.
      </p>
    </div>
  );
}
