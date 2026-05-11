import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

const PRICES = {
  pro_monthly:     'price_1TVovPRczq0AZU58plLiBROd',
  pro_yearly:      'price_1TVovkRczq0AZU580KtYD0cG',
  kitchen_monthly: 'price_1TVowsRczq0AZU58hxFTIS4V',
  kitchen_yearly:  'price_1TVoxARczq0AZU588wvXSPVF',
  group_monthly:   'price_1TVoyTRczq0AZU584SuI9y9j',
  group_yearly:    'price_1TVoypRczq0AZU58AUQoPfd9',
};

export async function POST(req: NextRequest) {
  try {
    const { priceKey, userToken } = await req.json();

    const priceId = PRICES[priceKey as keyof typeof PRICES];
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    // Verify user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: 'Bearer ' + userToken } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: { user_id: user.id, price_key: priceKey },
      success_url: `https://app.palateandpen.co.uk?upgraded=true`,
      cancel_url: `https://app.palateandpen.co.uk?upgrade=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}