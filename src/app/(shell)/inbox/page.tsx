import { getShellContext } from '@/lib/shell/context';
import { getInboxSignals, type InboxSignal } from '@/lib/inbox';
import { SignalActions } from './SignalActions';

export const metadata = { title: 'Inbox — Palatable' };

const surfaceLabel: Record<string, string> = {
  home: 'Home',
  prep: 'Prep',
  recipes: 'Recipes',
  menus: 'Menus',
  margins: 'Margins',
  'stock-suppliers': 'The Walk-in',
  notebook: 'Notebook',
  inbox: 'Inbox',
};

const tagLabel: Record<InboxSignal['tag'], string> = {
  plan_for_it: 'Plan For It',
  get_ready: 'Get Ready',
  worth_knowing: 'Worth Knowing',
  market_move: 'Market Move',
};

const severityStripe: Record<InboxSignal['severity'], string> = {
  urgent: 'before:bg-urgent',
  attention: 'before:bg-attention',
  healthy: 'before:bg-healthy',
  info: 'before:bg-gold',
};

const severityIconBg: Record<InboxSignal['severity'], string> = {
  urgent: 'bg-urgent',
  attention: 'bg-attention',
  healthy: 'bg-healthy',
  info: 'bg-gold',
};

const severityIconGlyph: Record<InboxSignal['severity'], string> = {
  urgent: '!',
  attention: '·',
  healthy: '✓',
  info: '↑',
};

function relativeTime(iso: string, now: Date): string {
  const t = new Date(iso);
  const diffMs = now.getTime() - t.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1) {
    const m = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${m} ${m === 1 ? 'min' : 'mins'}`;
  }
  if (diffH < 24) {
    const h = Math.floor(diffH);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  const d = Math.floor(diffH / 24);
  if (d < 14) return `${d} ${d === 1 ? 'day' : 'days'}`;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(t);
}

function escapeAndBold(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="not-italic font-semibold text-ink">$1</strong>',
  );
}

export default async function InboxPage() {
  const ctx = await getShellContext();
  const signals = await getInboxSignals(ctx.siteId);
  const now = new Date();
  const active = signals.filter((s) => !s.dismissed_at);
  const actedCount = signals.filter((s) => s.acted_at).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        Inbox
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        {signals.length === 0
          ? 'Nothing yet — signals will land here as the system spots patterns.'
          : `${active.length} ${active.length === 1 ? 'signal' : 'signals'} active across every surface, newest first${
              actedCount > 0
                ? ` · ${actedCount} acted on`
                : ''
            }.`}
      </p>

      {signals.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <p className="font-serif italic text-muted">
            The forward-intelligence detectors run daily. Once they've seen enough activity (a few weeks of invoices / prep / recipe changes) the patterns start arriving here.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          {signals.map((s, i) => (
            <SignalRow
              key={s.id}
              signal={s}
              now={now}
              last={i === signals.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalRow({
  signal,
  now,
  last,
}: {
  signal: InboxSignal;
  now: Date;
  last: boolean;
}) {
  const dismissed = !!signal.dismissed_at;
  const acted = !!signal.acted_at;
  return (
    <div
      className={
        'relative px-7 py-5 flex gap-4 items-start transition-colors before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ' +
        severityStripe[signal.severity] +
        (last ? '' : ' border-b border-rule') +
        (acted ? ' opacity-70' : dismissed ? ' opacity-60' : '')
      }
    >
      <div
        className={
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm text-paper ' +
          severityIconBg[signal.severity]
        }
        aria-hidden="true"
      >
        {severityIconGlyph[signal.severity]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap mb-1">
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
            {surfaceLabel[signal.target_surface] ?? signal.target_surface}
          </div>
          <div className="font-display font-semibold text-xs tracking-[0.08em] uppercase text-muted px-2 py-0.5 border border-rule">
            {tagLabel[signal.tag]}
          </div>
          <div className="font-sans text-xs text-muted-soft ml-auto whitespace-nowrap">
            {relativeTime(signal.emitted_at, now)}
          </div>
        </div>

        <div className="font-serif font-semibold text-base text-ink leading-snug mb-1">
          {signal.headline_pre}
          {signal.headline_em && (
            <em className="text-gold not-italic font-medium italic">
              {signal.headline_em}
            </em>
          )}
          {signal.headline_post}
        </div>

        <div
          className="font-serif italic text-sm text-muted leading-relaxed"
          dangerouslySetInnerHTML={{ __html: escapeAndBold(signal.body_md) }}
        />

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {signal.action_label && (
            <a
              href={signal.action_target ?? '#'}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors"
            >
              {signal.action_label}
            </a>
          )}
          {signal.action_context && (
            <span className="font-serif italic text-xs text-muted">
              {signal.action_context}
            </span>
          )}
          <div className="ml-auto">
            <SignalActions
              signalId={signal.id}
              dismissed={dismissed}
              acted={acted}
              hasActionTarget={signal.action_target != null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
