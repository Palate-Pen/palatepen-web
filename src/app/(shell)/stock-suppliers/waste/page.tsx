import { getShellContext } from '@/lib/shell/context';
import { getWaste, wasteCategoryLabel, type WasteRow } from '@/lib/waste';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import {
  LogWasteDialog,
  type BankIngredientOption,
} from './LogWasteDialog';

export const metadata = { title: 'Waste — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});
const gbp2 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function WastePage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();
  const [data, ingredientsResp] = await Promise.all([
    getWaste(ctx.siteId),
    supabase
      .from('ingredients')
      .select('id, name, unit, current_price')
      .eq('site_id', ctx.siteId)
      .order('name', { ascending: true }),
  ]);
  const bankIngredients: BankIngredientOption[] = (
    ingredientsResp.data ?? []
  ).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    unit: (r.unit as string | null) ?? null,
    current_price:
      r.current_price == null ? null : Number(r.current_price),
  }));

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Walk-in · Waste
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Waste</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {subtitle(data)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap print-hide">
          {data.recent.length > 0 && <PrintButton label="Print waste log" />}
          <LogWasteDialog bankIngredients={bankIngredients} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="This Week"
          value={data.total_value_7d > 0 ? gbp.format(data.total_value_7d) : '£0'}
          sub={
            data.trend_pct == null
              ? 'no prior week'
              : data.trend_pct === 0
                ? 'flat vs last week'
                : `${data.trend_pct >= 0 ? 'up' : 'down'} ${Math.abs(data.trend_pct)}% vs last week`
          }
          tone={
            data.trend_pct != null && data.trend_pct > 15
              ? 'attention'
              : data.trend_pct != null && data.trend_pct < -10
                ? 'healthy'
                : undefined
          }
        />
        <KpiCard
          label="Last 30 Days"
          value={data.total_value_30d > 0 ? gbp.format(data.total_value_30d) : '£0'}
          sub="cumulative loss"
        />
        <KpiCard
          label="Top Category"
          value={
            data.by_category.length > 0
              ? wasteCategoryLabel(data.by_category[0].category)
              : '—'
          }
          sub={
            data.by_category.length > 0
              ? `${gbp.format(data.by_category[0].value)} · ${data.by_category[0].count} entries`
              : 'no entries'
          }
        />
        <KpiCard
          label="Worst Offender"
          value={data.top_offender ? data.top_offender.name : '—'}
          sub={
            data.top_offender
              ? `${gbp.format(data.top_offender.value)} across ${data.top_offender.count}`
              : 'no entries'
          }
          tone={data.top_offender && data.top_offender.value > 30 ? 'attention' : undefined}
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="By Category"
          meta={`${data.by_category.length} ${data.by_category.length === 1 ? 'category' : 'categories'} active`}
        />
        {data.by_category.length === 0 ? (
          <EmptyState text="No waste logged in the last 30 days." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule border border-rule">
            {data.by_category.map((c) => (
              <CategoryTile key={c.category} cat={c} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionHead
          title="Recent Entries"
          meta={`${data.recent.length} in the last 30 days`}
        />
        {data.recent.length === 0 ? (
          <EmptyState text="Nothing logged. When something gets binned, log it and it shows here." />
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[170px_2fr_120px_100px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Logged', 'Item', 'Qty', 'Value', 'Category'].map((h) => (
                <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
                  {h}
                </div>
              ))}
            </div>
            {data.recent.map((row, i) => (
              <WasteRowView key={row.id} row={row} last={i === data.recent.length - 1} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function subtitle(data: Awaited<ReturnType<typeof getWaste>>): string {
  if (data.total_value_30d === 0) {
    return 'No waste logged in the last 30 days. Either the kitchen is tight, or entries are slipping through.';
  }
  if (data.trend_pct != null && data.trend_pct > 15) {
    return `${gbp.format(data.total_value_7d)} logged this week — up ${data.trend_pct}% on the prior week. Worth a look.`;
  }
  return `${gbp.format(data.total_value_30d)} logged across the last 30 days, ${gbp.format(data.total_value_7d)} this week.`;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-card border border-rule px-10 py-10 text-center">
      <p className="font-serif italic text-muted">{text}</p>
    </div>
  );
}

function CategoryTile({
  cat,
}: {
  cat: { category: import('@/lib/waste').WasteCategory; value: number; count: number };
}) {
  return (
    <div className="bg-card px-6 py-5">
      <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
        {wasteCategoryLabel(cat.category)}
      </div>
      <div className="font-serif font-semibold text-xl text-ink mb-1">
        {gbp.format(cat.value)}
      </div>
      <div className="font-serif italic text-sm text-muted">
        {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
      </div>
    </div>
  );
}

function WasteRowView({ row, last }: { row: WasteRow; last: boolean }) {
  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[170px_2fr_120px_100px_120px] gap-4 px-7 py-4 items-center ' +
        (last ? '' : 'border-b border-rule-soft')
      }
    >
      <div className="font-serif text-sm text-ink">
        {dateTimeFmt.format(new Date(row.logged_at))}
      </div>
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {row.ingredient_name ?? row.name}
        </div>
        {row.reason_md && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            {row.reason_md}
          </div>
        )}
      </div>
      <div className="font-serif text-sm text-ink">
        {row.qty} {row.qty_unit}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {row.value != null ? gbp2.format(row.value) : '—'}
      </div>
      <div>
        <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted px-2.5 py-1 border border-rule rounded-sm">
          {wasteCategoryLabel(row.category)}
        </span>
      </div>
    </div>
  );
}
