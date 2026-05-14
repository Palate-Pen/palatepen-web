import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Owner shell. Sibling of /manager — same pattern: slim eyebrow + role
 * gate, no dense sidebar yet (only the founder uses this surface at
 * the moment; navigation between owner sub-routes happens via the
 * Owner Home page until a real multi-site customer drives sidebar
 * design).
 *
 * Role: owner only. Managers / chefs can't see this surface.
 */
export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role, sites:site_id (account_id)')
    .eq('user_id', user.id);

  const ownerMemberships = (memberships ?? []).filter(
    (m) => m.role === 'owner',
  );
  if (ownerMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-3">
            Owner Surface
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            Not your room
          </h1>
          <p className="font-serif italic text-lg text-muted mb-6">
            The owner surface is for business owners — whole-business pulse, multi-site rollups, the financial picture.
          </p>
          <Link
            href="/"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors inline-block"
          >
            ← Back to your kitchen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="bg-ink text-paper px-7 py-2.5 flex justify-between items-center flex-shrink-0">
        <div className="font-display font-semibold text-[10px] tracking-[0.4em] uppercase text-gold-light">
          Owner ·{' '}
          {ownerMemberships.length === 1
            ? 'single site'
            : `${ownerMemberships.length} sites`}
        </div>
        <Link
          href="/"
          className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-paper/60 hover:text-paper transition-colors"
        >
          ← Chef surface
        </Link>
      </div>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
