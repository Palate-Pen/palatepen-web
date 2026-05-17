import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { findLabelSize } from '@/lib/safety/pdf/label-sizes';
import {
  PpdsLabelDoc,
  type PpdsIngredientLine,
} from '@/lib/safety/pdf/LabelDocs';
import { parseAllergens, ALLERGENS, type AllergenKey } from '@/lib/allergens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_SHELF_LIFE_DAYS = 3;
const DEFAULT_STORAGE = 'Keep refrigerated below 5°C';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const size = findLabelSize(url.searchParams.get('size'));
  const copies = Math.min(
    Math.max(1, parseInt(url.searchParams.get('copies') ?? '1', 10) || 1),
    96,
  );
  const shelfLifeDays = Math.min(
    Math.max(1, parseInt(url.searchParams.get('shelf') ?? String(DEFAULT_SHELF_LIFE_DAYS), 10) || DEFAULT_SHELF_LIFE_DAYS),
    90,
  );
  const storageInstruction =
    url.searchParams.get('storage') ?? DEFAULT_STORAGE;
  const quantityLabel = url.searchParams.get('qty') ?? '';

  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, name, site_id, allergens')
    .eq('id', id)
    .maybeSingle();
  if (!recipe) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', recipe.site_id as string)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Pull ingredients in descending weight order (FIR 2014 requires
  // ingredients list in descending order by weight in the finished
  // product). We use qty as the proxy.
  const { data: ingRows } = await supabase
    .from('recipe_ingredients')
    .select('name, qty, allergens, ingredient_id, ingredients:ingredient_id (name, allergens)')
    .eq('recipe_id', id);

  type IngRow = {
    name: string | null;
    qty: number;
    allergens: string[] | null;
    ingredient_id: string | null;
    ingredients: { name: string; allergens: string[] | null } | null;
  };
  const ings = (ingRows ?? []) as unknown as IngRow[];

  // Sort by qty descending — proxy for weight in finished product.
  const sorted = [...ings].sort((a, b) => Number(b.qty) - Number(a.qty));

  const ingredients: PpdsIngredientLine[] = sorted.map((row) => {
    const nm = row.name ?? row.ingredients?.name ?? 'ingredient';
    const ingAllergens = [
      ...(row.allergens ?? []),
      ...((row.ingredients?.allergens as string[] | null) ?? []),
    ];
    return {
      name: nm,
      isAllergen: ingAllergens.length > 0,
    };
  });

  // "Contains:" summary line from the recipe-level allergen state
  // (chef-edited dish-level overrides what's inherited from ingredients).
  const state = parseAllergens(recipe.allergens);
  const containsAllergens = state.contains.map((k) => {
    const a = ALLERGENS.find((x) => x.key === (k as AllergenKey));
    return a?.label ?? k;
  });

  const { data: site } = await supabase
    .from('sites')
    .select('name')
    .eq('id', recipe.site_id as string)
    .maybeSingle();
  const siteName = (site?.name as string | null) ?? 'Palatable kitchen';

  // FBO line — pulled from accounts.preferences.fbo if set, else fall
  // back to site name. Caller can override in the URL.
  const fboFromQs = url.searchParams.get('fbo');
  let fboName = fboFromQs ?? siteName;
  if (!fboFromQs) {
    const { data: siteAcc } = await supabase
      .from('sites')
      .select('account_id')
      .eq('id', recipe.site_id as string)
      .maybeSingle();
    const accId = siteAcc?.account_id as string | undefined;
    if (accId) {
      const { data: acc } = await supabase
        .from('accounts')
        .select('preferences')
        .eq('id', accId)
        .maybeSingle();
      const prefs = (acc?.preferences ?? null) as Record<string, unknown> | null;
      const fbo = prefs && typeof prefs.fbo === 'string' ? prefs.fbo : null;
      if (fbo) fboName = fbo;
    }
  }

  const useBy = new Date(Date.now() + shelfLifeDays * 24 * 60 * 60 * 1000);
  const useByLabel = dateFmt.format(useBy);

  const buffer = await renderToBuffer(
    <PpdsLabelDoc
      size={size}
      copies={copies}
      data={{
        siteName,
        fboName,
        recipeName: recipe.name as string,
        ingredients,
        containsAllergens,
        useByLabel,
        storageInstruction,
        quantityLabel,
      }}
    />,
  );

  const slug = (recipe.name as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${slug || 'recipe'}-ppds-label-${size.id}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
