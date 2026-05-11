import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAuthorized } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1. Find candidate rows by SELECT
  const { data: candidates, error: selErr } = await supabase
    .from('admin_audit_log')
    .select('id, action')
    .like('action', 'diag_%');

  // 2. Try delete by like
  const likeRes = await supabase
    .from('admin_audit_log')
    .delete()
    .like('action', 'diag_%')
    .select('id');

  // 3. Try delete by id list
  const ids = (candidates || []).map((r: any) => r.id);
  let idDeleteResult: any = { skipped: true };
  if (ids.length > 0) {
    const r = await supabase
      .from('admin_audit_log')
      .delete()
      .in('id', ids)
      .select('id');
    idDeleteResult = { deleted: r.data?.length ?? 0, error: r.error?.message };
  }

  // 4. Final count
  const { data: remaining } = await supabase
    .from('admin_audit_log')
    .select('id, action')
    .like('action', 'diag_%');

  return NextResponse.json({
    foundBeforeDelete: { count: candidates?.length ?? 0, error: selErr?.message },
    likeDelete: { deleted: likeRes.data?.length ?? 0, error: likeRes.error?.message, status: likeRes.status },
    idDelete: idDeleteResult,
    remainingAfter: remaining?.length ?? 0,
  });
}
