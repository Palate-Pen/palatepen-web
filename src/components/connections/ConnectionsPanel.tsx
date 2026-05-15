import { getConnections, SERVICE_CATALOG } from '@/lib/connections';
import { ConnectionCard } from '@/components/connections/ConnectionCard';
import { KpiCard } from '@/components/shell/KpiCard';

/**
 * Reusable Connections body. The chef + bar shells used to render this
 * directly; it now lives behind the Manager + Owner views (Kitchen+ tier
 * controls the integration surface — chefs no longer wire third parties).
 */
export async function ConnectionsPanel({
  siteId,
  revalidatePathname,
}: {
  siteId: string;
  revalidatePathname: string;
}) {
  const byService = await getConnections(siteId);

  const connectedCount = Array.from(byService.values()).filter(
    (c) => c.status === 'connected' && c.has_credential,
  ).length;
  const erroredCount = Array.from(byService.values()).filter(
    (c) => c.status === 'error' || c.status === 'expired',
  ).length;

  return (
    <>
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
          label="Scope"
          value="Site-scoped"
          sub="keys live with this site"
        />
        <KpiCard
          label="Tier"
          value="Kitchen+"
          sub="manager + owner control"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SERVICE_CATALOG.map((def) => (
          <ConnectionCard
            key={def.service}
            def={def}
            connection={byService.get(def.service) ?? null}
            revalidatePathname={revalidatePathname}
          />
        ))}
      </div>

      <div className="mt-10 bg-card border border-rule border-l-4 border-l-gold px-7 py-5">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mb-2">
          Honest about storage
        </div>
        <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
          Keys are stored on Palatable's EU servers, scoped to the site,
          and only used when the relevant integration runs. We don't share
          them with anyone, including across accounts. Disconnect at any
          time — the key field gets wiped.
        </p>
      </div>
    </>
  );
}
