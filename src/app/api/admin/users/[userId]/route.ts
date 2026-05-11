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

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== 'object' || !body.profile) {
    return NextResponse.json({ error: 'profile required' }, { status: 400 });
  }
  const supabase = svc();
  const { data, error } = await supabase
    .from('user_data')
    .update({ profile: body.profile, updated_at: new Date().toISOString() })
    .eq('user_id', params.userId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}

export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = svc();
  const { error } = await supabase
    .from('user_data')
    .delete()
    .eq('user_id', params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
