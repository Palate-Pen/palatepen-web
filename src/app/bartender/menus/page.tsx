import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Menus — Bar — Palatable' };

export default function BarMenusPage() {
  return (
    <BarComingSoon
      eyebrow="The Drinks List"
      title=""
      italic="Menus"
      subtitle="Cocktail list, wine list, beer board. Published live to your venue's public page."
      body="The bar-side of the existing Menu Builder. Drag-and-drop drink selection into sections (Classics / Signatures / Tonight Only / Wines by Glass / On Draught). Publishes to /m/{slug}-bar — same public reader pattern as the food menus. If the bartender has manager permissions they get the full Menu Builder; otherwise this is edit-light: pick from existing specs, hide / show, set a price."
      reads={[
        'v2.menus (filtered to dish_type=cocktail/wine/beer in their sections)',
        'v2.recipes joined for live spec data',
        'Reuses the existing Menu Builder template engine (manager shell)',
      ]}
    />
  );
}
