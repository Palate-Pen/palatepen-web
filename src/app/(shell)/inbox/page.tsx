export const metadata = { title: 'Inbox — Palatable' };

type Severity = 'unread' | 'urgent' | 'healthy' | 'normal';

type Message = {
  icon: string;
  headline: string;
  meta: string;
  preview: string;
  timestamp: string;
  severity: Severity;
};

const messages: Message[] = [
  {
    icon: '✓',
    headline: 'Mediterranean — invoice confirmation',
    meta: 'Auto-banked · 22 lines · £340',
    preview:
      "System auto-banked ingredient prices from today's delivery. Confirm or adjust in The Bank.",
    timestamp: '2 mins',
    severity: 'unread',
  },
  {
    icon: '!',
    headline: 'Aubrey — lamb shoulder short 4.2kg',
    meta: 'Discrepancy flagged',
    preview:
      'Delivery arrived short. Est. £60 impact on costing. Click to draft credit note.',
    timestamp: '1 hour',
    severity: 'urgent',
  },
  {
    icon: '📦',
    headline: 'Deliveries — Reza order cutoff 16:00 today',
    meta: 'Order reminder',
    preview:
      'Your Tuesday standing order. 19 items, £180 est. Order now or skip.',
    timestamp: '3 hours',
    severity: 'unread',
  },
  {
    icon: '✓',
    headline: 'Waste — Sunday pattern improving',
    meta: 'Positive signal',
    preview:
      "Aubergine waste down 50% vs last month. Tom's plating technique working.",
    timestamp: '1 day',
    severity: 'healthy',
  },
  {
    icon: '📋',
    headline: 'Prep — Friday 15 May confirmed',
    meta: 'Prep schedule locked',
    preview:
      '168 covers forecast. Hummus + shawarma + tahini scaled. 3 items unassigned.',
    timestamp: '2 days',
    severity: 'normal',
  },
];

const stripeFor: Record<Severity, string> = {
  unread: 'before:bg-gold',
  urgent: 'before:bg-urgent',
  healthy: 'before:bg-healthy',
  normal: 'before:bg-transparent',
};

const iconBgFor: Record<Severity, string> = {
  unread: 'bg-gold',
  urgent: 'bg-urgent',
  healthy: 'bg-healthy',
  normal: 'bg-gold',
};

export default function InboxPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1200px]">
      <h1 className="font-serif text-4xl text-ink mb-8">Inbox</h1>

      <div className="bg-card border border-rule">
        {messages.map((m, i) => (
          <div
            key={m.headline}
            className={
              'relative px-7 py-5 flex gap-4 items-start cursor-pointer transition-colors hover:bg-card-warm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ' +
              stripeFor[m.severity] +
              (i < messages.length - 1 ? ' border-b border-rule' : '')
            }
          >
            <div
              className={
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm text-paper ' +
                iconBgFor[m.severity]
              }
            >
              {m.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif font-semibold text-base text-ink">
                {m.headline}
              </div>
              <div className="text-xs text-muted mt-1">{m.meta}</div>
              <div className="font-serif italic text-sm text-muted mt-1.5 leading-relaxed">
                {m.preview}
              </div>
            </div>
            <div className="text-xs text-muted-soft whitespace-nowrap">
              {m.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
