import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!pageRes.ok) return NextResponse.json({ error: 'Could not load that page' }, { status: 400 });

    const html = await pageRes.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 12000);

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: `Extract the recipe from the following web page text. Return ONLY a valid JSON object with this exact shape (no prose, no code fences):

{
  "title": "string — the dish name",
  "description": "string — a 1-2 sentence overview, empty if not present",
  "servings": "string — e.g. \\"4\\" or \\"6 portions\\"; empty if unclear",
  "prepTime": "string — e.g. \\"20 min\\"; empty if unclear",
  "cookTime": "string — e.g. \\"45 min\\"; empty if unclear",
  "ingredients": ["array of strings, each one ingredient line with quantity and unit, e.g. \\"200g plain flour\\""],
  "method": ["array of method step strings in order, each a complete sentence or paragraph"],
  "chefNotes": "string — any tips or variations the recipe author included; empty if none",
  "category": "one of: Starter, Main, Dessert, Sauce, Bread, Pastry, Stock, Snack, Other — best fit for the dish"
}

If no recipe is present in the text, return exactly: {"error":"No recipe found on this page"}.

Page text:
${text}` }],
      }),
    });

    const data = await apiRes.json();
    const parsed = JSON.parse((data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim());
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}