import { NextResponse } from 'next/server';
import { isAuthorized, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// System health snapshot for the admin Overview/System sections. Returns the
// status of each external dependency we care about:
//   - DB: a trivial COUNT query, green if it responds
//   - Anthropic: env var presence (we don't ping their API to avoid spend)
//   - Stripe: env var presence + live/sandbox detection from key prefix
//   - Stripe webhook secret: env var presence
//   - Inbound email secret: env var presence
//   - Signup trigger: compares auth users vs user_data row count

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = svc();
  const result: any = {
    db: { status: 'red', detail: 'not checked' },
    anthropic: { status: 'red', detail: 'ANTHROPIC_API_KEY missing' },
    stripe: { status: 'red', detail: 'STRIPE_SECRET_KEY missing', mode: 'unknown' },
    stripeWebhook: { status: 'red', detail: 'STRIPE_WEBHOOK_SECRET missing' },
    inboundEmail: { status: 'red', detail: 'INBOUND_EMAIL_SECRET missing' },
    signupTrigger: { status: 'red', detail: 'not checked', authUsers: 0, dataRows: 0, drift: 0 },
  };

  // DB
  try {
    const { count, error } = await supabase.from('user_data').select('*', { count: 'exact', head: true });
    if (error) result.db = { status: 'red', detail: error.message };
    else result.db = { status: 'green', detail: `responding · ${count ?? 0} rows` };
  } catch (e: any) {
    result.db = { status: 'red', detail: e?.message || 'threw' };
  }

  // Anthropic key
  if (process.env.ANTHROPIC_API_KEY) {
    result.anthropic = { status: 'green', detail: 'configured · live API calls active' };
  }

  // Stripe key — live vs sandbox detection from prefix
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  if (stripeKey.startsWith('sk_live_')) {
    result.stripe = { status: 'green', detail: 'live mode', mode: 'live' };
  } else if (stripeKey.startsWith('sk_test_')) {
    result.stripe = { status: 'amber', detail: 'sandbox mode', mode: 'sandbox' };
  }

  // Webhook secret
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    result.stripeWebhook = { status: 'green', detail: 'configured' };
  } else {
    result.stripeWebhook = { status: 'amber', detail: 'STRIPE_WEBHOOK_SECRET not set' };
  }

  // Inbound email secret
  if (process.env.INBOUND_EMAIL_SECRET) {
    result.inboundEmail = { status: 'green', detail: 'configured' };
  } else {
    result.inboundEmail = { status: 'amber', detail: 'INBOUND_EMAIL_SECRET not set' };
  }

  // Signup trigger drift — compare auth users vs user_data rows
  try {
    const { data: authList, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authCount = authList?.users?.length || 0;
    const { count: dataCount } = await supabase.from('user_data').select('*', { count: 'exact', head: true });
    const drift = Math.abs(authCount - (dataCount || 0));
    let status: 'green' | 'amber' | 'red' = 'green';
    let detail = 'in sync';
    if (drift > 0 && drift <= 5) { status = 'amber'; detail = `${drift} mismatched`; }
    if (drift > 5) { status = 'red'; detail = `${drift} mismatched — trigger may be broken`; }
    if (authErr) { status = 'amber'; detail = authErr.message; }
    result.signupTrigger = { status, detail, authUsers: authCount, dataRows: dataCount || 0, drift };
  } catch (e: any) {
    result.signupTrigger = { status: 'amber', detail: e?.message || 'check failed', authUsers: 0, dataRows: 0, drift: 0 };
  }

  return NextResponse.json(result);
}
