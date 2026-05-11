import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Extract every <script type="application/ld+json"> block from the HTML and
// return the first one that looks like a schema.org Recipe (or contains one).
function findRecipeJsonLd(html: string): any | null {
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches: string[] = [];
  let m;
  while ((m = re.exec(html)) !== null) matches.push(m[1]);

  for (const raw of matches) {
    let parsed: any;
    try { parsed = JSON.parse(raw.trim()); } catch { continue; }
    const found = walkForRecipe(parsed);
    if (found) return found;
  }
  return null;
}

function walkForRecipe(node: any): any | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) { const r = walkForRecipe(item); if (r) return r; }
    return null;
  }
  if (typeof node === 'object') {
    const t = node['@type'];
    const isRecipe = (typeof t === 'string' && t.toLowerCase() === 'recipe') ||
                     (Array.isArray(t) && t.some((x: any) => typeof x === 'string' && x.toLowerCase() === 'recipe'));
    if (isRecipe) return node;
    if (Array.isArray(node['@graph'])) {
      const r = walkForRecipe(node['@graph']);
      if (r) return r;
    }
  }
  return null;
}

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

export async function POST(req: NextRequest) {
  try {
    const { url, userToken } = await req.json();

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
      return NextResponse.json({ error: 'Recipe import requires a paid subscription' }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured' }, { status: 500 });

    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    // Fetch with a realistic UA — BBC Good Food, Delicious, etc. block "Mozilla/5.0" alone.
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!pageRes.ok) return NextResponse.json({ error: `Could not load that page (HTTP ${pageRes.status})` }, { status: 400 });

    const html = await pageRes.text();
    const jsonLd = findRecipeJsonLd(html);

    // Strip scripts/styles after JSON-LD extraction so we still have a text fallback
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/gi, m => ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' } as any)[m.toLowerCase()] || m)
      .replace(/\s+/g, ' ')
      .slice(0, 14000);

    const sourceBlock = jsonLd
      ? `Structured recipe data (schema.org JSON-LD) extracted from the page:\n${JSON.stringify(jsonLd).slice(0, 20000)}\n\nFor reference, page text excerpt:\n${text.slice(0, 4000)}`
      : `Page text:\n${text}`;

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
        messages: [{ role: 'user', content: `Extract the recipe from the source below. Return ONE JSON object with this exact shape and nothing else (no prose before or after, no markdown fences):

{
  "title": "the dish name",
  "description": "a 1-2 sentence overview, or empty string",
  "servings": "e.g. \\"4\\" or \\"6 portions\\", or empty string",
  "prepTime": "e.g. \\"20 min\\", or empty string",
  "cookTime": "e.g. \\"45 min\\", or empty string",
  "ingredients": ["one ingredient line per array entry, each including quantity and unit, e.g. \\"200g plain flour\\""],
  "method": ["one step per array entry, in order, each a complete instruction"],
  "chefNotes": "any tips or variations the author included, or empty string",
  "category": "one of: Starter, Main, Dessert, Sauce, Bread, Pastry, Stock, Snack, Other"
}

If the source has no recipe, return exactly: {"error":"No recipe found on this page"}

Source:
${sourceBlock}` }],
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
          modelUsed: data.model,
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
        source: jsonLd ? 'json-ld' : 'page-text',
        ingredientsFound: parsed.ingredients?.length ?? 0,
        methodFound: parsed.method?.length ?? 0,
      },
    });
  } catch (e: any) {
    console.error('[import-recipe]', e?.message);
    return NextResponse.json({ error: 'Import failed: ' + (e?.message || 'unknown') }, { status: 500 });
  }
}
