import { NextResponse } from 'next/server';
import { isAuthorized, audit, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — current platform settings (feature flags + announcement)
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = svc();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value, updated_at')
    .eq('id', 'global')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    settings: data?.value || {},
    updatedAt: data?.updated_at || null,
  });
}

// PATCH — merge updates into the global settings row
export async function PATCH(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });

  const supabase = svc();
  // Fetch current then merge — this gives us a single round-trip update with
  // the new full value, easier to reason about than a Postgres JSONB merge.
  const { data: existing } = await supabase
    .from('app_settings')
    .select('value')
    .eq('id', 'global')
    .single();
  const merged = deepMerge(existing?.value || {}, body);

  const { error } = await supabase
    .from('app_settings')
    .upsert({ id: 'global', value: merged, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(req, supabase, 'platform_settings_update', null, {
    patch: body,
    merged,
  });

  return NextResponse.json({ ok: true, settings: merged });
}

// Recursive shallow merge — used for { featureFlags: { ... } } style patches
function deepMerge(a: any, b: any): any {
  if (!a || typeof a !== 'object') return b;
  if (!b || typeof b !== 'object') return b;
  if (Array.isArray(b)) return b; // arrays replace, don't merge
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') {
      out[k] = deepMerge(a[k], b[k]);
    } else {
      out[k] = b[k];
    }
  }
  return out;
}
