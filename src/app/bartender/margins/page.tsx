import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Margins — Bar — Palatable' };

export default function BarMarginsPage() {
  return (
    <BarComingSoon
      eyebrow="The Pour-Cost Picture"
      title=""
      italic="Margins"
      subtitle="Industry pour-cost bands built in. See which drinks earn and which ones leak."
      body="Pour-cost ranges hard-coded from industry standard: spirits 18-24%, wine 28-32%, beer 18-22%, cocktails 18-22%. Each spec colour-codes against its band. Pour-cost drift detector fires when a margin moves more than 2% week-on-week. Same drill-down + what-if pattern as chef Margins. Looking Ahead surfaces shifts before they bite."
      reads={[
        'v2.recipes + v2.recipe_ingredients + v2.ingredients for live margin',
        'POUR_COST_BANDS constant (in lib/bar.ts) for band thresholds',
        'v2.forward_signals target_surface=bar_margins for drift signals',
      ]}
    />
  );
}
