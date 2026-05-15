/**
 * Auto-categorise bank ingredients by name keyword. Ported from the
 * legacy `src/lib/categorize.ts` — the rules are tuned for UK kitchens
 * and the 18 categories below are the SFBB-aligned set.
 *
 * Used by:
 *  - Manual "Auto-categorise" action on The Bank (server action)
 *  - CSV import (suggested category when import lacks one)
 *  - Invoice scan post-processing (when AI doesn't return a category)
 *
 * Server-free; safe to import from client + server.
 */

export const CATEGORIES = [
  'Meat & Poultry',
  'Fish & Seafood',
  'Dairy & Eggs',
  'Fresh Produce',
  'Fresh Herbs',
  'Dry Goods & Grains',
  'Tinned & Preserved',
  'Oils & Vinegars',
  'Condiments & Sauces',
  'Spices & Seasonings',
  'Bakery & Pastry',
  'Frozen Meat & Fish',
  'Frozen Produce',
  'Frozen Pastry',
  'Beverages',
  'Cleaning & Chemicals',
  'Disposables & Packaging',
  'Other',
] as const;
export type Category = typeof CATEGORIES[number];

// Order matters: more specific rules win (e.g. "frozen prawns" → Frozen
// Meat & Fish before Fish & Seafood). Don't reorder lightly.
const RULES: Array<[Category, RegExp]> = [
  ['Disposables & Packaging', /\b(napkin|paper towel|kitchen roll|cling film|foil|bin bag|takeaway box|paper cup|straw|cutlery|disposable|gloves|apron|hairnet|packaging|wrap)\b/],
  ['Cleaning & Chemicals',    /\b(detergent|bleach|soap|cleaner|sanitiser|sanitizer|degreaser|dishwasher|washing up|polish|disinfect|wipe)\b/],

  ['Frozen Pastry',           /\b(puff pastry|filo pastry|frozen pastry|frozen dough|frozen croissant|frozen brioche)\b/],
  ['Frozen Produce',          /\bfrozen (pea|bean|spinach|berr|veg|fruit|potato|chip|sweetcorn|corn)/],
  ['Frozen Meat & Fish',      /\bfrozen (beef|pork|chicken|lamb|fish|salmon|prawn|shrimp|cod|haddock)/],

  ['Beverages',               /\b(water|juice|wine|beer|cider|vodka|gin|rum|whisky|whiskey|tequila|liqueur|coffee|tea|soda|cola|lemonade|tonic|spirit|prosecco|champagne|vermouth|sherry|port|brandy|cognac|kombucha|squash)\b/],

  ['Bakery & Pastry',         /\b(bread|loaf|roll|bun|baguette|focaccia|sourdough|ciabatta|pita|naan|tortilla|wrap|crouton|brioche|croissant|cake|biscuit|cookie|scone|muffin|tart|pie crust|pastry|filo|puff)\b/],

  ['Fresh Herbs',             /\b(basil|parsley|mint|coriander|cilantro|rosemary|thyme|sage|oregano|dill|chive|tarragon|bay leaf|chervil|marjoram|lemongrass)\b/],

  ['Spices & Seasonings',     /\b(cumin|paprika|turmeric|cinnamon|nutmeg|clove|cardamom|coriander seed|fennel seed|mustard seed|peppercorn|chilli flake|chili flake|smoked paprika|garam masala|ras el hanout|five spice|curry powder|saffron|vanilla|star anise|allspice|black pepper|white pepper|sea salt|rock salt|himalayan|table salt|maldon)\b/],

  ['Condiments & Sauces',     /\b(ketchup|mayonnaise|mayo|mustard|hp sauce|brown sauce|tabasco|sriracha|hoisin|teriyaki|soy sauce|fish sauce|oyster sauce|worcestershire|chutney|relish|jam|marmalade|honey|syrup|maple|tomato sauce|pasta sauce|pesto)\b/],

  ['Oils & Vinegars',         /\b(olive oil|sunflower oil|vegetable oil|rapeseed oil|sesame oil|coconut oil|truffle oil|oil|vinegar|balsamic|red wine vinegar|white wine vinegar|cider vinegar|sherry vinegar|rice vinegar)\b/],

  ['Tinned & Preserved',      /\b(tinned|canned|tin of|can of|preserved|pickle|olive|caper|sundried|sun-dried|chickpea|kidney bean|baked bean|tuna in|sardine in|tomato passata|passata|jarred)\b/],

  ['Dry Goods & Grains',      /\b(flour|sugar|caster|icing sugar|brown sugar|rice|pasta|noodle|spaghetti|penne|risotto|lentil|oat|porridge|quinoa|couscous|polenta|semolina|cornflour|cornstarch|baking powder|bicarbonate|yeast|cocoa|chocolate chip|breadcrumb|stock cube|bouillon|gelatin|cereal)\b/],

  ['Dairy & Eggs',            /\b(milk|cream|double cream|single cream|whipping cream|crème fraîche|creme fraiche|butter|cheese|yogurt|yoghurt|mozzarella|cheddar|parmesan|feta|ricotta|brie|mascarpone|halloumi|paneer|ghee|egg|eggs|buttermilk|sour cream)\b/],

  ['Fish & Seafood',          /\b(fish|salmon|tuna|cod|haddock|mackerel|sardine|anchovy|sea bass|sea bream|trout|monkfish|skate|prawn|shrimp|lobster|crab|mussel|scallop|oyster|squid|octopus|clam|crayfish|cockle|whelk)\b/],

  ['Meat & Poultry',          /\b(beef|pork|chicken|lamb|mutton|veal|duck|turkey|goose|partridge|pheasant|venison|rabbit|bacon|sausage|ham|mince|steak|ribs|rib|fillet|breast|thigh|wing|chorizo|pancetta|prosciutto|salami|liver|kidney|gammon|hock|shoulder)\b/],

  ['Fresh Produce',           /\b(tomato|onion|shallot|lettuce|carrot|potato|sweet potato|pepper|capsicum|cucumber|garlic|apple|orange|banana|lemon|lime|spinach|kale|broccoli|cabbage|cauliflower|mushroom|courgette|zucchini|aubergine|eggplant|leek|celery|fennel|chilli|chili|ginger|beetroot|radish|salad|peas|asparagus|artichoke|avocado|berry|grape|melon|peach|pear|plum|mango|pineapple|sprout|squash|pumpkin|sweetcorn|corn|rocket|watercress|endive|chicory|parsnip|swede|turnip|cherry)\b/],
];

export function guessCategory(name: string): Category {
  const n = (name || '').toLowerCase();
  for (const [cat, re] of RULES) if (re.test(n)) return cat;
  return 'Other';
}
