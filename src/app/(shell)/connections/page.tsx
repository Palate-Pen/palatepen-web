import { getShellContext } from '@/lib/shell/context';
import { getConnections, SERVICE_CATALOG } from '@/lib/connections';
import { ConnectionCard } from '@/components/connections/ConnectionCard';
import { KpiCard } from '@/components/shell/KpiCard';

export const metadata = { title: 'Connections — Palatable' };

export default async function ConnectionsPage() {
  const ctx = await getShellContext();
  const byService = await getConnections(ctx.siteId);

  const connectedCount = Array.from(byService.values()).filter(
    (c) => c.status === 'connected' && c.has_credential,
  ).length;
  const erroredCount = Array.from(byService.values()).filter(
    (c) => c.status === 'error' || c.status === 'expired',
  ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1100px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Tying It Together
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        <em className="text-gold font-semibold not-italic">Connections</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        Paste the API keys for the services you already use. Palatable pulls what's relevant — sales, reservations, the bookkeeper's feed — and folds it into Looking Ahead.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Connected"
          value={String(connectedCount)}
          sub={`of ${SERVICE_CATALOG.length} services`}
          tone={connectedCount > 0 ? 'healthy' : undefined}
        />
        <KpiCard
          label="Errored"
          value={String(erroredCount)}
          sub="need a new key"
          tone={erroredCount > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Account"
          value="Site-scoped"
          sub="keys live with your site"
        />
        <KpiCard
          label="Tier"
          value="Pro+"
          sub="API key Kitchen+"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SERVICE_CATALOG.map((def) => (
          <ConnectionCard
            key={def.service}
            def={def}
            connection={byService.get(def.service) ?? null}
            revalidatePathname="/connections"
          />
        ))}
      </div>

      <div className="mt-10 bg-card border border-rule border-l-4 border-l-gold px-7 py-5">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mb-2">
          Honest about storage
        </div>
        <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
          Keys are stored on Palatable's EU servers, scoped to your site, and only used when the relevant integration runs. We don't share them with anyone, including across accounts. Disconnect at any time — the key field gets wiped.
        </p>
      </div>
    </div>
  );
}
