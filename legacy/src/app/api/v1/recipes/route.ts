import { NextRequest, NextResponse } from 'next/server';
import { authenticateApi } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const r = await authenticateApi(req);
  if ('error' in r) return r.error;
  const recipes = (r.data.recipes || []).map((x: any) => ({
    id: x.id,
    title: x.title,
    category: x.category,
    notes: x.notes || '',
    photoUrl: x.photoUrl || null,
    locked: !!x.locked,
    linkedCostingId: x.linkedCostingId || null,
    createdAt: x.createdAt || null,
    description: x.imported?.description || '',
    servings: x.imported?.servings || '',
    prepTime: x.imported?.prepTime || '',
    cookTime: x.imported?.cookTime || '',
    ingredients: x.imported?.ingredients || [],
    method: x.imported?.method || [],
    allergens: x.allergens || { contains: [], mayContain: [], nutTypes: [], glutenTypes: [] },
  }));
  return NextResponse.json({ recipes, count: recipes.length });
}
