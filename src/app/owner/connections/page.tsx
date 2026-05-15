import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { ConnectionsPanel } from '@/components/connections/ConnectionsPanel';

export const metadata = { title: 'Connections — Owner — Palatable' };

export default async function OwnerConnectionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ site?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (name)')
    .eq('user_id', user.id)
    .eq('role', 'owner');
  const sites = ((memberships ?? []) as unknown as Array<{
    site_id: string;
    sites: { name: string | null } | null;
  }>).map((m) => ({
    id: m.site_id,
    name: m.sites?.name ?? 'Site',
  }));

  if (sites.length === 0) {
    return (
      <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
        <OwnerPageHeader
          eyebrow="Tying It Together"
          title="Connections"
          subtitle="No owned sites on file. Connections live per-site, so there's nothing to wire yet."
          activeSlug="connections"
        />
      </div>
    );
  }

  const sp = searchParams ? await searchParams : undefined;
  const activeSite =
    sites.find((s) => s.id === sp?.site)?.id ?? sites[0].id;
  const activeSiteName =
    sites.find((s) => s.id === activeSite)?.name ?? 'Site';

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <OwnerPageHeader
        eyebrow="Tying It Together"
        title="Connections"
        subtitle="Per-site API keys. POS, inbound email, the accountant feed. Manager + Owner control these together — Chefs no longer wire integrations."
        activeSlug="connections"
      />

      {sites.length > 1 && (
        <div className="mb-8 flex items-center gap-2 flex-wrap">
          <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mr-2">
            Site:
          </span>
          {sites.map((s) => (
            <Link
              key={s.id}
              href={`/owner/connections?site=${s.id}`}
              className={
                'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border transition-colors ' +
                (s.id === activeSite
                  ? 'bg-gold text-paper border-gold'
                  : 'bg-transparent text-muted border-rule hover:border-gold hover:text-gold')
              }
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <p className="font-serif italic text-sm text-muted mb-6">
        Wiring keys for <strong className="font-semibold text-ink not-italic">{activeSiteName}</strong>.
      </p>

      <ConnectionsPanel
        siteId={activeSite}
        revalidatePathname="/owner/connections"
      />
    </div>
  );
}
