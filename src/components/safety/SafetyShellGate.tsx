import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SafetyOnboardingModal } from './SafetyOnboardingModal';

/**
 * Renders one of three states:
 *
 *   1. children — Safety is enabled + liability acked. Normal pass-through.
 *   2. tier upsell card — account does not have safety_enabled = true.
 *   3. onboarding modal — owner has not acked liability yet.
 *
 * Used by src/app/safety/layout.tsx to gate every safety route.
 */
export async function SafetyShellGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, site_id, sites:site_id (account_id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect('/onboarding');

  const accountId =
    (membership.sites as unknown as {
      account_id?: string;
      name?: string;
    } | null)?.account_id ?? null;
  const siteName =
    (membership.sites as unknown as { name?: string } | null)?.name ??
    'this site';

  if (!accountId) {
    return <NotEnabled siteName={siteName} />;
  }

  const { data: account } = await supabase
    .from('accounts')
    .select(
      'safety_enabled, safety_liability_acked_at, is_founder',
    )
    .eq('id', accountId)
    .maybeSingle();
  const safetyEnabled = Boolean(account?.safety_enabled);
  const isFounder = Boolean(account?.is_founder);
  const ackedAt = (account?.safety_liability_acked_at as string | null) ?? null;

  if (!safetyEnabled && !isFounder) {
    return <NotEnabled siteName={siteName} />;
  }

  const isOwner = membership.role === 'owner';

  if (!ackedAt) {
    if (isOwner) {
      return (
        <>
          <div className="filter blur-sm pointer-events-none">{children}</div>
          <SafetyOnboardingModal />
        </>
      );
    }
    return <AwaitingOwnerAck />;
  }

  return <>{children}</>;
}

function NotEnabled({ siteName }: { siteName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[560px] text-center">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-3">
          Palatable Safety
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
          Not turned on
        </h1>
        <p className="font-serif italic text-lg text-muted mb-6">
          Safety is the £20/site uplift on the Kitchen tier — digital SFBB
          diary, probe + temperature log, incident records, training expiry,
          HACCP wizard, EHO Visit mode. {siteName} doesn't have it switched
          on yet.
        </p>
        <Link
          href="/owner/settings#safety"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors inline-block"
        >
          Enable Safety
        </Link>
      </div>
    </div>
  );
}

function AwaitingOwnerAck() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[520px] text-center">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-urgent mb-3">
          Liability ack required
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
          Owner has to open this first
        </h1>
        <p className="font-serif italic text-lg text-muted">
          An owner needs to open Safety once and accept the legal wording
          before kitchen + bar staff can record entries. Ask them to sign
          in and visit /safety.
        </p>
      </div>
    </div>
  );
}
