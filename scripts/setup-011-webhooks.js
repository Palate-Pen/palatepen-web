/* eslint-disable no-console */
/*
 * setup-011-webhooks.js
 *
 * Two webhook handlers + supporting lib, ported from legacy v1
 * (legacy/src/app/api/stripe/webhook + legacy/src/app/api/inbound-email)
 * to v2 conventions:
 *
 *   - accounts.tier is the source of truth (no user_data mirror)
 *   - v2.accounts.inbox_token (text column, not JSONB)
 *   - INSERT real v2.invoices + v2.invoice_lines rows (not user_data JSONB)
 *   - cachedAnthropicCall for vision (auto-cached, metered)
 *   - userHasFeature() / tier-rank for email-forwarding gate
 *   - founder short-circuit on Stripe writes (CLAUDE.md contract)
 *
 * Files:
 *   supabase/migrations/20260516_v2_accounts_stripe.sql
 *   src/lib/stripe.ts
 *   src/lib/inbox-token.ts
 *   src/app/api/stripe/webhook/route.ts
 *   src/app/api/inbound-email/route.ts
 *
 * Run: node scripts/setup-011-webhooks.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function write(rel, body) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, { encoding: 'utf8' });
  console.log('wrote', out);
}

// ---------------------------------------------------------------------
// 1. Migration — Stripe columns on v2.accounts
// ---------------------------------------------------------------------
const migration = `-- v2 migration: accounts stripe columns
-- Date: 2026-05-16
--
-- Per-account Stripe subscription state. The /api/stripe/webhook handler
-- writes these on checkout.session.completed and clears on
-- customer.subscription.deleted. accounts.tier is mirrored from the
-- price_key metadata sent through the checkout session.
--
-- Founder accounts are never billed: the webhook short-circuits when
-- accounts.is_founder = true so jack@palateandpen.co.uk stays
-- enterprise even if a stray Stripe webhook arrives.

alter table v2.accounts
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists accounts_stripe_customer_unique
  on v2.accounts(stripe_customer_id)
  where stripe_customer_id is not null;

comment on column v2.accounts.stripe_customer_id is
  'cus_xxx — set on first checkout, kept across plan changes';
comment on column v2.accounts.stripe_subscription_id is
  'sub_xxx — current active subscription; cleared when cancelled';
`;

// ---------------------------------------------------------------------
// 2. src/lib/stripe.ts
// ---------------------------------------------------------------------
const stripeLib = `import Stripe from 'stripe';

/**
 * Server-side Stripe client. Used by /api/stripe/webhook to validate
 * incoming events and (eventually) by /api/stripe/create-checkout when
 * we wire the upgrade flow. STRIPE_SECRET_KEY is set per-env in Vercel.
 *
 * Lazy-initialised so a missing key during build doesn't take the whole
 * app down — only callers actually using Stripe (webhook receiver +
 * checkout creator) will error at request time.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  cached = new Stripe(key, {
    // Pin API version so price + subscription shape changes don't bite us
    // silently. Bump on a deliberate test cycle.
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
  });
  return cached;
}

/**
 * Maps the price_key Stripe sees on checkout.session.metadata back to
 * the tier the app stores. Enterprise is sales-led (contact_sales) so
 * it never reaches this map — onboarding for that tier is manual after
 * the deal closes.
 */
export const TIER_FROM_PRICE_KEY: Record<string, string> = {
  pro_monthly: 'pro',
  pro_yearly: 'pro',
  kitchen_monthly: 'kitchen',
  kitchen_yearly: 'kitchen',
  group_monthly: 'group',
  group_yearly: 'group',
};

export type SupportedTier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise';

const VALID_TIERS = new Set<SupportedTier>([
  'free',
  'pro',
  'kitchen',
  'group',
  'enterprise',
]);

export function isValidTier(value: string): value is SupportedTier {
  return VALID_TIERS.has(value as SupportedTier);
}
`;

// ---------------------------------------------------------------------
// 3. src/lib/inbox-token.ts
// ---------------------------------------------------------------------
const inboxToken = `/**
 * Pulls the inbox token out of a To address of the form
 *   invoices+{token}@palateandpen.co.uk
 *
 * Providers send the To header in three different shapes — plain
 * string, array of strings, array of {email, name} objects. The
 * inbound webhook normalises all three before calling this.
 *
 * Token rules:
 *   - alphanumeric, 8–40 characters
 *   - case-insensitive (we lowercase before comparing to DB)
 *   - the literal part before the + must be 'invoices'
 *
 * Returns null when no valid token is found so the caller can decide
 * whether to drop the email silently or 422.
 */
export function extractInboxToken(address: string): string | null {
  if (!address) return null;

  // Pull the email out of "Display Name <foo@bar>" forms.
  const angle = address.match(/<([^>]+)>/);
  const email = (angle ? angle[1] : address).trim().toLowerCase();

  const m = email.match(/^invoices\\+([a-z0-9]{8,40})@/);
  return m ? m[1] : null;
}
`;

// ---------------------------------------------------------------------
// 4. Stripe webhook route
// ---------------------------------------------------------------------
const stripeWebhook = `import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  getStripe,
  TIER_FROM_PRICE_KEY,
  isValidTier,
  type SupportedTier,
} from '@/lib/stripe';

/**
 * Stripe webhook. Listens for checkout success + subscription updates
 * and mirrors the resulting tier onto v2.accounts.
 *
 * Founder contract (per CLAUDE.md): if an account's is_founder = true
 * we never touch tier or write Stripe ids. Jack@ stays enterprise
 * regardless of stray events.
 *
 * Auth: Stripe signs every request. We construct the event with
 * STRIPE_WEBHOOK_SECRET and reject if the signature doesn't match.
 *
 * Events handled:
 *   - checkout.session.completed       upgrade — set tier + ids
 *   - customer.subscription.updated    plan change — re-mirror tier
 *   - customer.subscription.deleted    cancel — revert to free, clear sub id
 *
 * Returns 200 on any handled event so Stripe doesn't retry. Errors are
 * logged + emit a 502 so Stripe retries within its policy.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'no_signature' }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[stripe-webhook] signature failed:', msg);
    return NextResponse.json(
      { error: 'webhook_error', detail: msg },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, sub);
        break;
      }
      default:
        // Other events are interesting in audit but not actionable yet.
        // Return 200 so Stripe doesn't retry them.
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[stripe-webhook]', event.type, 'failed:', msg);
    return NextResponse.json(
      { error: 'handler_failed', detail: msg },
      { status: 502 },
    );
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------

type Svc = ReturnType<typeof createSupabaseServiceClient>;

async function handleCheckoutCompleted(
  supabase: Svc,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = (session.metadata?.user_id as string | undefined) ?? null;
  const priceKey = (session.metadata?.price_key as string | undefined) ?? null;
  const tier: SupportedTier = (priceKey && TIER_FROM_PRICE_KEY[priceKey] && isValidTier(TIER_FROM_PRICE_KEY[priceKey]))
    ? (TIER_FROM_PRICE_KEY[priceKey] as SupportedTier)
    : 'pro';

  if (!userId) {
    console.warn('[stripe-webhook] checkout.completed missing metadata.user_id');
    return;
  }

  // Resolve every account the signing user owns. In v2 the user-account
  // link is the membership table — owner-role memberships fan out to
  // the relevant accounts.
  const { data: ownedMemberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (account_id)')
    .eq('user_id', userId)
    .eq('role', 'owner');

  const accountIds = Array.from(
    new Set(
      (ownedMemberships ?? [])
        .map((m) => (m.sites as unknown as { account_id?: string } | null)?.account_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (accountIds.length === 0) {
    console.warn(
      '[stripe-webhook] no owned accounts for user',
      userId,
      '— Stripe IDs unwired; will reconcile on next event',
    );
    return;
  }

  // Founder short-circuit: never touch tier on is_founder accounts.
  const { data: candidateRows } = await supabase
    .from('accounts')
    .select('id, is_founder')
    .in('id', accountIds);
  const nonFounderIds = (candidateRows ?? [])
    .filter((r) => !r.is_founder)
    .map((r) => r.id as string);

  if (nonFounderIds.length === 0) {
    console.log(
      '[stripe-webhook] all matching accounts are founder accounts — skipping tier update',
    );
    return;
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      tier,
      stripe_customer_id: (session.customer as string | null) ?? null,
      stripe_subscription_id: (session.subscription as string | null) ?? null,
      updated_at: new Date().toISOString(),
    })
    .in('id', nonFounderIds);
  if (error) {
    throw new Error('accounts update failed: ' + error.message);
  }
  console.log(
    '[stripe-webhook] tier=' + tier,
    'mirrored to',
    nonFounderIds.length,
    'account(s)',
  );
}

async function handleSubscriptionUpdated(
  supabase: Svc,
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  // Subscription items[0].price.id can map back to a tier via metadata. We
  // also look at status — only active / trialing subs should hold a paid
  // tier; past_due is grace, but unpaid + cancelled drop to free.
  const priceKey =
    (sub.items?.data?.[0]?.price?.metadata?.price_key as string | undefined) ??
    null;

  const tier: SupportedTier =
    sub.status === 'canceled' || sub.status === 'unpaid'
      ? 'free'
      : priceKey && TIER_FROM_PRICE_KEY[priceKey]
        ? (TIER_FROM_PRICE_KEY[priceKey] as SupportedTier)
        : 'pro';

  await applyTierByCustomer(supabase, customerId, tier, sub.id);
}

async function handleSubscriptionDeleted(
  supabase: Svc,
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  await applyTierByCustomer(supabase, customerId, 'free', null);
}

async function applyTierByCustomer(
  supabase: Svc,
  customerId: string,
  tier: SupportedTier,
  subscriptionId: string | null,
): Promise<void> {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, is_founder')
    .eq('stripe_customer_id', customerId);

  const targets = (accounts ?? [])
    .filter((a) => !a.is_founder)
    .map((a) => a.id as string);

  if (targets.length === 0) {
    console.warn(
      '[stripe-webhook] no matching non-founder accounts for customer',
      customerId,
    );
    return;
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      tier,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .in('id', targets);
  if (error) {
    throw new Error('accounts update failed: ' + error.message);
  }
  console.log(
    '[stripe-webhook] tier=' + tier,
    'applied via customer lookup to',
    targets.length,
    'account(s)',
  );
}
`;

// ---------------------------------------------------------------------
// 5. Inbound email route
// ---------------------------------------------------------------------
const inboundEmail = `import { NextRequest, NextResponse } from 'next/server';
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

const EXTRACTION_PROMPT = \`You are extracting line items from a hospitality supply invoice. Return ONLY a single JSON object — no prose, no markdown fences. Schema:

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
- Return ONLY the JSON object.\`;

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
  if (/\\.(jpe?g|png|webp|heic|tiff?)$/i.test(fn)) return true;
  return false;
}

function parseSupplierName(from: string): string | null {
  if (!from) return null;
  const m = from.match(/^"?([^"<]+?)"?\\s*<.+>$/);
  if (m) return m[1].trim();
  const at = from.indexOf('@');
  return at > 0 ? from.slice(0, at) : from;
}

function safeJsonExtract(text: string): Extracted | null {
  const stripped = text.replace(/\`\`\`(?:json)?/g, '').trim();
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
          notes_md: 'From: ' + fromHeader + '\\nSubject: ' + subject,
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
          'From: ' + fromHeader + '\\nSubject: ' + subject +
          (supplierLabel ? '\\nSupplier (extracted): ' + supplierLabel : ''),
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
`;

write('supabase/migrations/20260516_v2_accounts_stripe.sql', migration);
write('src/lib/stripe.ts', stripeLib);
write('src/lib/inbox-token.ts', inboxToken);
write('src/app/api/stripe/webhook/route.ts', stripeWebhook);
write('src/app/api/inbound-email/route.ts', inboundEmail);

console.log('\nApply the migration:');
console.log('  supabase/migrations/20260516_v2_accounts_stripe.sql');
console.log('\nSet these env vars in Vercel before pointing the providers:');
console.log('  STRIPE_SECRET_KEY=sk_live_...   (or sk_test_ in sandbox)');
console.log('  STRIPE_WEBHOOK_SECRET=whsec_...');
console.log('  INBOUND_EMAIL_SECRET=<long random string>');
