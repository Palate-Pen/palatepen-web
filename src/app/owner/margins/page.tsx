import Link from 'next/link';
import { OwnerComingSoon, OwnerPageHeader } from '@/components/owner/OwnerScaffold';

export const metadata = { title: 'Margins — Owner — Palatable' };

export default function OwnerMarginsPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <OwnerPageHeader
        eyebrow="The Whole Menu, Across Every Site"
        title="Margins"
        subtitle="Group-wide dish performance — the winners and the dogs across every kitchen you own."
        activeSlug="margins"
      />
      <OwnerComingSoon
        surface="Group margins"
        body={
          'The chef surface has /margins for the per-site margin board. The owner version aggregates: which dishes pull the heaviest weight across the business, which sites carry which dishes, where the same dish has divergent costs (supplier delta between sites). The single-site margin lens at /margins covers everything an owner needs for jack@ today — this surface fans out the moment a second site lands.'
        }
        reads={[
          'v2.recipes joined to v2.sites across the owner\'s memberships',
          'Live cost via existing getMarginsData per site, summed group-wide',
          'Cross-site dish-name matching (heuristic + manual link)',
        ]}
      />
      <div className="mt-6 font-serif italic text-sm text-muted">
        Single-site margins are live at{' '}
        <Link href="/margins" className="text-gold hover:text-gold-dark transition-colors not-italic font-semibold">
          /margins
        </Link>
        .
      </div>
    </div>
  );
}
