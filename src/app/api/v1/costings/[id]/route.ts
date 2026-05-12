import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const { id } = await ctx.params;
  const c = (r.data.gp_history || []).find((x: any) => x.id === id);
  if (!c) return NextResponse.json({ error: 'Costing not found' }, { status: 404 });
  return NextResponse.json({
    id: c.id,
    name: c.name,
    sell: c.sell,
    cost: c.cost,
    gp: c.gp,
    pct: c.pct,
    target: c.target,
    portions: c.portions,
    currency: c.currency,
    ingredients: c.ingredients || [],
    savedAt: c.savedAt,
  });
}
