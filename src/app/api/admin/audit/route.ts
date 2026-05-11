import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAuthorized } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get('limit') || '200', 10);
  const limit = Math.min(Math.max(limitParam || 0, 1), 500);
  const userId = url.searchParams.get('userId');
  const action = url.searchParams.get('action');

  const supabase = svc();
  let q = supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (userId) q = q.eq('target_user_id', userId);
  if (action) q = q.eq('action', action);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data || [] });
}
