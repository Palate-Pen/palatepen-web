import { getShellContext } from '@/lib/shell/context';
import { getTeam } from '@/lib/oversight';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Team — Manager — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const ROLE_LABEL: Record<string, string> = {
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

export default async function ManagerTeamPage() {
  const ctx = await getShellContext();
  const team = await getTeam(ctx.siteId);

  const owners = team.filter((m) => m.role === 'owner').length;
  const kitchen = team.filter(
    (m) => m.role === 'chef' || m.role === 'sous_chef' || m.role === 'commis',
  ).length;
  const bar = team.filter(
    (m) =>
      m.role === 'bartender' ||
      m.role === 'head_bartender' ||
      m.role === 'bar_back',
  ).length;
  const managers = team.filter((m) => m.role === 'manager').length;

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · Brigade
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Team</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {team.length === 0
              ? 'No memberships on this site yet.'
              : `${team.length} on the books — ${kitchen} kitchen, ${bar} bar, ${managers + owners} management.`}
          </p>
        </div>
        <div className="print-hide">
          {team.length > 0 && <PrintButton label="Print team list" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard label="Total" value={String(team.length)} sub="members" />
        <KpiCard label="Kitchen" value={String(kitchen)} sub="chef + sous + commis" />
        <KpiCard label="Bar" value={String(bar)} sub="head + bartender + back" />
        <KpiCard label="Management" value={String(managers + owners)} sub="manager + owner" />
      </div>

      <SectionHead
        title="On The Books"
        meta={team.length === 0 ? 'invite to start' : `${team.length} members`}
      />
      {team.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No team on file. Invite kitchen + bar staff from Settings to start tracking the brigade.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_140px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['User', 'Role', 'Joined'].map((h) => (
              <div
                key={h}
                className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
              >
                {h}
              </div>
            ))}
          </div>
          {team.map((m, i) => (
            <div
              key={m.user_id}
              className={
                'grid grid-cols-1 md:grid-cols-[1.4fr_1fr_140px] gap-4 px-7 py-4 items-center' +
                (i < team.length - 1 ? ' border-b border-rule-soft' : '')
              }
            >
              <div>
                <div className="font-serif font-semibold text-base text-ink">
                  {m.email ?? `user · ${m.user_id.slice(0, 8)}`}
                </div>
              </div>
              <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                {ROLE_LABEL[m.role] ?? m.role}
              </div>
              <div className="font-serif italic text-sm text-muted">
                {dateFmt.format(new Date(m.created_at))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="font-serif italic text-sm text-muted mt-6">
        Invite + remove flow lands with the multi-user signup batch.
      </p>
    </div>
  );
}
