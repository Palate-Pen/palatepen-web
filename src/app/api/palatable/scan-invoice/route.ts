import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType, userToken } = await req.json();

    // Verify user is Pro tier using their session token
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

    if (!base64 || !mediaType) {
      return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
    }

    const contentBlock = mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: [
          contentBlock,
          { type: 'text', text: 'Extract all food ingredients from this supplier invoice. Return ONLY a JSON array with no markdown. Each item: {"name":"","qty":0,"unit":"","unitPrice":0,"totalPrice":0}. If nothing found return [].' }
        ]}],
      }),
    });

    const data = await res.json();
    const text = (data.content?.[0]?.text || '[]').replace(/```json|```/g, '').trim();
    try {
      const items = JSON.parse(text);
      return NextResponse.json({ items });
    } catch {
      return NextResponse.json({ items: [] });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}