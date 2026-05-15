import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  ANTHROPIC_MODEL,
  ANTHROPIC_MAX_TOKENS,
} from '@/lib/anthropic';
import { cachedAnthropicCall, firstText } from '@/lib/anthropic-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Spec-sheet scanning endpoint. Chefs receive supplier spec sheets
 * (PDF or photo) listing products with pack sizes and prices. This
 * endpoint accepts the file, runs it through Haiku 4.5 vision, and
 * returns extracted lines for review. The client then bulk-creates
 * v2.ingredients rows via the existing Bank create action.
 *
 * Mirrors /api/palatable/scan-invoice in architecture — same auth,
 * same encoding pattern, same model. Different prompt + return shape
 * because spec sheets are list-of-products not list-of-line-items.
 *
 * Strategic note: this is the auto-maintained-costing wedge in action.
 * Chef gets a new sheet from a supplier, Haiku reads it, Bank populates
 * + becomes the cost-source-of-truth for every recipe that uses those
 * ingredients. No typing.
 */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

type ExtractedProduct = {
  name: string;
  unit: string;
  pack_size?: string;
  unit_price: number;
  supplier_hint?: string;
  notes?: string;
};

type Extracted = {
  supplier_name?: string;
  effective_date?: string; // YYYY-MM-DD
  products: ExtractedProduct[];
};

const EXTRACTION_PROMPT = `You are extracting products from a hospitality supplier spec sheet (a price list, product catalogue, or trade brochure). Return ONLY a single JSON object — no prose, no markdown fences. Schema:

{
  "supplier_name": string | null,
  "effective_date": string (YYYY-MM-DD) | null,
  "products": [
    {
      "name": string,
      "unit": string (e.g. "kg", "L", "bottle", "case", "each"),
      "pack_size": string | null (e.g. "12 x 75cl", "5kg sack"),
      "unit_price": number (in GBP, per UNIT, net of VAT),
      "supplier_hint": string | null,
      "notes": string | null
    }
  ]
}

Rules:
- "unit_price" must be PER UNIT — if the sheet shows "£24 / case of 12", and the unit is "case", price is 24. If the unit is "bottle", divide.
- "unit" must be a short string. Map "kilo" -> "kg", "litre" -> "L", "ea" -> "each".
- Strip currency symbols. Numbers, not strings.
- Skip rows with no clear price.
- Do not invent products not on the sheet.
- Return only the JSON object.`;

export async function POST(req: Request) {
  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: memberships } = await supabaseUser
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) {
    return NextResponse.json({ error: 'no_membership' }, { status: 403 });
  }
  if (
    !['owner', 'manager', 'chef', 'sous_chef', 'bartender', 'head_bartender'].includes(
      membership.role as string,
    )
  ) {
    return NextResponse.json({ error: 'insufficient_role' }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      {
        error: 'missing_file',
        detail: 'Expected multipart/form-data with a `file` field.',
      },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      {
        error: 'unsupported_type',
        detail: `MIME type ${file.type} not supported.`,
      },
      { status: 415 },
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'file_too_large', detail: 'Max 5MB.' },
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mediaType = file.type;

  const contentBlocks =
    mediaType === 'application/pdf'
      ? [
          {
            type: 'document',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: EXTRACTION_PROMPT },
        ]
      : [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: EXTRACTION_PROMPT },
        ];

  const { data: siteRow } = await supabaseUser
    .from('sites')
    .select('account_id')
    .eq('id', membership.site_id as string)
    .maybeSingle();
  const accountId = (siteRow?.account_id as string | undefined) ?? null;

  let extractedText: string;
  try {
    const res = await cachedAnthropicCall({
      surface: 'scan_spec_sheet',
      account_id: accountId,
      site_id: membership.site_id as string,
      user_id: user.id,
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: contentBlocks as Array<
            | { type: 'text'; text: string }
            | {
                type: 'image';
                source: { type: 'base64'; media_type: string; data: string };
              }
            | {
                type: 'document';
                source: { type: 'base64'; media_type: string; data: string };
              }
          >,
        },
      ],
    });
    extractedText = firstText(res.content);
  } catch (e) {
    console.error('[scan-spec-sheet] anthropic error:', (e as Error).message);
    return NextResponse.json(
      { error: 'extraction_failed', detail: (e as Error).message },
      { status: 502 },
    );
  }

  if (!extractedText) {
    return NextResponse.json({ error: 'extraction_empty' }, { status: 502 });
  }

  let extracted: Extracted;
  try {
    const cleaned = extractedText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    extracted = JSON.parse(cleaned) as Extracted;
  } catch (e) {
    console.error('[scan-spec-sheet] parse error:', e, extractedText);
    return NextResponse.json(
      { error: 'extraction_parse_failed', detail: extractedText.slice(0, 500) },
      { status: 502 },
    );
  }

  if (!Array.isArray(extracted.products) || extracted.products.length === 0) {
    return NextResponse.json(
      { error: 'no_products_extracted', detail: 'Anthropic returned no products.' },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    extracted,
  });
}
