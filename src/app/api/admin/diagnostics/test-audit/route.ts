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
  const { data, error } = await supabase
    .from('admin_audit_log')
    .insert({
      action: 'diag_audit_test',
      target_user_id: null,
      details: { ts: Date.now(), note: 'one-off diagnostic insert' },
      ip: '127.0.0.1',
      user_agent: 'diagnostic',
    })
    .select()
    .single();
  return NextResponse.json({ inserted: data, error: error ? { message: error.message, code: error.code, hint: error.hint, details: error.details } : null });
}
