'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { useIsMobile } from '@/lib/useIsMobile';

// Interactive in-app quick-start guide. Used both as the first-login welcome
// tour (auto-triggered when profile.tutorialDismissed is falsy) and as a
// replayable reference launched from Settings.

type Chapter = {
  id: string;
  title: string;
  tagline: string;
  body: React.ReactNode;
  tip?: React.ReactNode;
  goto?: string; // tab id for the "Take me there" CTA
  cta?: string;  // CTA button label
};

function bullet(children: React.ReactNode) {
  return <li style={{ marginBottom: '6px', lineHeight: 1.6 }}>{children}</li>;
}

function buildChapters(): Chapter[] {
  return [
    {
      id: 'welcome',
      title: 'Welcome to Palatable',
      tagline: 'Back office work you can stomach',
      body: (
        <>
          <p>Palatable is your back-office toolkit. Track recipes, cost dishes, manage stock, print menus, and stay on top of allergens and GP — all in one place.</p>
          <p style={{ marginTop: '10px' }}>This 2-minute guide walks you through everything. You can jump to any chapter on the left, and re-open this from Settings any time.</p>
        </>
      ),
    },
    {
      id: 'recipes',
      title: 'Recipes',
      tagline: 'Build your library, your way',
      body: (
        <>
          <p>Three ways to add a recipe:</p>
          <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
            {bullet(<><strong>Manual</strong> — type the title and notes, fill in ingredients in the costing panel.</>)}
            {bullet(<><strong>Import URL/file</strong> — paste a cookbook URL, or upload a PDF / image. Claude reads it and extracts ingredients + method.</>)}
            {bullet(<><strong>Scan Spec Sheet</strong> — upload an existing kitchen spec sheet (PDF or photo). AI extracts the recipe AND costing in one shot.</>)}
          </ul>
          <p style={{ marginTop: '10px' }}>Each recipe carries title, category, photo, ingredients, method, allergens (with name-the-nut/cereal sub-types), nutrition and chef notes. Edit ingredients inline — changes save into the linked costing.</p>
        </>
      ),
      tip: 'Lock a recipe once it’s final — prevents accidental edits. Unlock from the header any time.',
      goto: 'recipes',
      cta: 'Open Recipes',
    },
    {
      id: 'costing',
      title: 'Costing & GP',
      tagline: 'Price every dish with confidence',
      body: (
        <>
          <p>Sell price minus ingredient cost ÷ sell × 100 = GP%. The default target is <strong>72%</strong> (change it in Settings → Defaults).</p>
          <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
            {bullet(<>Build a costing from the dedicated <strong>Costing</strong> tab or right inside a recipe.</>)}
            {bullet(<>Each ingredient: name, qty, unit (kg/g/L/ml/each), cost-per-unit. Bank autocomplete suggests existing ingredients as you type.</>)}
            {bullet(<>Live GP preview, target benchmark bar and price recommendations.</>)}
          </ul>
        </>
      ),
      tip: 'When you save a costing, every named ingredient is added to your Bank automatically — names you type populate the dropdown next time.',
      goto: 'costing',
      cta: 'Open Costing',
    },
    {
      id: 'stock',
      title: 'Stock counts',
      tagline: 'Catch variances before they cost you',
      body: (
        <>
          <p>Add stock items with par + min levels. Run a count from the Stock tab — leave blank to skip an item.</p>
          <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
            {bullet(<>The <strong>Stock Summary</strong> report shows closing value, usage value, items counted, plus category breakdowns.</>)}
            {bullet(<>Variance flags surface: high usage (above 80% of par), negative usage (gained stock — check deliveries), below par, skipped items.</>)}
            {bullet(<>Export the report as CSV with the same summary structure.</>)}
          </ul>
        </>
      ),
      tip: 'Use the Bank tab to set ingredient unit prices once — they roll up into stock value automatically.',
      goto: 'stock',
      cta: 'Open Stock',
    },
    {
      id: 'bank',
      title: 'Ingredient Bank',
      tagline: 'One source of truth for every ingredient',
      body: (
        <>
          <p>The Bank stores ingredient name, unit, current price, allergens (with FIR sub-types) and per-100g nutrition.</p>
          <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
            {bullet(<>Every ingredient you add through a recipe or costing is added to the Bank automatically — <strong>existing prices are never overwritten</strong>.</>)}
            {bullet(<>Update a Bank price and every recipe using it picks up the change.</>)}
            {bullet(<>Tag allergens at the ingredient level — recipes inherit them from the linked costing.</>)}
          </ul>
        </>
      ),
      goto: 'bank',
      cta: 'Open Bank',
    },
    {
      id: 'menus',
      title: 'Menus & Designer',
      tagline: 'Print-ready menus in minutes',
      body: (
        <>
          <p>Build a menu by picking dishes from your library. Open the Menu Designer to style it.</p>
          <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
            {bullet(<>Backgrounds: Plain, Linen, Marble, Kraft, Botanical, Script, Art Deco, Modern — or upload your own template.</>)}
            {bullet(<>1 or 2 column layouts, three font families, three dish-row styles (standard, leader dots, stacked).</>)}
            {bullet(<>Accent colour, custom logo, footer text. Header pulls from your business name and location.</>)}
            {bullet(<>Print straight to A4. Engineering reports (Stars / Plough Horse / Puzzle / Dog) on the Reports tab.</>)}
          </ul>
        </>
      ),
      goto: 'menus',
      cta: 'Open Menus',
    },
    {
      id: 'reports',
      title: 'Reports',
      tagline: 'Live snapshots, per-section export',
      body: (
        <>
          <p>One dashboard for everything: average GP, stock value, waste, price changes and menu engineering.</p>
          <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
            {bullet(<>Each section is collapsible. Click a title to expand or collapse.</>)}
            {bullet(<>Pick a date range per section (7d / 30d / 90d / All) where time matters.</>)}
            {bullet(<>Every section has its own Print and CSV Export buttons — clean A4 printout, no app chrome.</>)}
          </ul>
        </>
      ),
      goto: 'reports',
      cta: 'Open Reports',
    },
    {
      id: 'csv',
      title: 'CSV templates',
      tagline: 'Bring data in, get data out',
      body: (
        <>
          <p>In <strong>Settings</strong> you can export and import everything as CSV.</p>
          <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
            {bullet(<><strong>Export Data</strong> — download Recipes / Costings / Stock as CSVs. Opens in Excel, Sheets, Numbers.</>)}
            {bullet(<><strong>Import Data</strong> — download a template, fill it offline, upload it back. Existing data isn’t overwritten; new rows are added.</>)}
            {bullet(<>Templates share column headers with the exports, so an export is a valid template you can edit and re-import.</>)}
          </ul>
        </>
      ),
      tip: 'For costings, the Ingredients column expects format: name × qty unit @price = line, separated by " | ". Copy from an exported costings CSV to see the exact shape.',
      goto: 'settings',
      cta: 'Open Settings',
    },
    {
      id: 'tips',
      title: 'Pro tips',
      tagline: 'Small things that save big time',
      body: (
        <>
          <ul style={{ paddingLeft: '18px' }}>
            {bullet(<>Set your <strong>business name and logo</strong> in Settings — they appear across the app and on every printout.</>)}
            {bullet(<>The <strong>compliance check</strong> button on a recipe runs a UK FIR 2014 + Natasha’s Law check — pass/warn/fail per rule.</>)}
            {bullet(<>The <strong>spec sheet</strong> button prints a chef-friendly A4 with full ingredient list, allergens, nutrition and FOP traffic lights.</>)}
            {bullet(<>The recipe library has a <strong>Print Recipe Book</strong> button — title page, contents, every recipe with page numbers.</>)}
            {bullet(<>The Bank autocomplete also <strong>flags duplicates</strong> as you type in costing rows — stops you adding the same ingredient twice.</>)}
            {bullet(<>The dashboard greeting includes your business name and a quick stats row — your morning snapshot.</>)}
          </ul>
        </>
      ),
    },
    {
      id: 'done',
      title: 'You’re set',
      tagline: 'Re-open this any time',
      body: (
        <>
          <p>That’s the tour. Re-open this guide from <strong>Settings → Help &amp; Tips</strong> whenever you want a refresher.</p>
          <p style={{ marginTop: '10px' }}>Questions or feedback? Email <a href="mailto:jack@palateandpen.co.uk" style={{ color: '#C8960A' }}>jack@palateandpen.co.uk</a>.</p>
        </>
      ),
    },
  ];
}

export default function QuickStartGuide({ open, onClose, setTab, onDismissForever }: {
  open: boolean;
  onClose: () => void;
  setTab?: (t: string) => void;
  onDismissForever?: () => void;
}) {
  const { state } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const isMobile = useIsMobile();
  const [idx, setIdx] = useState(0);

  if (!open) return null;
  const chapters = buildChapters();
  const ch = chapters[idx];
  const isLast = idx === chapters.length - 1;
  const businessName = (state.profile?.businessName || '').trim();

  function goto(target: string) {
    if (setTab) setTab(target);
    onDismissForever?.();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '24px' }}>
      <div style={{
        background: C.surface, border: '1px solid ' + C.border,
        width: '100%', maxWidth: '880px',
        height: isMobile ? '100vh' : 'auto', maxHeight: isMobile ? '100vh' : '88vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: isMobile ? 0 : '6px', overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid ' + C.border, gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: '20px' }}>P</span>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.gold, marginBottom: '5px' }}></div>
            <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: C.text, fontSize: '20px', letterSpacing: '3px' }}>ALATABLE</span>
            <span style={{ fontSize: '11px', color: C.faint, marginLeft: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>· Quick Start</span>
          </div>
          <button onClick={() => { onDismissForever?.(); onClose(); }}
            title="Close (you can re-open from Settings → Help & Tips)"
            style={{ background: 'none', border: 'none', color: C.faint, fontSize: '22px', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>

        {/* Body — chapter list + content */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Chapter list */}
          <div style={{
            background: C.surface2,
            borderRight: isMobile ? 'none' : '1px solid ' + C.border,
            borderBottom: isMobile ? '1px solid ' + C.border : 'none',
            width: isMobile ? '100%' : '220px',
            flexShrink: 0,
            padding: isMobile ? '8px' : '14px',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '4px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              {chapters.map((c, i) => {
                const active = i === idx;
                const done = i < idx;
                return (
                  <button key={c.id} type="button" onClick={() => setIdx(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: isMobile ? '6px 10px' : '8px 10px',
                      background: active ? C.gold + '14' : 'transparent',
                      border: '1px solid ' + (active ? C.gold + '50' : 'transparent'),
                      color: active ? C.gold : (done ? C.dim : C.faint),
                      fontSize: '12px', fontWeight: active ? 700 : 400,
                      textAlign: 'left', cursor: 'pointer', borderRadius: '3px',
                      whiteSpace: 'nowrap',
                    }}>
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? C.gold : (done ? C.gold + '40' : C.surface),
                      color: active ? C.bg : (done ? C.gold : C.faint),
                      fontSize: '10px', fontWeight: 700, flexShrink: 0,
                    }}>{done ? '✓' : (i + 1)}</span>
                    {c.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: isMobile ? '20px 18px' : '28px 32px', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold, marginBottom: '4px' }}>
              Chapter {idx + 1} of {chapters.length}
              {idx === 0 && businessName && ` · ${businessName}`}
            </p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '4px' }}>{ch.title}</h2>
            <p style={{ fontSize: '13px', color: C.faint, fontStyle: 'italic', marginBottom: '18px' }}>{ch.tagline}</p>

            <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, flex: 1 }}>
              {ch.body}
              {ch.tip && (
                <div style={{ marginTop: '16px', padding: '12px 14px', background: C.gold + '0E', border: '1px solid ' + C.gold + '40', borderRadius: '3px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.gold, marginBottom: '4px' }}>💡 Tip</p>
                  <p style={{ fontSize: '12px', color: C.text, lineHeight: 1.55 }}>{ch.tip}</p>
                </div>
              )}
            </div>

            {/* Bottom controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid ' + C.border, gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                style={{ fontSize: '12px', color: idx === 0 ? C.faint : C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '9px 14px', cursor: idx === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: idx === 0 ? 0.5 : 1 }}>
                ← Back
              </button>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ch.goto && ch.cta && setTab && (
                  <button type="button" onClick={() => goto(ch.goto!)}
                    style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '40', padding: '9px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                    {ch.cta} →
                  </button>
                )}
                {isLast ? (
                  <button type="button" onClick={() => { onDismissForever?.(); onClose(); }}
                    style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: C.bg, background: C.gold, border: 'none', padding: '9px 18px', cursor: 'pointer', borderRadius: '2px' }}>
                    Get started
                  </button>
                ) : (
                  <button type="button" onClick={() => setIdx(i => Math.min(chapters.length - 1, i + 1))}
                    style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: C.bg, background: C.gold, border: 'none', padding: '9px 18px', cursor: 'pointer', borderRadius: '2px' }}>
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
