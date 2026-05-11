import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAuthorized, audit } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// Creates a fake auth user, watches for the on_auth_user_created trigger
// to insert a matching user_data row, then cleans up both. Returns whether
// the trigger fired and how long it took.
export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = svc();
  const ts = Date.now();
  const testEmail = `_admin_diag_${ts}@palateandpen.invalid`;
  const testName = '_admin diagnostic (auto-deleted)';
  let userId: string | null = null;

  try {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: `t-${ts}-${Math.random().toString(36).slice(2, 12)}`,
      email_confirm: true,
      user_metadata: { name: testName, tier: 'free' },
    });
    if (createErr || !created.user) {
      return NextResponse.json({
        ok: false,
        stage: 'create_user',
        error: createErr?.message || 'createUser returned no user',
      }, { status: 500 });
    }
    userId = created.user.id;

    const start = Date.now();
    let row: any = null;
    while (Date.now() - start < 3000) {
      const { data } = await supabase
        .from('user_data')
        .select('user_id, profile, created_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) { row = data; break; }
      await new Promise(r => setTimeout(r, 150));
    }
    const elapsedMs = Date.now() - start;
    const profile = typeof row?.profile === 'string' ? JSON.parse(row.profile) : (row?.profile ?? null);

    await audit(req, supabase, 'test_signup', userId, {
      ok: !!row,
      elapsedMs,
      testEmail,
    });
    return NextResponse.json({
      ok: !!row,
      triggerFired: !!row,
      elapsedMs,
      testEmail,
      profileSeeded: profile ? {
        name: profile.name ?? null,
        email: profile.email ?? null,
        tier: profile.tier ?? null,
      } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, stage: 'unexpected', error: e?.message || String(e) }, { status: 500 });
  } finally {
    if (userId) {
      await supabase.from('user_data').delete().eq('user_id', userId);
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
    }
  }
}
