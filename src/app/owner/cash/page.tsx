import { OwnerComingSoon, OwnerPageHeader } from '@/components/owner/OwnerScaffold';

export const metadata = { title: 'Cash — Owner — Palatable' };

export default function OwnerCashPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <OwnerPageHeader
        eyebrow="The Money In, The Money Out"
        title="Cash"
        subtitle="A/R · outstanding · payment timing · the cash-flow lens nothing else gives you."
        activeSlug="cash"
      />
      <OwnerComingSoon
        surface="Cash flow"
        body={
          'This is the "open question" surface from the strategy doc — the place where supplier payment timing meets revenue timing meets outstanding invoices, so the owner can see "do I have the cash to make payroll on Friday" without flicking through three accounting tools. It needs revenue input (covers source / POS), payment terms per supplier, and the existing invoice + delivery state. Once those land this surface stitches them into a 30-day cash forward-look.'
        }
        reads={[
          'v2.invoices (outstanding + paid timestamps when payment-tracking lands)',
          'v2.supplier_contracts.payment_terms_days (pending)',
          'Revenue stream (pending — POS or manual)',
          'Optional: bank-feed integration for the actual money picture',
        ]}
      />
    </div>
  );
}
