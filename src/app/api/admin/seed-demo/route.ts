import { NextResponse } from 'next/server';
import { isAuthorized, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── DEMO DATA ─────────────────────────────────────────────────────────────
// Stable string ids so cross-references (recipe → costing, bank → costing
// ingredient line, menu → recipe) line up. The app never inspects the format
// of these ids — they just need to be unique within their slice.

const NOW = Date.now();
const D = (days: number) => NOW - days * 86400000;

// Bank — covers everything used in the recipes below. Names are canonical so
// the computed-allergens/nutrition match-by-name in RecipesView fires.
const bank = [
  { id: 'bnk-flour',      name: 'Plain flour',     unit: 'kg', unitPrice: 0.85,  category: 'Dry Goods & Grains', supplier: 'Brakes',     allergens: { contains: ['gluten'], glutenTypes: ['Wheat'], nutTypes: [] }, nutrition: { kcal: 364, kj: 1543, fat: 1.0, saturates: 0.2, carbs: 76,  sugars: 0.3,  protein: 10,   salt: 0.01, fibre: 2.7 } },
  { id: 'bnk-bread-flour',name: 'Strong bread flour', unit: 'kg', unitPrice: 1.10, category: 'Bakery & Pastry',    supplier: 'Brakes',     allergens: { contains: ['gluten'], glutenTypes: ['Wheat'], nutTypes: [] }, nutrition: { kcal: 359, kj: 1521, fat: 1.5, saturates: 0.3, carbs: 73,  sugars: 0.4,  protein: 12.5, salt: 0.01, fibre: 3.5 } },
  { id: 'bnk-caster',     name: 'Caster sugar',    unit: 'kg', unitPrice: 1.10,  category: 'Dry Goods & Grains', supplier: 'Brakes',     allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 400, kj: 1700, fat: 0,   saturates: 0,   carbs: 100, sugars: 100,  protein: 0,    salt: 0,    fibre: 0 } },
  { id: 'bnk-icing',      name: 'Icing sugar',     unit: 'kg', unitPrice: 1.40,  category: 'Dry Goods & Grains', supplier: 'Brakes',     allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 396, kj: 1683, fat: 0,   saturates: 0,   carbs: 99,  sugars: 99,   protein: 0,    salt: 0,    fibre: 0 } },
  { id: 'bnk-salt',       name: 'Sea salt',        unit: 'kg', unitPrice: 1.80,  category: 'Spices & Seasonings', supplier: 'Cotswold',   allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 0,   kj: 0,    fat: 0,   saturates: 0,   carbs: 0,   sugars: 0,    protein: 0,    salt: 100,  fibre: 0 } },
  { id: 'bnk-pepper',     name: 'Black pepper',    unit: 'kg', unitPrice: 24,    category: 'Spices & Seasonings', supplier: 'Cotswold',   allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 251, kj: 1062, fat: 3.3, saturates: 1,   carbs: 64,  sugars: 0.6,  protein: 10,   salt: 0.05, fibre: 25 } },
  { id: 'bnk-olive-oil',  name: 'Olive oil',       unit: 'l',  unitPrice: 6.50,  category: 'Oils & Vinegars',     supplier: 'Brakes',     allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 884, kj: 3700, fat: 100, saturates: 14,  carbs: 0,   sugars: 0,    protein: 0,    salt: 0,    fibre: 0 } },
  { id: 'bnk-veg-oil',    name: 'Vegetable oil',   unit: 'l',  unitPrice: 2.20,  category: 'Oils & Vinegars',     supplier: 'Brakes',     allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 884, kj: 3700, fat: 100, saturates: 9,   carbs: 0,   sugars: 0,    protein: 0,    salt: 0,    fibre: 0 } },
  { id: 'bnk-butter',     name: 'Unsalted butter', unit: 'kg', unitPrice: 7.20,  category: 'Dairy & Eggs',        supplier: 'Yeo Valley',  allergens: { contains: ['milk'],   glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 717, kj: 2950, fat: 81,  saturates: 51,  carbs: 0.1, sugars: 0.1,  protein: 0.9,  salt: 0.01, fibre: 0 } },
  { id: 'bnk-double-cream', name: 'Double cream',  unit: 'l',  unitPrice: 4.10,  category: 'Dairy & Eggs',        supplier: 'Yeo Valley',  allergens: { contains: ['milk'],   glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 467, kj: 1923, fat: 50,  saturates: 31,  carbs: 2.5, sugars: 2.5,  protein: 1.7,  salt: 0.05, fibre: 0 } },
  { id: 'bnk-milk',       name: 'Whole milk',      unit: 'l',  unitPrice: 1.05,  category: 'Dairy & Eggs',        supplier: 'Yeo Valley',  allergens: { contains: ['milk'],   glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 64,  kj: 268,  fat: 3.6, saturates: 2.3, carbs: 4.8, sugars: 4.8,  protein: 3.4,  salt: 0.1,  fibre: 0 } },
  { id: 'bnk-eggs',       name: 'Free-range eggs', unit: 'ea', unitPrice: 0.35,  category: 'Dairy & Eggs',        supplier: 'Cotswold',    allergens: { contains: ['eggs'],   glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 143, kj: 597,  fat: 9.5, saturates: 3.1, carbs: 0.7, sugars: 0.7,  protein: 13,   salt: 0.4,  fibre: 0 } },
  { id: 'bnk-parmesan',   name: 'Parmesan',        unit: 'kg', unitPrice: 16,    category: 'Dairy & Eggs',        supplier: 'Brakes',      allergens: { contains: ['milk'],   glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 392, kj: 1635, fat: 29,  saturates: 19,  carbs: 4.1, sugars: 0.9,  protein: 36,   salt: 1.6,  fibre: 0 } },
  { id: 'bnk-salmon',     name: 'Salmon fillet',   unit: 'kg', unitPrice: 22,    category: 'Fish & Seafood',      supplier: 'Direct Seafoods', allergens: { contains: ['fish'],glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 208, kj: 871,  fat: 13,  saturates: 3,   carbs: 0,   sugars: 0,    protein: 22,   salt: 0.1,  fibre: 0 } },
  { id: 'bnk-cod',        name: 'Cod fillet',      unit: 'kg', unitPrice: 18,    category: 'Fish & Seafood',      supplier: 'Direct Seafoods', allergens: { contains: ['fish'],glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 82,  kj: 343,  fat: 0.7, saturates: 0.1, carbs: 0,   sugars: 0,    protein: 18,   salt: 0.2,  fibre: 0 } },
  { id: 'bnk-crab',       name: 'White crab meat', unit: 'kg', unitPrice: 38,    category: 'Fish & Seafood',      supplier: 'Direct Seafoods', allergens: { contains: ['crustaceans'], glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 87, kj: 364,  fat: 1.5, saturates: 0.2, carbs: 0,   sugars: 0,    protein: 19,   salt: 0.6,  fibre: 0 } },
  { id: 'bnk-anchovy',    name: 'Anchovy fillets', unit: 'kg', unitPrice: 28,    category: 'Tinned & Preserved',  supplier: 'Brakes',      allergens: { contains: ['fish'],   glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 210, kj: 879,  fat: 10,  saturates: 2.3, carbs: 0,   sugars: 0,    protein: 29,   salt: 3.7,  fibre: 0 } },
  { id: 'bnk-beef-chuck', name: 'Beef chuck',      unit: 'kg', unitPrice: 14,    category: 'Meat & Poultry',      supplier: 'Aubrey Allen', allergens: { contains: [],        glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 215, kj: 902,  fat: 13,  saturates: 5,   carbs: 0,   sugars: 0,    protein: 23,   salt: 0.18, fibre: 0 } },
  { id: 'bnk-bacon',      name: 'Smoked streaky bacon', unit: 'kg', unitPrice: 11, category: 'Meat & Poultry',     supplier: 'Aubrey Allen', allergens: { contains: [],        glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 417, kj: 1737, fat: 38,  saturates: 13,  carbs: 0.6, sugars: 0,    protein: 18,   salt: 2.5,  fibre: 0 } },
  { id: 'bnk-onion',      name: 'Onion',           unit: 'kg', unitPrice: 1.10,  category: 'Fresh Produce',       supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 40,  kj: 167,  fat: 0.1, saturates: 0,   carbs: 9.3, sugars: 4.2,  protein: 1.1,  salt: 0.01, fibre: 1.7 } },
  { id: 'bnk-shallot',    name: 'Shallot',         unit: 'kg', unitPrice: 3.20,  category: 'Fresh Produce',       supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 72,  kj: 301,  fat: 0.1, saturates: 0,   carbs: 17,  sugars: 7.8,  protein: 2.5,  salt: 0.04, fibre: 3.2 } },
  { id: 'bnk-garlic',     name: 'Garlic',          unit: 'kg', unitPrice: 6.80,  category: 'Fresh Produce',       supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 149, kj: 623,  fat: 0.5, saturates: 0.1, carbs: 33,  sugars: 1,    protein: 6.4,  salt: 0.04, fibre: 2.1 } },
  { id: 'bnk-tomato',     name: 'Tomato (canned)', unit: 'kg', unitPrice: 1.40,  category: 'Tinned & Preserved',  supplier: 'Brakes',      allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 18,  kj: 75,   fat: 0.2, saturates: 0,   carbs: 3.2, sugars: 2.6,  protein: 0.9,  salt: 0.01, fibre: 1.2 } },
  { id: 'bnk-mushroom',   name: 'Chestnut mushroom', unit: 'kg', unitPrice: 4.40, category: 'Fresh Produce',       supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 22,  kj: 92,   fat: 0.3, saturates: 0,   carbs: 3.3, sugars: 1.7,  protein: 3.1,  salt: 0.01, fibre: 1   } },
  { id: 'bnk-arborio',    name: 'Arborio rice',    unit: 'kg', unitPrice: 3.80,  category: 'Dry Goods & Grains',  supplier: 'Brakes',      allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 354, kj: 1481, fat: 0.6, saturates: 0.2, carbs: 80,  sugars: 0.1,  protein: 6.6,  salt: 0,    fibre: 1.4 } },
  { id: 'bnk-lemon',      name: 'Lemon',           unit: 'kg', unitPrice: 2.40,  category: 'Fresh Produce',       supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 29,  kj: 121,  fat: 0.3, saturates: 0,   carbs: 9,   sugars: 2.5,  protein: 1.1,  salt: 0,    fibre: 2.8 } },
  { id: 'bnk-baby-gem',   name: 'Baby gem lettuce', unit: 'ea', unitPrice: 0.85, category: 'Fresh Produce',       supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 15,  kj: 63,   fat: 0.2, saturates: 0,   carbs: 2.9, sugars: 0.8,  protein: 1.4,  salt: 0.01, fibre: 1.3 } },
  { id: 'bnk-potato',     name: 'Maris Piper potato', unit: 'kg', unitPrice: 0.95, category: 'Fresh Produce',     supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 77,  kj: 322,  fat: 0.1, saturates: 0,   carbs: 17,  sugars: 0.8,  protein: 2,    salt: 0.01, fibre: 2.2 } },
  { id: 'bnk-peas',       name: 'Garden peas (frozen)', unit: 'kg', unitPrice: 2.40, category: 'Frozen Produce',  supplier: 'Brakes',      allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 81,  kj: 339,  fat: 0.4, saturates: 0.1, carbs: 14,  sugars: 5.7,  protein: 5.4,  salt: 0,    fibre: 5.7 } },
  { id: 'bnk-white-wine', name: 'Dry white wine (cooking)', unit: 'l', unitPrice: 4.50, category: 'Beverages',     supplier: 'Bibendum',    allergens: { contains: ['sulphites'], glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 82,  kj: 343,  fat: 0,   saturates: 0,   carbs: 2.6, sugars: 1,    protein: 0.1,  salt: 0,    fibre: 0 } },
  { id: 'bnk-red-wine',   name: 'Red wine (cooking)', unit: 'l', unitPrice: 5.20, category: 'Beverages',          supplier: 'Bibendum',    allergens: { contains: ['sulphites'], glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 85,  kj: 356,  fat: 0,   saturates: 0,   carbs: 2.6, sugars: 0.6,  protein: 0.1,  salt: 0,    fibre: 0 } },
  { id: 'bnk-beer',       name: 'Lager (cooking)', unit: 'l',  unitPrice: 2.80,  category: 'Beverages',           supplier: 'Bibendum',    allergens: { contains: ['gluten'], glutenTypes: ['Barley'], nutTypes: [] }, nutrition: { kcal: 43, kj: 180, fat: 0,   saturates: 0,   carbs: 3.6, sugars: 0,    protein: 0.5,  salt: 0,    fibre: 0 } },
  { id: 'bnk-stock-chicken', name: 'Chicken stock', unit: 'l', unitPrice: 1.60,  category: 'Tinned & Preserved',  supplier: 'Brakes',      allergens: { contains: ['celery'], glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 14,  kj: 59,   fat: 0.5, saturates: 0.1, carbs: 1.2, sugars: 0.4,  protein: 1.1,  salt: 0.6,  fibre: 0 } },
  { id: 'bnk-chocolate',  name: 'Dark chocolate (70%)', unit: 'kg', unitPrice: 9.50, category: 'Bakery & Pastry', supplier: 'Brakes',     allergens: { contains: ['milk', 'soybeans', 'nuts'], glutenTypes: [], nutTypes: ['Hazelnut'] }, nutrition: { kcal: 580, kj: 2424, fat: 42, saturates: 24, carbs: 39, sugars: 24, protein: 6.2, salt: 0.02, fibre: 12 } },
  { id: 'bnk-cocoa',      name: 'Cocoa powder',    unit: 'kg', unitPrice: 8.20,  category: 'Bakery & Pastry',     supplier: 'Brakes',      allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 228, kj: 953,  fat: 14,  saturates: 8,   carbs: 58,  sugars: 1.7,  protein: 19,   salt: 0.05, fibre: 33 } },
  { id: 'bnk-apple',      name: 'Bramley apple',   unit: 'kg', unitPrice: 2.60,  category: 'Fresh Produce',       supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 47,  kj: 197,  fat: 0.1, saturates: 0,   carbs: 11,  sugars: 11,   protein: 0.4,  salt: 0,    fibre: 2.4 } },
  { id: 'bnk-basil',      name: 'Fresh basil',     unit: 'kg', unitPrice: 36,    category: 'Fresh Herbs',         supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 23,  kj: 96,   fat: 0.6, saturates: 0,   carbs: 2.6, sugars: 0.3,  protein: 3.2,  salt: 0.01, fibre: 1.6 } },
  { id: 'bnk-thyme',      name: 'Fresh thyme',     unit: 'kg', unitPrice: 42,    category: 'Fresh Herbs',         supplier: 'Reynolds',    allergens: { contains: [],         glutenTypes: [], nutTypes: [] }, nutrition: { kcal: 101, kj: 423,  fat: 1.7, saturates: 0.5, carbs: 24,  sugars: 0,    protein: 5.6,  salt: 0.02, fibre: 14 } },
];

// Recipes — the human-facing entries. linkedCostingId points at gpHistory.
const recipes = [
  { id: 'rec-salmon',   title: 'Pan-seared Salmon, Lemon Beurre Blanc', category: 'Main',    notes: 'Score the skin lightly so it crisps evenly. Beurre blanc breaks above 60°C — keep just warm.', url: '', tags: [], linkedNoteIds: [], createdAt: D(45), allergens: { mayContain: ['crustaceans'] }, locked: false, linkedCostingId: 'gp-salmon',   imported: { description: 'Skin-on Scottish salmon with a classic white-wine and butter sauce, lemon-bright finish.', servings: '1', prepTime: '10 min', cookTime: '12 min', ingredients: ['180g salmon fillet, skin on', '50g unsalted butter, cubed', '50ml dry white wine', '1 shallot, finely chopped', '0.5 lemon, juiced', 'sea salt and black pepper'], method: ['Pat the salmon completely dry. Season skin generously.', 'Heat a non-stick pan over medium-high. Add a splash of oil, then place salmon skin-side down. Press for 30s, then leave for 5 min.', 'Flip, cook another 1-2 min. Rest off heat.', 'In a separate pan reduce wine + shallot to a glaze. Take off heat, whisk butter in cube by cube to emulsify.', 'Finish with lemon juice, salt, pepper. Spoon over salmon to serve.'] } },
  { id: 'rec-bourguignon', title: 'Beef Bourguignon', category: 'Main', notes: 'Make a day ahead — flavour deepens overnight. Pearl onions and bacon lardons are non-negotiable.', url: '', tags: [], linkedNoteIds: [], createdAt: D(60), allergens: { mayContain: [] }, locked: true, linkedCostingId: 'gp-bourg', imported: { description: 'Classic Burgundian beef stew, slow-braised in red wine with bacon, mushrooms and pearl onions.', servings: '6', prepTime: '30 min', cookTime: '3 hr', ingredients: ['1.2kg beef chuck, cubed', '200g smoked streaky bacon, lardons', '500ml red wine', '500ml chicken stock', '300g chestnut mushrooms, halved', '2 onions, diced', '4 cloves garlic, crushed', 'plain flour for dusting', '4 sprigs thyme'], method: ['Render bacon in a heavy casserole until crisp. Set aside.', 'Brown floured beef in batches in the bacon fat. Set aside.', 'Soften onions and garlic. Deglaze with wine, reduce by half.', 'Return beef + bacon to pot. Add stock, thyme. Cover, braise at 150°C for 2.5 hr.', 'Sauté mushrooms separately, fold in 30 min before serving.'] } },
  { id: 'rec-crab-cakes', title: 'Crab Cakes, Sriracha Aioli', category: 'Starter', notes: 'Bind just enough — too much breadcrumb and they\'re stodgy.', url: '', tags: [], linkedNoteIds: [], createdAt: D(20), allergens: { mayContain: ['molluscs', 'fish'] }, locked: false, linkedCostingId: 'gp-crab', imported: { description: 'Hand-picked white crab, panko-crusted and pan-fried, with a quick Sriracha aioli.', servings: '4', prepTime: '20 min', cookTime: '8 min', ingredients: ['400g white crab meat', '1 free-range egg', '50g plain flour', '20g unsalted butter, melted', '1 lemon, zested', 'salt and pepper', 'oil for frying'], method: ['Combine crab, egg, flour, butter, lemon zest. Season.', 'Form into 8 patties, chill 20 min.', 'Pan-fry in vegetable oil 3-4 min per side until golden.', 'Serve with aioli and lemon wedges.'] } },
  { id: 'rec-risotto',  title: 'Wild Mushroom Risotto', category: 'Main', notes: '', url: '', tags: [], linkedNoteIds: [], createdAt: D(15), allergens: { mayContain: [] }, locked: false, linkedCostingId: 'gp-risotto', imported: { description: 'Arborio risotto with chestnut mushrooms, white wine, finished with parmesan and butter.', servings: '4', prepTime: '15 min', cookTime: '25 min', ingredients: ['320g arborio rice', '400g chestnut mushrooms, sliced', '150ml dry white wine', '1.2L chicken stock, hot', '1 onion, finely diced', '2 cloves garlic', '60g parmesan, grated', '40g unsalted butter', 'olive oil'], method: ['Sweat onion + garlic in olive oil until soft.', 'Add rice, toast 1 min. Pour in wine, stir until absorbed.', 'Ladle stock in a bit at a time, stirring, until rice is al dente (18-20 min).', 'Sauté mushrooms separately in butter, fold through.', 'Off heat, beat in butter and parmesan. Rest 2 min before serving.'] } },
  { id: 'rec-fondant',  title: 'Chocolate Fondant', category: 'Dessert', notes: 'Bake from frozen for the cleanest molten centre.', url: '', tags: [], linkedNoteIds: [], createdAt: D(10), allergens: { mayContain: [] }, locked: false, linkedCostingId: 'gp-fondant', imported: { description: 'Individual molten-centre chocolate puddings — 12 min from freezer to plate.', servings: '6', prepTime: '15 min', cookTime: '12 min', ingredients: ['200g dark chocolate (70%)', '200g unsalted butter', '4 free-range eggs + 4 yolks', '100g caster sugar', '60g plain flour', 'cocoa powder for dusting'], method: ['Butter and cocoa-dust 6 ramekins.', 'Melt chocolate + butter together. Cool slightly.', 'Whisk eggs, yolks, sugar to ribbon stage. Fold in chocolate, then flour.', 'Divide between ramekins, freeze at least 1 hr (or up to a week).', 'Bake from frozen at 200°C for 12 min. Edge set, centre molten. Turn out immediately.'] } },
  { id: 'rec-sourdough', title: 'Country Sourdough', category: 'Bread', notes: '24h cold ferment in fridge gives best crumb open.', url: '', tags: [], linkedNoteIds: [], createdAt: D(80), allergens: { mayContain: [] }, locked: true, linkedCostingId: 'gp-sourdough', imported: { description: 'Long-fermented country loaf, 78% hydration, robust crust and open crumb.', servings: '8', prepTime: '4 hr', cookTime: '40 min', ingredients: ['500g strong bread flour', '375g water', '100g active sourdough starter', '10g sea salt'], method: ['Autolyse flour + water 1 hr. Mix in starter and salt.', 'Bulk ferment 4-5 hr with stretch-and-folds every 30 min.', 'Pre-shape, bench rest 20 min. Final shape into banneton.', 'Cold proof 12-24 hr in fridge.', 'Bake from cold in pre-heated 250°C dutch oven, 25 min lid on, 15 min lid off until deep mahogany.'] } },
  { id: 'rec-caesar',   title: 'Classic Caesar Salad', category: 'Starter', notes: '', url: '', tags: [], linkedNoteIds: [], createdAt: D(8), allergens: { mayContain: [] }, locked: false, linkedCostingId: 'gp-caesar', imported: { description: 'Baby gem hearts, anchovy-laced dressing, crisp parmesan, sourdough croutons.', servings: '2', prepTime: '15 min', cookTime: '5 min', ingredients: ['2 baby gem lettuce', '6 anchovy fillets', '1 free-range egg yolk', '40g parmesan, finely grated', '0.5 lemon, juiced', '1 clove garlic, crushed', '50ml olive oil', 'sourdough croutons'], method: ['Mash anchovies + garlic to a paste.', 'Whisk in egg yolk, lemon, then olive oil to emulsify.', 'Stir in half the parmesan.', 'Toss leaves and croutons with dressing. Top with remaining parmesan and black pepper.'] } },
  { id: 'rec-fish-chips', title: 'Fish & Chips', category: 'Main', notes: 'Beer batter must rest 30 min minimum.', url: '', tags: [], linkedNoteIds: [], createdAt: D(25), allergens: { mayContain: ['molluscs', 'crustaceans'] }, locked: false, linkedCostingId: 'gp-fish-chips', imported: { description: 'Cod in a crisp lager batter, twice-cooked Maris Piper chips, mushy peas.', servings: '2', prepTime: '20 min', cookTime: '20 min', ingredients: ['2 x 180g cod fillet', '500g Maris Piper potato, cut into chips', '150g plain flour', '200ml lager', '300g garden peas, frozen', '20g unsalted butter', 'salt and pepper'], method: ['Soak chips in cold water 30 min. Drain, pat dry.', 'First fry chips at 130°C until soft (8 min). Drain.', 'Make batter: flour + lager, whisk just to combine. Rest.', 'Heat oil to 190°C. Coat cod in flour, dip in batter, fry 5-6 min until golden.', 'Refry chips at 190°C until crisp. Cook peas, crush with butter and seasoning.'] } },
  { id: 'rec-tarte-tatin', title: 'Apple Tarte Tatin', category: 'Dessert', notes: '', url: '', tags: [], linkedNoteIds: [], createdAt: D(40), allergens: { mayContain: [] }, locked: false, linkedCostingId: 'gp-tarte', imported: { description: 'Caramelised Bramley apples on a buttery puff pastry base, served warm with crème fraîche.', servings: '6', prepTime: '25 min', cookTime: '40 min', ingredients: ['6 Bramley apples, peeled, halved, cored', '150g caster sugar', '60g unsalted butter', '300g puff pastry', '1 lemon, juiced'], method: ['Toss apples in lemon juice.', 'Make caramel in an oven-safe pan: melt sugar to amber, swirl in butter.', 'Arrange apples cut-side up in caramel, cook 10 min.', 'Roll out pastry, drape over, tuck edges down inside the pan.', 'Bake at 200°C for 25 min until pastry is deep golden.', 'Rest 5 min, then invert onto a plate. Serve warm.'] } },
  { id: 'rec-bisque',   title: 'Tomato Basil Bisque', category: 'Starter', notes: '', url: '', tags: [], linkedNoteIds: [], createdAt: D(5), allergens: { mayContain: [] }, locked: false, linkedCostingId: 'gp-bisque', imported: { description: 'Roasted tomato and basil bisque, finished with double cream.', servings: '4', prepTime: '15 min', cookTime: '35 min', ingredients: ['800g canned tomato', '200ml double cream', '1 onion, sliced', '3 cloves garlic', '20g fresh basil', '500ml chicken stock', '40g unsalted butter'], method: ['Sweat onion and garlic in butter until soft.', 'Add tomatoes and stock, simmer 25 min.', 'Blend smooth, return to pan.', 'Stir in cream, basil. Season.', 'Serve with a drizzle of olive oil and a basil leaf.'] } },
];

// Costings — sell/cost values produce a realistic GP spread (54%-78%)
// to make the engineering / GP reports look interesting.
const gpHistory = [
  { id: 'gp-salmon',   name: 'Pan-seared Salmon, Lemon Beurre Blanc', sell: 22.50, cost: 5.85,  gp: 16.65, pct: 74,   target: 72, portions: 1, currency: 'GBP', savedAt: D(45), ingredients: [
    { id: 'gpi1', name: 'Salmon fillet',     qty: 0.18, unit: 'kg', price: 22,   line: 3.96 },
    { id: 'gpi2', name: 'Unsalted butter',   qty: 0.05, unit: 'kg', price: 7.20, line: 0.36 },
    { id: 'gpi3', name: 'Dry white wine (cooking)', qty: 0.05, unit: 'l', price: 4.50, line: 0.225 },
    { id: 'gpi4', name: 'Shallot',           qty: 0.04, unit: 'kg', price: 3.20, line: 0.128 },
    { id: 'gpi5', name: 'Lemon',             qty: 0.05, unit: 'kg', price: 2.40, line: 0.12 },
  ] },
  { id: 'gp-bourg',    name: 'Beef Bourguignon', sell: 19.00, cost: 5.20, gp: 13.80, pct: 72.6, target: 72, portions: 6, currency: 'GBP', savedAt: D(60), ingredients: [
    { id: 'gpi6', name: 'Beef chuck',        qty: 1.2,  unit: 'kg', price: 14,   line: 16.80 },
    { id: 'gpi7', name: 'Smoked streaky bacon', qty: 0.2, unit: 'kg', price: 11, line: 2.20 },
    { id: 'gpi8', name: 'Red wine (cooking)', qty: 0.5, unit: 'l',  price: 5.20, line: 2.60 },
    { id: 'gpi9', name: 'Chicken stock',     qty: 0.5,  unit: 'l',  price: 1.60, line: 0.80 },
    { id: 'gpi10', name: 'Chestnut mushroom', qty: 0.3, unit: 'kg', price: 4.40, line: 1.32 },
    { id: 'gpi11', name: 'Onion',            qty: 0.3,  unit: 'kg', price: 1.10, line: 0.33 },
    { id: 'gpi12', name: 'Plain flour',      qty: 0.04, unit: 'kg', price: 0.85, line: 0.034 },
    { id: 'gpi13', name: 'Fresh thyme',      qty: 0.01, unit: 'kg', price: 42,   line: 0.42 },
  ] },
  { id: 'gp-crab',     name: 'Crab Cakes, Sriracha Aioli', sell: 12.50, cost: 4.20, gp: 8.30, pct: 66.4, target: 72, portions: 4, currency: 'GBP', savedAt: D(20), ingredients: [
    { id: 'gpi14', name: 'White crab meat',  qty: 0.4,  unit: 'kg', price: 38,   line: 15.20 },
    { id: 'gpi15', name: 'Free-range eggs',  qty: 1,    unit: 'ea', price: 0.35, line: 0.35 },
    { id: 'gpi16', name: 'Plain flour',      qty: 0.05, unit: 'kg', price: 0.85, line: 0.043 },
    { id: 'gpi17', name: 'Unsalted butter',  qty: 0.02, unit: 'kg', price: 7.20, line: 0.144 },
    { id: 'gpi18', name: 'Lemon',            qty: 0.05, unit: 'kg', price: 2.40, line: 0.12 },
  ] },
  { id: 'gp-risotto',  name: 'Wild Mushroom Risotto', sell: 16.00, cost: 3.80, gp: 12.20, pct: 76.3, target: 72, portions: 4, currency: 'GBP', savedAt: D(15), ingredients: [
    { id: 'gpi19', name: 'Arborio rice',     qty: 0.32, unit: 'kg', price: 3.80, line: 1.216 },
    { id: 'gpi20', name: 'Chestnut mushroom', qty: 0.4, unit: 'kg', price: 4.40, line: 1.76 },
    { id: 'gpi21', name: 'Dry white wine (cooking)', qty: 0.15, unit: 'l', price: 4.50, line: 0.675 },
    { id: 'gpi22', name: 'Chicken stock',    qty: 1.2,  unit: 'l',  price: 1.60, line: 1.92 },
    { id: 'gpi23', name: 'Onion',            qty: 0.15, unit: 'kg', price: 1.10, line: 0.165 },
    { id: 'gpi24', name: 'Parmesan',         qty: 0.06, unit: 'kg', price: 16,   line: 0.96 },
    { id: 'gpi25', name: 'Unsalted butter',  qty: 0.04, unit: 'kg', price: 7.20, line: 0.288 },
  ] },
  { id: 'gp-fondant',  name: 'Chocolate Fondant', sell: 9.50, cost: 1.85, gp: 7.65, pct: 80.5, target: 72, portions: 6, currency: 'GBP', savedAt: D(10), ingredients: [
    { id: 'gpi26', name: 'Dark chocolate (70%)', qty: 0.2, unit: 'kg', price: 9.50, line: 1.90 },
    { id: 'gpi27', name: 'Unsalted butter',  qty: 0.2,  unit: 'kg', price: 7.20, line: 1.44 },
    { id: 'gpi28', name: 'Free-range eggs',  qty: 8,    unit: 'ea', price: 0.35, line: 2.80 },
    { id: 'gpi29', name: 'Caster sugar',     qty: 0.1,  unit: 'kg', price: 1.10, line: 0.11 },
    { id: 'gpi30', name: 'Plain flour',      qty: 0.06, unit: 'kg', price: 0.85, line: 0.051 },
  ] },
  { id: 'gp-sourdough', name: 'Country Sourdough', sell: 5.50, cost: 0.95, gp: 4.55, pct: 82.7, target: 72, portions: 8, currency: 'GBP', savedAt: D(80), ingredients: [
    { id: 'gpi31', name: 'Strong bread flour', qty: 0.5, unit: 'kg', price: 1.10, line: 0.55 },
    { id: 'gpi32', name: 'Sea salt',         qty: 0.01, unit: 'kg', price: 1.80, line: 0.018 },
  ] },
  { id: 'gp-caesar',   name: 'Classic Caesar Salad', sell: 9.00, cost: 2.10, gp: 6.90, pct: 76.7, target: 72, portions: 2, currency: 'GBP', savedAt: D(8), ingredients: [
    { id: 'gpi33', name: 'Baby gem lettuce', qty: 2,    unit: 'ea', price: 0.85, line: 1.70 },
    { id: 'gpi34', name: 'Anchovy fillets',  qty: 0.025, unit: 'kg', price: 28,  line: 0.70 },
    { id: 'gpi35', name: 'Free-range eggs',  qty: 1,    unit: 'ea', price: 0.35, line: 0.35 },
    { id: 'gpi36', name: 'Parmesan',         qty: 0.04, unit: 'kg', price: 16,   line: 0.64 },
    { id: 'gpi37', name: 'Olive oil',        qty: 0.05, unit: 'l',  price: 6.50, line: 0.325 },
    { id: 'gpi38', name: 'Lemon',            qty: 0.05, unit: 'kg', price: 2.40, line: 0.12 },
  ] },
  { id: 'gp-fish-chips', name: 'Fish & Chips', sell: 16.50, cost: 5.80, gp: 10.70, pct: 64.8, target: 72, portions: 2, currency: 'GBP', savedAt: D(25), ingredients: [
    { id: 'gpi39', name: 'Cod fillet',       qty: 0.36, unit: 'kg', price: 18,   line: 6.48 },
    { id: 'gpi40', name: 'Maris Piper potato', qty: 0.5, unit: 'kg', price: 0.95, line: 0.475 },
    { id: 'gpi41', name: 'Plain flour',      qty: 0.15, unit: 'kg', price: 0.85, line: 0.128 },
    { id: 'gpi42', name: 'Lager (cooking)',  qty: 0.2,  unit: 'l',  price: 2.80, line: 0.56 },
    { id: 'gpi43', name: 'Garden peas (frozen)', qty: 0.3, unit: 'kg', price: 2.40, line: 0.72 },
    { id: 'gpi44', name: 'Unsalted butter',  qty: 0.02, unit: 'kg', price: 7.20, line: 0.144 },
    { id: 'gpi45', name: 'Vegetable oil',    qty: 0.4,  unit: 'l',  price: 2.20, line: 0.88 },
  ] },
  { id: 'gp-tarte',    name: 'Apple Tarte Tatin', sell: 7.50, cost: 1.30, gp: 6.20, pct: 82.7, target: 72, portions: 6, currency: 'GBP', savedAt: D(40), ingredients: [
    { id: 'gpi46', name: 'Bramley apple',    qty: 1.2,  unit: 'kg', price: 2.60, line: 3.12 },
    { id: 'gpi47', name: 'Caster sugar',     qty: 0.15, unit: 'kg', price: 1.10, line: 0.165 },
    { id: 'gpi48', name: 'Unsalted butter',  qty: 0.06, unit: 'kg', price: 7.20, line: 0.432 },
    { id: 'gpi49', name: 'Plain flour',      qty: 0.18, unit: 'kg', price: 0.85, line: 0.153 },
    { id: 'gpi50', name: 'Lemon',            qty: 0.05, unit: 'kg', price: 2.40, line: 0.12 },
  ] },
  { id: 'gp-bisque',   name: 'Tomato Basil Bisque', sell: 7.50, cost: 1.55, gp: 5.95, pct: 79.3, target: 72, portions: 4, currency: 'GBP', savedAt: D(5), ingredients: [
    { id: 'gpi51', name: 'Tomato (canned)',  qty: 0.8,  unit: 'kg', price: 1.40, line: 1.12 },
    { id: 'gpi52', name: 'Double cream',     qty: 0.2,  unit: 'l',  price: 4.10, line: 0.82 },
    { id: 'gpi53', name: 'Onion',            qty: 0.15, unit: 'kg', price: 1.10, line: 0.165 },
    { id: 'gpi54', name: 'Fresh basil',      qty: 0.02, unit: 'kg', price: 36,   line: 0.72 },
    { id: 'gpi55', name: 'Chicken stock',    qty: 0.5,  unit: 'l',  price: 1.60, line: 0.80 },
    { id: 'gpi56', name: 'Unsalted butter',  qty: 0.04, unit: 'kg', price: 7.20, line: 0.288 },
  ] },
];

// Stock — varied levels: some healthy, some low, some critical
const stockItems = [
  { id: 'st-1',  name: 'Salmon fillet',         unit: 'kg', currentQty: 8.5,  parLevel: 6,   minLevel: 3,   unitPrice: 22,   category: 'Fish & Seafood',    lastCounted: D(2) },
  { id: 'st-2',  name: 'Cod fillet',            unit: 'kg', currentQty: 2.0,  parLevel: 5,   minLevel: 2,   unitPrice: 18,   category: 'Fish & Seafood',    lastCounted: D(2) },
  { id: 'st-3',  name: 'Beef chuck',            unit: 'kg', currentQty: 4.0,  parLevel: 8,   minLevel: 3,   unitPrice: 14,   category: 'Meat & Poultry',    lastCounted: D(2) },
  { id: 'st-4',  name: 'Smoked streaky bacon',  unit: 'kg', currentQty: 1.2,  parLevel: 2,   minLevel: 0.5, unitPrice: 11,   category: 'Meat & Poultry',    lastCounted: D(2) },
  { id: 'st-5',  name: 'White crab meat',       unit: 'kg', currentQty: 0.4,  parLevel: 1,   minLevel: 0.5, unitPrice: 38,   category: 'Fish & Seafood',    lastCounted: D(2) },
  { id: 'st-6',  name: 'Anchovy fillets',       unit: 'kg', currentQty: 0.8,  parLevel: 0.5, minLevel: 0.2, unitPrice: 28,   category: 'Tinned & Preserved', lastCounted: D(5) },
  { id: 'st-7',  name: 'Unsalted butter',       unit: 'kg', currentQty: 6.0,  parLevel: 4,   minLevel: 2,   unitPrice: 7.20, category: 'Dairy & Eggs',      lastCounted: D(2) },
  { id: 'st-8',  name: 'Double cream',          unit: 'l',  currentQty: 1.5,  parLevel: 3,   minLevel: 1,   unitPrice: 4.10, category: 'Dairy & Eggs',      lastCounted: D(2) },
  { id: 'st-9',  name: 'Whole milk',            unit: 'l',  currentQty: 12,   parLevel: 10,  minLevel: 4,   unitPrice: 1.05, category: 'Dairy & Eggs',      lastCounted: D(2) },
  { id: 'st-10', name: 'Free-range eggs',       unit: 'ea', currentQty: 60,   parLevel: 60,  minLevel: 24,  unitPrice: 0.35, category: 'Dairy & Eggs',      lastCounted: D(2) },
  { id: 'st-11', name: 'Parmesan',              unit: 'kg', currentQty: 0.3,  parLevel: 0.5, minLevel: 0.2, unitPrice: 16,   category: 'Dairy & Eggs',      lastCounted: D(5) },
  { id: 'st-12', name: 'Plain flour',           unit: 'kg', currentQty: 8,    parLevel: 5,   minLevel: 2,   unitPrice: 0.85, category: 'Dry Goods & Grains', lastCounted: D(7) },
  { id: 'st-13', name: 'Strong bread flour',    unit: 'kg', currentQty: 1.5,  parLevel: 3,   minLevel: 1,   unitPrice: 1.10, category: 'Bakery & Pastry',    lastCounted: D(7) },
  { id: 'st-14', name: 'Caster sugar',          unit: 'kg', currentQty: 4,    parLevel: 3,   minLevel: 1,   unitPrice: 1.10, category: 'Dry Goods & Grains', lastCounted: D(7) },
  { id: 'st-15', name: 'Sea salt',              unit: 'kg', currentQty: 2,    parLevel: 1,   minLevel: 0.5, unitPrice: 1.80, category: 'Spices & Seasonings', lastCounted: D(14) },
  { id: 'st-16', name: 'Olive oil',             unit: 'l',  currentQty: 5,    parLevel: 5,   minLevel: 2,   unitPrice: 6.50, category: 'Oils & Vinegars',    lastCounted: D(7) },
  { id: 'st-17', name: 'Vegetable oil',         unit: 'l',  currentQty: 12,   parLevel: 10,  minLevel: 4,   unitPrice: 2.20, category: 'Oils & Vinegars',    lastCounted: D(7) },
  { id: 'st-18', name: 'Onion',                 unit: 'kg', currentQty: 6,    parLevel: 5,   minLevel: 2,   unitPrice: 1.10, category: 'Fresh Produce',      lastCounted: D(2) },
  { id: 'st-19', name: 'Shallot',               unit: 'kg', currentQty: 0.4,  parLevel: 1,   minLevel: 0.5, unitPrice: 3.20, category: 'Fresh Produce',      lastCounted: D(2) },
  { id: 'st-20', name: 'Garlic',                unit: 'kg', currentQty: 0.8,  parLevel: 1,   minLevel: 0.3, unitPrice: 6.80, category: 'Fresh Produce',      lastCounted: D(2) },
  { id: 'st-21', name: 'Lemon',                 unit: 'kg', currentQty: 1.5,  parLevel: 2,   minLevel: 0.5, unitPrice: 2.40, category: 'Fresh Produce',      lastCounted: D(2) },
  { id: 'st-22', name: 'Chestnut mushroom',     unit: 'kg', currentQty: 1.5,  parLevel: 2,   minLevel: 0.5, unitPrice: 4.40, category: 'Fresh Produce',      lastCounted: D(2) },
  { id: 'st-23', name: 'Maris Piper potato',    unit: 'kg', currentQty: 18,   parLevel: 15,  minLevel: 5,   unitPrice: 0.95, category: 'Fresh Produce',      lastCounted: D(2) },
  { id: 'st-24', name: 'Bramley apple',         unit: 'kg', currentQty: 4,    parLevel: 3,   minLevel: 1,   unitPrice: 2.60, category: 'Fresh Produce',      lastCounted: D(5) },
  { id: 'st-25', name: 'Tomato (canned)',       unit: 'kg', currentQty: 6,    parLevel: 4,   minLevel: 2,   unitPrice: 1.40, category: 'Tinned & Preserved', lastCounted: D(7) },
  { id: 'st-26', name: 'Garden peas (frozen)',  unit: 'kg', currentQty: 3,    parLevel: 2,   minLevel: 1,   unitPrice: 2.40, category: 'Frozen Produce',     lastCounted: D(7) },
  { id: 'st-27', name: 'Arborio rice',          unit: 'kg', currentQty: 1.0,  parLevel: 2,   minLevel: 0.5, unitPrice: 3.80, category: 'Dry Goods & Grains', lastCounted: D(7) },
  { id: 'st-28', name: 'Dark chocolate (70%)',  unit: 'kg', currentQty: 1.8,  parLevel: 1,   minLevel: 0.5, unitPrice: 9.50, category: 'Bakery & Pastry',    lastCounted: D(7) },
  { id: 'st-29', name: 'Dry white wine (cooking)', unit: 'l', currentQty: 2, parLevel: 3,   minLevel: 1,   unitPrice: 4.50, category: 'Beverages',          lastCounted: D(7) },
  { id: 'st-30', name: 'Red wine (cooking)',    unit: 'l',  currentQty: 4,    parLevel: 3,   minLevel: 1,   unitPrice: 5.20, category: 'Beverages',          lastCounted: D(7) },
  { id: 'st-31', name: 'Lager (cooking)',       unit: 'l',  currentQty: 3,    parLevel: 4,   minLevel: 1,   unitPrice: 2.80, category: 'Beverages',          lastCounted: D(7) },
  { id: 'st-32', name: 'Chicken stock',         unit: 'l',  currentQty: 5,    parLevel: 4,   minLevel: 2,   unitPrice: 1.60, category: 'Tinned & Preserved', lastCounted: D(7) },
];

// Menus — sales mix tuned to give a Star/Plough/Puzzle/Dog spread
const menus = [
  {
    id: 'menu-spring', name: 'Spring Lunch Menu', description: 'Lunch service Mar-May. 6 courses, 2 sittings.',
    recipeIds: ['rec-bisque', 'rec-caesar', 'rec-salmon', 'rec-risotto', 'rec-tarte', 'rec-fondant'],
    salesData: { 'rec-bisque': 28, 'rec-caesar': 35, 'rec-salmon': 62, 'rec-risotto': 18, 'rec-tarte': 24, 'rec-fondant': 48 },
    createdAt: D(20), updatedAt: D(2),
  },
  {
    id: 'menu-evening', name: 'A La Carte', description: 'Evening menu. 8 dishes across starters, mains, desserts.',
    recipeIds: ['rec-bisque', 'rec-crab-cakes', 'rec-caesar', 'rec-salmon', 'rec-bourguignon', 'rec-fish-chips', 'rec-fondant', 'rec-tarte'],
    salesData: { 'rec-bisque': 14, 'rec-crab-cakes': 32, 'rec-caesar': 22, 'rec-salmon': 78, 'rec-bourguignon': 41, 'rec-fish-chips': 95, 'rec-fondant': 56, 'rec-tarte': 18 },
    createdAt: D(45), updatedAt: D(1),
  },
];

// Notes — chef notebook
const notes = [
  { id: 'note-1', title: 'Sourdough hydration', content: 'Bumped to 78% — open crumb noticeably better. Pull bake 2 min earlier next time.', linkedRecipeIds: ['rec-sourdough'], createdAt: D(70) },
  { id: 'note-2', title: 'Tarte Tatin caramel', content: 'Drier caramel = more bitter; add a splash of water if going past medium amber.', linkedRecipeIds: ['rec-tarte'], createdAt: D(35) },
  { id: 'note-3', title: 'Salmon supplier swap', content: 'Direct Seafoods now consistently better grade than Brakes. Worth the 8% premium.', linkedRecipeIds: ['rec-salmon'], createdAt: D(22) },
  { id: 'note-4', title: 'Risotto rest time', content: 'Resting off heat for 2 min before plating tightens texture noticeably.', linkedRecipeIds: ['rec-risotto'], createdAt: D(12) },
  { id: 'note-5', title: 'Fish & chips margin', content: 'Cod price up 14% YoY — review menu pricing or look at hake/coley.', linkedRecipeIds: ['rec-fish-chips'], createdAt: D(6) },
];

// Waste log — last few weeks, varied reasons
const wasteLog = [
  { id: 'w-1', ingredientName: 'Salmon fillet',         qty: 0.4,  unit: 'kg', unitPrice: 22,   bankUnit: 'kg', totalCost: 8.80, reason: 'Out of date',         notes: 'Misordered last delivery', category: 'Fish & Seafood',    supplier: 'Direct Seafoods', createdAt: D(2) },
  { id: 'w-2', ingredientName: 'Double cream',          qty: 0.5,  unit: 'l',  unitPrice: 4.10, bankUnit: 'l',  totalCost: 2.05, reason: 'Spoilage',           notes: '',                          category: 'Dairy & Eggs',      supplier: 'Yeo Valley',     createdAt: D(4) },
  { id: 'w-3', ingredientName: 'Bramley apple',         qty: 1.0,  unit: 'kg', unitPrice: 2.60, bankUnit: 'kg', totalCost: 2.60, reason: 'Spoilage',           notes: 'Stored too warm',           category: 'Fresh Produce',     supplier: 'Reynolds',       createdAt: D(7) },
  { id: 'w-4', ingredientName: 'Beef chuck',            qty: 0.8,  unit: 'kg', unitPrice: 14,   bankUnit: 'kg', totalCost: 11.20,reason: 'Damaged or dropped', notes: 'Container failed in walk-in', category: 'Meat & Poultry', supplier: 'Aubrey Allen',   createdAt: D(9) },
  { id: 'w-5', ingredientName: 'Whole milk',            qty: 1.0,  unit: 'l',  unitPrice: 1.05, bankUnit: 'l',  totalCost: 1.05, reason: 'Out of date',         notes: '',                          category: 'Dairy & Eggs',      supplier: 'Yeo Valley',     createdAt: D(12) },
  { id: 'w-6', ingredientName: 'Free-range eggs',       qty: 6,    unit: 'ea', unitPrice: 0.35, bankUnit: 'ea', totalCost: 2.10, reason: 'Damaged or dropped', notes: '',                          category: 'Dairy & Eggs',      supplier: 'Cotswold',       createdAt: D(14) },
  { id: 'w-7', ingredientName: 'Maris Piper potato',    qty: 2.5,  unit: 'kg', unitPrice: 0.95, bankUnit: 'kg', totalCost: 2.38, reason: 'Off-spec / quality', notes: 'Lots of greening',          category: 'Fresh Produce',     supplier: 'Reynolds',       createdAt: D(18) },
  { id: 'w-8', ingredientName: 'Tomato (canned)',       qty: 0.4,  unit: 'kg', unitPrice: 1.40, bankUnit: 'kg', totalCost: 0.56, reason: 'Over-prep',          notes: 'Service slower than expected', category: 'Tinned & Preserved', supplier: 'Brakes',     createdAt: D(20) },
];

// Price alerts (last 30d) so the dashboard / notifications light up
const priceAlerts = [
  { id: 'pa-1', name: 'Cod fillet',          unit: 'kg', oldPrice: 16,    newPrice: 18,   change: 2,    pct: 12.5, detectedAt: D(3) },
  { id: 'pa-2', name: 'Double cream',        unit: 'l',  oldPrice: 3.80,  newPrice: 4.10, change: 0.30, pct: 7.9,  detectedAt: D(8) },
  { id: 'pa-3', name: 'Salmon fillet',       unit: 'kg', oldPrice: 24,    newPrice: 22,   change: -2,   pct: -8.3, detectedAt: D(11) },
  { id: 'pa-4', name: 'Maris Piper potato',  unit: 'kg', oldPrice: 0.85,  newPrice: 0.95, change: 0.10, pct: 11.8, detectedAt: D(15) },
  { id: 'pa-5', name: 'Unsalted butter',     unit: 'kg', oldPrice: 6.80,  newPrice: 7.20, change: 0.40, pct: 5.9,  detectedAt: D(22) },
];

const invoices = [
  { id: 'inv-1', supplier: 'Direct Seafoods', itemCount: 4,  totalValue: 312.40, scannedAt: D(3) },
  { id: 'inv-2', supplier: 'Brakes',          itemCount: 18, totalValue: 487.20, scannedAt: D(8) },
  { id: 'inv-3', supplier: 'Reynolds',        itemCount: 11, totalValue: 142.85, scannedAt: D(11) },
  { id: 'inv-4', supplier: 'Aubrey Allen',    itemCount: 3,  totalValue: 198.50, scannedAt: D(15) },
];

// ── ENDPOINT ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const userId: string | undefined = body?.userId;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const supabase = svc();

  // Read existing profile so we don't overwrite name/tier/comp/etc.
  const { data: existing } = await supabase
    .from('user_data')
    .select('profile')
    .eq('user_id', userId)
    .maybeSingle();

  const profile = existing?.profile && typeof existing.profile === 'object' ? existing.profile : {};

  const payload = {
    user_id: userId,
    recipes,
    notes,
    gp_history: gpHistory,
    ingredients_bank: bank,
    invoices,
    price_alerts: priceAlerts,
    stock_items: stockItems,
    menus,
    waste_log: wasteLog,
    profile,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_data').upsert(payload, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });

  return NextResponse.json({
    ok: true,
    seeded: {
      recipes: recipes.length,
      gpHistory: gpHistory.length,
      bank: bank.length,
      stockItems: stockItems.length,
      menus: menus.length,
      notes: notes.length,
      wasteLog: wasteLog.length,
      priceAlerts: priceAlerts.length,
      invoices: invoices.length,
    },
  });
}
