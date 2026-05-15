import { getShellContext } from '@/lib/shell/context';
import { ConnectionsPanel } from '@/components/connections/ConnectionsPanel';

export const metadata = { title: 'Connections — Manager — Palatable' };

export default async function ManagerConnectionsPage() {
  const ctx = await getShellContext();

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Tying It Together
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        <em className="text-gold font-semibold not-italic">Connections</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        Paste the API keys for the services this site uses — POS, inbound email, accountant feed. Palatable folds what's relevant into Looking Ahead.
      </p>
      <ConnectionsPanel
        siteId={ctx.siteId}
        revalidatePathname="/manager/connections"
      />
    </div>
  );
}
