import { generateInboxToken } from '../inboundToken';

// Showcase profile — sets sensible defaults so every settings surface displays
// something meaningful in a demo (currency symbol, GP target colouring, stock-
// day cadence, business name appearing in print headers). The inbox token is
// pre-generated so the Email Forwarding card shows the "in use" state rather
// than the empty Generate-address call-to-action.
//
// supplierContacts is keyed by the same normalised name the supplier-
// reliability calc uses (lowercased + whitespace-collapsed), so the Invoices
// → Suppliers expanded card finds the right rep / phone / email / notes
// when the chef taps a row.

export function buildShowcaseProfile(): Record<string, unknown> {
  return {
    businessName: 'The Palate Test Kitchen',
    name: 'Jack Harrison',
    location: 'London, UK',
    currencySymbol: '£',
    gpTarget: 72,
    stockDay: 1, // Monday
    stockFrequency: 'weekly',
    // Group tier so the demo unlocks every showcase surface including
    // multi-outlet (sidebar switcher, dashboard greeting, per-outlet
    // scoping). Public menus and API access (Group-only since the tier
    // tightening) and My Team management also light up automatically.
    // Three outlets ship with the seed — see ./outlets.ts.
    tier: 'group',
    invoiceInboxToken: generateInboxToken(),
    supplierContacts: {
      'brakes': {
        name: 'Brakes',
        rep: 'Sarah Wilkins',
        phone: '0345 606 9090',
        email: 'sarah.wilkins@brake.co.uk',
        notes: 'Order cut-off 4pm for next-day. Account #BR-44021.',
      },
      'smithfield butchers': {
        name: 'Smithfield Butchers',
        rep: 'Dave Patel',
        phone: '020 7726 4143',
        email: 'dave@smithfieldbutchers.co.uk',
        notes: 'Cuts to spec available — give 48h for the fillet trim.',
      },
      'borough market produce': {
        name: 'Borough Market Produce',
        rep: 'Theo Marlow',
        phone: '020 7407 1002',
        email: 'theo@boroughproduce.co.uk',
        notes: 'Quality varies — confirm with Theo before substitutions. Weekly invoice.',
      },
      'bidfood': {
        name: 'Bidfood',
        rep: 'Helen Choudhury',
        phone: '0370 366 2300',
        email: 'orders.london@bidfood.co.uk',
        notes: 'Tue / Thu / Fri delivery slots. Email orders preferred over phone.',
      },
      'cuisine de france': {
        name: 'Cuisine de France',
        rep: 'Marc Lefèvre',
        phone: '020 3489 5500',
        email: 'orders@cuisinedefrance.co.uk',
        notes: 'Bakery cut-off 6pm. Frozen croissants ship in cases of 24.',
      },
    },
  };
}
