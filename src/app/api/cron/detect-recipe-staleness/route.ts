import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Cron detector: recipe staleness.
 *
 * For each site's costed recipes, compares the current cost-per-cover
 * (computed live from recipe_ingredients × ingredients.current_price)
 * against the chef's cost_baseline. Emits a forward_signal when the
 * dish has drifted by more than DRIFT_THRESHOLD_PCT AND the costing is
 * at least MIN_AGE_DAYS old.
 *
 * Voice rule: reports what was spotted, never what the chef should do.
 *
 * Same Bearer auth contract as detect-market-moves. Scheduled via
 * vercel.json (daily 08:30 UTC, 30 minutes after market-moves so signals
 * across surfaces don't compete for cron throughput).
 */

const DRIFT_THRESHOLD_PCT = 3;
const MIN_AGE_DAYS = 28;

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

type IngredientLine = { qty: number; current_price: number | null; name: string };

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const minAgeIso = new Date(
    Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: recipes, error: recipesErr } = await supabase
    .from('recipes')
    .select(
      'id, site_id, name, serves, portion_per_cover, cost_baseline, costed_at',
    )
    .not('cost_baseline', 'is', null)
    .not('costed_at', 'is', null)
    .lte('costed_at', minAgeIso)
    .is('archived_at', null);
  if (recipesErr) {
    return NextResponse.json(
      { error: 'recipes_fetch_failed', detail: recipesErr.message },
      { status: 500 },
    );
  }

  let emitted = 0;
  let inspected = 0;

  for (const r of recipes ?? []) {
    inspected += 1;

    const serves = r.serves as number | null;
    const portion = r.portion_per_cover == null
      ? null
      : Number(r.portion_per_cover);
    if (!serves || !portion || serves <= 0) continue;

    const { data: ingredients, error: ingErr } = await supabase
      .from('recipe_ingredients')
      .select('qty, name, ingredient_id, ingredients:ingredient_id (current_price, supplier_id)')
      .eq('recipe_id', r.id);
    if (ingErr || !ingredients) continue;

    const lines: IngredientLine[] = ingredients.map((row) => {
      // Supabase's typed-relation joins arrive as either an array (1:many)
      // or a single object (1:1) depending on FK shape; recipe_ingredients
      // → ingredients is many-to-one, normalise to the first row.
      const rel = row.ingredients as unknown;
      const linked = Array.isArray(rel)
        ? (rel[0] as { current_price: number | null } | undefined)
        : (rel as { current_price: number | null } | null);
      return {
        qty: Number(row.qty),
        current_price:
          linked?.current_price == null ? null : Number(linked.current_price),
        name: row.name as string,
      };
    });

    const totalCost = lines.reduce(
      (sum, l) => sum + (l.current_price != null ? l.current_price * l.qty : 0),
      0,
    );
    const currentCostPerCover = (totalCost * portion) / serves;
    const baseline = Number(r.cost_baseline);
    if (baseline <= 0 || currentCostPerCover <= 0) continue;

    const driftPct = ((currentCostPerCover - baseline) / baseline) * 100;
    if (Math.abs(driftPct) < DRIFT_THRESHOLD_PCT) continue;

    const direction: 'up' | 'down' = driftPct > 0 ? 'up' : 'down';
    const weeksSinceCosted = Math.floor(
      (Date.now() - new Date(r.costed_at as string).getTime()) /
        (1000 * 60 * 60 * 24 * 7),
    );

    // Pick the ingredient with the largest absolute line-cost change as
    // the "mostly X" attribution. Without historical recipe_ingredients
    // we approximate by the highest-cost matched line — it's the line
    // most exposed to any movement.
    const sortedByImpact = lines
      .filter((l) => l.current_price != null)
      .sort((a, b) => (b.current_price! * b.qty) - (a.current_price! * a.qty));
    const driver = sortedByImpact[0];

    const headlinePre = '';
    const headlineEm = r.name as string;
    const headlinePost =
      direction === 'up' ? ' is drifting.' : ' has eased off.';

    const bodyMd =
      direction === 'up'
        ? `**Bank costs up ${driftPct.toFixed(1)}% since last priced ${weeksSinceCosted} weeks ago.** ` +
          (driver ? `Mostly ${driver.name.toLowerCase()}. ` : '') +
          `Margin is no longer where you set it — worth a re-price or a check on what's moving.`
        : `**Bank costs down ${Math.abs(driftPct).toFixed(1)}% since last priced ${weeksSinceCosted} weeks ago.** ` +
          (driver ? `Mostly ${driver.name.toLowerCase()}. ` : '') +
          `Margin's better than your last costing reflects.`;

    const { error: upsertErr } = await supabase
      .from('forward_signals')
      .upsert(
        {
          site_id: r.site_id as string,
          target_surface: 'recipes',
          tag: direction === 'up' ? 'worth_knowing' : 'worth_knowing',
          severity: direction === 'up' ? 'attention' : 'healthy',
          section_label: `${r.name as string} · Cost Drift`,
          headline_pre: headlinePre,
          headline_em: headlineEm,
          headline_post: headlinePost,
          body_md: bodyMd,
          action_label: 'Re-price the dish →',
          action_target: null,
          action_context: `last priced ${weeksSinceCosted} weeks ago`,
          detector_kind: 'recipe_staleness',
          detector_key: r.id as string,
          payload: {
            recipe_id: r.id,
            recipe_name: r.name,
            baseline,
            current: currentCostPerCover,
            drift_pct: driftPct,
            direction,
            weeks_since_costed: weeksSinceCosted,
            driver_ingredient: driver?.name ?? null,
          },
          display_priority: Math.min(Math.round(Math.abs(driftPct)), 30),
          emitted_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        { onConflict: 'site_id,detector_kind,detector_key' },
      );
    if (!upsertErr) emitted += 1;
  }

  return NextResponse.json({
    ok: true,
    recipes_inspected: inspected,
    signals_emitted: emitted,
  });
}
