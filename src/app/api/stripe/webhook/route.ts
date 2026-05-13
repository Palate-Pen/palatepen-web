import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

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

  const stripe = getStripe();

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

      // Multi-user: tier + Stripe IDs live on accounts. Mirror to every account
      // this user owns. (Personal-account aliasing means there's exactly one
      // owned account today; this works the same when a user later owns
      // several Group-tier accounts.)
      const { error: accountError } = await supabase
        .from('accounts')
        .update({
          tier,
          stripe_customer_id: session.customer as string | null,
          stripe_subscription_id: session.subscription as string | null,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_user_id', userId);
      if (accountError) console.error('Account update error:', accountError);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    // Prefer the accounts table for the lookup — it's now the source of truth
    // for billing. Fall back to user_metadata for any legacy customers we
    // haven't backfilled yet.
    const { data: byAccount } = await supabase
      .from('accounts')
      .select('id, owner_user_id')
      .eq('stripe_customer_id', customerId);

    const accountIds = (byAccount || []).map(a => a.id);
    const ownerIds = Array.from(new Set((byAccount || []).map(a => a.owner_user_id)));

    if (accountIds.length === 0) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const fallback = users?.find(u => u.user_metadata?.stripe_customer === customerId);
      if (fallback) ownerIds.push(fallback.id);
    }

    for (const ownerId of ownerIds) {
      const { data: u } = await supabase.auth.admin.getUserById(ownerId);
      if (u?.user) {
        await supabase.auth.admin.updateUserById(ownerId, {
          user_metadata: { ...u.user.user_metadata, tier: 'free' },
        });
      }
      const { data: userData } = await supabase.from('user_data').select('profile').eq('user_id', ownerId).maybeSingle();
      if (userData) {
        let profile = userData.profile || {};
        if (typeof profile === 'string') { try { profile = JSON.parse(profile); } catch { profile = {}; } }
        await supabase.from('user_data').update({ profile: { ...profile, tier: 'free' } }).eq('user_id', ownerId);
      }
    }

    if (accountIds.length > 0) {
      await supabase
        .from('accounts')
        .update({ tier: 'free', stripe_subscription_id: null, updated_at: new Date().toISOString() })
        .in('id', accountIds);
    } else {
      // Legacy fallback when no account row had the stripe_customer_id set yet
      for (const ownerId of ownerIds) {
        await supabase
          .from('accounts')
          .update({ tier: 'free', stripe_subscription_id: null, updated_at: new Date().toISOString() })
          .eq('owner_user_id', ownerId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
