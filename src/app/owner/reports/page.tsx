import { OwnerComingSoon, OwnerPageHeader } from '@/components/owner/OwnerScaffold';

export const metadata = { title: 'Reports — Owner — Palatable' };

export default function OwnerReportsPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px] mx-auto">
      <OwnerPageHeader
        eyebrow="What Your Accountant Wants"
        title="Reports"
        subtitle="Period reports · accountant exports · P&L bundles. Print, download, send."
        activeSlug="reports"
      />
      <OwnerComingSoon
        surface="Reports"
        body={
          'Period exports of everything that lands on the other owner tabs — Q1 / Q2 / annual P&L, supplier-spend summary, waste-by-category report, dish-margin trend report. Each one a PDF + CSV bundle the accountant can drop straight into Xero / QuickBooks. The chef + manager surfaces drive the data into Palatable; this surface drives it out.'
        }
        reads={[
          'Aggregated from every other owner-shell surface',
          'PDF generator (pending — likely Puppeteer or similar)',
          'CSV exporter (lightweight, ship first)',
          'Optional: direct Xero / QuickBooks push',
        ]}
      />
    </div>
  );
}
