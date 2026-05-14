import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  ANTHROPIC_MODEL,
  ANTHROPIC_VERSION,
  ANTHROPIC_MAX_TOKENS,
} from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Port of the legacy /api/palatable/import-recipe endpoint. Accepts
 * { url } in JSON body, fetches the page, extracts schema.org Recipe
 * JSON-LD when present (more accurate than free-text), then asks
 * Anthropic (Haiku 4.5 via the central helper) to project the source
 * into a typed JSON payload the RecipeForm can pre-fill from.
 *
 * Returns the extracted shape — the caller pre-fills the form, the
 * chef edits as needed, then hits Save through the normal createRecipe
 * action. The endpoint does NOT insert anything itself.
 *
 * URL-only path for v1. File-upload + pasted-text variants can land
 * later if Sonnet's URL fetch isn't enough.
 */

const SCHEMA_PROMPT = `Extract the recipe from the source below. Return ONE JSON object with this exact shape and nothing else (no prose before or after, no markdown fences):

{
  "title": "the dish name",
  "description": "a 1-2 sentence overview, or empty string",
  "servings": "e.g. \\"4\\" or \\"6 portions\\", or empty string",
  "prep_time": "e.g. \\"20 min\\", or empty string",
  "cook_time": "e.g. \\"45 min\\", or empty string",
  "ingredients": [
    { "name": "ingredient name without quantity", "qty": 200, "unit": "g" }
  ],
  "method": ["one step per array entry, in order, each a complete instruction"],
  "chef_notes": "any tips or variations the author included, or empty string",
  "menu_section": "one of: starters, mains, grill, sides, desserts, drinks, or null if unclear"
}

For each ingredient, split qty and unit when possible (e.g. "200g flour" → {name: "flour", qty: 200, unit: "g"}). If a quantity can't be parsed, set qty: 0 and unit: "each".

If the source has no recipe, return exactly: {"error":"No recipe found at that URL"}`;

type ExtractedRecipe = {
  title?: string;
  description?: string;
  servings?: string;
  prep_time?: string;
  cook_time?: string;
  ingredients?: Array<{ name?: string; qty?: number; unit?: string }>;
  method?: string[];
  chef_notes?: string;
  menu_section?: string;
  error?: string;
};

type ScrapedSource =
  | { kind: 'json-ld'; data: unknown; pageText: string }
  | { kind: 'page-text'; pageText: string };

function findRecipeJsonLd(html: string): unknown | null {
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const found = walkForRecipe(parsed);
      if (found) return found;
    } catch {
      continue;
    }
  }
  return null;
}

function walkForRecipe(node: unknown): unknown {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = walkForRecipe(item);
      if (r) return r;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const t = obj['@type'];
  const isRecipe =
    (typeof t === 'string' && t.toLowerCase() === 'recipe') ||
    (Array.isArray(t) &&
      t.some(
        (x) => typeof x === 'string' && x.toLowerCase() === 'recipe',
      ));
  if (isRecipe) return obj;
  const graph = obj['@graph'];
  if (Array.isArray(graph)) return walkForRecipe(graph);
  return null;
}

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

async function scrapeUrl(url: string): Promise<ScrapedSource | { error: string; status: number }> {
  let pageRes: Response;
  try {
    pageRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    });
  } catch (e) {
    return {
      error: `Could not reach that URL: ${(e as Error).message ?? 'network error'}`,
      status: 400,
    };
  }
  if (!pageRes.ok) {
    return {
      error: `Could not load that page (HTTP ${pageRes.status})`,
      status: 400,
    };
  }
  const html = await pageRes.text();
  const jsonLd = findRecipeJsonLd(html);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/gi, (m) =>
      (
        {
          '&nbsp;': ' ',
          '&amp;': '&',
          '&quot;': '"',
          '&#39;': "'",
          '&lt;': '<',
          '&gt;': '>',
        } as Record<string, string>
      )[m.toLowerCase()] ?? m,
    )
    .replace(/\s+/g, ' ')
    .slice(0, 14000);

  if (jsonLd) return { kind: 'json-ld', data: jsonLd, pageText: text };
  return { kind: 'page-text', pageText: text };
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const url = (body.url ?? '').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: 'invalid_url', detail: 'Provide a full http(s) URL.' },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'missing_anthropic_key' },
      { status: 500 },
    );
  }

  const scraped = await scrapeUrl(url);
  if ('error' in scraped) {
    return NextResponse.json(
      { error: 'scrape_failed', detail: scraped.error },
      { status: scraped.status },
    );
  }

  const sourceBlock =
    scraped.kind === 'json-ld'
      ? `Structured recipe data (schema.org JSON-LD):\n${JSON.stringify(scraped.data).slice(0, 20000)}\n\nFor reference, page text excerpt:\n${scraped.pageText.slice(0, 4000)}`
      : `Page text:\n${scraped.pageText}`;

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
      messages: [
        {
          role: 'user',
          content: SCHEMA_PROMPT + '\n\nSource:\n' + sourceBlock,
        },
      ],
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    console.error('[import-recipe] anthropic error:', anthropicRes.status, detail);
    return NextResponse.json(
      { error: 'extraction_failed', status: anthropicRes.status, detail },
      { status: 502 },
    );
  }

  const data = (await anthropicRes.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
  };
  const rawText = data.content?.[0]?.text ?? '';
  const jsonStr = extractFirstJson(rawText);
  if (!jsonStr) {
    return NextResponse.json(
      {
        error: 'parse_failed',
        detail: rawText.slice(0, 400),
      },
      { status: 502 },
    );
  }
  let parsed: ExtractedRecipe;
  try {
    parsed = JSON.parse(jsonStr) as ExtractedRecipe;
  } catch (e) {
    return NextResponse.json(
      { error: 'malformed_json', detail: (e as Error).message },
      { status: 502 },
    );
  }
  if (parsed.error) {
    return NextResponse.json(
      { error: 'no_recipe_found', detail: parsed.error },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    extracted: parsed,
    source_kind: scraped.kind,
  });
}
