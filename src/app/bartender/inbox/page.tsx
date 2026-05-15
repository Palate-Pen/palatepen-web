import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Inbox — Bar — Palatable' };

export default function BarInboxPage() {
  return (
    <BarComingSoon
      eyebrow="Forward-Intelligence Feed"
      title=""
      italic="Inbox"
      subtitle="Pour-cost drift. Stock variance. Allocation arrivals. Spillage patterns. Wine ageing."
      body="Bar-specific feed reading v2.forward_signals filtered to bar surfaces. Same dismiss / acted-on pattern as chef Inbox. Bar detectors: pour-cost drift (cocktail margin moves >2% w-o-w), stock variance alert (>£50 from last take), allocation arrivals (rare bottle in 7 days), par breaches, spillage patterns (same spirit 3+ times in 14d), wine ageing past optimal window, service-style mismatches."
      reads={[
        'v2.forward_signals filtered to target_surface in (bar_home/specs/cellar/back_bar/bar_margins)',
        'Bar-specific detector functions run on schedule (cron) — separate from chef detectors',
      ]}
    />
  );
}
