import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { reseedHelloDemoOnSupabase } from '@/lib/seed/demo-reseed';

/**
 * Daily cron — re-anchors every is_demo account so the demo data stays
 * relative to "today". Without this, the carefully-shaped 30-day
 * dataset drifts (probe failures land on increasingly-old dates, the
 * "today" missing opening check slides into yesterday, etc.) and the
 * customer-facing demo feels stale.
 *
 * Same Bearer auth contract as the other crons. Scheduled at 08:45 UTC
 * via vercel.json — sits between drain-events (08:15) and
 * detect-recipe-staleness (08:30) so the re-anchored timestamps are
 * already in place when the detectors run later in the same window.
 */

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

  const svc = createSupabaseServiceClient();
  const result = await reseedHelloDemoOnSupabase(svc);

  if (!result.ok) {
    // 200 with ok:false so Vercel doesn't mark the cron as failing on
    // empty-anchor / no-demo-accounts cases (which are valid states,
    // not errors).
    return NextResponse.json(result);
  }

  return NextResponse.json({
    ok: true,
    accounts: result.accounts.map((a) => ({
      account_name: a.account_name,
      delta_days: a.delta_days,
      sites: a.site_count,
      signals: a.signals_generated,
    })),
    timestamp: result.timestamp,
  });
}
