import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' as any });

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
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error('Webhook signature failed:', e.message);
    return NextResponse.json({ error: 'Webhook error: ' + e.message }, { status: 400 });
  }

  // Use service role client for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const priceKey = session.metadata?.price_key;
    const tier = TIER_MAP[priceKey || ''] || 'pro';

    console.log('Checkout completed:', { userId, priceKey, tier });

    if (userId) {
      // Update auth user metadata
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          tier,
          stripe_customer: session.customer,
          stripe_subscription: session.subscription,
        },
      });
      if (authError) console.error('Auth update error:', authError);

      // Update user_data profile
      const { data: userData, error: fetchError } = await supabase
        .from('user_data')
        .select('profile')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Fetch user_data error:', fetchError);
      } else {
        let profile = userData?.profile || {};
        if (typeof profile === 'string') {
          try { profile = JSON.parse(profile); } catch { profile = {}; }
        }
        const { error: updateError } = await supabase
          .from('user_data')
          .update({ profile: { ...profile, tier } })
          .eq('user_id', userId);
        if (updateError) console.error('Profile update error:', updateError);
        else console.log('Tier updated to', tier, 'for user', userId);
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    // Find user by stripe customer ID
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (!error && users) {
      const user = users.find(u => u.user_metadata?.stripe_customer === customerId);
      if (user) {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, tier: 'free' },
        });
        const { data: userData } = await supabase
          .from('user_data')
          .select('profile')
          .eq('user_id', user.id)
          .single();
        if (userData) {
          let profile = userData.profile || {};
          if (typeof profile === 'string') { try { profile = JSON.parse(profile); } catch { profile = {}; } }
          await supabase.from('user_data').update({ profile: { ...profile, tier: 'free' } }).eq('user_id', user.id);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
