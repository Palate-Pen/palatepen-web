import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const bank = (r.data.ingredients_bank || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    unit: b.unit,
    unitPrice: b.unitPrice,
    allergens: b.allergens || { contains: [], nutTypes: [], glutenTypes: [] },
    nutrition: b.nutrition || {},
  }));
  return NextResponse.json({ bank, count: bank.length });
}
