import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Back Bar — Palatable' };

export default function BackBarHubPage() {
  return (
    <BarComingSoon
      eyebrow="The Bottles, The Books, The Stock"
      title="Back"
      italic="Bar"
      subtitle="Everything physical and operational. Cellar, deliveries, invoices, suppliers, spillage, stock take."
      body="Hub mirroring chef Stock & Suppliers. Six destinations: Cellar (live bottle inventory + par levels), Deliveries (orders placed to suppliers), Invoices (scan + flag + credit notes — shared infra with kitchen), Suppliers (Liberty Wines, Speciality Drinks, Hop Burns Black etc — shared list filtered to bar-relevant), Spillage & Waste (over-pours, breakage, comps), Stock Take (weekly bottle count with variance tracking)."
      reads={[
        'v2.ingredients (filtered to bar unit_types: bottle/case/keg/cask/L/ml)',
        'v2.deliveries, v2.invoices, v2.suppliers — shared with chef Stock & Suppliers',
        'v2.waste_entries with spillage_reason set',
        'v2.allocations + v2.stock_takes + v2.stock_take_lines (bar-specific)',
      ]}
    />
  );
}
