import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { findLabelSize } from '@/lib/safety/pdf/label-sizes';
import { PrepLabelDoc } from '@/lib/safety/pdf/LabelDocs';
import { parseAllergens } from '@/lib/allergens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_SHELF_LIFE_DAYS = 3;
const DEFAULT_STORAGE = 'Chill below 5°C';

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
  const storageHint =
    url.searchParams.get('storage') ?? DEFAULT_STORAGE;

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

  const { data: site } = await supabase
    .from('sites')
    .select('name')
    .eq('id', recipe.site_id as string)
    .maybeSingle();
  const siteName = (site?.name as string | null) ?? 'Palatable kitchen';

  const preparedBy =
    (user.email ?? 'team').split('@')[0].replace(/[._-]+/g, ' ').slice(0, 24);

  const buffer = await renderToBuffer(
    <PrepLabelDoc
      size={size}
      copies={copies}
      data={{
        siteName,
        recipeName: recipe.name as string,
        preparedAt: new Date(),
        shelfLifeDays,
        allergens: parseAllergens(recipe.allergens),
        preparedBy,
        storageHint,
      }}
    />,
  );

  const slug = (recipe.name as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${slug || 'recipe'}-prep-label-${size.id}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
