import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Settings — Bar — Palatable' };

export default function BarSettingsPage() {
  return (
    <BarComingSoon
      eyebrow="The Bar Profile"
      title=""
      italic="Settings"
      subtitle="Bar info, team, tier, defaults."
      body="Bar-side settings. Bar name + location, default pour sizes (single 25ml / 35ml shot region), service hours, team list (bartenders, head bartender, bar backs), tier + billing if the bar has its own account. Currency + GP-target inherited from the account-level preferences set in chef Settings unless overridden here."
      reads={[
        'v2.sites + v2.accounts.preferences',
        'v2.memberships filtered to bar roles',
      ]}
    />
  );
}
