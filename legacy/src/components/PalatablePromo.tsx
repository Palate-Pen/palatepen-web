'use client';
import { useEffect, useRef, useState } from 'react';

const SCREENS = [
  { id: 'hero', duration: 5000 },
  { id: 'recipes', label: 'Feature 01', headline: ['Your entire menu,', 'in one place.'], desc: "Build your recipe library with ingredients, method, and chef's notes — with GP % displayed right on every card.", duration: 6000 },
  { id: 'costing', label: 'Feature 02', headline: ['Know your numbers.', 'Instantly.'], desc: 'Build dish costings ingredient by ingredient. See GP %, benchmark against your target, and know exactly what to charge.', duration: 6000 },
  { id: 'invoices', label: 'Feature 03', headline: ['Scan invoices.', 'AI does the rest.'], desc: 'Upload a supplier invoice — photo or PDF. Claude reads every line, extracts prices, and alerts you to price changes.', duration: 6000 },
  { id: 'stock', label: 'Feature 04', headline: ['Stock control,', 'without the clipboard.'], desc: 'Run counts, track valuations, flag items below par, and download a full CSV report — all from your phone or laptop.', duration: 6000 },
  { id: 'end', duration: 5000 },
];

export default function PalatablePromo() {
  const [current, setCurrent] = useState(0);
  const [bars, setBars] = useState(false);
  const timerRef = useRef<any>(null);

  function goTo(n: number) {
    clearTimeout(timerRef.current);
    setCurrent(n);
    setBars(false);
    setTimeout(() => setBars(true), 100);
  }

  useEffect(() => {
    setBars(true);
    timerRef.current = setTimeout(() => {
      goTo(current < SCREENS.length - 1 ? current + 1 : 0);
    }, SCREENS[current].duration);
    return () => clearTimeout(timerRef.current);
  }, [current]);

  const gold = '#C8960A';
  const bg = '#141210';
  const surface = '#1C1A17';
  const surface2 = '#242118';
  const border = '#35302A';
  const text = '#F0E8DC';
  const dim = 'rgba(240,232,220,0.45)';
  const faint = 'rgba(240,232,220,0.3)';
  const green = '#5AAA6A';
  const red = '#C84040';
  const s = SCREENS[current];

  const MacBar = ({ label }: { label?: string }) => (
    <div style={{ background: surface2, borderBottom: `1px solid ${border}`, padding: '10px 14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: red }}></div>
      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: gold }}></div>
      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: green }}></div>
      <div style={{ flex: 1, background: surface, borderRadius: '3px', padding: '2px 10px', fontSize: '10px', color: faint, marginLeft: '8px' }}>
        app.palateandpen.co.uk{label ? ` · ${label}` : ''}
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', background: bg, borderRadius: '12px', overflow: 'hidden', position: 'relative', minHeight: '520px', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: border, zIndex: 10 }}>
        <div style={{ height: '2px', background: gold, width: bars ? '100%' : '0%', transition: bars ? `width ${SCREENS[current].duration}ms linear` : 'none' }}></div>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
        {SCREENS.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === current ? gold : 'rgba(200,150,10,0.25)', border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.3s' }}></button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px 52px' }}>

        {s.id === 'hero' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', marginBottom: '24px' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', fontSize: '64px', color: text, letterSpacing: '-3px', lineHeight: '1' }}>P</span>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: gold, marginBottom: '20px', marginLeft: '2px', marginRight: '4px' }}></div>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '64px', color: text, letterSpacing: '14px', lineHeight: '1' }}>ALATABLE</span>
            </div>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: gold, marginBottom: '20px' }}>By Palate &amp; Pen</p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '40px', lineHeight: '1.1', color: text, marginBottom: '16px' }}>
              The professional chef&apos;s<br /><em style={{ fontStyle: 'italic', color: gold }}>toolkit, reimagined.</em>
            </h2>
            <p style={{ fontSize: '14px', color: dim, letterSpacing: '1px' }}>Recipes · Costing · Invoices · Stock</p>
          </div>
        )}

        {(s.id === 'recipes' || s.id === 'costing' || s.id === 'invoices' || s.id === 'stock') && (
          <div style={{ width: '100%', maxWidth: '780px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: gold, marginBottom: '10px' }}>{s.label}</p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '36px', lineHeight: '1.1', color: text, marginBottom: '10px' }}>
              {s.headline![0]}<br /><em style={{ color: gold }}>{s.headline![1]}</em>
            </h2>
            <p style={{ fontSize: '13px', color: dim, marginBottom: '24px', maxWidth: '440px', lineHeight: '1.7' }}>{s.desc}</p>

            {s.id === 'recipes' && (
              <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
                <MacBar />
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { title: 'Pan-seared Salmon, Dill Beurre Blanc', cat: 'Main', gp: 'GP 73.9%', gpCol: green },
                    { title: 'Beef Bourguignon', cat: 'Main', gp: 'GP 63.0%', gpCol: red },
                    { title: 'Tarte Tatin with Crème Fraîche', cat: 'Dessert', gp: 'GP 80.9%', gpCol: green },
                  ].map((r, i) => (
                    <div key={i} style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '6px', padding: '14px' }}>
                      <div style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '13px', color: text, marginBottom: '8px', lineHeight: '1.4' }}>{r.title}</div>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: gold, background: 'rgba(200,150,10,0.1)', border: '0.5px solid rgba(200,150,10,0.3)', padding: '2px 6px', borderRadius: '2px', marginRight: '4px' }}>{r.cat}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: r.gpCol, background: r.gpCol + '18', border: `0.5px solid ${r.gpCol}40`, padding: '2px 6px', borderRadius: '2px' }}>{r.gp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.id === 'costing' && (
              <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
                <MacBar label="Costing" />
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: `1px solid ${border}`, borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                    {[{ l: 'Sell', v: '£18.50', c: text }, { l: 'Cost/Cover', v: '£4.83', c: text }, { l: 'GP £', v: '£13.67', c: gold }, { l: 'GP %', v: '73.9%', c: green }].map((stat, i) => (
                      <div key={i} style={{ padding: '12px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${border}` : 'none' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: faint, marginBottom: '4px' }}>{stat.l}</div>
                        <div style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '18px', color: stat.c }}>{stat.v}</div>
                      </div>
                    ))}
                  </div>
                  {[{ l: 'This dish', v: 73.9, c: green }, { l: 'Target 72%', v: 72, c: green }].map((b, i) => (
                    <div key={i} style={{ marginBottom: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: faint, marginBottom: '3px' }}>
                        <span>{b.l}</span><span style={{ color: b.c }}>{b.v.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '3px', background: surface2, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '3px', background: b.c, borderRadius: '2px', width: bars ? b.v + '%' : '0%', transition: 'width 1.2s ease 0.3s' }}></div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '12px', borderTop: `1px solid ${border}`, paddingTop: '12px' }}>
                    {[{ n: 'Salmon fillet', q: '0.18kg', p: '£15.80', l: '£2.844' }, { n: 'Unsalted butter', q: '0.08kg', p: '£6.80', l: '£0.544' }, { n: 'Double cream', q: '0.03L', p: '£2.65', l: '£0.080' }].map((ing, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontSize: '11px', padding: '7px 0', borderBottom: `1px solid ${border}` }}>
                        <span style={{ color: text }}>{ing.n}</span><span style={{ color: faint }}>{ing.q}</span><span style={{ color: faint }}>{ing.p}</span><span style={{ color: gold }}>{ing.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {s.id === 'invoices' && (
              <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
                <MacBar label="Invoices" />
                <div style={{ padding: '16px' }}>
                  {[
                    { sup: 'Brakes', badge: '2 price changes', badgeCol: red, date: '3 May 2026 · 11 items', changes: [{ n: 'Salmon fillet', from: '£14.20', to: '£15.80', pct: '+11.3%' }, { n: 'Double cream', from: '£2.40', to: '£2.65', pct: '+10.4%' }] },
                    { sup: 'Bidfood', badge: '1 price change', badgeCol: red, date: '28 Apr 2026 · 8 items', changes: [] },
                    { sup: 'Fish Society', badge: 'No changes', badgeCol: green, date: '21 Apr 2026 · 5 items', changes: [] },
                  ].map((inv, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: `1px solid ${border}` }}>
                        <span style={{ fontSize: '13px', color: text, flex: 1 }}>{inv.sup}</span>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: inv.badgeCol, background: inv.badgeCol + '12', border: `0.5px solid ${inv.badgeCol}30`, padding: '2px 7px', borderRadius: '2px' }}>{inv.badge}</span>
                        <span style={{ fontSize: '11px', color: faint }}>{inv.date}</span>
                      </div>
                      {inv.changes.map((c, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '6px 8px', background: 'rgba(200,64,64,0.04)' }}>
                          <span style={{ color: dim }}>{c.n}</span>
                          <span style={{ color: dim }}>{c.from} → <strong style={{ color: text }}>{c.to}</strong> <span style={{ color: red }}>{c.pct}</span></span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.id === 'stock' && (
              <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
                <MacBar label="Stock" />
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: faint }}>10 items · Total value</span>
                    <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '22px', color: gold }}>£389.42</span>
                  </div>
                  {[
                    { n: 'Salmon fillet', q: '4.2kg', v: '£66.36', alert: null },
                    { n: 'Beef chuck', q: '7.5kg', v: '£93.00', alert: null },
                    { n: 'Double cream', q: '1.2L', v: '£3.18', alert: 'Below par' },
                    { n: 'Saffron', q: '2g', v: '£24.00', alert: 'Below min' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `1px solid ${border}` }}>
                      <span style={{ fontSize: '13px', color: text, flex: 1 }}>{item.n}</span>
                      <span style={{ fontSize: '11px', color: faint }}>{item.q}</span>
                      <span style={{ fontSize: '13px', color: gold }}>{item.v}</span>
                      {item.alert && <span style={{ fontSize: '9px', fontWeight: 700, color: red, background: 'rgba(200,64,64,0.1)', border: '0.5px solid rgba(200,64,64,0.3)', padding: '2px 7px', borderRadius: '2px' }}>{item.alert}</span>}
                    </div>
                  ))}
                  <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                    <div style={{ background: gold, color: bg, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 16px', borderRadius: '3px' }}>Download CSV</div>
                    <div style={{ border: `1px solid ${border}`, color: faint, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 16px', borderRadius: '3px' }}>Print Report</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {s.id === 'end' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', marginBottom: '20px' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', fontSize: '80px', color: text, letterSpacing: '-4px', lineHeight: '1' }}>P</span>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: gold, marginBottom: '26px', marginLeft: '3px', marginRight: '6px' }}></div>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '80px', color: text, letterSpacing: '18px', lineHeight: '1' }}>ALATABLE</span>
            </div>
            <p style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: faint, marginBottom: '10px' }}>The professional chef&apos;s toolkit</p>
            <a href="https://app.palateandpen.co.uk" style={{ fontSize: '13px', color: gold, letterSpacing: '1px', textDecoration: 'none' }}>app.palateandpen.co.uk</a>
          </div>
        )}
      </div>
    </div>
  );
}
