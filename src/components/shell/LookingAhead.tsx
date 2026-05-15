import { createSupabaseServerClient } from '@/lib/supabase/server';

type TargetSurface =
  | 'home'
  | 'prep'
  | 'recipes'
  | 'menus'
  | 'margins'
  | 'stock-suppliers'
  | 'notebook'
  | 'inbox'
  // Bartender shell surfaces
  | 'bar_home'
  | 'mise'
  | 'specs'
  | 'bar_menus'
  | 'bar_margins'
  | 'back_bar'
  | 'cellar';

type SignalTag = 'plan_for_it' | 'get_ready' | 'worth_knowing' | 'market_move';
type SignalSeverity = 'urgent' | 'attention' | 'healthy' | 'info';

type ForwardSignal = {
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
  action_context: string | null;
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

export async function LookingAhead({
  siteId,
  surface,
}: {
  siteId: string;
  surface: TargetSurface;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('forward_signals')
    .select(
      'id, tag, severity, section_label, headline_pre, headline_em, headline_post, body_md, action_label, action_target, action_context, emitted_at',
    )
    .eq('site_id', siteId)
    .eq('target_surface', surface)
    .is('dismissed_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('display_priority', { ascending: false })
    .order('emitted_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error('[LookingAhead] query failed:', error);
  }

  const signals = (data ?? []) as ForwardSignal[];

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          Looking Ahead
        </div>
        <div className="font-serif italic text-sm text-muted">
          {signals.length === 0
            ? 'patterns will appear here as the kitchen builds history'
            : signalsMeta(signals)}
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-7">
          <div className="font-serif italic text-sm text-muted leading-relaxed">
            No forward signals yet for this surface. The system needs a few weeks of scanned invoices, prep entries, or recipe activity before patterns surface. Until then, this space waits.
          </div>
        </div>
      ) : (
        <div className={'grid grid-cols-1 ' + (signals.length > 1 ? 'md:grid-cols-2' : '')}>
          <div className={'grid grid-cols-1 ' + (signals.length > 1 ? 'md:grid-cols-2 col-span-full' : '') + ' gap-6'}>
            {signals.map((s) => (
              <AheadCard key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function signalsMeta(signals: ForwardSignal[]): string {
  if (signals.length === 1) return 'one pattern worth watching';
  if (signals.length === 2) return 'two patterns worth watching';
  return `${signals.length} patterns the system spotted`;
}

function AheadCard({ signal: s }: { signal: ForwardSignal }) {
  return (
    <div
      className={
        'bg-card border border-rule border-l-4 px-7 py-7 ' + severityStripe[s.severity]
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

      <div
        className="font-serif italic text-sm text-muted leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: renderBodyMd(s.body_md) }}
      />

      {(s.action_label || s.action_context) && (
        <div className="flex items-center justify-between pt-3 border-t border-rule">
          {s.action_label ? (
            <a
              href={s.action_target ?? '#'}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold cursor-pointer"
            >
              {s.action_label}
            </a>
          ) : (
            <span />
          )}
          {s.action_context && (
            <div className="font-serif italic text-xs text-muted">
              {s.action_context}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STRONG_RE = /\*\*(.+?)\*\*/g;

function renderBodyMd(md: string): string {
  // Minimal markdown: only **bold**. Escape everything else.
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    STRONG_RE,
    '<strong class="not-italic font-semibold text-ink">$1</strong>',
  );
}
