export const CATEGORIES = ['Meat & Fish','Dairy','Produce','Dry Goods','Beverages','Bakery','Frozen','Cleaning','Other'] as const;
export type Category = typeof CATEGORIES[number];

const RULES: Array<[Category, RegExp]> = [
  ['Cleaning',    /\b(detergent|bleach|soap|cleaner|sanitiser|sanitizer|wipe|paper towel|kitchen roll|dishwasher|washing up|cling film|foil)\b/],
  ['Beverages',   /\b(water|juice|wine|beer|cider|vodka|gin|rum|whisky|whiskey|tequila|liqueur|coffee|tea|soda|cola|lemonade|tonic|spirit|prosecco|champagne)\b/],
  ['Bakery',      /\b(bread|roll|bun|baguette|focaccia|croissant|brioche|pastry|cake|biscuit|cookie|scone|muffin|pita|naan|tortilla|crouton|wrap)\b/],
  ['Frozen',      /\b(frozen|ice cream|gelato|sorbet)\b/],
  ['Dairy',       /\b(milk|cream|butter|cheese|yogurt|yoghurt|mozzarella|cheddar|parmesan|feta|ricotta|brie|mascarpone|halloumi|paneer|ghee|egg|eggs)\b/],
  ['Meat & Fish', /\b(beef|pork|chicken|lamb|fish|salmon|tuna|cod|haddock|shrimp|prawn|bacon|sausage|ham|mince|steak|ribs|rib|fillet|breast|thigh|duck|turkey|venison|mackerel|sardine|anchovy|mussel|scallop|oyster|squid|octopus|crab|lobster|chorizo|pancetta|prosciutto)\b/],
  ['Dry Goods',   /\b(flour|sugar|salt|rice|pasta|noodle|oil|vinegar|spice|seed|lentil|oat|quinoa|couscous|polenta|semolina|cornflour|yeast|chocolate|cocoa|honey|syrup|jam|marmalade|mustard|ketchup|mayonnaise|soy sauce|bouillon|gelatin|stock cube|puree|paste|sauce|crisps|cereal)\b/],
  ['Produce',     /\b(tomato|onion|lettuce|carrot|potato|pepper|cucumber|garlic|apple|orange|banana|lemon|lime|herb|basil|parsley|mint|coriander|rosemary|thyme|sage|oregano|dill|chive|spinach|kale|broccoli|cabbage|cauliflower|mushroom|courgette|zucchini|aubergine|eggplant|leek|celery|fennel|chilli|chili|ginger|beetroot|radish|salad|peas|asparagus|artichoke|avocado|berry|grape|melon|peach|pear|plum|mango|pineapple|sprout|squash|pumpkin|sweetcorn|corn)\b/],
];

export function guessCategory(name: string): Category {
  const n = (name||'').toLowerCase();
  for (const [cat, re] of RULES) if (re.test(n)) return cat;
  return 'Other';
}
