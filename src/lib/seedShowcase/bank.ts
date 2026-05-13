// Bank seed — the ingredient source-of-truth. Every other module (recipes,
// costings, stock, invoices) references ingredient names from here so the
// allergen / nutrition / cost pipelines all light up. Prices are realistic
// 2026 UK wholesale per-unit. Allergens follow UK FIR-2014 keys. Nutrition
// per 100g unless `perAmount: 'ml'`.

export interface ShowcaseBankIngredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  supplier?: string;
  allergens?: {
    contains: string[];
    treeNutTypes?: string[];
    cerealTypes?: string[];
  };
  nutrition?: {
    perAmount: 'g' | 'ml';
    energyKcal: number;
    fat: number;
    saturates: number;
    carbs: number;
    sugars: number;
    fibre: number;
    protein: number;
    salt: number;
  };
}

const SUPPLIERS = {
  brakes: 'Brakes',
  bidfood: 'Bidfood',
  butcher: 'Smithfield Butchers',
  market: 'Borough Market Produce',
  pastry: 'Cuisine de France',
};

export const SHOWCASE_BANK: ShowcaseBankIngredient[] = [
  // ── Meat & Poultry ───────────────────────────────────────
  { id: 'seed-bank-beef-fillet',  name: 'Beef fillet',  category: 'Meat & Poultry', unit: 'kg', unitPrice: 38.50, supplier: SUPPLIERS.butcher,
    nutrition: { perAmount: 'g', energyKcal: 218, fat: 11.5, saturates: 4.6, carbs: 0,    sugars: 0,    fibre: 0,   protein: 28.4, salt: 0.18 } },
  { id: 'seed-bank-chicken-breast', name: 'Chicken breast', category: 'Meat & Poultry', unit: 'kg', unitPrice: 8.40, supplier: SUPPLIERS.brakes,
    nutrition: { perAmount: 'g', energyKcal: 165, fat: 3.6,  saturates: 1.0, carbs: 0,    sugars: 0,    fibre: 0,   protein: 31.0, salt: 0.20 } },
  { id: 'seed-bank-lamb-shoulder', name: 'Lamb shoulder', category: 'Meat & Poultry', unit: 'kg', unitPrice: 14.90, supplier: SUPPLIERS.butcher,
    nutrition: { perAmount: 'g', energyKcal: 282, fat: 22.0, saturates: 10.0, carbs: 0,   sugars: 0,    fibre: 0,   protein: 20.0, salt: 0.20 } },
  { id: 'seed-bank-pork-belly',    name: 'Pork belly',    category: 'Meat & Poultry', unit: 'kg', unitPrice: 9.20,  supplier: SUPPLIERS.butcher },
  { id: 'seed-bank-duck-breast',   name: 'Duck breast',   category: 'Meat & Poultry', unit: 'kg', unitPrice: 22.00, supplier: SUPPLIERS.butcher },
  { id: 'seed-bank-pancetta',      name: 'Pancetta',      category: 'Meat & Poultry', unit: 'kg', unitPrice: 18.50, supplier: SUPPLIERS.brakes },

  // ── Fish & Seafood ───────────────────────────────────────
  { id: 'seed-bank-salmon-fillet', name: 'Salmon fillet', category: 'Fish & Seafood', unit: 'kg', unitPrice: 21.50, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['fish'] },
    nutrition: { perAmount: 'g', energyKcal: 208, fat: 13.0, saturates: 3.1, carbs: 0,    sugars: 0,    fibre: 0,   protein: 20.0, salt: 0.10 } },
  { id: 'seed-bank-cod-loin',      name: 'Cod loin',      category: 'Fish & Seafood', unit: 'kg', unitPrice: 18.80, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['fish'] } },
  { id: 'seed-bank-tiger-prawns',  name: 'Tiger prawns',  category: 'Fish & Seafood', unit: 'kg', unitPrice: 26.40, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['crustaceans'] } },
  { id: 'seed-bank-mussels',       name: 'Mussels',       category: 'Fish & Seafood', unit: 'kg', unitPrice: 6.20,  supplier: SUPPLIERS.brakes,
    allergens: { contains: ['molluscs'] } },

  // ── Dairy & Eggs ─────────────────────────────────────────
  { id: 'seed-bank-butter-unsalted', name: 'Unsalted butter', category: 'Dairy & Eggs', unit: 'kg', unitPrice: 7.20, supplier: SUPPLIERS.bidfood,
    allergens: { contains: ['milk'] },
    nutrition: { perAmount: 'g', energyKcal: 717, fat: 81.0, saturates: 51.0, carbs: 0.7, sugars: 0.7,  fibre: 0,   protein: 0.9,  salt: 0.02 } },
  { id: 'seed-bank-double-cream',  name: 'Double cream',  category: 'Dairy & Eggs', unit: 'L', unitPrice: 3.80,  supplier: SUPPLIERS.bidfood,
    allergens: { contains: ['milk'] },
    nutrition: { perAmount: 'ml', energyKcal: 467, fat: 48.0, saturates: 30.0, carbs: 2.7, sugars: 2.7,  fibre: 0,   protein: 1.8,  salt: 0.07 } },
  { id: 'seed-bank-whole-milk',    name: 'Whole milk',    category: 'Dairy & Eggs', unit: 'L', unitPrice: 1.20,  supplier: SUPPLIERS.bidfood,
    allergens: { contains: ['milk'] },
    nutrition: { perAmount: 'ml', energyKcal: 66,  fat: 3.6,  saturates: 2.3,  carbs: 4.7, sugars: 4.7,  fibre: 0,   protein: 3.3,  salt: 0.11 } },
  { id: 'seed-bank-eggs-large',    name: 'Eggs (large)',  category: 'Dairy & Eggs', unit: 'ea', unitPrice: 0.28,  supplier: SUPPLIERS.bidfood,
    allergens: { contains: ['eggs'] },
    nutrition: { perAmount: 'g', energyKcal: 143, fat: 9.5,  saturates: 3.1,  carbs: 0.7, sugars: 0.4,  fibre: 0,   protein: 12.6, salt: 0.36 } },
  { id: 'seed-bank-parmesan',      name: 'Parmesan',      category: 'Dairy & Eggs', unit: 'kg', unitPrice: 22.00, supplier: SUPPLIERS.bidfood,
    allergens: { contains: ['milk'] } },
  { id: 'seed-bank-mozzarella',    name: 'Mozzarella',    category: 'Dairy & Eggs', unit: 'kg', unitPrice: 9.40,  supplier: SUPPLIERS.bidfood,
    allergens: { contains: ['milk'] } },

  // ── Fresh Produce + Herbs ────────────────────────────────
  { id: 'seed-bank-tomatoes-vine', name: 'Vine tomatoes',  category: 'Fresh Produce', unit: 'kg', unitPrice: 3.20, supplier: SUPPLIERS.market },
  { id: 'seed-bank-onions',        name: 'Brown onions',   category: 'Fresh Produce', unit: 'kg', unitPrice: 1.10, supplier: SUPPLIERS.market },
  { id: 'seed-bank-garlic',        name: 'Garlic',         category: 'Fresh Produce', unit: 'kg', unitPrice: 9.80, supplier: SUPPLIERS.market },
  { id: 'seed-bank-potatoes',      name: 'Maris Piper potatoes', category: 'Fresh Produce', unit: 'kg', unitPrice: 1.40, supplier: SUPPLIERS.market },
  { id: 'seed-bank-carrots',       name: 'Carrots',        category: 'Fresh Produce', unit: 'kg', unitPrice: 1.00, supplier: SUPPLIERS.market },
  { id: 'seed-bank-spinach',       name: 'Baby spinach',   category: 'Fresh Produce', unit: 'kg', unitPrice: 6.80, supplier: SUPPLIERS.market },
  { id: 'seed-bank-mushrooms',     name: 'Chestnut mushrooms', category: 'Fresh Produce', unit: 'kg', unitPrice: 5.20, supplier: SUPPLIERS.market },
  { id: 'seed-bank-lemons',        name: 'Lemons',         category: 'Fresh Produce', unit: 'kg', unitPrice: 3.40, supplier: SUPPLIERS.market },
  { id: 'seed-bank-basil',         name: 'Basil',          category: 'Fresh Herbs',   unit: 'kg', unitPrice: 38.00, supplier: SUPPLIERS.market },
  { id: 'seed-bank-thyme',         name: 'Thyme',          category: 'Fresh Herbs',   unit: 'kg', unitPrice: 42.00, supplier: SUPPLIERS.market },
  { id: 'seed-bank-parsley',       name: 'Flat-leaf parsley', category: 'Fresh Herbs', unit: 'kg', unitPrice: 24.00, supplier: SUPPLIERS.market },

  // ── Dry Goods & Bakery ───────────────────────────────────
  { id: 'seed-bank-plain-flour',   name: 'Plain flour',    category: 'Dry Goods & Grains', unit: 'kg', unitPrice: 1.30, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['gluten'], cerealTypes: ['wheat'] },
    nutrition: { perAmount: 'g', energyKcal: 364, fat: 1.0, saturates: 0.2, carbs: 76.0, sugars: 0.3, fibre: 2.7, protein: 10.0, salt: 0.01 } },
  { id: 'seed-bank-caster-sugar',  name: 'Caster sugar',   category: 'Dry Goods & Grains', unit: 'kg', unitPrice: 1.60, supplier: SUPPLIERS.brakes,
    nutrition: { perAmount: 'g', energyKcal: 387, fat: 0,   saturates: 0,   carbs: 100,  sugars: 100, fibre: 0,   protein: 0,    salt: 0    } },
  { id: 'seed-bank-arborio-rice',  name: 'Arborio rice',   category: 'Dry Goods & Grains', unit: 'kg', unitPrice: 4.80, supplier: SUPPLIERS.brakes },
  { id: 'seed-bank-pasta-pappardelle', name: 'Pappardelle', category: 'Dry Goods & Grains', unit: 'kg', unitPrice: 5.40, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['gluten', 'eggs'], cerealTypes: ['wheat'] } },
  { id: 'seed-bank-sourdough',     name: 'Sourdough loaf', category: 'Bakery & Pastry', unit: 'ea', unitPrice: 3.60, supplier: SUPPLIERS.pastry,
    allergens: { contains: ['gluten'], cerealTypes: ['wheat'] } },
  { id: 'seed-bank-puff-pastry',   name: 'All-butter puff pastry', category: 'Frozen Pastry', unit: 'kg', unitPrice: 6.80, supplier: SUPPLIERS.pastry,
    allergens: { contains: ['gluten', 'milk'], cerealTypes: ['wheat'] } },

  // ── Oils, Sauces, Seasonings ─────────────────────────────
  { id: 'seed-bank-olive-oil',     name: 'Extra virgin olive oil', category: 'Oils & Vinegars', unit: 'L', unitPrice: 9.20, supplier: SUPPLIERS.brakes },
  { id: 'seed-bank-balsamic',      name: 'Balsamic vinegar', category: 'Oils & Vinegars', unit: 'L', unitPrice: 14.80, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['sulphites'] } },
  { id: 'seed-bank-dijon-mustard', name: 'Dijon mustard',    category: 'Condiments & Sauces', unit: 'kg', unitPrice: 8.20, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['mustard'] } },
  { id: 'seed-bank-soy-sauce',     name: 'Soy sauce',        category: 'Condiments & Sauces', unit: 'L', unitPrice: 7.40, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['gluten', 'soybeans'], cerealTypes: ['wheat'] } },
  { id: 'seed-bank-sea-salt',      name: 'Maldon sea salt',  category: 'Spices & Seasonings', unit: 'kg', unitPrice: 9.40, supplier: SUPPLIERS.brakes,
    nutrition: { perAmount: 'g', energyKcal: 0,  fat: 0,   saturates: 0,   carbs: 0,    sugars: 0,    fibre: 0,   protein: 0,    salt: 100 } },
  { id: 'seed-bank-black-pepper',  name: 'Black peppercorns', category: 'Spices & Seasonings', unit: 'kg', unitPrice: 28.00, supplier: SUPPLIERS.brakes },

  // ── Tinned / Preserved ───────────────────────────────────
  { id: 'seed-bank-tomato-passata', name: 'Tomato passata',  category: 'Tinned & Preserved', unit: 'L', unitPrice: 2.40, supplier: SUPPLIERS.brakes },
  { id: 'seed-bank-anchovies',      name: 'Anchovies in oil', category: 'Tinned & Preserved', unit: 'kg', unitPrice: 24.00, supplier: SUPPLIERS.brakes,
    allergens: { contains: ['fish'] } },
];
