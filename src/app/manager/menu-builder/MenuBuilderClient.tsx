'use client';

import { useMemo, useState } from 'react';

/**
 * Manager Menu Builder — ported from manager-menu-builder-mockup-v2.html.
 *
 * Static visual scaffolding for v1. Wired data lands in a later loop:
 * dish library will read v2.recipes (menu engineering classification
 * derived from cost + GP), menu document persisted to v2.menus, custom
 * template upload handled by /api/palatable/upload-menu-template.
 *
 * Interactive client state (view mode, layout, toggles, template
 * selection, filter chip, menu name, search query) is local-only for
 * now — wiring to a Supabase row is the next iteration.
 */

type ViewMode = 'chef' | 'customer';
type LayoutCols = 'single' | 'two' | 'three';
type TemplateKey = 'editorial' | 'minimal' | 'chalkboard' | 'bistro';
type Classification = 'star' | 'plowhorse' | 'puzzle' | 'dog' | 'unused';

type Dish = {
  id: string;
  name: string;
  cost: number;
  marginPct: number | null;
  classification: Classification;
};

type MenuRow = {
  dishId: string;
  desc: string;
  price: number;
  featured?: boolean;
  flagged?: boolean;
};

type MenuSection = {
  id: string;
  head: string;
  golden?: boolean;
  rows: MenuRow[];
};

const DISH_LIBRARY: Dish[] = [
  { id: 'hummus', name: 'Hummus', cost: 1.24, marginPct: 70, classification: 'star' },
  { id: 'shawarma', name: 'Lamb Shawarma', cost: 4.92, marginPct: 68, classification: 'star' },
  { id: 'baba', name: 'Baba Ghanoush', cost: 1.68, marginPct: 58, classification: 'plowhorse' },
  { id: 'saksuka', name: 'Şakşuka', cost: 1.04, marginPct: 62, classification: 'plowhorse' },
  { id: 'short-rib', name: 'Beef Short Rib', cost: 6.84, marginPct: 72, classification: 'puzzle' },
  { id: 'knafeh', name: 'Knafeh', cost: 2.18, marginPct: 76, classification: 'puzzle' },
  { id: 'halloumi', name: 'Halloumi Fries', cost: 2.4, marginPct: 42, classification: 'dog' },
  { id: 'tahini', name: 'Tahini Sauce', cost: 0.84, marginPct: null, classification: 'unused' },
  { id: 'posset', name: 'Lemon Posset', cost: 0.84, marginPct: null, classification: 'unused' },
  { id: 'chicken-skewers', name: 'Chicken Thigh Skewers', cost: 3.2, marginPct: 64, classification: 'plowhorse' },
];

const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'to-begin',
    head: 'To Begin',
    golden: true,
    rows: [
      { dishId: 'hummus', desc: 'Tahini, lemon, garlic, warm flatbread', price: 8, featured: true },
      { dishId: 'baba', desc: 'Smoked aubergine, tahini, pomegranate, mint', price: 9 },
      { dishId: 'saksuka', desc: 'Stewed aubergine and peppers, labneh, herbs', price: 9 },
    ],
  },
  {
    id: 'from-the-grill',
    head: 'From the Grill',
    rows: [
      { dishId: 'shawarma', desc: 'Slow-roasted lamb shoulder, pickles, garlic sauce', price: 18, featured: true },
      { dishId: 'short-rib', desc: 'Red wine braise, root vegetables, gremolata', price: 26, flagged: true },
      { dishId: 'chicken-skewers', desc: 'Berbere spice, charred lemon, tahini yoghurt', price: 16 },
    ],
  },
  {
    id: 'to-finish',
    head: 'To Finish',
    rows: [
      { dishId: 'knafeh', desc: 'Kataifi, mozzarella, honey, crushed pistachios', price: 9, flagged: true },
      { dishId: 'posset', desc: 'Cream, lemon, shortbread, candied peel', price: 7 },
    ],
  },
];

const TEMPLATES: Array<{ key: TemplateKey; name: string; sub: string }> = [
  { key: 'editorial', name: 'Editorial', sub: 'Palatable default' },
  { key: 'minimal', name: 'Bold Minimal', sub: 'High contrast' },
  { key: 'chalkboard', name: 'Chalkboard', sub: 'Bistro feel' },
  { key: 'bistro', name: 'Warm Bistro', sub: 'Terracotta' },
];

const FILTER_CHIPS: Array<{
  key: 'all' | Classification;
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'star', label: 'Stars' },
  { key: 'plowhorse', label: 'Plowhorses' },
  { key: 'puzzle', label: 'Puzzles' },
  { key: 'unused', label: 'Unused' },
];

export default function MenuBuilderClient() {
  const [menuName, setMenuName] = useState('Dinner Menu — May 2026');
  const [viewMode, setViewMode] = useState<ViewMode>('chef');
  const [layoutCols, setLayoutCols] = useState<LayoutCols>('single');
  const [showPrices, setShowPrices] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [sectionDividers, setSectionDividers] = useState(true);
  const [allergenIcons, setAllergenIcons] = useState(false);
  const [goldenTriangle, setGoldenTriangle] = useState(true);
  const [starPuzzleLabels, setStarPuzzleLabels] = useState(true);
  const [marginIndicators, setMarginIndicators] = useState(false);
  const [costPerCover, setCostPerCover] = useState(false);
  const [template, setTemplate] = useState<TemplateKey>('editorial');
  const [filterChip, setFilterChip] = useState<typeof FILTER_CHIPS[number]['key']>('all');
  const [search, setSearch] = useState('');

  const isCustomerView = viewMode === 'customer';
  const overlaysVisible = !isCustomerView;

  const filteredDishes = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return DISH_LIBRARY.filter((d) => {
      if (filterChip !== 'all' && d.classification !== filterChip) return false;
      if (needle && !d.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [filterChip, search]);

  return (
    <div className="bg-paper">
      {/* Top context bar */}
      <div className="print-hide bg-paper-warm border-b border-rule px-8 py-4 flex items-center justify-between gap-6 sticky top-0 z-20 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <input
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            className="font-serif font-semibold text-xl text-ink bg-transparent border-none cursor-text px-2 py-1 rounded-sm hover:bg-card focus:bg-card focus:outline-none min-w-[200px]"
          />
          <div className="font-serif italic text-sm text-muted hidden md:block">
            9 dishes · last edited 14 May 09:42
          </div>
          <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-2.5 py-1 bg-gold-bg text-gold-dark">
            Published
          </div>
        </div>

        <div className="flex justify-center order-3 md:order-2 w-full md:w-auto">
          <div className="inline-flex bg-card border border-rule rounded-sm p-[3px] gap-[2px]">
            <ViewToggleBtn
              active={viewMode === 'chef'}
              onClick={() => setViewMode('chef')}
              label="Chef View"
              icon={
                <>
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              }
            />
            <ViewToggleBtn
              active={viewMode === 'customer'}
              onClick={() => setViewMode('customer')}
              label="Customer View"
              icon={
                <>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </>
              }
            />
          </div>
        </div>

        <div className="flex gap-2.5 items-center order-2 md:order-3">
          <ActionBtn label="Preview" />
          <ActionBtn
            label="Print"
            onClick={() => window.print()}
            icon={
              <>
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
              </>
            }
          />
          <ActionBtn label="Publish updates" primary />
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_340px] min-h-[calc(100vh-130px)]">
        {/* LEFT — Dish library */}
        <aside className="hidden lg:flex flex-col bg-card border-r border-rule overflow-y-auto max-h-[calc(100vh-130px)] sticky top-[68px]">
          <div className="px-6 py-5 border-b border-rule bg-paper-warm">
            <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-1.5">
              Dish Library
            </div>
            <div className="font-serif italic text-sm text-muted">
              {DISH_LIBRARY.length} dishes · pull from Recipes
            </div>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="mx-6 mt-4 px-3.5 py-2.5 border border-rule bg-card font-sans text-sm focus:outline-none focus:border-gold"
          />

          <div className="px-6 py-3 flex flex-wrap gap-1.5">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.key}
                onClick={() => setFilterChip(chip.key)}
                className={
                  'font-display font-semibold text-[11px] tracking-[0.2em] uppercase px-2.5 py-1 border transition-colors ' +
                  (filterChip === chip.key
                    ? 'bg-ink border-ink text-paper'
                    : 'bg-transparent border-rule text-muted hover:border-gold hover:text-gold')
                }
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="py-2">
            {filteredDishes.length === 0 ? (
              <div className="px-6 py-8 font-serif italic text-sm text-muted text-center">
                No dishes match.
              </div>
            ) : (
              filteredDishes.map((d) => <DishTile key={d.id} dish={d} />)
            )}
          </div>
        </aside>

        {/* MIDDLE — Canvas */}
        <main className="bg-[#E8E2D6] py-10 px-5 md:px-10 overflow-y-auto flex flex-col items-center gap-6">
          <MenuPreview
            menuName={menuName}
            template={template}
            sections={MENU_SECTIONS}
            showPrices={showPrices}
            showDescriptions={showDescriptions}
            sectionDividers={sectionDividers}
            allergenIcons={allergenIcons}
            layoutCols={layoutCols}
            goldenTriangle={overlaysVisible && goldenTriangle}
            starPuzzleLabels={overlaysVisible && starPuzzleLabels}
            marginIndicators={overlaysVisible && marginIndicators}
            costPerCover={overlaysVisible && costPerCover}
          />
          {isCustomerView && (
            <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold-dark bg-gold-bg px-4 py-2 border border-gold/30">
              Customer view · overlays hidden
            </div>
          )}
        </main>

        {/* RIGHT — Settings panel */}
        <aside className="hidden lg:block bg-paper-warm border-l border-rule overflow-y-auto max-h-[calc(100vh-130px)] sticky top-[68px] px-6 pt-5 pb-20">
          <PanelSection title="Layout">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <LayoutBtn
                cols={1}
                active={layoutCols === 'single'}
                onClick={() => setLayoutCols('single')}
                label="Single"
              />
              <LayoutBtn
                cols={2}
                active={layoutCols === 'two'}
                onClick={() => setLayoutCols('two')}
                label="Two Col"
              />
              <LayoutBtn
                cols={3}
                active={layoutCols === 'three'}
                onClick={() => setLayoutCols('three')}
                label="Three Col"
              />
            </div>
            <ToggleRow
              label="Show prices"
              meta="£8 / £18 / £26"
              on={showPrices}
              onChange={setShowPrices}
            />
            <ToggleRow
              label="Show descriptions"
              meta="italic line under name"
              on={showDescriptions}
              onChange={setShowDescriptions}
            />
            <ToggleRow
              label="Section dividers"
              meta="gold underline"
              on={sectionDividers}
              onChange={setSectionDividers}
            />
            <ToggleRow
              label="Allergen icons"
              meta="V · VG · GF · contains nuts"
              on={allergenIcons}
              onChange={setAllergenIcons}
              isLast
            />
          </PanelSection>

          <PanelSection title="Engineering Overlays">
            <p className="font-serif italic text-[13px] text-muted mb-3 leading-relaxed">
              Internal cues to help you design. Auto-hidden in Customer View and print output.
            </p>
            <ToggleRow
              label="Golden triangle highlight"
              meta="prime real estate"
              on={goldenTriangle}
              onChange={setGoldenTriangle}
            />
            <ToggleRow
              label="Star & Puzzle labels"
              meta="corner pills"
              on={starPuzzleLabels}
              onChange={setStarPuzzleLabels}
            />
            <ToggleRow
              label="Margin indicators"
              meta="% next to each dish"
              on={marginIndicators}
              onChange={setMarginIndicators}
            />
            <ToggleRow
              label="Cost per cover"
              meta="food cost £ per dish"
              on={costPerCover}
              onChange={setCostPerCover}
              isLast
            />
          </PanelSection>

          <PanelSection title="Template">
            <div className="grid grid-cols-2 gap-2.5">
              {TEMPLATES.map((t) => (
                <TemplateCard
                  key={t.key}
                  template={t}
                  selected={template === t.key}
                  onSelect={() => setTemplate(t.key)}
                />
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Your Own Template">
            <div className="border-2 border-dashed border-rule bg-card p-5 text-center cursor-pointer hover:border-gold hover:bg-gold-bg transition-colors mb-3">
              <div className="w-8 h-8 mx-auto mb-2 text-gold">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </div>
              <div className="font-serif font-semibold text-sm text-ink mb-1">
                Upload your menu template
              </div>
              <div className="font-sans text-[11px] text-muted">
                PDF, AI, Figma, PSD · max 20MB
              </div>
            </div>
            <a className="flex items-center gap-2 px-3.5 py-2.5 bg-paper-warm border border-rule cursor-pointer hover:border-gold transition-colors no-underline text-ink">
              <div className="text-gold flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <div className="flex-1 font-serif text-[13px] text-ink">
                <strong className="font-semibold">Formatting guide</strong> · how to prep your file
              </div>
              <div className="text-muted-soft">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </div>
            </a>
          </PanelSection>

          <PanelSection title="Menu Engineering">
            <StatsList>
              <StatRow label="Avg margin across menu" value="66%" tone="healthy" />
              <StatRow label="Avg cover spend (est.)" value="£28" />
              <StatRow label="Stars in golden triangle" value="2 of 2" tone="healthy" />
              <StatRow label="Puzzles needing attention" value="2" tone="attention" />
              <StatRow label="Dogs on menu" value="0" tone="healthy" isLast />
            </StatsList>
          </PanelSection>

          <PanelSection title="Suggestions">
            <Suggestion
              tag="Margin Slip"
              tone="attention"
              body="Hummus margin dropped from 72% to 70% this week. Tahini up 12% across both suppliers. Consider £0.50 price increase to £8.50."
              boldPart="Hummus margin dropped from 72% to 70% this week."
              action="Apply & preview →"
            />
            <Suggestion
              tag="Reposition"
              body="Beef Short Rib is a Puzzle (high margin, low orders). Currently mid-section. Consider moving up or rewriting description to lead with “slow-roasted overnight”."
              boldPart="Beef Short Rib is a Puzzle (high margin, low orders)."
              action="Show in canvas →"
            />
            <Suggestion
              tag="Seasonal Hook"
              body="Wild garlic peaking this week. 3 chef notebook entries reference it. Worth adding a wild garlic feature dish?"
              boldPart="Wild garlic peaking this week."
              action="Browse seasonal →"
            />
          </PanelSection>

          <PanelSection title="Output Formats" isLast>
            <div className="flex flex-col gap-2">
              <FormatRow
                name="Print (PDF)"
                meta="A4 · A5 · custom sizes"
                icon={
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
                }
              />
              <FormatRow
                name="Web menu"
                meta="palateandpen.co.uk/m/berber-and-q"
                icon={
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </>
                }
              />
              <FormatRow
                name="QR code"
                meta="prints + downloads"
                icon={
                  <>
                    <rect x="3" y="3" width="8" height="8" />
                    <rect x="13" y="3" width="8" height="8" />
                    <rect x="3" y="13" width="8" height="8" />
                    <rect x="13" y="13" width="3" height="3" />
                    <rect x="18" y="13" width="3" height="3" />
                    <rect x="13" y="18" width="3" height="3" />
                    <rect x="18" y="18" width="3" height="3" />
                  </>
                }
              />
              <FormatRow
                name="Poster / Chalkboard"
                meta="specials · daily features"
                icon={
                  <>
                    <rect x="3" y="3" width="18" height="18" />
                    <path d="M3 9h18M9 3v18" />
                  </>
                }
              />
            </div>
          </PanelSection>
        </aside>
      </div>
    </div>
  );
}

function ViewToggleBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'font-display font-semibold text-[11px] tracking-[0.25em] uppercase px-3.5 py-2 inline-flex items-center gap-1.5 transition-colors ' +
        (active
          ? 'bg-ink text-paper'
          : 'bg-transparent text-muted hover:text-ink')
      }
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        {icon}
      </svg>
      {label}
    </button>
  );
}

function ActionBtn({
  label,
  icon,
  primary,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2.5 border transition-colors inline-flex items-center gap-1.5 ' +
        (primary
          ? 'bg-gold border-gold text-paper hover:bg-gold-dark hover:border-gold-dark'
          : 'bg-transparent border-rule text-ink-soft hover:border-gold hover:text-gold')
      }
    >
      {icon && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          {icon}
        </svg>
      )}
      {label}
    </button>
  );
}

const STRIPE_BY_CLASS: Record<Classification, string> = {
  star: 'bg-gold',
  plowhorse: 'bg-healthy',
  puzzle: 'bg-attention',
  dog: 'bg-urgent opacity-50',
  unused: 'bg-muted-soft',
};

const CHIP_BY_CLASS: Record<Classification, string> = {
  star: 'bg-gold text-paper',
  plowhorse: 'bg-healthy text-paper',
  puzzle: 'bg-attention text-paper',
  dog: 'bg-urgent text-paper',
  unused: 'bg-transparent border border-dashed border-muted-soft text-muted',
};

const CLASS_LABEL: Record<Classification, string> = {
  star: 'Star',
  plowhorse: 'Plowhorse',
  puzzle: 'Puzzle',
  dog: 'Dog',
  unused: 'Side / Unused',
};

function DishTile({ dish }: { dish: Dish }) {
  return (
    <div className="px-6 py-3.5 border-b border-rule-soft cursor-grab hover:bg-card-warm transition-colors relative">
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${STRIPE_BY_CLASS[dish.classification]}`} />
      <div className={dish.classification === 'unused' ? 'opacity-60' : ''}>
        <div className="font-serif font-semibold text-[15px] text-ink mb-1">
          {dish.name}
        </div>
        <div className="flex gap-3 items-baseline">
          <span className="font-sans text-xs text-muted">
            cost <strong className="text-ink font-semibold">£{dish.cost.toFixed(2)}</strong>
          </span>
          {dish.marginPct != null ? (
            <span
              className={
                'font-sans font-semibold text-xs ' +
                (dish.marginPct >= 60
                  ? 'text-healthy'
                  : dish.marginPct >= 50
                    ? 'text-attention'
                    : 'text-urgent')
              }
            >
              {dish.marginPct}%
            </span>
          ) : (
            <span className="font-sans font-semibold text-xs text-healthy">—</span>
          )}
        </div>
        <span
          className={
            'inline-block font-display font-semibold text-[11px] tracking-[0.25em] uppercase px-1.5 py-[2px] mt-1.5 ' +
            CHIP_BY_CLASS[dish.classification]
          }
        >
          {CLASS_LABEL[dish.classification]}
        </span>
      </div>
    </div>
  );
}

function MenuPreview({
  menuName,
  template,
  sections,
  showPrices,
  showDescriptions,
  sectionDividers,
  allergenIcons,
  layoutCols,
  goldenTriangle,
  starPuzzleLabels,
  marginIndicators,
  costPerCover,
}: {
  menuName: string;
  template: TemplateKey;
  sections: MenuSection[];
  showPrices: boolean;
  showDescriptions: boolean;
  sectionDividers: boolean;
  allergenIcons: boolean;
  layoutCols: LayoutCols;
  goldenTriangle: boolean;
  starPuzzleLabels: boolean;
  marginIndicators: boolean;
  costPerCover: boolean;
}) {
  void allergenIcons; // wire when allergen registry lands

  const dishById = useMemo(
    () => new Map(DISH_LIBRARY.map((d) => [d.id, d])),
    [],
  );

  const bg =
    template === 'chalkboard'
      ? 'bg-[#2a2520] text-[#f5ebd6]'
      : template === 'minimal'
        ? 'bg-card'
        : template === 'bistro'
          ? 'bg-paper-warm'
          : 'bg-paper';

  const colsClass =
    layoutCols === 'two'
      ? 'md:columns-2 md:gap-10'
      : layoutCols === 'three'
        ? 'md:columns-3 md:gap-8'
        : '';

  return (
    <div
      className={`w-full max-w-[720px] min-h-[900px] px-14 py-14 shadow-[0_8px_32px_rgba(26,22,18,0.12)] ${bg}`}
    >
      <div className="text-center mb-10 pb-8 border-b border-rule">
        <div className="font-display font-semibold text-[11px] tracking-[0.5em] uppercase text-gold mb-3.5">
          Berber &amp; Q · Shoreditch
        </div>
        <h2 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] text-ink mb-2.5">
          {menuName.split('—')[0]?.trim() || 'Menu'}{' '}
          <em className="text-gold italic font-medium">menu</em>
        </h2>
        <p className="font-serif italic text-base text-muted">
          A celebration of the Levant · charcoal, smoke, and spice
        </p>
      </div>

      <div className={colsClass}>
        {sections.map((section) => (
          <div
            key={section.id}
            className={
              'mb-9 relative break-inside-avoid ' +
              (goldenTriangle && section.golden
                ? '-mx-4 px-4 py-4 bg-gold-bg rounded-sm'
                : '')
            }
          >
            {goldenTriangle && section.golden && (
              <span className="absolute -top-3 right-0 font-display font-semibold text-[11px] tracking-[0.3em] text-gold bg-paper px-2 py-[2px]">
                GOLDEN TRIANGLE
              </span>
            )}
            <div
              className={
                'font-display font-semibold text-sm tracking-[0.4em] uppercase text-gold text-center mb-6 pb-3 ' +
                (sectionDividers ? 'border-b border-rule' : '')
              }
            >
              {section.head}
            </div>
            {section.rows.map((row) => {
              const dish = dishById.get(row.dishId);
              return (
                <div
                  key={row.dishId}
                  className={
                    'grid grid-cols-[1fr_auto] gap-6 py-3.5 items-baseline relative ' +
                    (row.featured ? 'pl-3 border-l-2 border-gold' : '')
                  }
                >
                  <div>
                    <div className="font-serif font-semibold text-[17px] text-ink mb-1">
                      {dish?.name ?? row.dishId}
                    </div>
                    {showDescriptions && (
                      <div className="font-serif italic text-sm text-ink-soft leading-relaxed">
                        {row.desc}
                      </div>
                    )}
                    {marginIndicators && dish?.marginPct != null && (
                      <div
                        className={
                          'font-sans font-semibold text-[11px] tracking-[0.1em] uppercase mt-1 ' +
                          (dish.marginPct >= 60
                            ? 'text-healthy'
                            : dish.marginPct >= 50
                              ? 'text-attention'
                              : 'text-urgent')
                        }
                      >
                        GP {dish.marginPct}%
                      </div>
                    )}
                    {costPerCover && dish && (
                      <div className="font-sans font-semibold text-[11px] tracking-[0.1em] uppercase mt-0.5 text-muted">
                        Food cost £{dish.cost.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {showPrices && (
                    <div className="font-serif font-semibold text-[17px] text-ink whitespace-nowrap">
                      £{row.price}
                    </div>
                  )}
                  {starPuzzleLabels && row.featured && (
                    <span className="absolute -right-9 top-3.5 font-display font-semibold text-[11px] tracking-[0.3em] text-gold">
                      STAR
                    </span>
                  )}
                  {starPuzzleLabels && row.flagged && (
                    <span className="absolute -right-12 top-3.5 font-display font-semibold text-[11px] tracking-[0.3em] text-attention">
                      PUZZLE
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelSection({
  title,
  children,
  isLast,
}: {
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <section className={isLast ? '' : 'mb-8'}>
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-3 pb-2.5 border-b border-rule">
        {title}
      </div>
      {children}
    </section>
  );
}

function LayoutBtn({
  cols,
  active,
  onClick,
  label,
}: {
  cols: number;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'flex flex-col items-center gap-1.5 py-3 px-2 transition-colors ' +
        (active
          ? 'bg-gold-bg border-2 border-gold'
          : 'bg-card border border-rule hover:border-gold')
      }
    >
      <div className="w-8 h-6 flex gap-[2px]">
        {Array.from({ length: cols }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 rounded-[1px] ${active ? 'bg-gold' : 'bg-muted-soft'}`}
          />
        ))}
      </div>
      <span className="font-display font-semibold text-[11px] tracking-[0.2em] uppercase text-ink">
        {label}
      </span>
    </button>
  );
}

function ToggleRow({
  label,
  meta,
  on,
  onChange,
  isLast,
}: {
  label: string;
  meta: string;
  on: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <div
      className={
        'flex items-center justify-between py-2.5 ' +
        (isLast ? '' : 'border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif text-sm text-ink">{label}</div>
        <div className="font-sans text-[11px] text-muted mt-0.5">{meta}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={
          'w-[38px] h-[22px] rounded-[11px] cursor-pointer relative flex-shrink-0 transition-colors ' +
          (on ? 'bg-gold' : 'bg-rule')
        }
      >
        <span
          className={
            'absolute top-[3px] w-4 h-4 bg-paper rounded-full transition-all ' +
            (on ? 'left-[19px]' : 'left-[3px]')
          }
        />
      </button>
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: { key: TemplateKey; name: string; sub: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={
        'p-3 cursor-pointer transition-all text-center ' +
        (selected
          ? 'border-2 border-gold bg-gold-bg p-[11px]'
          : 'border border-rule bg-card hover:border-gold')
      }
    >
      <div className="w-full h-20 bg-paper mb-2 relative border border-rule overflow-hidden">
        <TemplateThumb template={template.key} />
      </div>
      <div className="font-display font-semibold text-[11px] tracking-[0.25em] uppercase text-ink">
        {template.name}
      </div>
      <div className="font-serif italic text-[11px] text-muted mt-0.5">
        {template.sub}
      </div>
    </button>
  );
}

function TemplateThumb({ template }: { template: TemplateKey }) {
  if (template === 'editorial') {
    return (
      <>
        <span className="absolute top-3 left-1/2 -translate-x-1/2 w-2/5 h-[3px] bg-gold" />
        <span
          className="absolute top-5 left-3 right-3 h-10 opacity-40"
          style={{
            background:
              'repeating-linear-gradient(180deg, rgb(61 54 44) 0, rgb(61 54 44) 1px, transparent 1px, transparent 8px)',
          }}
        />
      </>
    );
  }
  if (template === 'minimal') {
    return (
      <>
        <span className="absolute top-3 left-3 right-3 h-2 bg-ink" />
        <span
          className="absolute top-7 left-3 right-3 h-9 opacity-80"
          style={{
            background:
              'repeating-linear-gradient(180deg, rgb(26 22 18) 0, rgb(26 22 18) 2px, transparent 2px, transparent 10px)',
          }}
        />
      </>
    );
  }
  if (template === 'chalkboard') {
    return (
      <div className="absolute inset-0 bg-[#2a2520]">
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 font-serif italic text-sm text-[#f5ebd6]">
          Menu
        </div>
        <span
          className="absolute top-9 left-3 right-3 h-[30px] opacity-60"
          style={{
            background:
              'repeating-linear-gradient(180deg, #f5ebd6 0, #f5ebd6 1px, transparent 1px, transparent 8px)',
          }}
        />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 bg-paper-warm">
      <span
        className="absolute top-3.5 left-3.5 w-1.5 h-1.5 rounded-full bg-attention"
        style={{ boxShadow: '12px 0 0 rgb(184 106 46)' }}
      />
      <span
        className="absolute top-[30px] left-3.5 right-3.5 h-9 opacity-50"
        style={{
          background:
            'repeating-linear-gradient(180deg, rgb(61 54 44) 0, rgb(61 54 44) 1px, transparent 1px, transparent 7px)',
        }}
      />
    </div>
  );
}

function StatsList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}

function StatRow({
  label,
  value,
  tone,
  isLast,
}: {
  label: string;
  value: string;
  tone?: 'healthy' | 'attention';
  isLast?: boolean;
}) {
  return (
    <div
      className={
        'flex justify-between items-baseline py-2 ' +
        (isLast ? '' : 'border-b border-rule-soft')
      }
    >
      <span className="font-serif text-[13px] text-muted">{label}</span>
      <span
        className={
          'font-sans font-semibold text-sm ' +
          (tone === 'healthy'
            ? 'text-healthy'
            : tone === 'attention'
              ? 'text-attention'
              : 'text-ink')
        }
      >
        {value}
      </span>
    </div>
  );
}

function Suggestion({
  tag,
  body,
  boldPart,
  action,
  tone,
}: {
  tag: string;
  body: string;
  boldPart: string;
  action: string;
  tone?: 'attention' | 'urgent';
}) {
  const borderClass =
    tone === 'urgent'
      ? 'border-l-urgent'
      : tone === 'attention'
        ? 'border-l-attention'
        : 'border-l-gold';
  const tagColor =
    tone === 'urgent'
      ? 'text-urgent'
      : tone === 'attention'
        ? 'text-attention'
        : 'text-gold';
  const rest = body.replace(boldPart, '').trim();
  return (
    <div className={`bg-card border border-rule border-l-[3px] ${borderClass} px-4 py-3.5 mb-2.5`}>
      <div className={`font-display font-semibold text-[11px] tracking-[0.3em] uppercase mb-1.5 ${tagColor}`}>
        {tag}
      </div>
      <div className="font-serif italic text-[13px] text-ink-soft leading-relaxed">
        <strong className="not-italic font-semibold text-ink">{boldPart}</strong>{' '}
        {rest}
      </div>
      <a className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-gold mt-2 inline-block cursor-pointer">
        {action}
      </a>
    </div>
  );
}

function FormatRow({
  name,
  meta,
  icon,
}: {
  name: string;
  meta: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 bg-card border border-rule cursor-pointer hover:border-gold transition-colors">
      <div className="w-8 h-8 flex items-center justify-center bg-gold-bg text-gold flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          {icon}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif font-semibold text-sm text-ink">{name}</div>
        <div className="font-sans text-[11px] text-muted mt-0.5 truncate">{meta}</div>
      </div>
    </div>
  );
}
