'use client';

import { useState } from 'react';
import {
  ALLERGENS,
  GLUTEN_TYPES,
  NUT_TYPES,
  type AllergenState,
} from '@/lib/allergens';

type CheckStatus = 'pass' | 'warn' | 'fail';

type CheckRow = {
  label: string;
  status: CheckStatus;
  detail: string;
};

/**
 * UK FIR 2014 + Natasha's Law compliance check, computed from the
 * recipe's allergen + ingredient state. Each check is one of
 * pass/warn/fail with a short reason. Not a substitute for legal
 * review — the modal footer says so explicitly.
 *
 * Mirrors the legacy compliance-check modal but reads from v2 shapes
 * (recipe.allergens + recipe.ingredients) instead of the legacy
 * Bank-derived union.
 */
export function ComplianceCheck({
  recipeName,
  ingredientCount,
  matchedIngredientCount,
  allergens,
}: {
  recipeName: string;
  ingredientCount: number;
  matchedIngredientCount: number;
  allergens: AllergenState;
}) {
  const [open, setOpen] = useState(false);

  const checks: CheckRow[] = [];

  // 1. Recipe has a name.
  checks.push({
    label: 'Recipe name set',
    status: recipeName.trim().length > 0 ? 'pass' : 'fail',
    detail:
      recipeName.trim().length > 0
        ? `"${recipeName.trim()}" — Natasha's Law requires a clear dish name on PPDS labels.`
        : 'Required for PPDS labelling.',
  });

  // 2. Ingredients on file.
  checks.push({
    label: 'Ingredient list captured',
    status:
      ingredientCount === 0
        ? 'fail'
        : ingredientCount < 2
          ? 'warn'
          : 'pass',
    detail:
      ingredientCount === 0
        ? 'No ingredients linked. Required for full ingredient declaration.'
        : ingredientCount < 2
          ? 'Only one ingredient on file — verify this matches the dish as plated.'
          : `${ingredientCount} ${ingredientCount === 1 ? 'ingredient' : 'ingredients'} on the recipe.`,
  });

  // 3. Bank-linked ingredients (cost + allergen + nutrition flow).
  const linkCoverage =
    ingredientCount === 0
      ? 0
      : (matchedIngredientCount / ingredientCount) * 100;
  checks.push({
    label: 'Ingredients linked to The Bank',
    status:
      linkCoverage === 100
        ? 'pass'
        : linkCoverage >= 50
          ? 'warn'
          : 'fail',
    detail:
      linkCoverage === 100
        ? 'All ingredients linked — allergens, cost and nutrition flow automatically.'
        : `${matchedIngredientCount}/${ingredientCount} linked. Free-text ingredients carry no allergen data — declare manually if you keep them as free-text.`,
  });

  // 4. Allergen review done — at least one allergen declared OR an
  //    explicit "none" intent. Since we can't distinguish "no allergens"
  //    from "not yet reviewed", we warn at zero and pass at any > 0.
  const totalAllergens =
    allergens.contains.length + allergens.mayContain.length;
  checks.push({
    label: 'Allergen review carried out',
    status: totalAllergens > 0 ? 'pass' : 'warn',
    detail:
      totalAllergens === 0
        ? 'No allergens declared. If the dish genuinely has none, ignore — but verify against every ingredient.'
        : `${allergens.contains.length} contains, ${allergens.mayContain.length} may-contain declared.`,
  });

  // 5. If nuts is in contains, FIR requires the specific nut(s).
  if (allergens.contains.includes('nuts')) {
    checks.push({
      label: 'Specific tree nuts named',
      status: allergens.nutTypes.length > 0 ? 'pass' : 'fail',
      detail:
        allergens.nutTypes.length > 0
          ? `Named: ${allergens.nutTypes.join(', ')}.`
          : `FIR requires naming the specific tree nut(s). Allowed: ${NUT_TYPES.slice(0, 4).join(', ')}, …`,
    });
  }

  // 6. If gluten is in contains, FIR requires the specific cereal(s).
  if (allergens.contains.includes('gluten')) {
    checks.push({
      label: 'Specific gluten cereals named',
      status: allergens.glutenTypes.length > 0 ? 'pass' : 'fail',
      detail:
        allergens.glutenTypes.length > 0
          ? `Named: ${allergens.glutenTypes.join(', ')}.`
          : `FIR requires naming the specific cereal(s). Allowed: ${GLUTEN_TYPES.join(', ')}.`,
    });
  }

  // 7. Cross-contam awareness — if "may contain" is empty but kitchen
  //    has high-risk allergens declared elsewhere, hint to think about
  //    cross-contam. Pure heuristic; warn never fails.
  if (
    allergens.contains.length > 0 &&
    allergens.mayContain.length === 0 &&
    allergens.contains.includes('nuts') === false
  ) {
    checks.push({
      label: 'Cross-contamination considered',
      status: 'warn',
      detail:
        'Worth thinking through whether shared surfaces or fryers could carry traces of other allergens.',
    });
  }

  const failed = checks.filter((c) => c.status === 'fail').length;
  const warned = checks.filter((c) => c.status === 'warn').length;
  const summaryTone: CheckStatus =
    failed > 0 ? 'fail' : warned > 0 ? 'warn' : 'pass';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors"
      >
        Run compliance check →
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40">
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[640px] w-full max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                UK FIR 2014 · Natasha's Law
              </div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
                Compliance check
              </h2>
              <p className="font-serif italic text-sm text-muted mt-2">
                {summaryLabel(summaryTone, failed, warned)}
              </p>
            </div>

            <div className="px-7 py-5 flex flex-col gap-3">
              {checks.map((c, i) => (
                <CheckLine key={i} check={c} />
              ))}
            </div>

            <div className="px-7 py-4 border-t border-rule bg-paper-warm font-serif italic text-xs text-muted leading-relaxed">
              This is a software check on the captured fields, not a legal review. Always verify with your local Environmental Health Officer before printing PPDS labels or distributing allergen statements.
            </div>

            <div className="px-7 pb-6 pt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function summaryLabel(
  tone: CheckStatus,
  failed: number,
  warned: number,
): string {
  if (tone === 'pass') {
    return 'All checks pass. Ready to label.';
  }
  if (tone === 'fail') {
    return `${failed} ${failed === 1 ? 'check fails' : 'checks fail'}${warned > 0 ? ` · ${warned} ${warned === 1 ? 'warning' : 'warnings'}` : ''} — fix before labelling.`;
  }
  return `${warned} ${warned === 1 ? 'check needs a look' : 'checks need a look'}. No outright failures.`;
}

void ALLERGENS;

function CheckLine({ check }: { check: CheckRow }) {
  const tone =
    check.status === 'pass'
      ? 'border-l-healthy text-healthy'
      : check.status === 'warn'
        ? 'border-l-attention text-attention'
        : 'border-l-urgent text-urgent';
  const icon =
    check.status === 'pass' ? '✓' : check.status === 'warn' ? '!' : '✗';
  return (
    <div className={'bg-card border border-rule border-l-4 px-4 py-3 ' + tone}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display font-semibold text-base">{icon}</span>
        <span className="font-serif font-semibold text-sm text-ink">
          {check.label}
        </span>
      </div>
      <p className="font-serif italic text-sm text-ink-soft leading-relaxed pl-6">
        {check.detail}
      </p>
    </div>
  );
}
