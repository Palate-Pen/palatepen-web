'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const PLANS = [
  {
    key: 'pro',
    name: 'Pro',
    monthly: 25,
    yearly: 249,
    monthlyKey: 'pro_monthly',
    yearlyKey: 'pro_yearly',
    features: ['Unlimited recipes', 'AI invoice scanning', 'Stock & par levels', 'Menu builder', 'Allergens & nutrition', 'Price alerts'],
  },
  {
    key: 'kitchen',
    name: 'Kitchen',
    monthly: 59,
    yearly: 590,
    monthlyKey: 'kitchen_monthly',
    yearlyKey: 'kitchen_yearly',
    features: ['Up to 5 users', 'Everything in Pro', 'Team permissions', 'Supplier ordering', 'Waste tracking'],
  },
  {
    key: 'group',
    name: 'Group',
    monthly: 129,
    yearly: 1290,
    monthlyKey: 'group_monthly',
    yearlyKey: 'group_yearly',
    features: ['Unlimited users', 'Multiple outlets', 'Central kitchen management', 'Group reporting', 'POS integration'],
  },
];

export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  async function upgrade(priceKey: string) {
    setLoading(priceKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceKey, userToken: token }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert('Something went wrong. Please try again.');
    } catch (e) {
      alert('Something went wrong. Please try again.');
    }
    setLoading(null);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
      <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '8px', width: '100%', maxWidth: '760px', maxHeight: '90vh', overflow: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: C.text, marginBottom: '4px' }}>Upgrade Palatable</h2>
            <p style={{ fontSize: '13px', color: C.faint }}>Back office work you can stomach</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Billing toggle */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: billing === 'monthly' ? C.text : C.faint }}>Monthly</span>
          <button onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            style={{ width: '44px', height: '24px', borderRadius: '12px', background: billing === 'yearly' ? C.gold : C.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: billing === 'yearly' ? '23px' : '3px', transition: 'left 0.2s' }}></div>
          </button>
          <span style={{ fontSize: '13px', color: billing === 'yearly' ? C.text : C.faint }}>
            Yearly <span style={{ fontSize: '11px', color: C.gold, fontWeight: 700 }}>Save 2 months</span>
          </span>
        </div>

        {/* Plans */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {PLANS.map(plan => {
            const priceKey = billing === 'monthly' ? plan.monthlyKey : plan.yearlyKey;
            const price = billing === 'monthly' ? plan.monthly : plan.yearly;
            const isLoading = loading === priceKey;
            return (
              <div key={plan.key} style={{ border: plan.key === 'pro' ? '1.5px solid ' + C.gold : '1px solid ' + C.border, borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                {plan.key === 'pro' && (
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.gold, background: C.gold + '15', border: '0.5px solid ' + C.gold + '40', padding: '3px 10px', borderRadius: '3px', display: 'inline-block', marginBottom: '12px', alignSelf: 'flex-start' }}>Most popular</div>
                )}
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: plan.key === 'pro' ? C.gold : C.faint, marginBottom: '8px' }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.text }}>£{price}</span>
                  <span style={{ fontSize: '12px', color: C.faint }}>/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {billing === 'yearly' && <p style={{ fontSize: '11px', color: C.gold, marginBottom: '16px' }}>£{(price / 12).toFixed(2)}/mo effective</p>}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px', marginTop: billing === 'yearly' ? 0 : '16px' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.dim }}>
                      <span style={{ color: C.gold, fontSize: '12px' }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={() => upgrade(priceKey)} disabled={!!loading}
                  style={{ width: '100%', background: plan.key === 'pro' ? C.gold : C.surface2, color: plan.key === 'pro' ? C.bg : C.text, border: plan.key === 'pro' ? 'none' : '1px solid ' + C.border, padding: '12px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', borderRadius: '3px', opacity: loading ? 0.6 : 1 }}>
                  {isLoading ? 'Redirecting...' : 'Upgrade to ' + plan.name}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid ' + C.border, textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: C.faint }}>Secure payment via Stripe. Cancel anytime. All prices include VAT.</p>
        </div>
      </div>
    </div>
  );
}