import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Cellar — Bar — Palatable' };

export default function BarCellarPage() {
  return (
    <BarComingSoon
      eyebrow="Live Bottle Inventory"
      title=""
      italic="Cellar"
      subtitle="Every bottle, every par, every pour. The Bank, bar-flavoured."
      body="Mirrors The Bank but bar-tuned. Category filter at the top (Spirits / Wines / Beers / Mixers / Garnish / All). Per-row: name + current stock vs par level (visual bar) + cost per pour. Par breaches flag in urgent red. Detail view extends Bank's price-history sparkline with par/reorder controls, linked allocations, recent stock-take variance. Pour-cost computed live from current_price ÷ pack_volume_ml × pour_ml."
      reads={[
        'v2.ingredients (all categories, filter by unit_type for default bar view)',
        'v2.ingredients.par_level / reorder_point / current_stock / pack_volume_ml',
        'v2.ingredient_price_history for sparklines (shared with chef Bank)',
        'v2.allocations + v2.stock_take_lines for the per-bottle detail panel',
      ]}
    />
  );
}
