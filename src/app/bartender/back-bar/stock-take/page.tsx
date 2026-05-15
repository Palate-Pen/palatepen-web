import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Stock Take — Bar — Palatable' };

export default function BarStockTakePage() {
  return (
    <BarComingSoon
      eyebrow="The Honest Count"
      title="Stock"
      italic="Take"
      subtitle="Weekly bottle count. Variance flagged. The bar's truth check."
      body="Bar-specific workflow — chef equivalent doesn't exist yet. Sessions: start a stock take, count each bottle (counted vs expected), variance auto-calculated against the last invoice-confirmed quantity. Variance > £50 fires an alert on the Bartender Home. Completed takes archive with notes. Looking Ahead surfaces variance trends week-over-week."
      reads={[
        'v2.stock_takes + v2.stock_take_lines (bar-specific tables)',
        'v2.ingredients.current_stock as the expected baseline',
        'v2.forward_signals target_surface=bar_home for variance alerts',
      ]}
    />
  );
}
