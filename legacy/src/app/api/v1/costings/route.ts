import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const costings = (r.data.gp_history || []).map((x: any) => ({
    id: x.id,
    name: x.name,
    sell: x.sell,
    cost: x.cost,
    gp: x.gp,
    pct: x.pct,
    target: x.target,
    portions: x.portions,
    currency: x.currency,
    ingredients: x.ingredients || [],
    savedAt: x.savedAt,
  }));
  return NextResponse.json({ costings, count: costings.length });
}
