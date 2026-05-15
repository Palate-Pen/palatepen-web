import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Deliveries — Bar — Palatable' };

export default function BarDeliveriesPage() {
  return (
    <BarComingSoon
      eyebrow="Placing Orders"
      title=""
      italic="Deliveries"
      subtitle="Place orders to suppliers. Track expected arrivals. Allocations show separately."
      body="Same pattern as chef Deliveries (the surface is for placing orders, not just receiving them). Pre-filtered to bar-relevant suppliers. Par-level breach surfaces here as suggested order quantities. Allocations get a separate strip — rare bottles arrive when they arrive."
      reads={[
        'v2.deliveries (shared with chef — filtered by linked supplier or category)',
        'v2.allocations for the rare-bottle strip',
        'v2.ingredients.par_level / reorder_point for suggested-order surfacing',
      ]}
    />
  );
}
