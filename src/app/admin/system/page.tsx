import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Admin · System Health — Palatable' };

const TABLES: Array<{ name: string; label: string }> = [
  { name: 'accounts', label: 'Accounts' },
  { name: 'sites', label: 'Sites' },
  { name: 'memberships', label: 'Memberships' },
  { name: 'recipes', label: 'Recipes' },
  { name: 'ingredients', label: 'Bank ingredients' },
  { name: 'suppliers', label: 'Suppliers' },
  { name: 'invoices', label: 'Invoices' },
  { name: 'invoice_lines', label: 'Invoice lines' },
  { name: 'credit_notes', label: 'Credit notes' },
  { name: 'deliveries', label: 'Deliveries' },
  { name: 'waste_entries', label: 'Waste entries' },
  { name: 'prep_items', label: 'Prep items' },
  { name: 'menu_plans', label: 'Menu plans' },
  { name: 'menu_plan_items', label: 'Menu plan items' },
  { name: 'notebook_entries', label: 'Notebook entries' },
  { name: 'forward_signals', label: 'Forward signals' },
  { name: 'ingredient_price_history', label: 'Price history' },
  { name: 'gp_calculations', label: 'GP calculations' },
  { name: 'connections', label: 'Connections' },
];

export default async function AdminSystemPage() {
  const svc = createSupabaseServiceClient();

  const rows = await Promise.all(
    TABLES.map(async (t) => {
      try {
        const { count, error } = await svc
          .from(t.name)
          .select('*', { count: 'exact', head: true });
        if (error) return { ...t, count: 0, missing: true };
        return { ...t, count: count ?? 0, missing: false };
      } catch {
        return { ...t, count: 0, missing: true };
      }
    }),
  );

  const totalRows = rows.reduce((s, r) => s + r.count, 0);
  const missing = rows.filter((r) => r.missing);

  const { data: signalsAge } = await svc
    .from('forward_signals')
    .select('detector_kind, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  const signalsByKind = new Map<string, number>();
  let mostRecentSignal: string | null = null;
  for (const s of (signalsAge ?? []) as Array<{
    detector_kind: string;
    created_at: string;
  }>) {
    signalsByKind.set(
      s.detector_kind,
      (signalsByKind.get(s.detector_kind) ?? 0) + 1,
    );
    if (!mostRecentSignal) mostRecentSignal = s.created_at;
  }

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin · System
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        <em className="text-gold font-semibold not-italic">Pulse</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        Row counts across every v2 table. If something looks empty that shouldn't be, something's wrong.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Total Rows"
          value={totalRows.toLocaleString('en-GB')}
          sub={`across ${TABLES.length} tables`}
        />
        <KpiCard
          label="Forward Signals"
          value={String(signalsAge?.length ?? 0)}
          sub={`${signalsByKind.size} detector kinds`}
        />
        <KpiCard
          label="Missing Tables"
          value={String(missing.length)}
          sub={missing.length === 0 ? 'all present' : 'need migrations'}
          tone={missing.length === 0 ? 'healthy' : 'urgent'}
        />
        <KpiCard
          label="Latest Signal"
          value={mostRecentSignal ? relativeAge(mostRecentSignal) : '—'}
          sub="cron health"
        />
      </div>

      <SectionHead title="Tables" meta={`${rows.length} tracked`} />
      <div className="bg-card border border-rule mb-10">
        <div className="hidden md:grid grid-cols-[2fr_120px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Table', 'Rows', 'Status'].map((h) => (
            <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
              {h}
            </div>
          ))}
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name}
            className={
              'grid grid-cols-1 md:grid-cols-[2fr_120px_120px] gap-4 px-7 py-3 items-center ' +
              (i === rows.length - 1 ? '' : 'border-b border-rule-soft')
            }
          >
            <div>
              <div className="font-serif font-semibold text-sm text-ink">
                {r.label}
              </div>
              <div className="font-mono text-[11px] text-muted-soft mt-0.5">
                v2.{r.name}
              </div>
            </div>
            <div className="font-mono text-sm text-ink">
              {r.count.toLocaleString('en-GB')}
            </div>
            <div
              className={
                'font-display font-semibold text-xs tracking-[0.08em] uppercase ' +
                (r.missing
                  ? 'text-urgent'
                  : r.count === 0
                    ? 'text-muted-soft'
                    : 'text-healthy')
              }
            >
              {r.missing ? 'missing' : r.count === 0 ? 'empty' : 'live'}
            </div>
          </div>
        ))}
      </div>

      <SectionHead
        title="Forward signals · detector mix"
        meta={`${signalsAge?.length ?? 0} recent`}
      />
      <div className="bg-card border border-rule mb-10">
        {signalsByKind.size === 0 ? (
          <div className="px-10 py-10 text-center font-serif italic text-muted">
            No forward signals on record. Cron might not be running.
          </div>
        ) : (
          Array.from(signalsByKind.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([kind, count], i, arr) => (
              <div
                key={kind}
                className={
                  'px-7 py-3 flex items-center justify-between ' +
                  (i === arr.length - 1 ? '' : 'border-b border-rule-soft')
                }
              >
                <div className="font-mono text-xs text-muted">{kind}</div>
                <div className="font-display font-semibold text-xs tracking-[0.08em] uppercase text-gold">
                  {count}
                </div>
              </div>
            ))
        )}
      </div>

      <Link
        href="/admin"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
      >
        ← Back to Admin home
      </Link>
    </div>
  );
}

function relativeAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
