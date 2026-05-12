import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Find the first complete JSON object in a string (handles ```json fences and prose).
function extractFirstJson(s: string): string | null {
  const cleaned = s.replace(/```json|```/g, '');
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return null;
}

// Schema-bound prompt — tuned for printed kitchen spec sheets, where we want
// the full picture in one go: recipe metadata, structured priced ingredients,
// FIR allergens with sub-types, and per-portion nutrition where shown.
const SCHEMA_PROMPT = `You are reading a kitchen dish spec sheet. Extract every field you can find. Return ONE JSON object with this exact shape and nothing else (no prose, no markdown fences):

{
  "title": "the dish name",
  "category": "Starter|Main|Dessert|Sauce|Bread|Pastry|Stock|Snack|Other",
  "portions": 4,
  "sellPrice": 14.50,
  "targetGp": 72,
  "description": "1-2 sentences if shown",
  "prepTime": "e.g. \\"20 min\\"",
  "cookTime": "e.g. \\"45 min\\"",
  "ingredients": [
    { "name": "plain flour", "qty": 200, "unit": "g", "price": 0.80 }
  ],
  "method": ["one step per array entry, in order"],
  "chefNotes": "any tips or variations on the sheet",
  "allergens": {
    "contains": ["gluten", "eggs"],
    "mayContain": ["nuts"],
    "nutTypes": ["Almond"],
    "glutenTypes": ["Wheat"]
  },
  "nutrition": {
    "kcal": 350,
    "fat": 12,
    "saturates": 4,
    "carbs": 45,
    "sugars": 8,
    "protein": 8,
    "salt": 0.4,
    "fibre": 2
  }
}

Rules:
- Ingredient "unit" must be one of: g, kg, ml, L, each, bunch, tbsp, tsp. Convert to one of these where possible (e.g. "2 cups flour" → qty 200, unit g if a weight is also given, else qty 2, unit each).
- Ingredient "price" is the per-unit cost in £ if shown on the sheet; omit the field if not shown.
- "portions" is a number (integer).
- "sellPrice" is the dish sell price in £ as a number; omit if not shown.
- "targetGp" is the GP target % as a number; omit if not shown.
- "allergens.contains" / "mayContain" values must be lowercase keys from this exact list: gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs. Use only the keys that apply.
- "allergens.nutTypes" values must come from: Almond, Hazelnut, Walnut, Cashew, Pecan, Brazil nut, Pistachio, Macadamia. Only when contains includes "nuts".
- "allergens.glutenTypes" values must come from: Wheat, Rye, Barley, Oats, Spelt, Kamut. Only when contains includes "gluten".
- "nutrition" values are per portion in grams (or kcal for energy); omit fields that aren't on the sheet.
- Omit any field that's not shown rather than guess.

If the source has no recipe/spec data, return exactly: {"error":"No spec sheet content found"}`;

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType, userToken } = await req.json();

    // Verify user is on a paid tier (pro/kitchen/group)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: 'Bearer ' + userToken } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const tier = user.user_metadata?.tier || 'free';
    if (!['pro','kitchen','group'].includes(tier)) {
      return NextResponse.json({ error: 'Spec sheet scanning requires a paid subscription' }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured' }, { status: 500 });

    if (!base64 || !mediaType) {
      return NextResponse.json({ error: 'Provide a PDF or image' }, { status: 400 });
    }
    const isPdf = mediaType === 'application/pdf';
    const isImage = mediaType.startsWith('image/');
    if (!isPdf && !isImage) {
      return NextResponse.json({ error: 'Unsupported file type — use PDF or image (JPG/PNG/WebP)' }, { status: 400 });
    }

    const messageContent = [
      isPdf
        ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
        : { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: SCHEMA_PROMPT + '\n\nSource: the attached ' + (isPdf ? 'document' : 'image') + '.' },
    ];

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    const data = await apiRes.json();
    if (!apiRes.ok || data.type === 'error') {
      const apiMsg = data.error?.message || data.message || 'unknown';
      return NextResponse.json({
        error: `Anthropic API error (HTTP ${apiRes.status}): ${apiMsg}`,
        debug: { apiStatus: apiRes.status, apiError: data.error, apiType: data.type },
      }, { status: 502 });
    }
    const rawText = data.content?.[0]?.text || '';
    const stopReason = data.stop_reason;
    const jsonStr = extractFirstJson(rawText);
    if (!jsonStr) {
      return NextResponse.json({
        error: 'AI response could not be parsed' + (stopReason && stopReason !== 'end_turn' ? ` (stop_reason: ${stopReason})` : ''),
        debug: {
          stopReason,
          rawLength: rawText.length,
          rawSnippet: rawText.slice(0, 600),
        },
      }, { status: 502 });
    }
    let parsed: any;
    try { parsed = JSON.parse(jsonStr); }
    catch (e: any) {
      return NextResponse.json({
        error: 'AI returned malformed JSON',
        debug: { jsonStr: jsonStr.slice(0, 400), parseError: e?.message },
      }, { status: 502 });
    }
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

    return NextResponse.json({
      ...parsed,
      _meta: {
        source: isPdf ? 'pdf' : 'image',
        ingredientsFound: parsed.ingredients?.length ?? 0,
        methodFound: parsed.method?.length ?? 0,
        hasCosting: typeof parsed.sellPrice === 'number' && Array.isArray(parsed.ingredients),
      },
    });
  } catch (e: any) {
    console.error('[scan-spec-sheet]', e?.message);
    return NextResponse.json({ error: 'Scan failed: ' + (e?.message || 'unknown') }, { status: 500 });
  }
}
