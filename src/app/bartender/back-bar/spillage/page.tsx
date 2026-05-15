import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Spillage & Waste — Bar — Palatable' };

export default function BarSpillagePage() {
  return (
    <BarComingSoon
      eyebrow="What Didn't Make It Into A Glass"
      title="Spillage &"
      italic="Waste"
      subtitle="Over-pours, breakage, comps, returns. The honest picture."
      body="Bar's own waste surface, parallel to chef Waste. Reasons drop down to bar-flavoured options (over_pour / breakage / spillage / comp / returned / expired). Pattern detector watches for same spirit appearing 3+ times in spillage in 14 days — training need or theft signal."
      reads={[
        'v2.waste_entries (filtered by spillage_reason IS NOT NULL)',
        'v2.forward_signals target_surface=bar_home for spillage-pattern alerts',
      ]}
    />
  );
}
