import { NextRequest, NextResponse } from 'next/server';
import { svc } from '@/lib/admin';
import { extractInboxToken } from '@/lib/inboundToken';
import { getGlobalFeatureFlags, isFeatureEnabled } from '@/lib/featureFlags';
import { ANTHROPIC_MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Inbound email webhook. Chefs forward supplier emails to
// `invoices+{token}@palateandpen.co.uk`. The email provider (Resend,
// Postmark, Mailgun) POSTs the parsed email here. We:
//   1. Verify the shared secret (provider auth)
//   2. Extract the token from any of the To addresses
//   3. Look up the account by token + tier-gate (Pro/Kitchen/Group)
//   4. Run every PDF/image attachment through Claude vision
//   5. Append the resulting invoice records to user_data.invoices
//
// Always returns 200 on auth-success so providers don't retry. Errors are
// logged and the failing email lands in the chef's inbox quietly without
// retry storms.

// Pulls a value from a payload object trying multiple key spellings —
// inbound providers vary on case ("to" vs "To", "attachments" vs "Attachments").
function field<T = any>(body: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (body[k] !== undefined) return body[k] as T;
  }
  return undefined;
}

// Resolve attachments to a uniform shape regardless of provider.
function normalizeAttachments(raw: any): { filename: string; contentType: string; base64: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a: any) => {
    const filename = a.filename || a.Name || a.name || 'attachment';
    const contentType = a.contentType || a.ContentType || a['content-type'] || 'application/octet-stream';
    // Resend/Postmark provide `content` as base64 string. Mailgun stores URLs.
    const base64 = typeof a.content === 'string' ? a.content
                 : typeof a.Content === 'string' ? a.Content
                 : '';
    return { filename, contentType, base64 };
  }).filter((a: any) => a.base64);
}

function isInvoiceAttachment(a: { contentType: string; filename: string }): boolean {
  const ct = (a.contentType || '').toLowerCase();
  const fn = (a.filename || '').toLowerCase();
  if (ct === 'application/pdf' || fn.endsWith('.pdf')) return true;
  if (ct.startsWith('image/')) return true;
  if (/\.(jpe?g|png|webp|heic|tiff?)$/i.test(fn)) return true;
  return false;
}

async function scanAttachment(base64: string, contentType: string): Promise<any[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
  const isPdf = contentType === 'application/pdf';
  const block = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image',    source: { type: 'base64', media_type: contentType, data: base64 } };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2500,
      messages: [{ role: 'user', content: [
        block,
        { type: 'text', text: 'Extract every food, beverage, and kitchen ingredient line from this supplier invoice. Return ONLY a JSON array with no markdown, no prose. Each item: {"name":"product name in plain English","qty":number,"unit":"kg|g|l|ml|ea|case|dozen","unitPrice":number,"totalPrice":number}. Convert pack sizes into a sensible unit (e.g. "12x500ml bottles" → unit "ml" qty 6000, OR unit "ea" qty 12 — pick the more useful one for cost tracking). Skip non-stock lines like delivery, VAT, deposit. If no ingredients are visible return [].' },
      ]}],
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const text = (data.content?.[0]?.text || '[]').replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// Pull a supplier name out of the From header: "Big Foods Ltd <orders@big.com>"
// → "Big Foods Ltd". Falls back to the email address itself.
function parseSupplier(from: string): string {
  if (!from) return 'Unknown supplier';
  const m = from.match(/^"?([^"<]+?)"?\s*<.+>$/);
  if (m) return m[1].trim();
  const at = from.indexOf('@');
  return at > 0 ? from.slice(0, at) : from;
}

export async function POST(req: NextRequest) {
  // Shared-secret auth. Provider posts with either:
  //   Authorization: Bearer <INBOUND_EMAIL_SECRET>
  //   or ?secret=<INBOUND_EMAIL_SECRET> (fallback for providers without header support)
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    const qsSecret = new URL(req.url).searchParams.get('secret');
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (bearer !== secret && qsSecret !== secret) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
  }

  // Feature-flag gate: when emailForwarding is disabled platform-wide we
  // still accept the POST (200) so the provider doesn't retry, but skip the
  // expensive Anthropic vision pass + DB write.
  const flags = await getGlobalFeatureFlags();
  if (!isFeatureEnabled('emailForwarding', flags)) {
    return NextResponse.json({ ok: true, skipped: 'feature-disabled' });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  // Find any To address that contains a +token suffix. Providers send `to` as
  // string, array of strings, or array of objects — try them all.
  const toCandidates: string[] = [];
  const toRaw = field<any>(body, 'to', 'To', 'recipient', 'ToFull');
  if (typeof toRaw === 'string') toCandidates.push(toRaw);
  else if (Array.isArray(toRaw)) {
    for (const t of toRaw) {
      if (typeof t === 'string') toCandidates.push(t);
      else if (t && (t.email || t.Email)) toCandidates.push(t.email || t.Email);
    }
  }
  let token: string | null = null;
  for (const t of toCandidates) {
    token = extractInboxToken(t);
    if (token) break;
  }
  if (!token) {
    console.warn('[inbound-email] no token in To addresses', toCandidates);
    return NextResponse.json({ ok: true, skipped: 'no-token' });
  }

  // Look up account by inbox token. Fetch up to 2 rows so we can detect a
  // theoretical token collision — if two user_data rows ever carry the same
  // invoiceInboxToken we'd be guessing which one to write to, so we bail
  // safely rather than risk routing an invoice to the wrong account.
  const supabase = svc();
  const { data: rows } = await supabase
    .from('user_data')
    .select('user_id, account_id, profile, invoices')
    .contains('profile', { invoiceInboxToken: token })
    .limit(2);
  if (!rows || rows.length === 0) {
    console.warn('[inbound-email] no account for token', token);
    return NextResponse.json({ ok: true, skipped: 'no-account' });
  }
  if (rows.length > 1) {
    console.error('[inbound-email] token collision — refusing to route', { token, rowCount: rows.length });
    return NextResponse.json({ ok: true, skipped: 'token-collision' });
  }
  const row = rows[0] as any;

  const { data: account } = await supabase
    .from('accounts')
    .select('id, tier, owner_user_id')
    .eq('id', row.account_id)
    .single();
  if (!account || !['pro', 'kitchen', 'group'].includes(account.tier)) {
    console.warn('[inbound-email] tier ineligible', { token, tier: account?.tier });
    return NextResponse.json({ ok: true, skipped: 'tier-ineligible' });
  }
  // Sanity guard: the user_data row's account_id must match the account row
  // we just loaded. They're loaded by the same id so this is true by
  // construction today, but the assertion guards against future refactors
  // that change how rows are looked up.
  if (account.id !== row.account_id) {
    console.error('[inbound-email] account_id mismatch — refusing to write', { token, rowAccount: row.account_id, resolvedAccount: account.id });
    return NextResponse.json({ ok: true, skipped: 'account-mismatch' });
  }

  const from = field<string>(body, 'from', 'From') || '';
  const subject = field<string>(body, 'subject', 'Subject') || 'Invoice';
  const supplier = parseSupplier(from);
  const attachments = normalizeAttachments(field<any>(body, 'attachments', 'Attachments'));
  const invoiceAttachments = attachments.filter(isInvoiceAttachment);

  if (invoiceAttachments.length === 0) {
    console.warn('[inbound-email] no invoice attachments', { from, subject });
    return NextResponse.json({ ok: true, skipped: 'no-attachments' });
  }

  // Process each attachment in parallel
  const results = await Promise.all(invoiceAttachments.map(async att => {
    const items = await scanAttachment(att.base64, att.contentType);
    return { att, items };
  }));

  const now = Date.now();
  const newInvoices = results.map((r, i) => {
    const total = r.items.reduce((a: number, it: any) => a + (parseFloat(it.totalPrice) || 0), 0);
    return {
      id: `inb-${now}-${i}`,
      supplier,
      filename: r.att.filename,
      receivedAt: now,
      createdAt: now,
      source: 'email',
      subject,
      from,
      items: r.items,
      total,
      addedBy: row.user_id || account.owner_user_id || null,
    };
  });

  const merged = [...newInvoices, ...((row.invoices || []) as any[])].slice(0, 500);
  const { error: upErr } = await supabase
    .from('user_data')
    .update({ invoices: merged })
    .eq('account_id', row.account_id);
  if (upErr) {
    console.error('[inbound-email] save failed', upErr.message);
    return NextResponse.json({ ok: false, error: 'save-failed' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    invoicesCreated: newInvoices.length,
    itemsExtracted: newInvoices.reduce((a, n) => a + n.items.length, 0),
  });
}

// GET — quick health check so providers can verify the endpoint is reachable
export async function GET() {
  return NextResponse.json({ ok: true, service: 'palatable-inbound-email', version: '1' });
}
