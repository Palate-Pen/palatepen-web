import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Cron detector: cross-supplier market moves.
 *
 * For each site, finds ingredients sold by 2+ suppliers and checks
 * whether 2+ supplier rows for the same ingredient moved in the same
 * direction by >= MOVE_THRESHOLD_PCT inside the last LOOKBACK_DAYS.
 * Emits one forward_signal per (site, ingredient_name) match with
 * tag='market_move', target_surface='stock-suppliers'.
 *
 * Scheduled via vercel.json. Vercel cron requests carry
 * Authorization: Bearer <CRON_SECRET>; the route rejects anything else.
 */

const LOOKBACK_DAYS = 14;
const MOVE_THRESHOLD_PCT = 4;

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const since = new Date(
    Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: sites, error: sitesErr } = await supabase
    .from('sites')
    .select('id');
  if (sitesErr) {
    return NextResponse.json(
      { error: 'sites_fetch_failed', detail: sitesErr.message },
      { status: 500 },
    );
  }

  let emitted = 0;
  let inspected = 0;
  const sitesInspected: string[] = [];

  for (const site of sites ?? []) {
    const siteId = site.id as string;
    sitesInspected.push(siteId);

    const { data: ingredients, error: ingErr } = await supabase
      .from('ingredients')
      .select('id, name, supplier_id, current_price')
      .eq('site_id', siteId);
    if (ingErr || !ingredients) continue;

    const byName = new Map<string, typeof ingredients>();
    for (const ing of ingredients) {
      const key = (ing.name as string).toLowerCase();
      const arr = byName.get(key) ?? [];
      arr.push(ing);
      byName.set(key, arr);
    }

    for (const [nameKey, supplierRows] of byName) {
      if (supplierRows.length < 2) continue;

      const ingredientIds = supplierRows.map((r) => r.id as string);
      const { data: history, error: histErr } = await supabase
        .from('ingredient_price_history')
        .select('ingredient_id, price, recorded_at')
        .in('ingredient_id', ingredientIds)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });
      if (histErr || !history) continue;

      const movements = supplierRows.map((row) => {
        const pts = history.filter((h) => h.ingredient_id === row.id);
        if (pts.length < 2) {
          return { row, movement: 0, valid: false };
        }
        const first = Number(pts[0].price);
        const last = Number(pts[pts.length - 1].price);
        if (first <= 0) return { row, movement: 0, valid: false };
        return {
          row,
          movement: ((last - first) / first) * 100,
          valid: true,
        };
      });

      const validUp = movements.filter(
        (m) => m.valid && m.movement >= MOVE_THRESHOLD_PCT,
      );
      const validDown = movements.filter(
        (m) => m.valid && m.movement <= -MOVE_THRESHOLD_PCT,
      );

      inspected += 1;

      let direction: 'up' | 'down' | null = null;
      let matching: typeof movements = [];
      if (validUp.length >= 2) {
        direction = 'up';
        matching = validUp;
      } else if (validDown.length >= 2) {
        direction = 'down';
        matching = validDown;
      } else {
        continue;
      }

      const supplierIdsForLookup = matching
        .map((m) => m.row.supplier_id as string | null)
        .filter((s): s is string => !!s);
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .in('id', supplierIdsForLookup);
      const supplierNameById = new Map(
        (suppliers ?? []).map((s) => [s.id as string, s.name as string]),
      );

      const namedMatches = matching.map((m) => ({
        supplier: supplierNameById.get(m.row.supplier_id as string) ?? '—',
        casual: casualSupplier(
          supplierNameById.get(m.row.supplier_id as string) ?? '—',
        ),
        movement: m.movement,
      }));

      const displayName =
        (supplierRows[0].name as string).charAt(0).toUpperCase() +
        (supplierRows[0].name as string).slice(1);

      const detectorKey = nameKey;
      const headlinePre = '';
      const headlineEm = displayName;
      const headlinePost =
        direction === 'up'
          ? ' moving up at both suppliers.'
          : ' easing off across the market.';

      const bodyClauses = namedMatches
        .map(
          (m) =>
            `${m.casual} ${direction === 'up' ? 'up' : 'down'} ${Math.abs(m.movement).toFixed(0)}%`,
        )
        .join(', ');

      const bodyMd =
        direction === 'up'
          ? `**${bodyClauses} — both inside the last ${LOOKBACK_DAYS} days.** When two suppliers move the same direction at the same time, it's the market, not the supplier. Worth stocking what you'll need before it ticks again.`
          : `**${bodyClauses} — both inside the last ${LOOKBACK_DAYS} days.** Quality and price both moving in your favour. Good moment to lean into dishes using this ingredient.`;

      const sectionLabel = `${displayName} · Cross-Supplier`;
      const actionContext = `${matching.length} suppliers moving in step`;

      const { error: upsertErr } = await supabase
        .from('forward_signals')
        .upsert(
          {
            site_id: siteId,
            target_surface: 'stock-suppliers',
            tag: 'market_move',
            severity: direction === 'up' ? 'attention' : 'healthy',
            section_label: sectionLabel,
            headline_pre: headlinePre,
            headline_em: headlineEm,
            headline_post: headlinePost,
            body_md: bodyMd,
            action_label: 'See affected dishes →',
            action_target: null,
            action_context: actionContext,
            detector_kind: 'market_move_pattern',
            detector_key: detectorKey,
            payload: {
              ingredient_name: displayName,
              direction,
              matches: namedMatches,
              lookback_days: LOOKBACK_DAYS,
            },
            display_priority: Math.round(
              Math.abs(
                matching.reduce((s, m) => s + m.movement, 0) / matching.length,
              ),
            ),
            emitted_at: new Date().toISOString(),
            expires_at: new Date(
              Date.now() + 14 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
          { onConflict: 'site_id,detector_kind,detector_key' },
        );
      if (!upsertErr) emitted += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    sites_inspected: sitesInspected.length,
    ingredient_groups_inspected: inspected,
    signals_emitted: emitted,
  });
}

function casualSupplier(name: string): string {
  const tokens = name.split(/\s+/);
  if (tokens.length === 1) return tokens[0];
  if (tokens[0].toLowerCase() === 'mediterranean') return name;
  return tokens[0];
}
