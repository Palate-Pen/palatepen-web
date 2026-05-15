import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Inbox — Bar — Palatable' };

const BAR_SURFACES = [
  'bar_home',
  'mise',
  'specs',
  'bar_menus',
  'bar_margins',
  'back_bar',
  'cellar',
] as const;

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
  emitted_at: string;
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

export default async function BarInboxPage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('forward_signals')
    .select(
      'id, tag, severity, section_label, headline_pre, headline_em, headline_post, body_md, action_label, action_target, emitted_at',
    )
    .eq('site_id', ctx.siteId)
    .in('target_surface', BAR_SURFACES as unknown as string[])
    .is('dismissed_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('display_priority', { ascending: false })
    .order('emitted_at', { ascending: false });
  const signals = (data ?? []) as Signal[];

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1100px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Forward-Intelligence Feed
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Inbox</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-10">
        {subtitleFor(signals)}
      </p>

      {signals.length === 0 ? (
        <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-12 text-center">
          <p className="font-serif italic text-muted max-w-md mx-auto">
            No bar signals yet. The system needs a few weeks of pour data, deliveries, and spillage entries before patterns surface.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function subtitleFor(signals: Signal[]): string {
  if (signals.length === 0)
    return 'All clear. Patterns will surface here as the bar builds history.';
  const urgent = signals.filter((s) => s.severity === 'urgent').length;
  const attention = signals.filter((s) => s.severity === 'attention').length;
  if (urgent > 0)
    return `${urgent} urgent · ${attention} worth attention · ${signals.length} total.`;
  if (attention > 0)
    return `${attention} ${attention === 1 ? 'pattern' : 'patterns'} worth attention.`;
  return `${signals.length} ${signals.length === 1 ? 'pattern' : 'patterns'} the system spotted.`;
}

function SignalCard({ signal: s }: { signal: Signal }) {
  return (
    <div
      className={
        'bg-card border border-rule border-l-4 px-7 py-6 ' +
        severityStripe[s.severity]
      }
    >
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div
          className={
            'font-sans font-semibold text-xs tracking-[0.08em] uppercase ' +
            severityLabelColor[s.severity]
          }
        >
          {s.section_label}
        </div>
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted px-2 py-1 border border-rule whitespace-nowrap">
          {tagLabel[s.tag]}
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
