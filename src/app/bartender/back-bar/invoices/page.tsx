import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Invoices — Bar — Palatable' };

export default function BarInvoicesPage() {
  return (
    <BarComingSoon
      eyebrow="Paperwork, Prices, Credit Notes"
      title=""
      italic="Invoices"
      subtitle="Same scan / review / flag / draft credit-note flow as the kitchen — shared infra."
      body="The bar reads the same invoice surface as chef Stock & Suppliers — invoices arrive scanned or via email forward, lines flag when delivery doesn't match, credit notes draft from flagged lines. Default filter shows bar-relevant invoices (linked to bar suppliers) but everything's visible if the bartender wants to drill into a cross-shell delivery."
      reads={[
        'v2.invoices + v2.invoice_lines + v2.credit_notes — shared with chef',
        'v2.suppliers — filtered to bar by category if set, else by manual flag',
      ]}
    />
  );
}
