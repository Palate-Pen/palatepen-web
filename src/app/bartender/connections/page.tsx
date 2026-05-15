import { BarComingSoon } from '@/components/bartender/BarComingSoon';

export const metadata = { title: 'Connections — Bar — Palatable' };

export default function BarConnectionsPage() {
  return (
    <BarComingSoon
      eyebrow="Plug Things In"
      title=""
      italic="Connections"
      subtitle="POS, distributor APIs, allocation feeds. Chef pastes keys; we don't go fetch."
      body="Same pattern as chef Connections: the bartender pastes their own credentials for POS (drinks-vs-food split), distributor APIs (Liberty Wines, Speciality), and any allocation-pulling integration. No OAuth sweep from our side — the keys are chef-owned."
      reads={[
        'v2.user_preferences.api_credentials (encrypted, chef-input)',
        'Webhooks from third-party services land via /api/inbound-* routes',
      ]}
    />
  );
}
