import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import {
  getMarginsData,
  gpToneFor,
  type DishRow,
  type GpTone,
  type MarginsData,
  type SectionRollup,
  DEFAULT_GP_TARGET,
} from '@/lib/margins';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { GPBenchmarkPanel } from '@/components/gp/GPBenchmarkPanel';
import { FOOD_DISH_TYPES } from '@/lib/bar';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Margins — Palatable' };

const gpFmt = (pct: number | null): string =>
  pct == null ? '—' : `${pct.toFixed(0)}%`;
const driftFmt = (pct: number | null): string =>
  pct == null ? '—' : (pct >= 0 ? '+' : '') + pct.toFixed(1) + 'pt';
const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const toneText: Record<NonNullable<GpTone>, string> = {
  healthy: 'text-healthy',
  attention: 'text-attention',
  urgent: 'text-urgent',
};

const dotBg: Record<NonNullable<GpTone>, string> = {
  healthy: 'bg-healthy',
  attention: 'bg-attention',
  urgent: 'bg-urgent',
};

export default async function MarginsPage() {
  const ctx = await getShellContext();
  const data = await getMarginsData(ctx.siteId, { dishTypes: FOOD_DISH_TYPES });

  const menuGpTone = gpToneFor(data.menu_gp_pct);
  const needsAttention = data.dishes_attention + data.dishes_urgent;

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Menu Performance
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Margins</em>
            {' '}— how your menu is doing
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {summarySentence(data)}
          </p>
        </div>

        <div className="flex items-start gap-3 flex-wrap">
          <div className="print-hide">
            {data.dishes_total > 0 && <PrintButton label="Print margins" />}
          </div>
          <div className="bg-card border border-rule px-5 py-4 min-w-[300px]">
            <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-3">
              Comparing
            </div>
            <div className="font-serif italic text-xs text-muted">
              All dishes · live Bank prices · target{' '}
              <strong className="not-italic font-semibold text-ink">{DEFAULT_GP_TARGET}%</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Menu GP"
          value={gpFmt(data.menu_gp_pct)}
          sub={`target ${DEFAULT_GP_TARGET}%`}
          tone={menuGpTone === 'urgent' ? 'attention' : menuGpTone === 'healthy' ? 'healthy' : undefined}
        />
        <KpiCard
          label="Dishes Healthy"
          value={String(data.dishes_healthy)}
          trend={data.dishes_total > 0 ? `/ ${data.dishes_total}` : undefined}
          sub={
            data.dishes_total > 0
              ? `${Math.round((data.dishes_healthy / data.dishes_total) * 100)}% of menu on target`
              : 'no costed dishes yet'
          }
        />
        <KpiCard
          label="Needs Attention"
          value={String(needsAttention)}
          sub={
            needsAttention === 0
              ? 'nothing to sort'
              : data.dishes_urgent > 0
                ? `${data.dishes_urgent} urgent · ${data.dishes_attention} watch`
                : `${data.dishes_attention} watching`
          }
          tone={needsAttention > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Worst Drift"
          value={driftFmt(data.worst_drift_pct)}
          sub={data.worst_drift_recipe?.name?.toLowerCase() ?? 'no drift tracked'}
          tone={
            data.worst_drift_pct != null && data.worst_drift_pct > 3
              ? 'attention'
              : undefined
          }
        />
      </div>

      <div className="print-hide">
        <LookingAhead siteId={ctx.siteId} surface="margins" />
      </div>

      <section className="mt-12">
        <SectionHead
          title="Benchmark — Where The Industry Sits"
          meta="reference"
        />
        <GPBenchmarkPanel flavour="food" />
      </section>

      <section className="mt-12">
        <SectionHead
          title="Menu Section Performance"
          meta="in menu order · click to jump to detail"
        />
        {data.sections.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-12 text-center">
            <p className="font-serif italic text-muted">
              No costed dishes yet. Add recipes with sell prices and the section breakdown lands here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {data.sections.map((s) => (
              <SectionSummaryCard key={s.name} section={s} />
            ))}
          </div>
        )}
      </section>

      {data.sections.length > 0 && (
        <section className="mt-12">
          <SectionHead
            title="All Dishes"
            meta="in menu order · click any dish to drill into its costing"
          />
          {data.sections.map((s) => (
            <MenuDetailBlock key={s.name} section={s} />
          ))}
        </section>
      )}
    </div>
  );
}

function summarySentence(data: MarginsData): string {
  if (data.dishes_total === 0) {
    return 'No recipes yet. Add a dish, link its ingredients to The Bank, and Margins fills in from there.';
  }
  const parts: string[] = [];
  const needs = data.dishes_attention + data.dishes_urgent;
  if (needs === 0) {
    parts.push('Everything on target.');
  } else if (data.dishes_urgent === 0) {
    parts.push(`${needs} ${needs === 1 ? 'dish' : 'dishes'} drifting — worth a look.`);
  } else {
    parts.push(
      `${data.dishes_urgent} ${data.dishes_urgent === 1 ? 'dish' : 'dishes'} bleeding margin`,
    );
    if (data.dishes_attention > 0) parts.push(`· ${data.dishes_attention} watching`);
  }
  return parts.join(' ');
}

function SectionSummaryCard({ section }: { section: SectionRollup }) {
  const tone = gpToneFor(section.avg_gp_pct);
  const flagDotTone: NonNullable<GpTone> =
    section.dishes.some((d) => d.gp_tone === 'urgent')
      ? 'urgent'
      : section.dishes.some((d) => d.gp_tone === 'attention')
        ? 'attention'
        : 'healthy';
  return (
    <a
      href={`#section-${section.name}`}
      className="bg-card border border-rule px-5 py-5 cursor-pointer transition-colors hover:border-rule-gold no-underline"
    >
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-3">
        {section.display_name}
      </div>
      <div
        className={`font-serif font-medium text-2xl leading-none ${
          tone ? toneText[tone] : 'text-ink'
        }`}
      >
        {gpFmt(section.avg_gp_pct)}
      </div>
      <div className="font-serif italic text-xs text-muted mt-2">
        {section.dishes.length} {section.dishes.length === 1 ? 'dish' : 'dishes'}
      </div>
      <div className="flex items-center gap-1.5 mt-2 font-serif italic text-xs text-muted">
        <span className={`w-1.5 h-1.5 rounded-full ${dotBg[flagDotTone]}`} />
        <span>
          {section.flagged_count === 0
            ? 'all behaving'
            : `${section.flagged_count} flagged`}
        </span>
      </div>
    </a>
  );
}

function MenuDetailBlock({ section }: { section: SectionRollup }) {
  return (
    <div className="mb-8" id={`section-${section.name}`}>
      <div className="bg-paper-warm border border-rule px-6 py-4">
        <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-1.5">
          {section.display_name}
        </div>
        <div className="font-serif italic text-xs text-muted">
          <strong className="not-italic font-semibold text-ink">
            {section.dishes.length} {section.dishes.length === 1 ? 'dish' : 'dishes'}
          </strong>
          {' '}· avg GP{' '}
          <strong className="not-italic font-semibold text-ink">
            {gpFmt(section.avg_gp_pct)}
          </strong>
        </div>
      </div>

      <div className="bg-card border border-rule border-t-0">
        <div className="hidden md:grid grid-cols-[2fr_70px_70px_90px_2fr_30px] gap-4 px-6 py-3 border-b border-rule bg-paper-warm/40">
          {['Dish', 'GP %', 'vs Baseline', 'Plate Price', 'Exposed To', ''].map(
            (h, i) => (
              <div
                key={i}
                className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
              >
                {h}
              </div>
            ),
          )}
        </div>

        {section.dishes.map((d, i) => (
          <DishRowView
            key={d.recipe.id}
            row={d}
            last={i === section.dishes.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function DishRowView({ row, last }: { row: DishRow; last: boolean }) {
  const tone = row.gp_tone;
  const driftClass =
    row.drift_pct == null
      ? 'text-muted'
      : row.drift_pct >= 4
        ? 'text-urgent'
        : row.drift_pct >= 2
          ? 'text-attention'
          : row.drift_pct <= -1
            ? 'text-healthy'
            : 'text-muted';

  return (
    <Link
      href={`/margins/${row.recipe.id}`}
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_70px_70px_90px_2fr_30px] gap-4 px-6 py-4 items-center cursor-pointer hover:bg-card-warm transition-colors' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div className="font-serif font-semibold text-base text-ink">
        {row.recipe.name}
      </div>
      <div
        className={`font-serif font-semibold text-base ${
          tone ? toneText[tone] : 'text-muted-soft'
        }`}
      >
        {gpFmt(row.gp_pct)}
      </div>
      <div className={`font-serif font-medium text-sm ${driftClass}`}>
        {row.drift_pct == null
          ? '—'
          : (row.drift_pct >= 0 ? '↑ ' : '↓ ') +
            Math.abs(row.drift_pct).toFixed(1)}
      </div>
      <div className="font-serif text-sm text-ink">
        {row.recipe.sell_price == null ? '—' : gbp.format(row.recipe.sell_price)}
      </div>
      <div className="font-serif italic text-xs text-muted">
        {row.driver ? (
          <>
            <strong className="not-italic font-semibold text-ink">
              {row.driver.name}
            </strong>
            {row.driver.line_cost == null
              ? ' · not yet matched'
              : ` · ${gbp.format(row.driver.line_cost)} per dish`}
          </>
        ) : (
          'no ingredients yet'
        )}
      </div>
      <div className="text-muted-soft justify-self-end">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 3l4 4-4 4" />
        </svg>
      </div>
    </Link>
  );
}
