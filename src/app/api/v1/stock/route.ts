import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const stock = (r.data.stock_items || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    unit: s.unit,
    currentQty: s.currentQty,
    parLevel: s.parLevel,
    minLevel: s.minLevel,
    unitPrice: s.unitPrice,
    lastCounted: s.lastCounted,
    createdAt: s.createdAt,
  }));
  return NextResponse.json({ stock, count: stock.length });
}
