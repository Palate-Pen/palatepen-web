import { getShellContext } from '@/lib/shell/context';
import { getConnections, SERVICE_CATALOG } from '@/lib/connections';
import { ConnectionCard } from '@/components/connections/ConnectionCard';
import { KpiCard } from '@/components/shell/KpiCard';

export const metadata = { title: 'Connections — Bar — Palatable' };

/**
 * Bar shell sees the same connections as chef — they're site-level,
 * not per-shell. Default ordering nudges the bar-relevant ones (Resy
 * for reservations, Square for POS) to the top.
 */
export default async function BarConnectionsPage() {
  const ctx = await getShellContext();
  const byService = await getConnections(ctx.siteId);

  const connectedCount = Array.from(byService.values()).filter(
    (c) => c.status === 'connected' && c.has_credential,
  ).length;
  const erroredCount = Array.from(byService.values()).filter(
    (c) => c.status === 'error' || c.status === 'expired',
  ).length;

  const ordered = [
    ...SERVICE_CATALOG.filter((s) => s.bar_relevant),
    ...SERVICE_CATALOG.filter((s) => !s.bar_relevant),
  ];

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1100px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Tools You Already Use
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        Bar <em className="text-gold font-semibold not-italic">Connections</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        Square POS, Resy reservations, your own keys — pasted in once, working across kitchen and bar.
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
        <KpiCard label="Scope" value="Site" sub="shared with kitchen" />
        <KpiCard label="Same Data" value="Yes" sub="kitchen sees these too" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ordered.map((def) => (
          <ConnectionCard
            key={def.service}
            def={def}
            connection={byService.get(def.service) ?? null}
            revalidatePathname="/bartender/connections"
          />
        ))}
      </div>
    </div>
  );
}
