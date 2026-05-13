import { NextResponse } from 'next/server';
import { isAuthorized, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Returns rolling actual-spend totals for the admin Infrastructure dashboard.
// Hits the anthropic_usage table (migration 010). Fail-graceful: if the
// table doesn't exist yet, returns zeros + a `tableMissing: true` flag so
// the UI can prompt to run the migration without crashing.

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = svc();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now - 7 * day).toISOString();
  const thirtyDaysAgo = new Date(now - 30 * day).toISOString();

  const [w, m] = await Promise.all([
    supabase.from('anthropic_usage').select('cost_pence, kind').gte('called_at', sevenDaysAgo),
    supabase.from('anthropic_usage').select('cost_pence, kind').gte('called_at', thirtyDaysAgo),
  ]);

  // Postgres "relation does not exist" → 42P01. If the migration hasn't been
  // run yet, return a sentinel so the dashboard can prompt the operator.
  if ((w.error as any)?.code === '42P01' || (m.error as any)?.code === '42P01') {
    return NextResponse.json({
      tableMissing: true,
      last7Days: { totalPence: 0, count: 0, byKind: {} },
      last30Days: { totalPence: 0, count: 0, byKind: {} },
    });
  }
  if (w.error) return NextResponse.json({ error: w.error.message }, { status: 500 });
  if (m.error) return NextResponse.json({ error: m.error.message }, { status: 500 });

  function summarise(rows: { cost_pence: number; kind: string }[]) {
    const byKind: Record<string, { count: number; pence: number }> = {};
    let totalPence = 0;
    for (const r of rows) {
      totalPence += r.cost_pence;
      const k = r.kind || 'unknown';
      const entry = byKind[k] || { count: 0, pence: 0 };
      entry.count++;
      entry.pence += r.cost_pence;
      byKind[k] = entry;
    }
    return { totalPence, count: rows.length, byKind };
  }

  return NextResponse.json({
    last7Days:  summarise(w.data || []),
    last30Days: summarise(m.data || []),
  });
}
