import { daysAgo } from './time';
import { OUTLET_IDS } from './outlets';

// Notebook seed — chef-style notes pinned to specific recipes (recipeId)
// plus a couple of unpinned reflections. Notebook displays as a feed with
// recipe context shown when a note is linked.

export interface ShowcaseNote {
  id: string;
  title?: string;
  content: string;
  recipeId?: string;
  createdAt: number;
  updatedAt?: number;
  // Some notes are site-specific (service incidents, prep at the central
  // kitchen). Others are account-level chef ideas — left unscoped so they
  // surface on every outlet via the legacy-fallback path.
  outletId?: string;
}

export function buildShowcaseNotes(): ShowcaseNote[] {
  return [
    {
      id: 'seed-note-001',
      title: 'Beef Wellington — supplier change',
      content: 'Switched the fillet to Smithfield. Better marbling but ~£2/kg more. GP holding at 65% on the dinner menu — keep an eye on next month\'s invoice.',
      recipeId: 'seed-recipe-beef-wellington',
      createdAt: daysAgo(28),
    },
    {
      id: 'seed-note-002',
      title: 'Fondant timing',
      content: 'Oven runs hot near the back-right element — 8 min 30 sec there, full 9 min in the middle two shelves. Centre still molten = perfect.',
      recipeId: 'seed-recipe-chocolate-fondant',
      createdAt: daysAgo(45),
    },
    {
      id: 'seed-note-003',
      content: 'Pumpkin soup feedback Friday service: table 4 said "really vibrant". Worth pushing on social.',
      recipeId: 'seed-recipe-pumpkin-soup',
      createdAt: daysAgo(12),
    },
    {
      id: 'seed-note-004',
      title: 'Cod arrived poor quality',
      content: 'Wednesday delivery — flesh dull, smelled too strong. Returned. Brakes credited the invoice. Going to flag this if it happens again next week.',
      recipeId: 'seed-recipe-cod-mussels',
      createdAt: daysAgo(8),
      outletId: OUTLET_IDS.soho,
    },
    {
      id: 'seed-note-005',
      title: 'Salmon spec sheet drafted',
      content: 'Wrote up the salmon spec — skin score depth, internal target 48°C carryover to 52°C, plate temp warm not hot. Pinned to the pass for new starters.',
      recipeId: 'seed-recipe-pan-roast-salmon',
      createdAt: daysAgo(20),
    },
    {
      id: 'seed-note-006',
      content: 'GP audit Q1: average sitting at 71.2%, target is 72%. Big drags are the chicken supreme and the cod-mussels — both running below 70%. Investigate substitution options.',
      createdAt: daysAgo(5),
    },
    {
      id: 'seed-note-007',
      title: 'Risotto — agitation discipline',
      content: 'Stirring matters less than the heat. New chefs over-stir and break the grain. Train them on the gentle fold technique — see Massimo Bottura clip.',
      recipeId: 'seed-recipe-mushroom-risotto',
      createdAt: daysAgo(35),
    },
    {
      id: 'seed-note-008',
      content: 'Holiday Friday — heavy bookings (124 covers projected). Pre-portion fillets at 3pm, set up two wellington stations.',
      createdAt: daysAgo(2),
      outletId: OUTLET_IDS.soho,
    },
    {
      id: 'seed-note-009',
      title: 'Marylebone bar — cocktail garnish stock',
      content: 'Citrus dehydrator wheels keep running low Friday/Saturday. Bump par to 200 wheels and pre-batch the rosemary/thyme bundles on Thursday morning.',
      createdAt: daysAgo(6),
      outletId: OUTLET_IDS.marylebone,
    },
    {
      id: 'seed-note-010',
      title: 'CK prep schedule — wellington fillets',
      content: 'Bermondsey prep team to portion + chain-wrap fillets every Tuesday morning for Soho service. Delivery 1pm via fridge van. Mark batch with weight + date.',
      createdAt: daysAgo(14),
      outletId: OUTLET_IDS.centralKitchen,
    },
  ];
}
