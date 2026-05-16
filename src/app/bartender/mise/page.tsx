import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Prep — Bar — Palatable' };

type PrepRow = {
  id: string;
  name: string;
  qty: number | null;
  qty_unit: string | null;
  status: 'not_started' | 'in_progress' | 'done' | 'over_prepped' | 'short';
  station: string | null;
  assigned_label: string | null;
  notes: string | null;
  prep_date: string | null;
};

const STATUS_LABEL: Record<PrepRow['status'], string> = {
  not_started: 'Pending',
  in_progress: 'On the go',
  done: 'Done',
  over_prepped: 'Over-prepped',
  short: 'Short',
};

const STATUS_TONE: Record<PrepRow['status'], 'healthy' | 'attention' | 'urgent' | undefined> = {
  not_started: undefined,
  in_progress: 'attention',
  done: 'healthy',
  over_prepped: 'attention',
  short: 'urgent',
};

const BAR_STATIONS = ['Cocktail', 'Wine', 'Beer', 'Service Bar', 'Garnish'];

export default async function BarMisePage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: rows } = await supabase
    .from('prep_items')
    .select(
      'id, name, qty, qty_unit, status, station, assigned_label, notes, prep_date',
    )
    .eq('site_id', ctx.siteId)
    .gte('prep_date', today)
    .order('prep_date', { ascending: true });

  const items = (rows ?? []) as PrepRow[];

  // Stub note: bar-station prep is not yet partitioned in v2.prep_items —
  // we show all of today's prep here and let the bartender filter by
  // station once that field carries bar-specific values.

  const todayItems = items.filter(
    (i) => i.prep_date && i.prep_date.slice(0, 10) === today,
  );
  const tomorrowItems = items.filter(
    (i) => i.prep_date && i.prep_date.slice(0, 10) === tomorrow,
  );
  const doneCount = todayItems.filter((i) => i.status === 'done').length;
  const shortCount = todayItems.filter((i) => i.status === 'short').length;

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Bar Prep
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Prep</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {subtitleFor(todayItems.length, doneCount, shortCount, tomorrowItems.length)}
          </p>
        </div>
        <div className="print-hide">
          {todayItems.length > 0 && <PrintButton label="Print bar mise" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Today"
          value={String(todayItems.length)}
          sub={
            todayItems.length === 0
              ? 'nothing on the board'
              : `${doneCount} done`
          }
        />
        <KpiCard
          label="Done"
          value={String(doneCount)}
          sub={
            todayItems.length === 0
              ? '—'
              : `${Math.round((doneCount / Math.max(1, todayItems.length)) * 100)}% complete`
          }
          tone={
            todayItems.length > 0 && doneCount === todayItems.length
              ? 'healthy'
              : undefined
          }
        />
        <KpiCard
          label="Short"
          value={String(shortCount)}
          sub={shortCount === 0 ? 'all on track' : 'service at risk'}
          tone={shortCount > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Tomorrow"
          value={String(tomorrowItems.length)}
          sub="prep planned"
        />
      </div>

      <section className="mb-12">
        <SectionHead title="Today's Prep" />
        {todayItems.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-12 text-center">
            <p className="font-serif italic text-muted">
              Nothing on the board for today. Prep items will land here once they're added — syrups, peels, batched cocktails, garnishes.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            {todayItems.map((r, i) => (
              <MiseRow
                key={r.id}
                row={r}
                last={i === todayItems.length - 1}
              />
            ))}
          </div>
        )}
      </section>

      {tomorrowItems.length > 0 && (
        <section className="mb-12">
          <SectionHead
            title="Tomorrow's Mise"
            meta={`${tomorrowItems.length} planned`}
          />
          <div className="bg-card border border-rule opacity-80">
            {tomorrowItems.map((r, i) => (
              <MiseRow
                key={r.id}
                row={r}
                last={i === tomorrowItems.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <SectionHead title="Bar Stations" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-rule border border-rule">
          {BAR_STATIONS.map((s) => (
            <div key={s} className="bg-card px-5 py-6">
              <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2">
                {s}
              </div>
              <div className="font-serif italic text-xs text-muted-soft">
                station discriminator pending
              </div>
            </div>
          ))}
        </div>
      </section>

      <LookingAhead siteId={ctx.siteId} surface="mise" />
    </div>
  );
}

function subtitleFor(
  todayN: number,
  done: number,
  short: number,
  tomorrowN: number,
): string {
  if (todayN === 0) {
    if (tomorrowN > 0) {
      return `Quiet today. ${tomorrowN} prep ${tomorrowN === 1 ? 'item' : 'items'} on the books for tomorrow.`;
    }
    return 'Nothing on the prep board. Either an easy day or the team hasn\'t mapped it out yet.';
  }
  const parts: string[] = [];
  parts.push(`${done}/${todayN} done`);
  if (short > 0)
    parts.push(`${short} short — service is at risk`);
  return parts.join(', ') + '.';
}

function MiseRow({ row, last }: { row: PrepRow; last: boolean }) {
  const tone = STATUS_TONE[row.status];
  const statusClass =
    tone === 'urgent'
      ? 'text-urgent bg-urgent/10 border-urgent/40'
      : tone === 'attention'
        ? 'text-attention bg-attention/10 border-attention/40'
        : tone === 'healthy'
          ? 'text-healthy bg-healthy/10 border-healthy/40'
          : 'text-muted bg-paper-warm border-rule';
  return (
    <Link
      href={`/prep`}
      className={
        'grid grid-cols-[2fr_120px_120px_110px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {row.name}
        </div>
        {row.station && (
          <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-gold mt-0.5">
            {row.station}
          </div>
        )}
      </div>
      <div className="font-serif text-sm text-ink">
        {row.qty != null ? `${row.qty} ${row.qty_unit ?? ''}` : '—'}
      </div>
      <div className="font-serif italic text-sm text-muted">
        {row.assigned_label ?? 'unassigned'}
      </div>
      <div>
        <span
          className={
            'inline-flex items-center px-2 py-0.5 border font-display font-semibold text-[11px] tracking-[0.18em] uppercase rounded-sm ' +
            statusClass
          }
        >
          {STATUS_LABEL[row.status]}
        </span>
      </div>
    </Link>
  );
}
