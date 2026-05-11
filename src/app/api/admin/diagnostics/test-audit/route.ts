import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAuthorized, audit } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1. Count before
  const { count: before } = await supabase.from('admin_audit_log').select('*', { count: 'exact', head: true });

  // 2. Direct insert WITH select+single
  const directResult = await supabase
    .from('admin_audit_log')
    .insert({ action: 'diag_direct', target_user_id: null, details: { ts: Date.now() }, ip: null, user_agent: 'diag' })
    .select()
    .single();

  // 3. Direct insert WITHOUT select (the old pattern)
  const fireForgetResult = await supabase
    .from('admin_audit_log')
    .insert({ action: 'diag_minimal', target_user_id: null, details: { ts: Date.now() }, ip: null, user_agent: 'diag' });

  // 4. Call the audit() helper
  await audit(req, supabase, 'diag_helper', null, { ts: Date.now() });

  // 5. Count after (small delay for any async commit)
  await new Promise(r => setTimeout(r, 500));
  const { count: after } = await supabase.from('admin_audit_log').select('*', { count: 'exact', head: true });

  // 6. Last 5 rows
  const { data: latest } = await supabase
    .from('admin_audit_log')
    .select('id, action, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    countBefore: before,
    countAfter: after,
    delta: (after ?? 0) - (before ?? 0),
    direct: { id: directResult.data?.id, error: directResult.error?.message },
    fireForget: { error: fireForgetResult.error?.message, status: fireForgetResult.status },
    latest,
  });
}
