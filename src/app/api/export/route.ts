import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildCsv, csvFilename } from '@/lib/csv';

/**
 * CSV export for chef/owner offline analysis. Kitchen+ tier feature
 * per the legacy spec — caller selects a dataset by query string
 * (`?dataset=recipes|bank|stock|waste|invoices`). Returns text/csv with
 * a Content-Disposition that browsers + curl honour as a download.
 *
 * The data is fetched live on each request — no caching, so the
 * downloaded file always reflects current state. All datasets are
 * scoped to the caller's primary site (first membership row).
 */

const DATASETS = new Set(['recipes', 'bank', 'stock', 'waste', 'invoices']);

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dataset = searchParams.get('dataset') ?? '';
  if (!DATASETS.has(dataset)) {
    return NextResponse.json({ error: 'invalid_dataset' }, { status: 400 });
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .limit(1);
  const siteId = memberships?.[0]?.site_id as string | undefined;
  if (!siteId) {
    return NextResponse.json({ error: 'no_membership' }, { status: 403 });
  }

  let csv: string;
  try {
    csv = await buildDataset(supabase, siteId, dataset);
  } catch (e) {
    return NextResponse.json(
      { error: 'build_failed', detail: (e as Error).message },
      { status: 500 },
    );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${csvFilename(dataset)}"`,
      'Cache-Control': 'no-store',
    },
  });
}

async function buildDataset(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  siteId: string,
  dataset: string,
): Promise<string> {
  if (dataset === 'bank') {
    const { data } = await supabase
      .from('ingredients')
      .select('name, spec, unit, category, current_price, par_level, reorder_point, current_stock, last_seen_at')
      .eq('site_id', siteId)
      .order('name', { ascending: true });
    return buildCsv(
      ['Name', 'Spec', 'Unit', 'Category', 'Current price (£)', 'Par level', 'Reorder point', 'Current stock', 'Last seen'],
      (data ?? []).map((r) => [
        r.name,
        r.spec,
        r.unit,
        r.category,
        r.current_price,
        r.par_level,
        r.reorder_point,
        r.current_stock,
        r.last_seen_at,
      ]),
    );
  }

  if (dataset === 'recipes') {
    const { data } = await supabase
      .from('recipes')
      .select('name, menu_section, dish_type, serves, portion_per_cover, sell_price, cost_baseline, costed_at, locked, tags')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .order('name', { ascending: true });
    return buildCsv(
      ['Name', 'Menu section', 'Dish type', 'Serves', 'Portion per cover', 'Sell price (£)', 'Cost baseline (£)', 'Costed at', 'Locked', 'Tags'],
      (data ?? []).map((r) => [
        r.name,
        r.menu_section,
        r.dish_type,
        r.serves,
        r.portion_per_cover,
        r.sell_price,
        r.cost_baseline,
        r.costed_at,
        r.locked ? 'yes' : 'no',
        Array.isArray(r.tags) ? (r.tags as string[]).join('; ') : '',
      ]),
    );
  }

  if (dataset === 'stock') {
    const { data } = await supabase
      .from('ingredients')
      .select('name, category, unit, current_stock, par_level, reorder_point, current_price')
      .eq('site_id', siteId)
      .not('par_level', 'is', null)
      .order('name', { ascending: true });
    return buildCsv(
      ['Ingredient', 'Category', 'Unit', 'Current stock', 'Par level', 'Reorder point', 'Unit price (£)', 'Value (£)'],
      (data ?? []).map((r) => {
        const stock = r.current_stock == null ? 0 : Number(r.current_stock);
        const price = r.current_price == null ? null : Number(r.current_price);
        const value = price != null ? +(stock * price).toFixed(2) : null;
        return [
          r.name,
          r.category,
          r.unit,
          r.current_stock,
          r.par_level,
          r.reorder_point,
          price,
          value,
        ];
      }),
    );
  }

  if (dataset === 'waste') {
    const { data } = await supabase
      .from('waste_entries')
      .select('logged_at, name, qty, qty_unit, category, value, reason_md')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .order('logged_at', { ascending: false });
    return buildCsv(
      ['Logged at', 'Ingredient', 'Qty', 'Unit', 'Category', 'Value (£)', 'Notes'],
      (data ?? []).map((r) => [
        r.logged_at,
        r.name,
        r.qty,
        r.qty_unit,
        r.category,
        r.value,
        r.reason_md,
      ]),
    );
  }

  if (dataset === 'invoices') {
    const { data } = await supabase
      .from('invoices')
      .select('issued_at, invoice_number, total, status, suppliers:supplier_id (name)')
      .eq('site_id', siteId)
      .order('issued_at', { ascending: false });
    return buildCsv(
      ['Issued at', 'Supplier', 'Invoice number', 'Total (£)', 'Status'],
      (data ?? []).map((r) => [
        r.issued_at,
        (r.suppliers as { name?: string } | null)?.name ?? '',
        r.invoice_number,
        r.total,
        r.status,
      ]),
    );
  }

  throw new Error(`unknown_dataset:${dataset}`);
}
