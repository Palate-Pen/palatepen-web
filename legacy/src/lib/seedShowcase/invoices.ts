import { SHOWCASE_BANK } from './bank';
import { daysAgo } from './time';
import { OUTLET_IDS } from './outlets';

// Invoice seed — spread over 90 days across 5 suppliers, mix of manually
// scanned and email-forwarded (so the inbound-email pipe shows usage). A
// handful carry detected price changes so the Reports "Price changes" tab
// and the Supplier-performance Δ Prices column have signal.

const bankById = new Map(SHOWCASE_BANK.map(b => [b.id, b] as const));

interface LineSpec {
  bankId: string;
  qty: number;
  unitPrice?: number; // overrides bank price (for price-change scenarios)
}

interface DiscrepancySpec {
  bankId: string;
  invoicedQty: number;
  receivedQty: number;
  received: boolean;
  note?: string;
}

interface InvoiceSpec {
  id: string;
  supplier: string;
  daysAgo: number;
  lines: LineSpec[];
  source?: 'email';     // when present, marks this invoice as inbound-email
  subject?: string;     // email subject (only used when source==='email')
  from?: string;        // sender (only used when source==='email')
  filename?: string;    // attachment filename
  priceChanges?: { bankId: string; oldPrice: number; newPrice: number }[];
  // Optional delivery-check outcome. Most invoices in the seed are
  // implicitly 'confirmed' (chef tapped Yes, all good). A handful carry
  // explicit flagged status + discrepancies so the demo shows the
  // supplier reliability score and 30-day discrepancy banner with real
  // signal. 'confirmed' invoices have their status stamped explicitly
  // so the reliability calc treats them as deliberate Yes-taps.
  status?: 'confirmed' | 'flagged';
  discrepancies?: DiscrepancySpec[];
}

const SPECS: InvoiceSpec[] = [
  // ── Brakes (broadline supplier — frequent, mid-volume) ──
  { id: 'seed-inv-brakes-001', supplier: 'Brakes', daysAgo: 88, status: 'confirmed', lines: [
    { bankId: 'seed-bank-chicken-breast', qty: 5 },
    { bankId: 'seed-bank-salmon-fillet', qty: 3 },
    { bankId: 'seed-bank-cod-loin', qty: 2 },
    { bankId: 'seed-bank-arborio-rice', qty: 4 },
    { bankId: 'seed-bank-pasta-pappardelle', qty: 3 },
  ]},
  { id: 'seed-inv-brakes-002', supplier: 'Brakes', daysAgo: 72, status: 'confirmed', lines: [
    { bankId: 'seed-bank-chicken-breast', qty: 5 },
    { bankId: 'seed-bank-salmon-fillet', qty: 4 },
    { bankId: 'seed-bank-olive-oil', qty: 5 },
    { bankId: 'seed-bank-soy-sauce', qty: 2 },
  ]},
  { id: 'seed-inv-brakes-003', supplier: 'Brakes', daysAgo: 55, status: 'flagged', lines: [
    { bankId: 'seed-bank-chicken-breast', qty: 6, unitPrice: 8.95 }, // up from 8.40
    { bankId: 'seed-bank-cod-loin', qty: 3 },
    { bankId: 'seed-bank-tiger-prawns', qty: 2 },
    { bankId: 'seed-bank-balsamic', qty: 2 },
  ], priceChanges: [
    { bankId: 'seed-bank-chicken-breast', oldPrice: 8.40, newPrice: 8.95 },
  ], discrepancies: [
    { bankId: 'seed-bank-chicken-breast', invoicedQty: 6, receivedQty: 5.5, received: true, note: 'Half kg light — scales agreed at door' },
    { bankId: 'seed-bank-tiger-prawns',   invoicedQty: 2, receivedQty: 0,   received: false, note: 'Missing from delivery, credit pending' },
  ]},
  { id: 'seed-inv-brakes-004', supplier: 'Brakes', daysAgo: 35, status: 'confirmed', lines: [
    { bankId: 'seed-bank-chicken-breast', qty: 5, unitPrice: 9.20 }, // up further
    { bankId: 'seed-bank-salmon-fillet', qty: 3, unitPrice: 22.40 }, // up
    { bankId: 'seed-bank-cod-loin', qty: 3 },
    { bankId: 'seed-bank-tiger-prawns', qty: 2 },
  ], priceChanges: [
    { bankId: 'seed-bank-chicken-breast', oldPrice: 8.95, newPrice: 9.20 },
    { bankId: 'seed-bank-salmon-fillet', oldPrice: 21.50, newPrice: 22.40 },
  ]},
  { id: 'seed-inv-brakes-005', supplier: 'Brakes', daysAgo: 12, status: 'confirmed', lines: [
    { bankId: 'seed-bank-chicken-breast', qty: 6, unitPrice: 9.40 },
    { bankId: 'seed-bank-salmon-fillet', qty: 4 },
    { bankId: 'seed-bank-arborio-rice', qty: 3 },
    { bankId: 'seed-bank-puff-pastry', qty: 3 },
  ], priceChanges: [
    { bankId: 'seed-bank-chicken-breast', oldPrice: 9.20, newPrice: 9.40 },
  ]},

  // ── Smithfield Butchers (premium meat — lower frequency, high spend) ──
  // All confirmed → 10/10 reliability, models a top-tier supplier.
  { id: 'seed-inv-butcher-001', supplier: 'Smithfield Butchers', daysAgo: 80, status: 'confirmed', lines: [
    { bankId: 'seed-bank-beef-fillet', qty: 4 },
    { bankId: 'seed-bank-lamb-shoulder', qty: 3 },
    { bankId: 'seed-bank-duck-breast', qty: 2 },
  ]},
  { id: 'seed-inv-butcher-002', supplier: 'Smithfield Butchers', daysAgo: 50, status: 'confirmed', lines: [
    { bankId: 'seed-bank-beef-fillet', qty: 5, unitPrice: 40.20 }, // up
    { bankId: 'seed-bank-lamb-shoulder', qty: 4 },
    { bankId: 'seed-bank-pork-belly', qty: 4 },
  ], priceChanges: [
    { bankId: 'seed-bank-beef-fillet', oldPrice: 38.50, newPrice: 40.20 },
  ]},
  { id: 'seed-inv-butcher-003', supplier: 'Smithfield Butchers', daysAgo: 22, status: 'confirmed', lines: [
    { bankId: 'seed-bank-beef-fillet', qty: 4, unitPrice: 41.80 },
    { bankId: 'seed-bank-lamb-shoulder', qty: 3 },
    { bankId: 'seed-bank-duck-breast', qty: 3 },
    { bankId: 'seed-bank-pancetta', qty: 2 },
  ], priceChanges: [
    { bankId: 'seed-bank-beef-fillet', oldPrice: 40.20, newPrice: 41.80 },
  ]},

  // ── Borough Market Produce (produce — high frequency, low value) ──
  // Two flagged out of 5 — produce is fragile, models a sometimes-iffy
  // supplier. Drops the reliability score and surfaces a clear top issue.
  { id: 'seed-inv-market-001', supplier: 'Borough Market Produce', daysAgo: 78, status: 'confirmed', lines: [
    { bankId: 'seed-bank-tomatoes-vine', qty: 8 },
    { bankId: 'seed-bank-onions', qty: 15 },
    { bankId: 'seed-bank-garlic', qty: 2 },
    { bankId: 'seed-bank-potatoes', qty: 25 },
    { bankId: 'seed-bank-basil', qty: 0.5 },
  ]},
  { id: 'seed-inv-market-002', supplier: 'Borough Market Produce', daysAgo: 64, status: 'flagged', lines: [
    { bankId: 'seed-bank-tomatoes-vine', qty: 10 },
    { bankId: 'seed-bank-spinach', qty: 4 },
    { bankId: 'seed-bank-mushrooms', qty: 6 },
    { bankId: 'seed-bank-lemons', qty: 3 },
    { bankId: 'seed-bank-basil', qty: 0.6 },
  ], discrepancies: [
    { bankId: 'seed-bank-spinach',   invoicedQty: 4, receivedQty: 0,   received: false, note: 'Wrong veg — sent kale by mistake, refused' },
    { bankId: 'seed-bank-tomatoes-vine', invoicedQty: 10, receivedQty: 8, received: true, note: 'Two tops soft, kept the good ones' },
  ]},
  { id: 'seed-inv-market-003', supplier: 'Borough Market Produce', daysAgo: 41, status: 'confirmed', lines: [
    { bankId: 'seed-bank-tomatoes-vine', qty: 12, unitPrice: 3.60 }, // seasonal up
    { bankId: 'seed-bank-spinach', qty: 5 },
    { bankId: 'seed-bank-carrots', qty: 10 },
    { bankId: 'seed-bank-mushrooms', qty: 5 },
    { bankId: 'seed-bank-thyme', qty: 0.3 },
  ], priceChanges: [
    { bankId: 'seed-bank-tomatoes-vine', oldPrice: 3.20, newPrice: 3.60 },
  ]},
  { id: 'seed-inv-market-004', supplier: 'Borough Market Produce', daysAgo: 18, status: 'flagged', lines: [
    { bankId: 'seed-bank-tomatoes-vine', qty: 10 },
    { bankId: 'seed-bank-mushrooms', qty: 6, unitPrice: 5.80 }, // up
    { bankId: 'seed-bank-spinach', qty: 4 },
    { bankId: 'seed-bank-lemons', qty: 4 },
    { bankId: 'seed-bank-parsley', qty: 0.5 },
  ], priceChanges: [
    { bankId: 'seed-bank-mushrooms', oldPrice: 5.20, newPrice: 5.80 },
  ], discrepancies: [
    { bankId: 'seed-bank-mushrooms', invoicedQty: 6,  receivedQty: 4, received: true, note: 'One tray with mould, returned' },
    { bankId: 'seed-bank-tomatoes-vine', invoicedQty: 10, receivedQty: 7, received: true, note: 'Soft tops again — same supplier issue' },
  ]},
  { id: 'seed-inv-market-005', supplier: 'Borough Market Produce', daysAgo: 4, status: 'confirmed', lines: [
    { bankId: 'seed-bank-tomatoes-vine', qty: 8 },
    { bankId: 'seed-bank-onions', qty: 12 },
    { bankId: 'seed-bank-carrots', qty: 8 },
    { bankId: 'seed-bank-basil', qty: 0.5 },
    { bankId: 'seed-bank-mushrooms', qty: 5 },
  ]},

  // ── Bidfood (dairy + dry — moderate frequency) ──
  // All confirmed → 10/10, models a second top-tier supplier.
  { id: 'seed-inv-bidfood-001', supplier: 'Bidfood', daysAgo: 67, status: 'confirmed', lines: [
    { bankId: 'seed-bank-butter-unsalted', qty: 10 },
    { bankId: 'seed-bank-double-cream', qty: 8 },
    { bankId: 'seed-bank-whole-milk', qty: 20 },
    { bankId: 'seed-bank-eggs-large', qty: 60 },
    { bankId: 'seed-bank-parmesan', qty: 4 },
  ]},
  { id: 'seed-inv-bidfood-002', supplier: 'Bidfood', daysAgo: 30, status: 'confirmed', lines: [
    { bankId: 'seed-bank-butter-unsalted', qty: 10, unitPrice: 7.60 }, // up
    { bankId: 'seed-bank-double-cream', qty: 8 },
    { bankId: 'seed-bank-whole-milk', qty: 20 },
    { bankId: 'seed-bank-eggs-large', qty: 60 },
    { bankId: 'seed-bank-mozzarella', qty: 5 },
  ], priceChanges: [
    { bankId: 'seed-bank-butter-unsalted', oldPrice: 7.20, newPrice: 7.60 },
  ]},
  { id: 'seed-inv-bidfood-003', supplier: 'Bidfood', daysAgo: 7, status: 'confirmed', lines: [
    { bankId: 'seed-bank-butter-unsalted', qty: 12 },
    { bankId: 'seed-bank-double-cream', qty: 10 },
    { bankId: 'seed-bank-eggs-large', qty: 60 },
    { bankId: 'seed-bank-parmesan', qty: 3 },
  ], source: 'email',
    subject: 'Your weekly Bidfood invoice — INV-2026-04401',
    from: 'invoicing@bidfood.co.uk',
    filename: 'INV-2026-04401.pdf' },

  // ── Cuisine de France (pastry — low frequency, occasional shortfall) ──
  { id: 'seed-inv-pastry-001', supplier: 'Cuisine de France', daysAgo: 58, status: 'confirmed', lines: [
    { bankId: 'seed-bank-puff-pastry', qty: 5 },
    { bankId: 'seed-bank-sourdough', qty: 24 },
  ]},
  { id: 'seed-inv-pastry-002', supplier: 'Cuisine de France', daysAgo: 28, status: 'flagged', lines: [
    { bankId: 'seed-bank-puff-pastry', qty: 6 },
    { bankId: 'seed-bank-sourdough', qty: 30 },
  ], source: 'email',
    subject: 'Cuisine de France — order 12041',
    from: 'orders@cuisinedefrance.co.uk',
    filename: 'cuisinedefrance-12041.pdf',
    discrepancies: [
      { bankId: 'seed-bank-sourdough', invoicedQty: 30, receivedQty: 24, received: true, note: 'Six loaves short of the order' },
    ]},
  { id: 'seed-inv-pastry-003', supplier: 'Cuisine de France', daysAgo: 9, status: 'confirmed', lines: [
    { bankId: 'seed-bank-puff-pastry', qty: 4 },
    { bankId: 'seed-bank-sourdough', qty: 24 },
  ]},
];

export interface ShowcaseInvoice {
  id: string;
  supplier: string;
  itemCount: number;
  priceChanges: number;
  priceChangeDetails: any[];
  items: any[];
  scannedAt: number;
  total?: number;
  outletId: string;
  source?: 'email';
  receivedAt?: number;
  subject?: string;
  from?: string;
  filename?: string;
  status?: 'confirmed' | 'flagged';
  discrepancies?: Array<{ name: string; invoicedQty: number; receivedQty: number; received: boolean; note?: string; unitPrice: number; unit: string }>;
}

export interface ShowcasePriceAlert {
  id: string;
  name: string;
  unit: string;
  oldPrice: number;
  newPrice: number;
  change: number;
  pct: number;
  detectedAt: number;
}

// Map each seed invoice to an outlet so the demo shows per-outlet scoping.
// Default: Soho (main restaurant). Brakes + Bidfood deliveries route to the
// Central Kitchen (realistic — bulk supplier ships to prep hub). A handful
// of invoices are pinned to Marylebone for variety on the sister site.
function outletForInvoice(id: string): string {
  const marylebone: Record<string, true> = {
    'seed-inv-market-003': true,
    'seed-inv-market-005': true,
    'seed-inv-pastry-002': true,
    'seed-inv-butcher-002': true,
  };
  if (marylebone[id]) return OUTLET_IDS.marylebone;
  if (id.includes('brakes') || id.includes('bidfood')) return OUTLET_IDS.centralKitchen;
  return OUTLET_IDS.soho;
}

export function buildShowcaseInvoices(): { invoices: ShowcaseInvoice[]; priceAlerts: ShowcasePriceAlert[] } {
  const invoices: ShowcaseInvoice[] = [];
  const priceAlerts: ShowcasePriceAlert[] = [];

  for (const spec of SPECS) {
    const ts = daysAgo(spec.daysAgo);

    const items = spec.lines.map(line => {
      const b = bankById.get(line.bankId);
      const unitPrice = line.unitPrice ?? b?.unitPrice ?? 0;
      const totalPrice = unitPrice * line.qty;
      return {
        name: b?.name ?? line.bankId,
        qty: line.qty,
        unit: b?.unit ?? 'ea',
        unitPrice,
        totalPrice,
        category: b?.category ?? 'Other',
      };
    });
    const total = items.reduce((s, i) => s + (i.totalPrice || 0), 0);

    const pcDetails = (spec.priceChanges || []).map(pc => {
      const b = bankById.get(pc.bankId);
      const change = pc.newPrice - pc.oldPrice;
      const pct = pc.oldPrice > 0 ? (change / pc.oldPrice) * 100 : 0;
      const alert: ShowcasePriceAlert = {
        id: `seed-alert-${spec.id}-${pc.bankId}`,
        name: b?.name ?? pc.bankId,
        unit: b?.unit ?? 'kg',
        oldPrice: pc.oldPrice,
        newPrice: pc.newPrice,
        change,
        pct,
        detectedAt: ts,
      };
      priceAlerts.push(alert);
      return alert;
    });

    // Materialise discrepancies — resolve bankId → name/unit/unitPrice so the
    // app and reliability calc don't have to look anything up at read time.
    const discrepancies = (spec.discrepancies || []).map(d => {
      const b = bankById.get(d.bankId);
      return {
        name: b?.name ?? d.bankId,
        invoicedQty: d.invoicedQty,
        receivedQty: d.receivedQty,
        received: d.received,
        note: d.note,
        unitPrice: b?.unitPrice ?? 0,
        unit: b?.unit ?? '',
      };
    });

    invoices.push({
      id: spec.id,
      supplier: spec.supplier,
      itemCount: items.length,
      priceChanges: pcDetails.length,
      priceChangeDetails: pcDetails,
      items,
      scannedAt: ts,
      total,
      outletId: outletForInvoice(spec.id),
      ...(spec.status ? { status: spec.status } : {}),
      ...(discrepancies.length > 0 ? { discrepancies } : {}),
      ...(spec.source === 'email' ? {
        source: 'email' as const,
        receivedAt: ts,
        subject: spec.subject,
        from: spec.from,
        filename: spec.filename,
      } : {}),
    });
  }

  return { invoices, priceAlerts };
}
