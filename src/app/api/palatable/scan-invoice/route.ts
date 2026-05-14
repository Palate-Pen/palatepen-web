import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  ANTHROPIC_MODEL,
  ANTHROPIC_VERSION,
  ANTHROPIC_MAX_TOKENS,
} from '@/lib/anthropic';

/**
 * Invoice scanning endpoint. Accepts a multipart/form-data POST with a
 * single `file` field (image of an invoice). Sends to Anthropic Haiku
 * with vision, parses extracted line items, inserts v2.invoices +
 * v2.invoice_lines in 'scanned' status. Returns the invoice + lines
 * so the chef can review and confirm via /api/palatable/confirm-invoice.
 *
 * Auth: requires a Supabase session cookie. The user must have
 * owner/manager/chef membership on the active site (resolved from the
 * first membership row for v1 — single-site assumption).
 *
 * Costs: fraction of a penny per call on Haiku 4.5 (~13× cheaper than
 * Sonnet 4.6 on the same payload shape). If ANTHROPIC_API_KEY is
 * missing or credits are exhausted, the call returns 4xx/5xx — no
 * silent fallback.
 */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

type ExtractedLine = {
  name: string;
  qty: number;
  unit: string;
  unit_price: number;
  line_total?: number;
  vat_rate?: number;
};

type Extracted = {
  supplier_name?: string;
  invoice_number?: string;
  issued_at?: string; // YYYY-MM-DD
  subtotal?: number;
  vat?: number;
  total?: number;
  lines: ExtractedLine[];
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
      "unit": string (e.g. "kg", "L", "each", "case"),
      "unit_price": number (in GBP, net of VAT),
      "line_total": number | null,
      "vat_rate": number | null
    }
  ]
}

Rules:
- Quantities and prices must be numbers, never strings. Strip currency symbols.
- "unit" must be a short SI/imperial unit string. Map "kilo" -> "kg", "litre" -> "L", "ea" -> "each".
- If a value is illegible or missing on the invoice, use null (or omit the line item entirely if the row is unreadable).
- Do not invent line items not present in the invoice.
- Return only the JSON object.`;

export async function POST(req: Request) {
  // 1. Auth — cookie-based Supabase session
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Find the user's site (v1 single-site assumption)
  const { data: memberships } = await supabaseUser
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) {
    return NextResponse.json({ error: 'no_membership' }, { status: 403 });
  }
  if (!['owner', 'manager', 'chef'].includes(membership.role as string)) {
    return NextResponse.json({ error: 'insufficient_role' }, { status: 403 });
  }
  const siteId = membership.site_id as string;

  // 3. Parse upload
  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'missing_file', detail: 'Expected multipart/form-data with a `file` field.' },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'unsupported_type', detail: `MIME type ${file.type} not supported. Allowed: ${[...ALLOWED_MIME].join(', ')}.` },
      { status: 415 },
    );
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'file_too_large', detail: 'Max 4MB.' },
      { status: 413 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'missing_anthropic_key' },
      { status: 500 },
    );
  }

  // 4. Encode file as base64 + call Anthropic
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mediaType = file.type;

  const contentBlocks =
    mediaType === 'application/pdf'
      ? [
          { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ]
      : [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ];

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages: [{ role: 'user', content: contentBlocks }],
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    console.error('[scan-invoice] anthropic error:', anthropicRes.status, detail);
    return NextResponse.json(
      { error: 'extraction_failed', status: anthropicRes.status, detail },
      { status: 502 },
    );
  }

  const anthropicJson = (await anthropicRes.json()) as {
    content: { type: string; text?: string }[];
  };
  const textBlock = anthropicJson.content?.find((b) => b.type === 'text');
  if (!textBlock?.text) {
    return NextResponse.json(
      { error: 'extraction_empty' },
      { status: 502 },
    );
  }

  let extracted: Extracted;
  try {
    // Some models occasionally wrap JSON in markdown fences despite the
    // prompt — strip them defensively.
    const cleaned = textBlock.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    extracted = JSON.parse(cleaned) as Extracted;
  } catch (e) {
    console.error('[scan-invoice] parse error:', e, textBlock.text);
    return NextResponse.json(
      { error: 'extraction_parse_failed', detail: textBlock.text.slice(0, 500) },
      { status: 502 },
    );
  }

  if (!Array.isArray(extracted.lines) || extracted.lines.length === 0) {
    return NextResponse.json(
      { error: 'no_lines_extracted', detail: 'Anthropic returned no line items.' },
      { status: 422 },
    );
  }

  // 5. Insert into v2 — use service-role client to bypass RLS friction
  //    on the multi-table insert (RLS still cleanly applies to chef
  //    reads of the invoice via the user-session client).
  const service = createSupabaseServiceClient();

  // Match supplier by name (case-insensitive). Null if no match — chef
  // can resolve later from the invoice detail view.
  let supplierId: string | null = null;
  if (extracted.supplier_name) {
    const { data: suppliers } = await service
      .from('suppliers')
      .select('id, name')
      .eq('site_id', siteId)
      .ilike('name', `%${extracted.supplier_name}%`)
      .limit(1);
    supplierId = (suppliers?.[0]?.id as string | undefined) ?? null;
  }

  const { data: invoiceRows, error: invoiceErr } = await service
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
      source: 'scanned',
      delivery_confirmation: 'pending',
    })
    .select('id')
    .single();
  if (invoiceErr || !invoiceRows) {
    return NextResponse.json(
      { error: 'invoice_insert_failed', detail: invoiceErr?.message },
      { status: 500 },
    );
  }
  const invoiceId = invoiceRows.id as string;

  // Match each line to a Bank ingredient by case-insensitive name.
  const { data: bankIngredients } = await service
    .from('ingredients')
    .select('id, name')
    .eq('site_id', siteId);
  const byName = new Map<string, string>(
    (bankIngredients ?? []).map((i) => [
      (i.name as string).toLowerCase().trim(),
      i.id as string,
    ]),
  );

  const lineRows = extracted.lines.map((l, i) => {
    const key = (l.name ?? '').toLowerCase().trim();
    return {
      invoice_id: invoiceId,
      ingredient_id: byName.get(key) ?? null,
      raw_name: l.name,
      qty: l.qty,
      qty_unit: l.unit,
      unit_price: l.unit_price,
      line_total: l.line_total ?? null,
      vat_rate: l.vat_rate ?? null,
      position: i + 1,
    };
  });

  const { error: linesErr } = await service.from('invoice_lines').insert(lineRows);
  if (linesErr) {
    return NextResponse.json(
      { error: 'lines_insert_failed', detail: linesErr.message, invoice_id: invoiceId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    invoice_id: invoiceId,
    extracted_lines: extracted.lines.length,
    matched_to_bank: lineRows.filter((r) => r.ingredient_id != null).length,
    supplier_matched: supplierId != null,
  });
}
