'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type Plan = {
  key: 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise';
  name: string;
  monthly: number | null;
  yearly: number | null;
  monthlyKey: string | null;
  yearlyKey: string | null;
  who: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  contactSales?: boolean;
  locked?: boolean;
};

const ENTERPRISE_MAILTO = 'mailto:hello@palateandpen.co.uk?subject=Enterprise%20enquiry';

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    monthly: 0,
    yearly: 0,
    monthlyKey: null,
    yearlyKey: null,
    who: 'Trying it out',
    features: ['5 recipes', 'Basic costing', '10 notebook ideas'],
    cta: 'Current plan',
    locked: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 25,
    yearly: 249,
    monthlyKey: 'pro_monthly',
    yearlyKey: 'pro_yearly',
    who: 'The working chef',
    features: ['Unlimited recipes', 'AI invoice scanning', 'Stock & par levels', 'Menu builder', 'Allergens & nutrition', 'Price alerts'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    key: 'kitchen',
    name: 'Kitchen',
    monthly: 59,
    yearly: 590,
    monthlyKey: 'kitchen_monthly',
    yearlyKey: 'kitchen_yearly',
    who: 'Small team, one site',
    features: ['Up to 5 users', 'Team permissions', 'Supplier ordering', 'Waste tracking', 'Public menus + QR'],
    cta: 'Upgrade to Kitchen',
  },
  {
    key: 'group',
    name: 'Group',
    monthly: 129,
    yearly: 1290,
    monthlyKey: 'group_monthly',
    yearlyKey: 'group_yearly',
    who: 'Multi-site operators',
    features: ['Unlimited users', 'Multiple outlets', 'Central kitchen', 'Group reporting', 'POS integration', 'Public API access'],
    cta: 'Upgrade to Group',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: null,
    yearly: null,
    monthlyKey: null,
    yearlyKey: null,
    who: 'Hotel groups, contract caterers, franchises',
    features: ['Custom integrations', 'Dedicated account manager', 'Volume pricing', 'SLA + priority support', 'Onboarding & training', 'Custom contract terms'],
    cta: 'Contact sales',
    contactSales: true,
  },
];

export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  async function upgrade(plan: Plan) {
    if (plan.locked) return;
    if (plan.contactSales) {
      window.location.href = ENTERPRISE_MAILTO;
      return;
    }
    const priceKey = billing === 'monthly' ? plan.monthlyKey : plan.yearlyKey;
    if (!priceKey) return;
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
      <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '8px', width: '100%', maxWidth: '1200px', maxHeight: '92vh', overflow: 'auto' }}>

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
            Yearly <span style={{ fontSize: '11px', color: C.gold, fontWeight: 700 }}>2 months free</span>
          </span>
        </div>

        {/* Plans — 5-col on desktop, horizontal scroll on mobile */}
        <div style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))',
          gap: '12px',
          overflowX: 'auto',
        }}>
          {PLANS.map(plan => {
            const isLoading = loading != null && (loading === plan.monthlyKey || loading === plan.yearlyKey);
            const price = plan.contactSales || plan.monthly == null ? null
              : billing === 'monthly' ? plan.monthly : plan.yearly;
            const isHighlight = !!plan.highlight;
            const isLocked = !!plan.locked;
            const isContact = !!plan.contactSales;

            return (
              <div key={plan.key} style={{
                border: isHighlight ? '1.5px solid ' + C.gold : '1px solid ' + C.border,
                background: isLocked ? C.surface2 : C.surface,
                borderRadius: '6px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                opacity: isLocked ? 0.65 : 1,
                position: 'relative',
              }}>
                {isHighlight && (
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.gold, background: C.gold + '15', border: '0.5px solid ' + C.gold + '40', padding: '3px 10px', borderRadius: '3px', display: 'inline-block', marginBottom: '12px', alignSelf: 'flex-start' }}>Most popular</div>
                )}
                {isLocked && (
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, background: C.bg, border: '0.5px solid ' + C.border, padding: '3px 10px', borderRadius: '3px', display: 'inline-block', marginBottom: '12px', alignSelf: 'flex-start' }}>Current</div>
                )}

                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: isHighlight ? C.gold : C.faint, marginBottom: '8px' }}>{plan.name}</p>

                {isContact ? (
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: C.text }}>Contact sales</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.text }}>£{price}</span>
                    {price != null && price > 0 && (
                      <span style={{ fontSize: '12px', color: C.faint }}>/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                    )}
                  </div>
                )}

                {!isContact && billing === 'yearly' && price != null && price > 0 ? (
                  <p style={{ fontSize: '11px', color: C.gold, marginBottom: '8px' }}>£{(price / 12).toFixed(2)}/mo effective</p>
                ) : !isContact && price === 0 ? (
                  <p style={{ fontSize: '11px', color: C.faint, marginBottom: '8px' }}>Forever</p>
                ) : isContact ? (
                  <p style={{ fontSize: '11px', color: C.faint, marginBottom: '8px' }}>Custom pricing</p>
                ) : (
                  <p style={{ fontSize: '11px', color: C.faint, marginBottom: '8px', height: '15px' }} />
                )}

                <p style={{ fontSize: '11px', color: C.dim, marginBottom: '14px', fontStyle: 'italic' }}>{plan.who}</p>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: C.dim, lineHeight: 1.4 }}>
                      <span style={{ color: C.gold, fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => upgrade(plan)} disabled={!!loading || isLocked}
                  style={{
                    width: '100%',
                    background: isLocked ? 'transparent' : isHighlight ? C.gold : C.surface2,
                    color: isLocked ? C.faint : isHighlight ? C.bg : C.text,
                    border: isLocked ? '1px solid ' + C.border : isHighlight ? 'none' : '1px solid ' + C.border,
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    cursor: isLocked ? 'not-allowed' : (loading ? 'wait' : 'pointer'),
                    borderRadius: '3px',
                    opacity: loading && !isLoading ? 0.6 : 1,
                  }}>
                  {isLoading ? 'Redirecting...' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid ' + C.border, textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: C.faint }}>Secure payment via Stripe. Cancel anytime. All prices include VAT. Enterprise enquiries: <a href={ENTERPRISE_MAILTO} style={{ color: C.gold, textDecoration: 'none' }}>hello@palateandpen.co.uk</a></p>
        </div>
      </div>
    </div>
  );
}
