import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Cron detector: cost spikes on costed dishes.
 *
 * Sibling to detect-recipe-staleness but targeted at Margins, not
 * Recipes. Walks every recipe with sell_price + cost_baseline set,
 * computes the current Bank-derived cost-per-cover, and emits a
 * forward_signal when:
 *   - cost has risen >= SPIKE_PCT vs baseline AND
 *   - resulting GP has dropped below GP_TARGET
 *
 * The 'urgent' severity fires when GP drops below the urgent band
 * (target - 7 = 65% by default); 'attention' below target itself.
 *
 * detector_kind='cost_spike_anticipation', detector_key=recipe_id.
 *
 * Voice rules: reports what's happening, never tells the chef what to
 * do beyond surfacing the dish + dominant cost driver.
 *
 * Scheduled via vercel.json at 09:00 UTC (30 min after recipe-staleness).
 */

const SPIKE_PCT = 4;
const GP_TARGET = 72;
const GP_ATTENTION_BAND = 7; // target-7 = urgent threshold

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: recipes, error: recipesErr } = await supabase
    .from('recipes')
    .select(
      'id, site_id, name, serves, portion_per_cover, sell_price, cost_baseline',
    )
    .not('cost_baseline', 'is', null)
    .not('sell_price', 'is', null)
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
    const portion =
      r.portion_per_cover == null ? null : Number(r.portion_per_cover);
    const sell = r.sell_price == null ? null : Number(r.sell_price);
    const baseline = Number(r.cost_baseline);
    if (!serves || !portion || serves <= 0 || sell == null || sell <= 0) continue;
    if (baseline <= 0) continue;

    const { data: ingredients, error: ingErr } = await supabase
      .from('recipe_ingredients')
      .select('qty, name, ingredient_id, ingredients:ingredient_id (current_price, supplier_id)')
      .eq('recipe_id', r.id);
    if (ingErr || !ingredients) continue;

    let totalCost = 0;
    const lines: { name: string; lineCost: number }[] = [];
    for (const row of ingredients) {
      const rel = row.ingredients as unknown;
      const linked = Array.isArray(rel)
        ? (rel[0] as { current_price: number | null } | undefined)
        : (rel as { current_price: number | null } | null);
      const price =
        linked?.current_price == null ? null : Number(linked.current_price);
      if (price == null) continue;
      const lineCost = price * Number(row.qty);
      totalCost += lineCost;
      lines.push({ name: row.name as string, lineCost });
    }

    const currentCost = (totalCost * portion) / serves;
    if (currentCost <= 0) continue;

    const costSpikePct = ((currentCost - baseline) / baseline) * 100;
    if (costSpikePct < SPIKE_PCT) continue;

    const currentGp = ((sell - currentCost) / sell) * 100;
    if (currentGp >= GP_TARGET) continue; // still on-target; no spike worth surfacing

    const severity =
      currentGp < GP_TARGET - GP_ATTENTION_BAND ? 'urgent' : 'attention';

    const driver = lines.sort((a, b) => b.lineCost - a.lineCost)[0];

    const headlineEm = (r.name as string).toLowerCase();
    const headlinePre = severity === 'urgent' ? 'Your ' : 'The ';
    const headlinePost =
      severity === 'urgent' ? "'s bleeding margin." : "'s drifting on you.";

    const bodyMd =
      `**Cost up ${costSpikePct.toFixed(1)}% since you priced it. GP now ${currentGp.toFixed(0)}%, target ${GP_TARGET}%.** ` +
      (driver ? `Mostly ${driver.name.toLowerCase()}. ` : '') +
      (severity === 'urgent'
        ? `Each plate is leaking money — worth a re-price or a swap.`
        : `Soft drift, not a one-off — worth keeping an eye on.`);

    const { error: upsertErr } = await supabase
      .from('forward_signals')
      .upsert(
        {
          site_id: r.site_id as string,
          target_surface: 'margins',
          tag: 'plan_for_it',
          severity,
          section_label: 'Mains', // generic; UI ignores this when not in attention-card context
          headline_pre: headlinePre,
          headline_em: headlineEm,
          headline_post: headlinePost,
          body_md: bodyMd,
          action_label: 'Sort the dish →',
          action_target: null,
          action_context: `GP target ${GP_TARGET}%`,
          detector_kind: 'cost_spike_anticipation',
          detector_key: r.id as string,
          payload: {
            recipe_id: r.id,
            recipe_name: r.name,
            baseline,
            current_cost: currentCost,
            sell_price: sell,
            gp_pct: currentGp,
            cost_spike_pct: costSpikePct,
            severity,
            driver_ingredient: driver?.name ?? null,
          },
          display_priority: Math.min(Math.round(costSpikePct * 2), 50),
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
