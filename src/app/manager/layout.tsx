import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Manager shell layout. Slim — the locked manager mockups (Home,
 * Menu Builder) each carry their own dense top context bar, so this
 * layout intentionally provides only the role gate plus a minimal
 * eyebrow strip with a back-to-chef-shell link.
 *
 * Full ten-tab manager sidebar lands once the remaining 8 manager
 * tab mockups are designed (task #34 in CLAUDE.md roadmap).
 */
export default async function ManagerLayout({
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
    .select('site_id, role, sites:site_id (name)')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect('/onboarding');

  const role = membership.role as string;
  if (role !== 'manager' && role !== 'owner') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-3">
            Manager Surface
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            Not your room
          </h1>
          <p className="font-serif italic text-lg text-muted mb-6">
            The manager surface is for site managers and owners. You're signed in as a {role}.
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

  const siteName =
    ((membership as unknown as { sites: { name: string } | null }).sites?.name) ??
    'My Kitchen';

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="bg-ink text-paper px-7 py-2.5 flex justify-between items-center flex-shrink-0">
        <div className="font-display font-semibold text-[10px] tracking-[0.4em] uppercase text-gold-light">
          Manager · {siteName}
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
