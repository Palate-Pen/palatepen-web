import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Spillage & Waste — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

const REASON_LABEL: Record<string, string> = {
  over_pour: 'Over-pour',
  breakage: 'Breakage',
  spillage: 'Spillage',
  comp: 'Comped',
  returned: 'Returned',
  expired: 'Expired',
};

const REASON_TONE: Record<string, 'attention' | 'urgent' | undefined> = {
  over_pour: 'attention',
  breakage: 'urgent',
  spillage: 'attention',
  comp: undefined,
  returned: undefined,
  expired: 'attention',
};

type SpillageRow = {
  id: string;
  name: string;
  qty: number;
  qty_unit: string;
  value: number | null;
  logged_at: string;
  spillage_reason: string;
  reason_md: string | null;
};

export default async function BarSpillagePage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const since30 = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: rows } = await supabase
    .from('waste_entries')
    .select(
      'id, name, qty, qty_unit, value, logged_at, spillage_reason, reason_md',
    )
    .eq('site_id', ctx.siteId)
    .not('spillage_reason', 'is', null)
    .gte('logged_at', since30)
    .order('logged_at', { ascending: false });

  const items = (rows ?? []) as SpillageRow[];

  const totalValue = items.reduce(
    (sum, r) => sum + Number(r.value ?? 0),
    0,
  );
  const byReason: Record<string, { count: number; value: number }> = {};
  for (const r of items) {
    byReason[r.spillage_reason] ??= { count: 0, value: 0 };
    byReason[r.spillage_reason].count += 1;
    byReason[r.spillage_reason].value += Number(r.value ?? 0);
  }
  const topReason = Object.entries(byReason).sort(
    (a, b) => b[1].count - a[1].count,
  )[0];

  // Pattern detection: same name appearing 3+ times in 14 days
  const since14 = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const nameCounts: Record<string, number> = {};
  for (const r of items) {
    if (new Date(r.logged_at).getTime() < since14) continue;
    nameCounts[r.name] = (nameCounts[r.name] ?? 0) + 1;
  }
  const patterns = Object.entries(nameCounts)
    .filter(([, n]) => n >= 3)
    .map(([name, n]) => ({ name, n }));

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            What Didn't Make It Into A Glass
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            Spillage &{' '}
            <em className="text-gold font-semibold not-italic">Waste</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {subtitleFor(items.length, totalValue, topReason, patterns)}
          </p>
        </div>
        <div className="print-hide">
          {items.length > 0 && <PrintButton label="Print spillage log" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Last 30 days"
          value={String(items.length)}
          sub={items.length === 0 ? 'nothing logged' : 'entries'}
        />
        <KpiCard
          label="Value"
          value={gbp.format(totalValue)}
          sub="cost of mistakes"
          tone={totalValue > 50 ? 'attention' : undefined}
        />
        <KpiCard
          label="Top reason"
          value={topReason ? REASON_LABEL[topReason[0]] ?? topReason[0] : '—'}
          sub={topReason ? `${topReason[1].count} entries` : 'no data'}
        />
        <KpiCard
          label="Patterns"
          value={String(patterns.length)}
          sub={
            patterns.length === 0
              ? 'no repeat offenders'
              : '3+ times in 14 days'
          }
          tone={patterns.length > 0 ? 'attention' : undefined}
        />
      </div>

      {patterns.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Patterns Worth Watching" />
          <div className="bg-card border border-rule border-l-4 border-l-attention px-7 py-5">
            <ul className="font-serif text-base text-ink-soft space-y-1.5">
              {patterns.map((p) => (
                <li key={p.name}>
                  <em className="text-gold not-italic font-medium italic">
                    {p.name}
                  </em>
                  {' '}— logged{' '}
                  <strong className="font-semibold">{p.n} times</strong>{' '}
                  in the last fortnight. Worth a five-minute chat with whoever's been on the well.
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <SectionHead
        title="Recent Entries"
        meta={
          items.length === 0
            ? 'last 30 days'
            : `${items.length} in last 30 days`
        }
      />
      {items.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No spillage logged. Over-pours, breakage, comps and returns get logged here when the team taps in.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[2fr_110px_110px_120px_90px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Item', 'Qty', 'Value', 'Reason', 'When'].map((h, i) => (
              <div
                key={i}
                className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
              >
                {h}
              </div>
            ))}
          </div>
          {items.map((r, i) => (
            <SpillageRowDisplay
              key={r.id}
              row={r}
              last={i === items.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function subtitleFor(
  count: number,
  value: number,
  topReason: [string, { count: number; value: number }] | undefined,
  patterns: Array<{ name: string; n: number }>,
): string {
  if (count === 0) {
    return 'No spillage logged in the last 30 days. Either a clean month or the team is not logging — worth checking which.';
  }
  const parts: string[] = [];
  parts.push(`${count} ${count === 1 ? 'entry' : 'entries'} worth ${gbp.format(value)} last 30 days`);
  if (topReason) {
    parts.push(
      `mostly ${REASON_LABEL[topReason[0]]?.toLowerCase() ?? topReason[0]}`,
    );
  }
  if (patterns.length > 0) {
    parts.push(
      `${patterns.length} pattern${patterns.length === 1 ? '' : 's'} flagged`,
    );
  }
  return parts.join(', ') + '.';
}

function SpillageRowDisplay({
  row,
  last,
}: {
  row: SpillageRow;
  last: boolean;
}) {
  const tone = REASON_TONE[row.spillage_reason];
  const reasonClass =
    tone === 'urgent'
      ? 'text-urgent bg-urgent/10 border-urgent/40'
      : tone === 'attention'
        ? 'text-attention bg-attention/10 border-attention/40'
        : 'text-muted bg-paper-warm border-rule';
  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_110px_110px_120px_90px] gap-4 px-7 py-4 items-start' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {row.name}
        </div>
        {row.reason_md && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            {row.reason_md}
          </div>
        )}
      </div>
      <div className="font-serif text-sm text-ink">
        {Number(row.qty)} {row.qty_unit}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {row.value != null ? gbp.format(Number(row.value)) : '—'}
      </div>
      <div>
        <span
          className={
            'inline-flex items-center px-2 py-0.5 border font-display font-semibold text-[10px] tracking-[0.18em] uppercase rounded-sm ' +
            reasonClass
          }
        >
          {REASON_LABEL[row.spillage_reason] ?? row.spillage_reason}
        </span>
      </div>
      <div className="font-serif italic text-xs text-muted">
        {dateFmt.format(new Date(row.logged_at))}
      </div>
    </div>
  );
}
