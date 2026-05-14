import { NextResponse } from 'next/server';
import { isAuthorized, audit, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PROFILE = {
  name: '', location: '', currency: 'GBP', currencySymbol: '£', units: 'metric',
  gpTarget: 72, tier: 'free', stockDay: 1, stockFrequency: 'weekly',
};

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = svc();
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const userId = body?.userId;
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  const profile = { ...DEFAULT_PROFILE, name: body?.name || '', email: body?.email || '' };
  const supabase = svc();
  const { data, error } = await supabase
    .from('user_data')
    .insert({
      user_id: userId,
      recipes: [], notes: [], gp_history: [],
      ingredients_bank: [], invoices: [], price_alerts: [], stock_items: [],
      profile,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(req, supabase, 'initialize_user', userId, {
    seeded: { name: profile.name, email: profile.email, tier: profile.tier },
  });
  return NextResponse.json({ user: data });
}
