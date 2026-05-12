import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const { account, data } = r;
  return NextResponse.json({
    account: {
      id: account.id,
      name: account.name || data.profile?.businessName || null,
      tier: account.tier,
    },
    business: {
      name: data.profile?.businessName || '',
      location: data.profile?.location || '',
      currency: data.profile?.currencySymbol || '£',
      gpTarget: data.profile?.gpTarget || 72,
    },
    counts: {
      recipes: (data.recipes || []).length,
      costings: (data.gp_history || []).length,
      stockItems: (data.stock_items || []).length,
      menus: (data.menus || []).length,
      bankIngredients: (data.ingredients_bank || []).length,
    },
    apiVersion: '1.0',
  });
}
