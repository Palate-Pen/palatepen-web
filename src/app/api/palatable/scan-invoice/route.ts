import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { denyIfFlagOff } from '@/lib/featureFlags';
import { ANTHROPIC_MODEL } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  try {
    const flagDeny = await denyIfFlagOff('aiInvoiceScan');
    if (flagDeny) return flagDeny;

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
      return NextResponse.json({ error: 'Invoice scanning requires a paid subscription' }, { status: 403 });
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
        model: ANTHROPIC_MODEL,
        max_tokens: 2500,
        messages: [{ role: 'user', content: [
          contentBlock,
          { type: 'text', text: 'Extract every food, beverage, and kitchen ingredient line from this supplier invoice. Return ONLY a JSON array with no markdown, no prose. Each item: {"name":"product name in plain English","qty":number,"unit":"kg|g|l|ml|ea|case|dozen","unitPrice":number,"totalPrice":number}. Convert pack sizes into a sensible unit (e.g. "12x500ml bottles" → unit "ml" qty 6000, OR unit "ea" qty 12 — pick the more useful one for cost tracking). Skip non-stock lines like delivery, VAT, deposit. If no ingredients are visible return [].' }
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