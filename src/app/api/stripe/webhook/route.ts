import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

const TIER_MAP: Record<string, string> = {
  pro_monthly: 'pro',
  pro_yearly: 'pro',
  kitchen_monthly: 'kitchen',
  kitchen_yearly: 'kitchen',
  group_monthly: 'group',
  group_yearly: 'group',
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    return NextResponse.json({ error: 'Webhook error: ' + e.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const priceKey = session.metadata?.price_key;
    const tier = TIER_MAP[priceKey || ''] || 'pro';

    if (userId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Update user metadata in Supabase auth
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { tier, stripe_customer: session.customer, stripe_subscription: session.subscription },
      });

      // Also update profile in user_data table
      const { data } = await supabase.from('user_data').select('profile').eq('user_id', userId).single();
      if (data) {
        const profile = typeof data.profile === 'string' ? JSON.parse(data.profile) : data.profile;
        await supabase.from('user_data').update({ profile: { ...profile, tier } }).eq('user_id', userId);
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find user by stripe customer ID and downgrade to free
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.user_metadata?.stripe_customer === customerId);
    if (user) {
      await supabase.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, tier: 'free' } });
      const { data } = await supabase.from('user_data').select('profile').eq('user_id', user.id).single();
      if (data) {
        const profile = typeof data.profile === 'string' ? JSON.parse(data.profile) : data.profile;
        await supabase.from('user_data').update({ profile: { ...profile, tier: 'free' } }).eq('user_id', user.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}