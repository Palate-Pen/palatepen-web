import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Suppliers — Bar — Palatable' };

export default function BarSuppliersPage() {
  return (
    <BarComingSoon
      eyebrow="Who You Buy From"
      title=""
      italic="Suppliers"
      subtitle="Shared with kitchen, filtered to bar-relevant. Per-supplier reliability score, contract terms, spend trend."
      body="Liberty Wines, Speciality Drinks, Hop Burns Black — the bar's supplier list. Same surface as chef Suppliers (per-supplier detail view with reliability score, recent invoices, ingredient spread, 90-day spend) — just default-filtered to bar suppliers."
      reads={[
        'v2.suppliers (shared with chef — filtered by category or manual flag)',
        'v2.invoices joined for spend + reliability',
      ]}
    />
  );
}
