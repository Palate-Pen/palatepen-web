import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const { id } = await ctx.params;
  const recipe = (r.data.recipes || []).find((x: any) => x.id === id);
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  // Attach the linked costing inline so consumers don't have to make a second call
  let costing: any = null;
  if (recipe.linkedCostingId) {
    costing = (r.data.gp_history || []).find((h: any) => h.id === recipe.linkedCostingId) || null;
  }
  if (!costing) {
    costing = (r.data.gp_history || []).find((h: any) => (h.name || '').toLowerCase().trim() === (recipe.title || '').toLowerCase().trim()) || null;
  }
  return NextResponse.json({
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    notes: recipe.notes || '',
    photoUrl: recipe.photoUrl || null,
    locked: !!recipe.locked,
    linkedCostingId: recipe.linkedCostingId || null,
    createdAt: recipe.createdAt || null,
    description: recipe.imported?.description || '',
    servings: recipe.imported?.servings || '',
    prepTime: recipe.imported?.prepTime || '',
    cookTime: recipe.imported?.cookTime || '',
    ingredients: recipe.imported?.ingredients || [],
    method: recipe.imported?.method || [],
    allergens: recipe.allergens || { contains: [], mayContain: [], nutTypes: [], glutenTypes: [] },
    costing: costing ? {
      id: costing.id,
      sell: costing.sell,
      cost: costing.cost,
      gp: costing.gp,
      pct: costing.pct,
      target: costing.target,
      portions: costing.portions,
      currency: costing.currency,
      ingredients: costing.ingredients || [],
      savedAt: costing.savedAt,
    } : null,
  });
}
