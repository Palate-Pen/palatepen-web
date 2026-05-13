import { daysAgo } from './time';

// Menus seed — two showcase menus. The "Dinner à la carte" has salesData
// populated so the menu engineering report classifies dishes into Star /
// Plough / Puzzle / Dog quadrants. The "Lunch" menu is included with no
// sales data to show the "uncosted / no covers" empty state realistically.

export interface ShowcaseMenu {
  id: string;
  name: string;
  recipeIds: string[];
  salesData?: Record<string, number>;
  published?: boolean;
  publicSlug?: string;
  createdAt: number;
}

export function buildShowcaseMenus(): ShowcaseMenu[] {
  return [
    {
      id: 'seed-menu-dinner',
      name: 'Dinner à la carte',
      recipeIds: [
        // Starters
        'seed-recipe-heritage-tomato-salad',
        'seed-recipe-pumpkin-soup',
        'seed-recipe-prawn-cocktail',
        'seed-recipe-smoked-salmon-blinis',
        // Mains
        'seed-recipe-beef-wellington',
        'seed-recipe-pan-roast-salmon',
        'seed-recipe-lamb-shoulder',
        'seed-recipe-confit-duck',
        'seed-recipe-mushroom-risotto',
        'seed-recipe-pappardelle-ragu',
        'seed-recipe-cod-mussels',
        // Desserts
        'seed-recipe-chocolate-fondant',
        'seed-recipe-creme-brulee',
        'seed-recipe-lemon-tart',
      ],
      // Weekly covers — populated so menu engineering classifies dishes.
      // Numbers chosen to spread across all four Kasavana-Smith quadrants:
      //   - Beef Wellington: high mix, low GP → Plough Horse
      //   - Chocolate fondant: high mix, high GP → Star
      //   - Confit duck: low mix, high GP → Puzzle
      //   - Pumpkin soup: low mix, low GP → Dog (unlikely but possible at high cost basis)
      salesData: {
        'seed-recipe-heritage-tomato-salad': 38,
        'seed-recipe-pumpkin-soup': 18,
        'seed-recipe-prawn-cocktail': 27,
        'seed-recipe-smoked-salmon-blinis': 22,
        'seed-recipe-beef-wellington': 64,
        'seed-recipe-pan-roast-salmon': 48,
        'seed-recipe-lamb-shoulder': 31,
        'seed-recipe-confit-duck': 19,
        'seed-recipe-mushroom-risotto': 36,
        'seed-recipe-pappardelle-ragu': 42,
        'seed-recipe-cod-mussels': 28,
        'seed-recipe-chocolate-fondant': 71,
        'seed-recipe-creme-brulee': 45,
        'seed-recipe-lemon-tart': 38,
      },
      published: true,
      publicSlug: 'palate-test-kitchen-dinner',
      createdAt: daysAgo(85),
    },
    {
      id: 'seed-menu-lunch',
      name: 'Lunch — Set menu',
      recipeIds: [
        'seed-recipe-heritage-tomato-salad',
        'seed-recipe-chicken-supreme',
        'seed-recipe-pappardelle-ragu',
        'seed-recipe-pork-belly-asian',
        'seed-recipe-lemon-tart',
      ],
      published: false,
      createdAt: daysAgo(20),
    },
  ];
}
