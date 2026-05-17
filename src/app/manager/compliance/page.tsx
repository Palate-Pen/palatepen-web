import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getAllergenMatrix, getComplianceRollup } from '@/lib/oversight';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import { AllergenMatrix } from '@/components/allergens/AllergenMatrix';
import { ALLERGENS } from '@/lib/allergens';

export const metadata = { title: 'Compliance — Manager — Palatable' };

export default async function ManagerCompliancePage() {
  const ctx = await getShellContext();
  const [c, matrix] = await Promise.all([
    getComplianceRollup(ctx.siteId),
    getAllergenMatrix(ctx.siteId),
  ]);

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · UK FIR Allergens
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Compliance</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            Where the kitchen sits against UK FIR 2014 + Natasha's Law.
            Allergen coverage across every recipe, with anything that needs
            chef review surfaced as a list below.
          </p>
        </div>
        <div className="print-hide">
          <PrintButton label="Print compliance" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Recipes"
          value={String(c.total_recipes)}
          sub="non-archived"
        />
        <KpiCard
          label="Declared"
          value={String(c.declared)}
          sub={`${c.declared_pct}% of book`}
          tone={c.declared_pct >= 90 ? 'healthy' : c.declared_pct >= 70 ? 'attention' : 'urgent'}
        />
        <KpiCard
          label="Needs Review"
          value={String(c.needs_review.length)}
          sub="missing detail"
          tone={c.needs_review.length > 0 ? 'attention' : 'healthy'}
        />
        <KpiCard
          label="Coverage"
          value={`${c.declared_pct}%`}
          sub="goal: 100%"
        />
      </div>

      <SectionHead
        title="Needs Chef Review"
        meta={
          c.needs_review.length === 0
            ? 'all clean — no review needed'
            : `${c.needs_review.length} recipe${c.needs_review.length === 1 ? '' : 's'}`
        }
      />
      {c.needs_review.length === 0 ? (
        <div className="bg-card border border-rule border-l-4 border-l-healthy px-7 py-6">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-healthy mb-2">
            ✓ All Clear
          </div>
          <p className="font-serif italic text-base text-ink-soft">
            Every food recipe has allergens declared and (where applicable)
            nut + cereal sub-types specified. This view re-scans on every
            recipe save, so it stays current.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          {c.needs_review.map((r, i) => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}/edit`}
              className={
                'block px-7 py-4 hover:bg-paper-warm transition-colors' +
                (i < c.needs_review.length - 1
                  ? ' border-b border-rule-soft'
                  : '')
              }
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="font-serif font-semibold text-base text-ink">
                  {r.name}
                </div>
                <div className="font-serif italic text-sm text-attention">
                  {r.reason}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-10">
        <SectionHead
          title="Allergen Matrix"
          meta={`${matrix.rows.length} dish${matrix.rows.length === 1 ? '' : 'es'} × 14 allergens`}
        />
        <p className="font-serif italic text-sm text-muted mb-4 max-w-[720px]">
          Every dish against every UK FIR allergen — what an EHO will want to scan in 30 seconds. ● = contains · ○ = may contain · blank = not declared. Click any row to edit the recipe.
        </p>
        <AllergenMatrix matrix={matrix} />

        <div className="bg-paper-warm border border-rule px-5 py-4 mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {ALLERGENS.map((a) => (
            <div key={a.key} className="flex items-baseline gap-2">
              <span className="font-mono font-medium text-[11px] text-ink w-7">
                {a.short}
              </span>
              <span className="font-serif text-xs text-muted">{a.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-5 mt-8">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-2">
          UK FIR 2014 reminder
        </div>
        <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
          The 14 mandatory allergens must be available to customers on
          request. Recipes flagged as &quot;Contains nuts&quot; must specify which
          tree nuts (almond / hazelnut / walnut / cashew / pecan /
          brazil / pistachio / macadamia). Same pattern for cereals
          containing gluten. PPDS (Natasha&apos;s Law) items need a full
          ingredient list with the 14 allergens emphasised.
        </p>
      </div>
    </div>
  );
}
