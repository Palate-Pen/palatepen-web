import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { url, userToken } = await req.json();

    // Verify user is Pro tier
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: 'Bearer ' + userToken } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    if (user.user_metadata?.tier !== 'pro') {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
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
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: 'Extract recipe from this text. Return ONLY JSON: {"title":"","description":"","servings":"","prepTime":"","cookTime":"","ingredients":[],"method":[],"chefNotes":"","category":"Main"}. If no recipe: {"error":"No recipe found"}\n\n' + text }],
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