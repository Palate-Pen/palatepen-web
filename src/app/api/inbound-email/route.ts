import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { extractInboxToken } from '@/lib/inbox-token';
import { cachedAnthropicCall, firstText } from '@/lib/anthropic-cache';
import { ANTHROPIC_MODEL } from '@/lib/anthropic';

/**
 * Inbound email webhook. Chefs forward supplier emails to
 *   invoices+{token}@palateandpen.co.uk
 *
 * An inbound provider (Resend / Postmark / Mailgun) parses the email
 * and POSTs JSON here. We:
 *   1. Verify the shared secret (provider auth)
 *   2. Extract the token from the To address(es)
 *   3. Look up the account by accounts.inbox_token
 *   4. Tier-gate (Pro+ for invoices.scan feature)
 *   5. Run every PDF/image attachment through Haiku 4.5 vision
 *      (cached via cachedAnthropicCall + metered to anthropic_usage)
 *   6. INSERT v2.invoices header + v2.invoice_lines rows with source='email'
 *
 * Always returns 200 on auth-success so providers don't retry. Errors
 * are logged + the email lands quietly without retry storms.
 *
 * Schema-wise this is the proper v2 replacement for the legacy
 * user_data.invoices JSONB blob path — chef's existing
 * /stock-suppliers/invoices list reads the same v2.invoices table, so
 * a forwarded email appears in the chef's invoice queue with status =
 * 'scanned' just like a manual upload would.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PRO_PLUS_TIERS = new Set(['pro', 'kitchen', 'group', 'enterprise']);

type Attachment = {
  filename: string;
  contentType: string;
  base64: string;
};

type Extracted = {
  supplier_name?: string;
  invoice_number?: string;
  issued_at?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  lines: Array<{
    name: string;
    qty: number;
    unit: string;
    unit_price: number;
    line_total?: number;
    vat_rate?: number;
  }>;
};

const EXTRACTION_PROMPT = `You are extracting line items from a hospitality supply invoice. Return ONLY a single JSON object — no prose, no markdown fences. Schema:

{
  "supplier_name": string | null,
  "invoice_number": string | null,
  "issued_at": string (YYYY-MM-DD) | null,
  "subtotal": number | null,
  "vat": number | null,
  "total": number | null,
  "lines": [
    {
      "name": string,
      "qty": number,
      "unit": string,
      "unit_price": number,
      "line_total": number | null,
      "vat_rate": number | null
    }
  ]
}

Rules:
- Quantities and prices must be numbers, never strings. Strip currency symbols.
- "unit" must be a short SI/imperial unit ("kg", "L", "each", "case").
- Skip non-stock lines (delivery, VAT, deposit).
- If a value is illegible or missing, use null (or omit the line if the row is unreadable).
- Return ONLY the JSON object.`;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function field<T = unknown>(body: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (body[k] !== undefined) return body[k] as T;
  }
  return undefined;
}

function normaliseAttachments(raw: unknown): Attachment[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>)
    .map((a): Attachment => {
      const filename =
        (a.filename as string) ||
        (a.Name as string) ||
        (a.name as string) ||
        'attachment';
      const contentType =
        (a.contentType as string) ||
        (a.ContentType as string) ||
        (a['content-type'] as string) ||
        'application/octet-stream';
      const base64 =
        typeof a.content === 'string'
          ? a.content
          : typeof a.Content === 'string'
            ? a.Content
            : '';
      return { filename, contentType, base64 };
    })
    .filter((a) => a.base64);
}

function isInvoiceAttachment(a: Attachment): boolean {
  const ct = a.contentType.toLowerCase();
  const fn = a.filename.toLowerCase();
  if (ct === 'application/pdf' || fn.endsWith('.pdf')) return true;
  if (ct.startsWith('image/')) return true;
  if (/\.(jpe?g|png|webp|heic|tiff?)$/i.test(fn)) return true;
  return false;
}

function parseSupplierName(from: string): string | null {
  if (!from) return null;
  const m = from.match(/^"?([^"<]+?)"?\s*<.+>$/);
  if (m) return m[1].trim();
  const at = from.indexOf('@');
  return at > 0 ? from.slice(0, at) : from;
}

function safeJsonExtract(text: string): Extracted | null {
  const stripped = text.replace(/```(?:json)?/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1)) as Extracted;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'palatable-inbound-email',
    version: 'v2',
  });
}

export async function POST(req: NextRequest) {
  // 1. Shared-secret auth.
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) {
    console.warn('[inbound-email] INBOUND_EMAIL_SECRET not set — refusing');
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  const qsSecret = new URL(req.url).searchParams.get('secret');
  const bearer = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (bearer !== secret && qsSecret !== secret) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  // 2. Parse body.
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  // 3. Find the token in any To address.
  const toCandidates: string[] = [];
  const toRaw = field<unknown>(body, 'to', 'To', 'recipient', 'ToFull');
  if (typeof toRaw === 'string') toCandidates.push(toRaw);
  else if (Array.isArray(toRaw)) {
    for (const t of toRaw) {
      if (typeof t === 'string') toCandidates.push(t);
      else if (t && typeof t === 'object') {
        const obj = t as Record<string, unknown>;
        const email = (obj.email as string) || (obj.Email as string);
        if (email) toCandidates.push(email);
      }
    }
  }

  let token: string | null = null;
  for (const candidate of toCandidates) {
    token = extractInboxToken(candidate);
    if (token) break;
  }
  if (!token) {
    console.warn('[inbound-email] no token in To', toCandidates);
    return NextResponse.json({ ok: true, skipped: 'no-token' });
  }

  // 4. Look up account by token.
  const supabase = createSupabaseServiceClient();
  const { data: account } = await supabase
    .from('accounts')
    .select('id, tier, inbox_token')
    .eq('inbox_token', token)
    .maybeSingle();
  if (!account) {
    console.warn('[inbound-email] no account for token', token);
    return NextResponse.json({ ok: true, skipped: 'no-account' });
  }

  // 5. Tier gate. Pro+ have email forwarding.
  const tier = String(account.tier ?? 'free').toLowerCase();
  if (!PRO_PLUS_TIERS.has(tier)) {
    console.warn(
      '[inbound-email] tier ineligible',
      { token, tier },
    );
    return NextResponse.json({ ok: true, skipped: 'tier-ineligible' });
  }

  // 6. Pick a site for this account. v1 accounts had owner_user_id; v2
  // doesn't — instead we find any site under the account_id and use it
  // for the invoice site_id. If the account owns multiple sites the
  // chef can re-attribute the invoice in the UI later.
  const { data: sites } = await supabase
    .from('sites')
    .select('id')
    .eq('account_id', account.id)
    .limit(1);
  const siteId = (sites ?? [])[0]?.id as string | undefined;
  if (!siteId) {
    console.warn(
      '[inbound-email] account has no sites; skipping',
      account.id,
    );
    return NextResponse.json({ ok: true, skipped: 'no-site' });
  }

  // 7. Pull email metadata + attachments.
  const fromHeader = String(field(body, 'from', 'From') ?? '');
  const subject = String(field(body, 'subject', 'Subject') ?? 'Invoice');
  const fromSupplier = parseSupplierName(fromHeader);
  const rawAttachments = field<unknown>(body, 'attachments', 'Attachments');
  const attachments = normaliseAttachments(rawAttachments).filter(isInvoiceAttachment);

  if (attachments.length === 0) {
    console.warn('[inbound-email] no invoice attachments', {
      from: fromHeader,
      subject,
    });
    return NextResponse.json({ ok: true, skipped: 'no-attachments' });
  }

  // 8. Per-attachment vision pass + DB write.
  let invoicesCreated = 0;
  let linesExtracted = 0;
  for (const att of attachments) {
    const isPdf = att.contentType === 'application/pdf';
    const block = isPdf
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf',
            data: att.base64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: att.contentType,
            data: att.base64,
          },
        };

    let extracted: Extracted | null = null;
    try {
      const res = await cachedAnthropicCall({
        surface: 'scan_invoice',
        account_id: account.id,
        site_id: siteId,
        user_id: null,
        model: ANTHROPIC_MODEL,
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: [block, { type: 'text', text: EXTRACTION_PROMPT }],
          },
        ],
      });
      extracted = safeJsonExtract(firstText(res.content));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[inbound-email] vision failed', msg);
    }

    if (!extracted || !Array.isArray(extracted.lines) || extracted.lines.length === 0) {
      // Insert an empty-shell invoice so the chef can see the email
      // arrived but extraction didn't yield lines. They can manually
      // type lines or re-scan.
      const { data: shell, error: shellErr } = await supabase
        .from('invoices')
        .insert({
          site_id: siteId,
          invoice_number: extracted?.invoice_number ?? null,
          issued_at: extracted?.issued_at ?? null,
          received_at: new Date().toISOString().slice(0, 10),
          subtotal: extracted?.subtotal ?? null,
          vat: extracted?.vat ?? null,
          total: extracted?.total ?? null,
          status: 'scanned',
          source: 'email',
          notes_md: 'From: ' + fromHeader + '\nSubject: ' + subject,
        })
        .select('id')
        .single();
      if (!shellErr && shell) invoicesCreated++;
      continue;
    }

    // Resolve supplier by name. We prefer the supplier_name extracted
    // from the invoice body; fall back to the From header parsed name.
    // Lookup is fuzzy: lowercase + trim. No new supplier rows are
    // created automatically — chef confirms on the invoice detail page.
    const supplierLabel =
      extracted.supplier_name?.trim() || fromSupplier || null;
    let supplierId: string | null = null;
    if (supplierLabel) {
      const { data: matchedSupplier } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('site_id', siteId)
        .ilike('name', supplierLabel)
        .limit(1)
        .maybeSingle();
      supplierId = (matchedSupplier?.id as string | undefined) ?? null;
    }

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        site_id: siteId,
        supplier_id: supplierId,
        invoice_number: extracted.invoice_number ?? null,
        issued_at: extracted.issued_at ?? null,
        received_at: new Date().toISOString().slice(0, 10),
        subtotal: extracted.subtotal ?? null,
        vat: extracted.vat ?? null,
        total: extracted.total ?? null,
        status: 'scanned',
        source: 'email',
        notes_md:
          'From: ' + fromHeader + '\nSubject: ' + subject +
          (supplierLabel ? '\nSupplier (extracted): ' + supplierLabel : ''),
      })
      .select('id')
      .single();
    if (invErr || !invoice) {
      console.error('[inbound-email] invoice insert failed', invErr?.message);
      continue;
    }

    const lineRows = extracted.lines.map((l, i) => ({
      invoice_id: invoice.id as string,
      raw_name: String(l.name ?? '').slice(0, 200),
      qty: Number(l.qty) || 0,
      qty_unit: String(l.unit ?? 'each').slice(0, 20),
      unit_price: Number(l.unit_price) || 0,
      line_total:
        l.line_total != null
          ? Number(l.line_total)
          : (Number(l.qty) || 0) * (Number(l.unit_price) || 0),
      vat_rate: l.vat_rate != null ? Number(l.vat_rate) : null,
      position: i,
    }));
    const { error: linesErr } = await supabase
      .from('invoice_lines')
      .insert(lineRows);
    if (linesErr) {
      console.error(
        '[inbound-email] invoice_lines insert failed',
        linesErr.message,
      );
      // Don't roll back the header — the chef can still see + fix it.
    }

    invoicesCreated++;
    linesExtracted += lineRows.length;
  }

  return NextResponse.json({
    ok: true,
    invoicesCreated,
    linesExtracted,
  });
}
