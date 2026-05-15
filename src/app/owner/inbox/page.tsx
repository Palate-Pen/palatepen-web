import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Inbox — Owner — Palatable' };

type SignalTag = 'plan_for_it' | 'get_ready' | 'worth_knowing' | 'market_move';
type SignalSeverity = 'urgent' | 'attention' | 'healthy' | 'info';

type Signal = {
  id: string;
  tag: SignalTag;
  severity: SignalSeverity;
  section_label: string;
  headline_pre: string | null;
  headline_em: string | null;
  headline_post: string | null;
  body_md: string;
  action_label: string | null;
  action_target: string | null;
  target_surface: string;
  emitted_at: string;
  site_id: string;
};

const tagLabel: Record<SignalTag, string> = {
  plan_for_it: 'Plan For It',
  get_ready: 'Get Ready',
  worth_knowing: 'Worth Knowing',
  market_move: 'Market Move',
};

const severityStripe: Record<SignalSeverity, string> = {
  urgent: 'border-l-urgent',
  attention: 'border-l-attention',
  healthy: 'border-l-healthy',
  info: 'border-l-gold',
};

const severityLabelColor: Record<SignalSeverity, string> = {
  urgent: 'text-urgent',
  attention: 'text-attention',
  healthy: 'text-healthy',
  info: 'text-gold',
};

export default async function OwnerInboxPage() {
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

  const siteIds = (memberships ?? [])
    .map((m) => m.site_id as string)
    .filter(Boolean);
  const siteNames = new Map<string, string>(
    (memberships ?? []).map((m) => [
      m.site_id as string,
      ((m.sites as unknown as { name?: string } | null) ?? null)?.name ??
        'Site',
    ]),
  );

  const { data } =
    siteIds.length > 0
      ? await supabase
          .from('forward_signals')
          .select(
            'id, tag, severity, section_label, headline_pre, headline_em, headline_post, body_md, action_label, action_target, target_surface, emitted_at, site_id',
          )
          .in('site_id', siteIds)
          .is('dismissed_at', null)
          .or(
            `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`,
          )
          .in('severity', ['urgent', 'attention'])
          .order('display_priority', { ascending: false })
          .order('emitted_at', { ascending: false })
      : { data: [] };
  const signals = (data ?? []) as Signal[];

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        What Needs Your Eyes
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Inbox</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-10">
        Cross-business forward signals — urgent and attention only. Nothing worth-knowing makes it here; that's a manager job.
      </p>

      {signals.length === 0 ? (
        <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-12 text-center">
          <p className="font-serif italic text-muted max-w-md mx-auto">
            Nothing for the owner's attention right now. Patterns surface here only when they're urgent or attention-level across one of your sites.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((s) => (
            <SignalCard
              key={s.id}
              signal={s}
              siteName={siteNames.get(s.site_id) ?? 'Site'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalCard({
  signal: s,
  siteName,
}: {
  signal: Signal;
  siteName: string;
}) {
  return (
    <div
      className={
        'bg-card border border-rule border-l-4 px-7 py-6 ' +
        severityStripe[s.severity]
      }
    >
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div
          className={
            'font-sans font-semibold text-xs tracking-[0.08em] uppercase ' +
            severityLabelColor[s.severity]
          }
        >
          {s.section_label}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft">
            {siteName}
          </span>
          <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted px-2 py-1 border border-rule whitespace-nowrap">
            {tagLabel[s.tag]}
          </span>
        </div>
      </div>
      <div className="font-serif text-xl text-ink mb-3 leading-snug">
        {s.headline_pre}
        {s.headline_em && (
          <em className="text-gold not-italic font-medium italic">
            {s.headline_em}
          </em>
        )}
        {s.headline_post}
      </div>
      <div className="font-serif italic text-sm text-muted leading-relaxed mb-4 whitespace-pre-line">
        {s.body_md}
      </div>
      {s.action_label && s.action_target && (
        <div className="pt-3 border-t border-rule">
          <Link
            href={s.action_target}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold"
          >
            {s.action_label}
          </Link>
        </div>
      )}
    </div>
  );
}
