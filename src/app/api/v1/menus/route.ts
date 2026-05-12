import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const menus = (r.data.menus || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    description: m.description || '',
    recipeIds: m.recipeIds || [],
    salesData: m.salesData || {},
    published: !!m.published,
    publicSlug: m.publicSlug || null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
  return NextResponse.json({ menus, count: menus.length });
}
