import { SHOWCASE_BANK } from './bank';
import { daysAgo } from './time';

// Recipes + their primary costing + optional re-costings to power GP trend.
// Costing ingredient `name` MUST match bank entry `name` so the app's
// allergen + nutrition computation (which matches by lowercased name) lights
// up automatically. Imported.ingredients[] is a separate display list with
// chef-style phrasing.

const bankById = new Map(SHOWCASE_BANK.map(b => [b.id, b] as const));

interface IngredientRef {
  bankId: string;
  qty: number;
  unit: 'kg' | 'g' | 'L' | 'ml' | 'ea' | 'bunch' | 'tbsp';
  display?: string; // chef-style line, e.g. "200g vine tomatoes, halved"
}

interface RecipeSpec {
  id: string;
  title: string;
  category: 'Starter' | 'Main' | 'Dessert' | 'Sauce' | 'Bread' | 'Pastry' | 'Stock' | 'Snack' | 'Other';
  imported: { method: string[]; servings?: number; prepTime?: string; cookTime?: string };
  locked?: boolean;
  manualMayContain?: string[];
  ingredients: IngredientRef[];
  sellPrice: number;
  portions: number;
  daysAgoCreated: number;
  daysAgoCosted: number;
  // Additional days-ago entries for the same dish — produces a re-costed
  // history that powers the GP trend feature. Drift is applied to ingredient
  // unit prices (cheaper old prices → today's GP looks worse than 2mo ago
  // for some dishes, better for others — realistic mixed signal).
  recostings?: { daysAgo: number; priceDeltaPct: number }[];
}

// Convert qty + unit to the "standard" unit of the bank entry (kg/L/ea).
// Mirrors the conversion in CostingView's line computation.
function toStandard(qty: number, unit: string, bankUnit: string): number {
  if (unit === bankUnit) return qty;
  if (unit === 'g'  && bankUnit === 'kg') return qty / 1000;
  if (unit === 'ml' && bankUnit === 'L')  return qty / 1000;
  if (unit === 'kg' && bankUnit === 'g')  return qty * 1000;
  if (unit === 'L'  && bankUnit === 'ml') return qty * 1000;
  // bunch / tbsp fall back to ea-style (1 unit) when bank is each
  if ((unit === 'bunch' || unit === 'tbsp') && bankUnit === 'ea') return qty;
  return qty;
}

function lineCost(ref: IngredientRef, priceMultiplier = 1): { line: number; price: number } {
  const b = bankById.get(ref.bankId);
  if (!b) return { line: 0, price: 0 };
  const price = b.unitPrice * priceMultiplier;
  const standard = toStandard(ref.qty, ref.unit, b.unit);
  return { line: standard * price, price };
}

// ── Recipe specs ──────────────────────────────────────────────
const SPECS: RecipeSpec[] = [
  // STARTERS — high GP (small portion costs)
  {
    id: 'seed-recipe-heritage-tomato-salad',
    title: 'Heritage tomato salad',
    category: 'Starter',
    imported: {
      method: [
        'Slice tomatoes into varied thicknesses and arrange on a chilled plate.',
        'Tear basil over the top, dress with olive oil and aged balsamic.',
        'Finish with Maldon sea salt and cracked black pepper.',
      ],
      servings: 1, prepTime: '8 min', cookTime: '0',
    },
    ingredients: [
      { bankId: 'seed-bank-tomatoes-vine', qty: 220, unit: 'g', display: '220g mixed heritage tomatoes, sliced' },
      { bankId: 'seed-bank-basil',         qty: 10,  unit: 'g', display: '10g fresh basil leaves' },
      { bankId: 'seed-bank-olive-oil',     qty: 15,  unit: 'ml', display: '15ml extra virgin olive oil' },
      { bankId: 'seed-bank-balsamic',      qty: 5,   unit: 'ml', display: '5ml aged balsamic' },
      { bankId: 'seed-bank-sea-salt',      qty: 2,   unit: 'g', display: 'Maldon sea salt' },
    ],
    sellPrice: 9.50, portions: 1, daysAgoCreated: 75, daysAgoCosted: 65,
    recostings: [{ daysAgo: 30, priceDeltaPct: 8 }, { daysAgo: 8, priceDeltaPct: 14 }],
  },
  {
    id: 'seed-recipe-pumpkin-soup',
    title: 'Roast pumpkin soup',
    category: 'Starter',
    imported: {
      method: [
        'Roast pumpkin with thyme and olive oil at 200°C for 35 min.',
        'Sweat onion and garlic in butter, add roasted pumpkin and stock.',
        'Blend smooth, finish with a swirl of double cream.',
      ],
      servings: 4, prepTime: '15 min', cookTime: '50 min',
    },
    ingredients: [
      { bankId: 'seed-bank-onions',          qty: 200, unit: 'g' },
      { bankId: 'seed-bank-butter-unsalted', qty: 40,  unit: 'g' },
      { bankId: 'seed-bank-garlic',          qty: 15,  unit: 'g' },
      { bankId: 'seed-bank-double-cream',    qty: 60,  unit: 'ml' },
      { bankId: 'seed-bank-thyme',           qty: 5,   unit: 'g' },
      { bankId: 'seed-bank-olive-oil',       qty: 20,  unit: 'ml' },
    ],
    sellPrice: 8.00, portions: 4, daysAgoCreated: 60, daysAgoCosted: 50,
    locked: true,
  },
  {
    id: 'seed-recipe-prawn-cocktail',
    title: 'Classic prawn cocktail',
    category: 'Starter',
    imported: {
      method: [
        'Mix prawns with marie rose dressing.',
        'Layer over shredded baby gem.',
        'Top with paprika, lemon wedge.',
      ],
      servings: 1, prepTime: '5 min', cookTime: '0',
    },
    manualMayContain: ['molluscs'], // cross-contamination from prep area
    ingredients: [
      { bankId: 'seed-bank-tiger-prawns', qty: 90, unit: 'g' },
      { bankId: 'seed-bank-lemons',       qty: 30, unit: 'g' },
    ],
    sellPrice: 12.50, portions: 1, daysAgoCreated: 50, daysAgoCosted: 42,
  },
  {
    id: 'seed-recipe-smoked-salmon-blinis',
    title: 'Smoked salmon blinis',
    category: 'Starter',
    imported: {
      method: [
        'Top warm blinis with crème fraîche.',
        'Drape with salmon ribbons, finish with dill and lemon zest.',
      ],
      servings: 1, prepTime: '10 min', cookTime: '5 min',
    },
    ingredients: [
      { bankId: 'seed-bank-salmon-fillet',  qty: 70,  unit: 'g' },
      { bankId: 'seed-bank-double-cream',   qty: 25,  unit: 'ml' },
      { bankId: 'seed-bank-plain-flour',    qty: 30,  unit: 'g' },
      { bankId: 'seed-bank-eggs-large',     qty: 1,   unit: 'ea' },
      { bankId: 'seed-bank-whole-milk',     qty: 30,  unit: 'ml' },
      { bankId: 'seed-bank-lemons',         qty: 10,  unit: 'g' },
    ],
    sellPrice: 11.00, portions: 1, daysAgoCreated: 45, daysAgoCosted: 35,
  },

  // MAINS — GP varied 65-78% for realistic spread
  {
    id: 'seed-recipe-beef-wellington',
    title: 'Beef Wellington',
    category: 'Main',
    imported: {
      method: [
        'Sear beef fillet hard on all sides, rest, brush with mustard.',
        'Layer mushroom duxelles + prosciutto on cling film, wrap fillet.',
        'Encase in all-butter puff, egg-wash, bake at 200°C until core 52°C.',
        'Rest 8 min before slicing.',
      ],
      servings: 1, prepTime: '40 min', cookTime: '25 min',
    },
    ingredients: [
      { bankId: 'seed-bank-beef-fillet',    qty: 220, unit: 'g' },
      { bankId: 'seed-bank-mushrooms',      qty: 80,  unit: 'g' },
      { bankId: 'seed-bank-pancetta',       qty: 30,  unit: 'g' },
      { bankId: 'seed-bank-puff-pastry',    qty: 120, unit: 'g' },
      { bankId: 'seed-bank-dijon-mustard',  qty: 10,  unit: 'g' },
      { bankId: 'seed-bank-eggs-large',     qty: 1,   unit: 'ea' },
      { bankId: 'seed-bank-butter-unsalted', qty: 15, unit: 'g' },
    ],
    sellPrice: 34.00, portions: 1, daysAgoCreated: 85, daysAgoCosted: 75,
    recostings: [{ daysAgo: 30, priceDeltaPct: 12 }, { daysAgo: 5, priceDeltaPct: 18 }],
  },
  {
    id: 'seed-recipe-pan-roast-salmon',
    title: 'Pan-roasted salmon',
    category: 'Main',
    imported: {
      method: [
        'Score skin, season generously, place skin-down in cold pan.',
        'Bring to medium-high until skin crisps, flip 90 seconds.',
        'Rest on samphire, butter-baste with lemon and thyme.',
      ],
      servings: 1, prepTime: '5 min', cookTime: '12 min',
    },
    ingredients: [
      { bankId: 'seed-bank-salmon-fillet',  qty: 180, unit: 'g' },
      { bankId: 'seed-bank-butter-unsalted', qty: 30, unit: 'g' },
      { bankId: 'seed-bank-spinach',        qty: 80,  unit: 'g' },
      { bankId: 'seed-bank-lemons',         qty: 30,  unit: 'g' },
      { bankId: 'seed-bank-thyme',          qty: 4,   unit: 'g' },
    ],
    sellPrice: 22.50, portions: 1, daysAgoCreated: 80, daysAgoCosted: 70,
  },
  {
    id: 'seed-recipe-lamb-shoulder',
    title: 'Slow-roast lamb shoulder',
    category: 'Main',
    imported: {
      method: [
        'Rub shoulder with garlic, rosemary, sea salt.',
        'Cover and slow-roast at 140°C for 4 hours.',
        'Rest, shred, serve with roasted carrots and a sherry jus.',
      ],
      servings: 4, prepTime: '20 min', cookTime: '4 hr',
    },
    ingredients: [
      { bankId: 'seed-bank-lamb-shoulder', qty: 900, unit: 'g' },
      { bankId: 'seed-bank-garlic',        qty: 30,  unit: 'g' },
      { bankId: 'seed-bank-thyme',         qty: 10,  unit: 'g' },
      { bankId: 'seed-bank-carrots',       qty: 400, unit: 'g' },
      { bankId: 'seed-bank-onions',        qty: 250, unit: 'g' },
      { bankId: 'seed-bank-olive-oil',     qty: 40,  unit: 'ml' },
    ],
    sellPrice: 26.00, portions: 4, daysAgoCreated: 70, daysAgoCosted: 60,
  },
  {
    id: 'seed-recipe-confit-duck',
    title: 'Confit duck leg',
    category: 'Main',
    imported: {
      method: [
        'Cure duck legs in salt + thyme overnight.',
        'Confit in own fat at 90°C for 4 hours.',
        'Crisp skin in pan, serve with lentils.',
      ],
      servings: 1, prepTime: '20 min', cookTime: '4 hr',
    },
    ingredients: [
      { bankId: 'seed-bank-duck-breast',   qty: 200, unit: 'g' },
      { bankId: 'seed-bank-thyme',         qty: 5,   unit: 'g' },
      { bankId: 'seed-bank-sea-salt',      qty: 15,  unit: 'g' },
      { bankId: 'seed-bank-garlic',        qty: 12,  unit: 'g' },
    ],
    sellPrice: 24.00, portions: 1, daysAgoCreated: 55, daysAgoCosted: 48,
  },
  {
    id: 'seed-recipe-mushroom-risotto',
    title: 'Wild mushroom risotto',
    category: 'Main',
    imported: {
      method: [
        'Sweat onion + garlic in butter, add rice and toast 2 min.',
        'Deglaze, add hot stock a ladle at a time.',
        'Fold in sautéed mushrooms, finish with parmesan + parsley.',
      ],
      servings: 1, prepTime: '10 min', cookTime: '25 min',
    },
    ingredients: [
      { bankId: 'seed-bank-arborio-rice',   qty: 80,  unit: 'g' },
      { bankId: 'seed-bank-mushrooms',      qty: 150, unit: 'g' },
      { bankId: 'seed-bank-parmesan',       qty: 35,  unit: 'g' },
      { bankId: 'seed-bank-butter-unsalted', qty: 30, unit: 'g' },
      { bankId: 'seed-bank-onions',         qty: 60,  unit: 'g' },
      { bankId: 'seed-bank-garlic',         qty: 8,   unit: 'g' },
      { bankId: 'seed-bank-parsley',        qty: 8,   unit: 'g' },
    ],
    sellPrice: 18.00, portions: 1, daysAgoCreated: 65, daysAgoCosted: 55,
    locked: true,
  },
  {
    id: 'seed-recipe-pappardelle-ragu',
    title: 'Pappardelle al ragù',
    category: 'Main',
    imported: {
      method: [
        'Build slow-cooked beef ragù: brown mince, add soffritto + passata, braise 2.5h.',
        'Toss with cooked pappardelle and emulsifying water.',
        'Finish with parmesan and torn basil.',
      ],
      servings: 1, prepTime: '20 min', cookTime: '2.5 hr',
    },
    ingredients: [
      { bankId: 'seed-bank-pasta-pappardelle', qty: 120, unit: 'g' },
      { bankId: 'seed-bank-beef-fillet',     qty: 80,  unit: 'g' },
      { bankId: 'seed-bank-tomato-passata',  qty: 200, unit: 'ml' },
      { bankId: 'seed-bank-onions',          qty: 80,  unit: 'g' },
      { bankId: 'seed-bank-carrots',         qty: 50,  unit: 'g' },
      { bankId: 'seed-bank-garlic',          qty: 10,  unit: 'g' },
      { bankId: 'seed-bank-parmesan',        qty: 25,  unit: 'g' },
      { bankId: 'seed-bank-basil',           qty: 5,   unit: 'g' },
    ],
    sellPrice: 16.50, portions: 1, daysAgoCreated: 50, daysAgoCosted: 40,
  },
  {
    id: 'seed-recipe-cod-mussels',
    title: 'Cod with mussel bouillabaisse',
    category: 'Main',
    imported: {
      method: [
        'Sear cod skin-side until crisp, finish in oven.',
        'Build saffron bouillabaisse with mussels.',
        'Serve cod over broth with potato confit and rouille.',
      ],
      servings: 1, prepTime: '20 min', cookTime: '15 min',
    },
    ingredients: [
      { bankId: 'seed-bank-cod-loin',        qty: 180, unit: 'g' },
      { bankId: 'seed-bank-mussels',         qty: 200, unit: 'g' },
      { bankId: 'seed-bank-anchovies',       qty: 10,  unit: 'g' },
      { bankId: 'seed-bank-tomato-passata',  qty: 80,  unit: 'ml' },
      { bankId: 'seed-bank-potatoes',        qty: 120, unit: 'g' },
    ],
    sellPrice: 26.50, portions: 1, daysAgoCreated: 40, daysAgoCosted: 32,
  },
  {
    id: 'seed-recipe-chicken-supreme',
    title: 'Roast chicken supreme',
    category: 'Main',
    imported: {
      method: [
        'Brine breast for 2h, pat dry.',
        'Sear skin-side, finish in oven 8 min.',
        'Serve with crushed potatoes, jus, watercress.',
      ],
      servings: 1, prepTime: '10 min', cookTime: '18 min',
    },
    ingredients: [
      { bankId: 'seed-bank-chicken-breast',  qty: 220, unit: 'g' },
      { bankId: 'seed-bank-potatoes',        qty: 200, unit: 'g' },
      { bankId: 'seed-bank-butter-unsalted', qty: 25,  unit: 'g' },
      { bankId: 'seed-bank-thyme',           qty: 4,   unit: 'g' },
      { bankId: 'seed-bank-garlic',          qty: 8,   unit: 'g' },
    ],
    sellPrice: 19.00, portions: 1, daysAgoCreated: 35, daysAgoCosted: 25,
  },
  {
    id: 'seed-recipe-pork-belly-asian',
    title: 'Asian-glazed pork belly',
    category: 'Main',
    imported: {
      method: [
        'Slow-braise pork belly in soy + ginger stock 3h.',
        'Press, portion, glaze with reduction.',
        'Crisp under salamander, serve with stir-fried greens.',
      ],
      servings: 1, prepTime: '25 min', cookTime: '3 hr',
    },
    ingredients: [
      { bankId: 'seed-bank-pork-belly',  qty: 200, unit: 'g' },
      { bankId: 'seed-bank-soy-sauce',   qty: 25,  unit: 'ml' },
      { bankId: 'seed-bank-garlic',      qty: 10,  unit: 'g' },
      { bankId: 'seed-bank-spinach',     qty: 100, unit: 'g' },
    ],
    sellPrice: 20.00, portions: 1, daysAgoCreated: 28, daysAgoCosted: 18,
    recostings: [{ daysAgo: 6, priceDeltaPct: -5 }],
  },

  // DESSERTS — high GP
  {
    id: 'seed-recipe-chocolate-fondant',
    title: 'Chocolate fondant',
    category: 'Dessert',
    imported: {
      method: [
        'Whisk eggs + sugar until pale.',
        'Fold in melted dark chocolate + butter, then flour.',
        'Bake at 200°C for exactly 9 min. Turn out, serve immediately.',
      ],
      servings: 1, prepTime: '8 min', cookTime: '9 min',
    },
    ingredients: [
      { bankId: 'seed-bank-eggs-large',      qty: 2,  unit: 'ea' },
      { bankId: 'seed-bank-butter-unsalted', qty: 50, unit: 'g' },
      { bankId: 'seed-bank-caster-sugar',    qty: 40, unit: 'g' },
      { bankId: 'seed-bank-plain-flour',     qty: 25, unit: 'g' },
    ],
    sellPrice: 9.50, portions: 1, daysAgoCreated: 90, daysAgoCosted: 80,
    locked: true,
  },
  {
    id: 'seed-recipe-creme-brulee',
    title: 'Vanilla crème brûlée',
    category: 'Dessert',
    imported: {
      method: [
        'Infuse cream with vanilla, whisk yolks + sugar.',
        'Combine, strain, bake in bain-marie at 140°C until just set.',
        'Chill, dust with sugar, blowtorch to crack.',
      ],
      servings: 4, prepTime: '15 min', cookTime: '45 min',
    },
    ingredients: [
      { bankId: 'seed-bank-double-cream',   qty: 400, unit: 'ml' },
      { bankId: 'seed-bank-eggs-large',     qty: 6,   unit: 'ea' },
      { bankId: 'seed-bank-caster-sugar',   qty: 100, unit: 'g' },
    ],
    sellPrice: 7.50, portions: 4, daysAgoCreated: 70, daysAgoCosted: 60,
  },
  {
    id: 'seed-recipe-lemon-tart',
    title: 'Lemon tart',
    category: 'Dessert',
    imported: {
      method: [
        'Blind-bake sweet pastry shell.',
        'Whisk eggs, lemon, cream, sugar; pour and bake low until just set.',
        'Chill, brûlée or dust with icing sugar.',
      ],
      servings: 6, prepTime: '30 min', cookTime: '50 min',
    },
    ingredients: [
      { bankId: 'seed-bank-eggs-large',      qty: 5,   unit: 'ea' },
      { bankId: 'seed-bank-caster-sugar',    qty: 150, unit: 'g' },
      { bankId: 'seed-bank-double-cream',    qty: 100, unit: 'ml' },
      { bankId: 'seed-bank-lemons',          qty: 250, unit: 'g' },
      { bankId: 'seed-bank-plain-flour',     qty: 175, unit: 'g' },
      { bankId: 'seed-bank-butter-unsalted', qty: 100, unit: 'g' },
    ],
    sellPrice: 7.00, portions: 6, daysAgoCreated: 55, daysAgoCosted: 45,
  },

  // SAUCES
  {
    id: 'seed-recipe-hollandaise',
    title: 'Hollandaise',
    category: 'Sauce',
    imported: {
      method: [
        'Whisk yolks over bain-marie to ribbon stage.',
        'Slowly emulsify in clarified butter.',
        'Season with lemon, cayenne, salt.',
      ],
      servings: 4, prepTime: '12 min', cookTime: '5 min',
    },
    ingredients: [
      { bankId: 'seed-bank-eggs-large',      qty: 4,   unit: 'ea' },
      { bankId: 'seed-bank-butter-unsalted', qty: 200, unit: 'g' },
      { bankId: 'seed-bank-lemons',          qty: 30,  unit: 'g' },
    ],
    sellPrice: 0, portions: 4, daysAgoCreated: 95, daysAgoCosted: 90,
  },
];

// ── Builders ─────────────────────────────────────────────────
export interface ShowcaseRecipe {
  id: string;
  title: string;
  category: string;
  locked?: boolean;
  linkedCostingId?: string;
  imported?: { ingredients: string[]; method?: string[]; servings?: number; prepTime?: string; cookTime?: string };
  allergens?: { mayContain: string[]; contains: string[]; treeNutTypes?: string[]; cerealTypes?: string[] };
  notes?: string;
  photoUrl?: string | null;
  createdAt: number;
  addedBy?: string;
}

export interface ShowcaseCosting {
  id: string;
  name: string;
  sell: number;
  cost: number;
  gp: number;
  pct: number;
  target: number;
  portions: number;
  currency: string;
  savedAt: number;
  ingredients: { name: string; qty: number; unit: string; price: number; line: number }[];
}

function buildCosting(spec: RecipeSpec, savedAtMs: number, priceMultiplier: number, idSuffix: string): ShowcaseCosting {
  const ingredients = spec.ingredients.map(ref => {
    const b = bankById.get(ref.bankId);
    const { line, price } = lineCost(ref, priceMultiplier);
    return {
      name: b?.name ?? ref.bankId,
      qty: ref.qty,
      unit: ref.unit,
      price,
      line,
    };
  });
  const totalCost = ingredients.reduce((a, b) => a + b.line, 0);
  const costPerCover = spec.portions > 0 ? totalCost / spec.portions : totalCost;
  const sell = spec.sellPrice;
  const gpAbs = sell - costPerCover;
  const pct = sell > 0 ? (gpAbs / sell) * 100 : 0;
  return {
    id: `seed-costing-${spec.id.replace('seed-recipe-', '')}${idSuffix}`,
    name: spec.title,
    sell,
    cost: costPerCover,
    gp: gpAbs,
    pct,
    target: 72,
    portions: spec.portions,
    currency: 'GBP',
    savedAt: savedAtMs,
    ingredients,
  };
}

export function buildShowcaseRecipesAndCostings(): { recipes: ShowcaseRecipe[]; costings: ShowcaseCosting[] } {
  const recipes: ShowcaseRecipe[] = [];
  const costings: ShowcaseCosting[] = [];

  for (const spec of SPECS) {
    // Build all costings for this spec — the original base-price one plus any
    // re-costed historical entries with price drift. recipe.linkedCostingId
    // then points to whichever has the MOST RECENT savedAt so menu
    // engineering / GP reports evaluate the dish against today's cost basis,
    // not 60-90 day old prices. (Earlier versions of this seed linked to the
    // base-price entry by default, which made re-costed dishes look
    // artificially high-margin — Star quadrant captured everything.)
    const baseCosting = buildCosting(spec, daysAgo(spec.daysAgoCosted), 1.0, '-base');
    costings.push(baseCosting);

    let latestCosting = baseCosting;
    if (spec.recostings) {
      for (const rc of spec.recostings) {
        const mult = 1 + rc.priceDeltaPct / 100;
        const id = `-rc-${rc.daysAgo}`;
        const c = buildCosting(spec, daysAgo(rc.daysAgo), mult, id);
        costings.push(c);
        if (c.savedAt > latestCosting.savedAt) latestCosting = c;
      }
    }

    // Chef-style imported.ingredients list — falls back to bank name if no
    // display string was provided.
    const imported = {
      ingredients: spec.ingredients.map(ref => {
        if (ref.display) return ref.display;
        const b = bankById.get(ref.bankId);
        return `${ref.qty}${ref.unit} ${b?.name ?? ref.bankId}`;
      }),
      method: spec.imported.method,
      servings: spec.imported.servings,
      prepTime: spec.imported.prepTime,
      cookTime: spec.imported.cookTime,
    };

    recipes.push({
      id: spec.id,
      title: spec.title,
      category: spec.category,
      locked: spec.locked,
      linkedCostingId: latestCosting.id,
      imported,
      allergens: spec.manualMayContain
        ? { mayContain: spec.manualMayContain, contains: [] }
        : { mayContain: [], contains: [] },
      notes: '',
      photoUrl: null,
      createdAt: daysAgo(spec.daysAgoCreated),
    });
  }

  return { recipes, costings };
}
