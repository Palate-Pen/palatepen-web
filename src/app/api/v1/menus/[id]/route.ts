import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const { id } = await ctx.params;
  const m = (r.data.menus || []).find((x: any) => x.id === id);
  if (!m) return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
  // Resolve recipe IDs into the dish records so consumers get one shot
  const dishes = (m.recipeIds || []).map((rid: string) => {
    const recipe = (r.data.recipes || []).find((x: any) => x.id === rid);
    if (!recipe) return null;
    let costing: any = null;
    if (recipe.linkedCostingId) costing = (r.data.gp_history || []).find((h: any) => h.id === recipe.linkedCostingId);
    if (!costing) costing = (r.data.gp_history || []).find((h: any) => (h.name || '').toLowerCase().trim() === (recipe.title || '').toLowerCase().trim());
    return {
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      description: recipe.imported?.description || '',
      photoUrl: recipe.photoUrl || null,
      sell: costing?.sell ?? null,
      cost: costing?.cost ?? null,
      pct: costing?.pct ?? null,
      allergens: recipe.allergens || { contains: [], mayContain: [], nutTypes: [], glutenTypes: [] },
    };
  }).filter(Boolean);
  return NextResponse.json({
    id: m.id,
    name: m.name,
    description: m.description || '',
    design: m.design || {},
    published: !!m.published,
    publicSlug: m.publicSlug || null,
    publicUrl: m.publicSlug ? `https://app.palateandpen.co.uk/m/${m.publicSlug}` : null,
    salesData: m.salesData || {},
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    dishes,
  });
}
