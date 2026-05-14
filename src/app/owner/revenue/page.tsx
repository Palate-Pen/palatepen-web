import { OwnerComingSoon, OwnerPageHeader } from '@/components/owner/OwnerScaffold';

export const metadata = { title: 'Revenue — Owner — Palatable' };

export default function OwnerRevenuePage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <OwnerPageHeader
        eyebrow="The Top Line"
        title="Revenue"
        subtitle="Period trends · year-on-year · same-period growth. Lands once a revenue source is wired."
        activeSlug="revenue"
      />
      <OwnerComingSoon
        surface="Revenue"
        body="Revenue tracking needs a covers source (POS integration or manual cover counts) and a sell-price stream — neither of those is fully online yet. Once they are, this surface shows weekly / monthly / quarterly revenue with year-on-year comparison, plus the headline same-period growth metric. The chef + manager surfaces don't need it; the owner surface is where it lives."
        reads={[
          'v2.covers (schema pending — POS integration or manual entry)',
          'v2.recipes.sell_price × cover counts per dish',
          'Optional: Square / ePOSnow integration when wired',
        ]}
      />
    </div>
  );
}
