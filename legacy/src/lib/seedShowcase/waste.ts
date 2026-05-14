import { SHOWCASE_BANK } from './bank';
import { daysAgo } from './time';
import { OUTLET_IDS } from './outlets';

// Waste log seed — ~20 entries spread over 60 days across the 9 standard
// reasons. Cost computed against bank unit-price so the Waste cost dashboard
// shows realistic £ totals. Mix of reasons spread out enough that the
// "By reason" + "Most-wasted ingredients" lists both show diversity.

const bankById = new Map(SHOWCASE_BANK.map(b => [b.id, b] as const));

interface WasteSpec {
  bankId: string;
  qty: number;
  unit: string;
  reason: string;
  daysAgo: number;
}

const SPECS: WasteSpec[] = [
  // Recent (≤7d) — drives the 7d window
  { bankId: 'seed-bank-tomatoes-vine', qty: 800, unit: 'g',  reason: 'Spoilage',         daysAgo: 1 },
  { bankId: 'seed-bank-spinach',       qty: 500, unit: 'g',  reason: 'Out of date',      daysAgo: 2 },
  { bankId: 'seed-bank-cod-loin',      qty: 400, unit: 'g',  reason: 'Customer return', daysAgo: 3 },
  { bankId: 'seed-bank-double-cream',  qty: 250, unit: 'ml', reason: 'Spillage',         daysAgo: 5 },
  { bankId: 'seed-bank-mushrooms',     qty: 300, unit: 'g',  reason: 'Spoilage',         daysAgo: 6 },

  // 7-30d window — most volume here
  { bankId: 'seed-bank-chicken-breast', qty: 600, unit: 'g',  reason: 'Trim/Prep',        daysAgo: 9 },
  { bankId: 'seed-bank-salmon-fillet',  qty: 350, unit: 'g',  reason: 'Test/Tasting',     daysAgo: 11 },
  { bankId: 'seed-bank-butter-unsalted', qty: 200, unit: 'g', reason: 'Spillage',         daysAgo: 13 },
  { bankId: 'seed-bank-tomatoes-vine',  qty: 1100, unit: 'g', reason: 'Spoilage',         daysAgo: 15 },
  { bankId: 'seed-bank-puff-pastry',    qty: 250, unit: 'g',  reason: 'Burnt',            daysAgo: 17 },
  { bankId: 'seed-bank-arborio-rice',   qty: 300, unit: 'g',  reason: 'Burnt',            daysAgo: 19 },
  { bankId: 'seed-bank-eggs-large',     qty: 6,   unit: 'ea', reason: 'Test/Tasting',     daysAgo: 22 },
  { bankId: 'seed-bank-lemons',         qty: 300, unit: 'g',  reason: 'Spoilage',         daysAgo: 24 },
  { bankId: 'seed-bank-mussels',        qty: 600, unit: 'g',  reason: 'Out of date',      daysAgo: 27 },

  // 30-60d window
  { bankId: 'seed-bank-beef-fillet',    qty: 300, unit: 'g',  reason: 'Customer return', daysAgo: 35 },
  { bankId: 'seed-bank-lamb-shoulder',  qty: 700, unit: 'g',  reason: 'Overproduction',   daysAgo: 38 },
  { bankId: 'seed-bank-pasta-pappardelle', qty: 400, unit: 'g', reason: 'Burnt',         daysAgo: 42 },
  { bankId: 'seed-bank-whole-milk',     qty: 800, unit: 'ml', reason: 'Out of date',      daysAgo: 46 },
  { bankId: 'seed-bank-onions',         qty: 1500, unit: 'g', reason: 'Trim/Prep',        daysAgo: 51 },
  { bankId: 'seed-bank-mushrooms',      qty: 500, unit: 'g',  reason: 'Spoilage',         daysAgo: 55 },
];

export interface ShowcaseWasteEntry {
  id: string;
  ingredientName: string;
  bankId: string;
  category: string;
  qty: number;
  unit: string;
  reason: string;
  totalCost: number;
  supplier?: string | null;
  createdAt: number;
  outletId: string;
}

function toStandard(qty: number, unit: string, bankUnit: string): number {
  if (unit === bankUnit) return qty;
  if (unit === 'g'  && bankUnit === 'kg') return qty / 1000;
  if (unit === 'ml' && bankUnit === 'L')  return qty / 1000;
  return qty;
}

// Distribute waste entries across the 3 outlets. Soho is the busiest
// kitchen so it generates the most waste; Marylebone has bar-shift waste
// (citrus, dairy); Central Kitchen has the bulk-prep losses (trim,
// overproduction on portioned items).
const WASTE_OUTLET_CYCLE = [
  OUTLET_IDS.soho, OUTLET_IDS.soho, OUTLET_IDS.soho,
  OUTLET_IDS.marylebone, OUTLET_IDS.marylebone,
  OUTLET_IDS.centralKitchen,
];

export function buildShowcaseWaste(): ShowcaseWasteEntry[] {
  return SPECS.map((s, i) => {
    const b = bankById.get(s.bankId);
    const cost = b ? toStandard(s.qty, s.unit, b.unit) * b.unitPrice : 0;
    return {
      id: `seed-waste-${String(i + 1).padStart(3, '0')}`,
      ingredientName: b?.name ?? s.bankId,
      bankId: s.bankId,
      category: b?.category ?? 'Other',
      qty: s.qty,
      unit: s.unit,
      reason: s.reason,
      totalCost: Math.round(cost * 100) / 100,
      supplier: b?.supplier ?? null,
      createdAt: daysAgo(s.daysAgo),
      outletId: WASTE_OUTLET_CYCLE[i % WASTE_OUTLET_CYCLE.length],
    };
  });
}
