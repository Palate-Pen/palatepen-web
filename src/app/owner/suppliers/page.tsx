import Link from 'next/link';
import { OwnerComingSoon, OwnerPageHeader } from '@/components/owner/OwnerScaffold';

export const metadata = { title: 'Suppliers — Owner — Palatable' };

export default function OwnerSuppliersPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <OwnerPageHeader
        eyebrow="Group Spend, Group Leverage"
        title="Suppliers"
        subtitle="Consolidated spend across the business · where the negotiating leverage sits."
        activeSlug="suppliers"
      />
      <OwnerComingSoon
        surface="Group suppliers"
        body={
          'The chef + manager surfaces show suppliers per site. The owner version consolidates: same supplier across multiple sites = a contract conversation; sites buying the same ingredient from different suppliers at different prices = a sourcing opportunity. Contract terms, payment dates, volume commitments live here too once the contract schema lands.'
        }
        reads={[
          'v2.suppliers + v2.ingredients joined across owner memberships',
          'v2.invoices summed for spend-per-supplier-per-quarter',
          'v2.supplier_contracts (schema pending — terms, payment days, volume targets)',
          'Cross-site ingredient matching for sourcing-arbitrage signals',
        ]}
      />
      <div className="mt-6 font-serif italic text-sm text-muted">
        Single-site suppliers live at{' '}
        <Link href="/stock-suppliers/suppliers" className="text-gold hover:text-gold-dark transition-colors not-italic font-semibold">
          /stock-suppliers/suppliers
        </Link>
        .
      </div>
    </div>
  );
}
