import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Specs — Bar — Palatable' };

export default function BarSpecsPage() {
  return (
    <BarComingSoon
      eyebrow="The Drinks Book"
      title=""
      italic="Specs"
      subtitle="Every drink, every pour, every margin. The cocktail spec book — live-costed from the Cellar."
      body="Specs mirrors the chef Recipes surface — tile grid per drink with name, glass, ice, technique, garnish, photo, cost-per-pour, margin. Filter by type (cocktail / wine / beer / soft / spirit). Same allergens + dietary chip logic as food recipes (egg in flips, dairy in cream drinks, nuts in orgeat). Build sheet at the detail level: 25ml gin, 12.5ml vermouth, 5ml syrup, twist of lemon. Live-recosting when cellar prices move."
      reads={[
        'v2.recipes filtered to dish_type in (cocktail/wine/beer/soft/spirit)',
        'v2.recipe_ingredients joined to v2.ingredients for live cost-per-pour',
        'v2.recipes.glass_type / ice_type / technique / pour_ml / garnish',
        'v2.ingredients.pack_volume_ml for the cost calc',
      ]}
    />
  );
}
