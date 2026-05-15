import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Inbox — Manager — Palatable' };

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

const SURFACE_LABEL: Record<string, string> = {
  home: 'Kitchen',
  prep: 'Prep',
  recipes: 'Recipes',
  menus: 'Menus',
  margins: 'Margins',
  'stock-suppliers': 'Stock & Suppliers',
  notebook: 'Notebook',
  inbox: 'Inbox',
  bar_home: 'Bar',
  mise: 'Bar Mise',
  specs: 'Bar Specs',
  bar_menus: 'Bar Menus',
  bar_margins: 'Bar Margins',
  back_bar: 'Back Bar',
  cellar: 'Cellar',
};

export default async function ManagerInboxPage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  // Manager sees everything across kitchen + bar surfaces — they oversee
  // both. Filtered to non-dismissed, non-expired signals on their site.
  const { data } = await supabase
    .from('forward_signals')
    .select(
      'id, tag, severity, section_label, headline_pre, headline_em, headline_post, body_md, action_label, action_target, target_surface, emitted_at',
    )
    .eq('site_id', ctx.siteId)
    .is('dismissed_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('display_priority', { ascending: false })
    .order('emitted_at', { ascending: false });
  const signals = (data ?? []) as Signal[];

  // Group by area for the manager
  const kitchenSurfaces = new Set([
    'home',
    'prep',
    'recipes',
    'menus',
    'margins',
    'stock-suppliers',
    'notebook',
  ]);
  const kitchenSignals = signals.filter((s) =>
    kitchenSurfaces.has(s.target_surface),
  );
  const barSignals = signals.filter((s) => !kitchenSurfaces.has(s.target_surface));

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1100px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Site-Wide Forward Intelligence
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
            All clear. Patterns from kitchen and bar surface here when there's something worth your eyes.
          </p>
        </div>
      ) : (
        <>
          {kitchenSignals.length > 0 && (
            <SignalGroup
              title="Kitchen"
              signals={kitchenSignals}
              meta={`${kitchenSignals.length} signal${kitchenSignals.length === 1 ? '' : 's'}`}
            />
          )}
          {barSignals.length > 0 && (
            <SignalGroup
              title="Bar"
              signals={barSignals}
              meta={`${barSignals.length} signal${barSignals.length === 1 ? '' : 's'}`}
            />
          )}
        </>
      )}
    </div>
  );
}

function subtitleFor(signals: Signal[]): string {
  if (signals.length === 0)
    return 'All clear. Patterns will surface here as the site builds history.';
  const urgent = signals.filter((s) => s.severity === 'urgent').length;
  const attention = signals.filter((s) => s.severity === 'attention').length;
  if (urgent > 0)
    return `${urgent} urgent · ${attention} worth attention · ${signals.length} total.`;
  if (attention > 0)
    return `${attention} ${attention === 1 ? 'pattern' : 'patterns'} worth attention across kitchen and bar.`;
  return `${signals.length} ${signals.length === 1 ? 'pattern' : 'patterns'} the system spotted.`;
}

function SignalGroup({
  title,
  signals,
  meta,
}: {
  title: string;
  signals: Signal[];
  meta: string;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-rule">
        <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold">
          {title}
        </div>
        <div className="font-serif italic text-sm text-muted">{meta}</div>
      </div>
      <div className="space-y-4">
        {signals.map((s) => (
          <SignalCard key={s.id} signal={s} />
        ))}
      </div>
    </section>
  );
}

function SignalCard({ signal: s }: { signal: Signal }) {
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
          <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted-soft">
            {SURFACE_LABEL[s.target_surface] ?? s.target_surface}
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
