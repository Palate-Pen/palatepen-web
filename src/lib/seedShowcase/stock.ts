import { SHOWCASE_BANK } from './bank';
import { daysAgo } from './time';

// Stock seed — a curated subset of bank items with par/min levels and current
// counts. Mix of states (some critical, some healthy, some 0) so StockView's
// list shows the full range of status pills and the dashboard "X items below
// par" tile has signal.

interface StockShape {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQty: number;
  parLevel: number;
  minLevel: number;
  unitPrice: number;
  lastCounted: number;
  createdAt: number;
}

// Bank-id → { par, min, current } overrides. Anything in this list ends up
// on the Stock tab; bank entries not listed stay Bank-only (some ingredients
// are bought per-order rather than held in stock).
const STOCK_PROFILE: Record<string, { par: number; min: number; current: number }> = {
  'seed-bank-beef-fillet':       { par: 8,    min: 3,   current: 2.4 },   // critical
  'seed-bank-chicken-breast':    { par: 12,   min: 5,   current: 4.2 },   // critical
  'seed-bank-lamb-shoulder':     { par: 6,    min: 2,   current: 5.8 },   // healthy
  'seed-bank-pork-belly':        { par: 5,    min: 2,   current: 0 },     // out of stock
  'seed-bank-duck-breast':       { par: 4,    min: 2,   current: 3.5 },   // healthy
  'seed-bank-salmon-fillet':     { par: 8,    min: 3,   current: 6.0 },   // healthy
  'seed-bank-cod-loin':          { par: 6,    min: 3,   current: 2.4 },   // critical
  'seed-bank-tiger-prawns':      { par: 3,    min: 1,   current: 1.8 },   // healthy
  'seed-bank-butter-unsalted':   { par: 8,    min: 3,   current: 7.2 },   // healthy
  'seed-bank-double-cream':      { par: 6,    min: 2,   current: 1.4 },   // critical (below min)
  'seed-bank-whole-milk':        { par: 12,   min: 4,   current: 10.0 },  // healthy
  'seed-bank-eggs-large':        { par: 60,   min: 24,  current: 36 },    // healthy
  'seed-bank-parmesan':          { par: 3,    min: 1,   current: 2.4 },   // healthy
  'seed-bank-mozzarella':        { par: 4,    min: 1.5, current: 0.8 },   // critical
  'seed-bank-tomatoes-vine':     { par: 10,   min: 4,   current: 7.5 },   // healthy
  'seed-bank-onions':            { par: 15,   min: 5,   current: 12.0 },  // healthy
  'seed-bank-garlic':            { par: 2,    min: 1,   current: 1.6 },   // healthy
  'seed-bank-potatoes':          { par: 25,   min: 10,  current: 8.0 },   // critical
  'seed-bank-carrots':           { par: 10,   min: 3,   current: 6.5 },   // healthy
  'seed-bank-spinach':           { par: 4,    min: 1.5, current: 3.0 },   // healthy
  'seed-bank-mushrooms':         { par: 5,    min: 2,   current: 1.5 },   // critical
  'seed-bank-lemons':            { par: 3,    min: 1,   current: 2.4 },   // healthy
  'seed-bank-basil':             { par: 1,    min: 0.4, current: 0.6 },   // healthy
  'seed-bank-thyme':             { par: 0.5,  min: 0.2, current: 0.35 },  // healthy
  'seed-bank-plain-flour':       { par: 10,   min: 4,   current: 7.0 },   // healthy
  'seed-bank-caster-sugar':      { par: 5,    min: 2,   current: 4.2 },   // healthy
  'seed-bank-arborio-rice':      { par: 4,    min: 1.5, current: 3.0 },   // healthy
  'seed-bank-sourdough':         { par: 8,    min: 3,   current: 5 },     // healthy
  'seed-bank-olive-oil':         { par: 5,    min: 2,   current: 1.6 },   // critical
  'seed-bank-balsamic':          { par: 2,    min: 0.5, current: 1.4 },   // healthy
  'seed-bank-tomato-passata':    { par: 12,   min: 4,   current: 9.0 },   // healthy
};

export function buildShowcaseStock(): StockShape[] {
  const bankById = new Map(SHOWCASE_BANK.map(b => [b.id, b] as const));
  const out: StockShape[] = [];
  let idx = 0;
  for (const [bankId, profile] of Object.entries(STOCK_PROFILE)) {
    const b = bankById.get(bankId);
    if (!b) continue;
    out.push({
      id: `seed-stock-${bankId.replace('seed-bank-', '')}`,
      name: b.name,
      category: b.category,
      unit: b.unit,
      currentQty: profile.current,
      parLevel: profile.par,
      minLevel: profile.min,
      unitPrice: b.unitPrice,
      // Spread last-counted timestamps so the "last counted X days ago" column
      // shows variation — most counted in the last week, a few older.
      lastCounted: daysAgo(idx % 5 === 0 ? 14 : idx % 3 === 0 ? 7 : 2),
      createdAt: daysAgo(60),
    });
    idx++;
  }
  return out;
}
