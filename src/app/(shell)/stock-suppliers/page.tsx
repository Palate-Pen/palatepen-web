export const metadata = { title: 'Stock & Suppliers — Palatable' };

type AttentionSeverity = 'urgent' | 'attention' | 'info';
type DeliveryTone = 'healthy' | 'attention' | 'normal';

type Attention = {
  severity: AttentionSeverity;
  sectionLabel: string;
  severityLabel: string;
  headlinePre: string;
  headlineEm: string;
  headlinePost: string;
  body: React.ReactNode;
  actionLabel: string;
  actionContext: string;
};

const attentions: Attention[] = [
  {
    severity: 'urgent',
    sectionLabel: 'Price Spike',
    severityLabel: 'Urgent',
    headlinePre: 'Lamb shoulder up',
    headlineEm: '12%',
    headlinePost: ' at Aubrey.',
    body: (
      <>
        <strong className="not-italic font-semibold text-ink">
          Tuesday's delivery hit £14.20/kg, up from £12.70.
        </strong>{' '}
        Your shawarma was costed at £11.50, so the dish is bleeding £1.85 a plate. Margins flagged it this morning too.
      </>
    ),
    actionLabel: 'Open the invoice →',
    actionContext: 'Tue 13 May, 07:14',
  },
  {
    severity: 'attention',
    sectionLabel: 'Waste Pattern',
    severityLabel: 'Watch',
    headlinePre: 'Herbs are walking out the bin this week.',
    headlineEm: '',
    headlinePost: '',
    body: (
      <>
        <strong className="not-italic font-semibold text-ink">
          £62 of herbs binned in four days
        </strong>{' '}
        — twice last week. Mostly parsley and coriander. Worth a look at prep quantities versus how busy you've actually been.
      </>
    ),
    actionLabel: 'Open the waste log →',
    actionContext: '7-day rolling total',
  },
  {
    severity: 'info',
    sectionLabel: 'The Bank',
    severityLabel: 'Working',
    headlinePre: "Bank's been busy keeping itself tidy.",
    headlineEm: '',
    headlinePost: '',
    body: (
      <>
        <strong className="not-italic font-semibold text-ink">
          11 prices updated automatically this week
        </strong>{' '}
        from the invoices you scanned. Three new ingredients added — saffron threads, sumac, Aleppo pepper. No duplicates, all matched to existing suppliers.
      </>
    ),
    actionLabel: 'Open the Bank →',
    actionContext: 'last update 07:14 today',
  },
];

const deliveries = [
  {
    day: 'Thu',
    supplier: 'Aubrey Allen',
    sub: 'Lamb shoulder, beef mince, short rib · 8 lines · auto-banked',
    status: 'Arrived',
    tone: 'healthy' as DeliveryTone,
  },
  {
    day: 'Thu',
    supplier: 'Reza Foods',
    sub: 'Tahini, spices, dry goods · 12 lines',
    status: 'Due soon',
    tone: 'attention' as DeliveryTone,
  },
  {
    day: 'Thu',
    supplier: 'Mediterranean Direct',
    sub: 'Veg, herbs, fresh produce · 22 lines',
    status: 'Expected',
    tone: 'normal' as DeliveryTone,
  },
  {
    day: 'Fri',
    supplier: 'Wright Brothers',
    sub: 'Sea bream, mackerel, oysters · 6 lines',
    status: 'Tomorrow',
    tone: 'normal' as DeliveryTone,
  },
  {
    day: 'Sat',
    supplier: 'Aubrey Allen',
    sub: 'Weekend top-up',
    status: 'Saturday',
    tone: 'normal' as DeliveryTone,
  },
];

export default function StockSuppliersPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-display font-semibold text-[9px] tracking-[0.5em] uppercase text-gold mb-3.5">
            The Flow Of Stuff
          </div>
          <h1 className="font-serif text-5xl text-ink leading-[1.05] tracking-[-0.015em]">
            <em className="text-gold not-italic font-medium italic">
              Stock & Suppliers
            </em>
          </h1>
          <p className="font-serif italic text-[17px] text-muted mt-3">
            Three deliveries today. One price spike to deal with. The rest is moving as it should.
          </p>
        </div>

        <div className="bg-card border border-rule px-5 py-4 min-w-[240px] flex items-center gap-3.5 cursor-pointer transition-all hover:border-rule-gold hover:-translate-y-px">
          <div className="w-10 h-10 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </div>
          <div>
            <div className="font-serif font-semibold text-base text-ink leading-tight">
              Scan an invoice
            </div>
            <div className="font-serif italic text-xs text-muted mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="2" width="12" height="20" rx="2" />
                  <path d="M12 18h.01" />
                </svg>
                Use Phone
              </span>
              <span>or upload PDF</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <Kpi label="Today's Deliveries" value="3" sub="Aubrey · Reza · Mediterranean" />
        <Kpi label="Suppliers Active" value="8" sub="all up to date" />
        <Kpi label="Invoices Pending" value="2" sub="one discrepancy flagged" tone="attention" />
        <Kpi label="Waste This Week" value="£148" sub="up 12% — mostly herbs" tone="attention" />
      </div>

      <Section title="Across The Supply Graph" meta="two to action · one to celebrate">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {attentions.map((a) => (
            <AttentionCard key={a.sectionLabel} attention={a} />
          ))}
        </div>
      </Section>

      <Section title="Open A Workspace" meta="five places to go, each with their job">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DestinationCard
            featured
            name="Deliveries"
            tagline="what's arriving today and this week"
            iconPath={
              <>
                <path d="M3 7h13l3 4h2v6h-2" />
                <path d="M3 7v10h13V7" />
                <circle cx="7" cy="18" r="1.5" />
                <circle cx="17" cy="18" r="1.5" />
              </>
            }
            linkLabel="Open Deliveries →"
            linkMeta="5 in next 7 days"
          >
            <div className="flex flex-col">
              {deliveries.map((d, i) => (
                <div
                  key={i}
                  className={
                    'flex items-center gap-4 py-3' +
                    (i < deliveries.length - 1 ? ' border-b border-rule-soft' : '')
                  }
                >
                  <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted w-8">
                    {d.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif font-semibold text-[15px] text-ink">
                      {d.supplier}
                    </div>
                    <div className="font-serif italic text-[12px] text-muted">
                      {d.sub}
                    </div>
                  </div>
                  <div
                    className={
                      'font-display font-semibold text-[9px] tracking-[0.3em] uppercase whitespace-nowrap ' +
                      (d.tone === 'healthy'
                        ? 'text-healthy'
                        : d.tone === 'attention'
                          ? 'text-attention'
                          : 'text-muted')
                    }
                  >
                    {d.status}
                  </div>
                </div>
              ))}
            </div>
          </DestinationCard>

          <DestinationCard
            name="Invoices"
            tagline="paperwork, discrepancies, credit notes"
            iconPath={
              <>
                <path d="M6 3h10l4 4v14H6V3z" />
                <path d="M16 3v4h4" />
                <path d="M9 11h7M9 14h7M9 17h5" />
              </>
            }
            linkLabel="Open Invoices →"
            linkMeta="last received 07:14"
          >
            <StateRow label="In the inbox" value="14" />
            <StateRow label="Discrepancies flagged" value="1" tone="attention" />
            <StateRow label="Credit notes in flight" value="2" />
          </DestinationCard>

          <DestinationCard
            name="Suppliers"
            tagline="who you buy from, when, for how much"
            iconPath={
              <>
                <path d="M3 21V8l9-5 9 5v13" />
                <path d="M9 21V12h6v9" />
                <circle cx="12" cy="9" r="1.2" />
              </>
            }
            linkLabel="Open Suppliers →"
            linkMeta="+ add new"
          >
            <StateRow label="On the books" value="8" />
            <StateRow label="Ordering today" value="Reza by 16:00" />
            <StateRow label="Price lists current" value="7 of 8" />
          </DestinationCard>

          <DestinationCard
            name="The Bank"
            tagline="every ingredient, every price, live"
            iconPath={
              <>
                <ellipse cx="12" cy="6" rx="9" ry="3" />
                <path d="M3 6v12c0 1.7 4 3 9 3s9-1.3 9-3V6" />
                <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
              </>
            }
            linkLabel="Open The Bank →"
            linkMeta="last update 07:14"
          >
            <StateRow
              label="Updating in real time"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-healthy animate-pulse" />
                  Live
                </span>
              }
              tone="healthy"
            />
            <StateRow label="Ingredients on file" value="147" />
            <StateRow
              label="Prices on the move"
              value={
                <>
                  11{' '}
                  <em className="not-italic italic font-serif text-[11px] text-muted ml-1">
                    this week
                  </em>
                </>
              }
              tone="attention"
            />
          </DestinationCard>

          <DestinationCard
            name="Waste"
            tagline="what got binned and why"
            iconPath={
              <>
                <path d="M4 7h16" />
                <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
                <path d="M9 7V4h6v3" />
                <path d="M10 11v6M14 11v6" />
              </>
            }
            linkLabel="Open Waste →"
            linkMeta="+ log new"
          >
            <StateRow
              label="This week"
              value={
                <>
                  £148{' '}
                  <em className="not-italic italic font-serif text-[11px] text-muted ml-1">
                    up 12%
                  </em>
                </>
              }
              tone="attention"
            />
            <StateRow label="Top category" value="Herbs" />
            <StateRow label="Last logged" value="Yesterday 22:14" />
          </DestinationCard>
        </div>
      </Section>

      <Section
        title="Looking Ahead"
        meta="two patterns the system spotted · worth getting ahead of"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AheadCard
            sectionLabel="Market Move"
            tag="Plan For It"
            headlinePre=""
            headlineEm="Tahini"
            headlinePost=" is drifting up across the market."
            body={
              <>
                <strong className="not-italic font-semibold text-ink">
                  Reza put it up 8% this week, Mediterranean up 6%
                </strong>{' '}
                — both moving the same direction tells you this isn't a supplier issue, it's the market. Likely to tick again in 2–3 weeks. Worth stocking what you'll need before then. Your hummus and baba ghanoush will both feel it.
              </>
            }
            actionLabel="See affected dishes →"
            actionContext="2 suppliers moving in step"
          />
          <AheadCard
            sectionLabel="Next Week"
            tag="Get Ready"
            headlinePre="Next week is a "
            headlineEm="heavy"
            headlinePost=" one."
            body={
              <>
                <strong className="not-italic font-semibold text-ink">
                  Six deliveries booked, £840 across them.
                </strong>{' '}
                Aubrey's running big Monday and Saturday — about £390 of meat between them. Worth clearing walk-in space before the weekend and making sure someone's on the pass for both deliveries.
              </>
            }
            actionLabel="See the week ahead →"
            actionContext="Mon 18 May – Sun 24 May"
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
        <div className="font-display font-semibold text-[10px] tracking-[0.5em] uppercase text-gold">
          {title}
        </div>
        <div className="font-serif italic text-[13px] text-muted">{meta}</div>
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'attention' | 'healthy';
}) {
  return (
    <div className="bg-card px-7 py-6">
      <div className="font-display font-semibold text-[8px] tracking-[0.4em] uppercase text-muted mb-3">
        {label}
      </div>
      <div
        className={
          'font-serif font-medium text-[36px] leading-none tracking-[-0.015em] ' +
          (tone === 'attention'
            ? 'text-attention'
            : tone === 'healthy'
              ? 'text-healthy'
              : 'text-ink')
        }
      >
        {value}
      </div>
      <div className="font-serif italic text-[13px] text-muted mt-2">{sub}</div>
    </div>
  );
}

const attentionBorder: Record<AttentionSeverity, string> = {
  urgent: 'border-l-4 border-l-urgent',
  attention: 'border-l-4 border-l-attention',
  info: 'border-l-4 border-l-gold',
};

const attentionLabelColor: Record<AttentionSeverity, string> = {
  urgent: 'text-urgent',
  attention: 'text-attention',
  info: 'text-gold',
};

function AttentionCard({ attention: a }: { attention: Attention }) {
  return (
    <div className={'bg-card border border-rule px-7 py-7 ' + attentionBorder[a.severity]}>
      <div className="flex items-baseline justify-between mb-4">
        <div
          className={
            'font-display font-semibold text-[9px] tracking-[0.4em] uppercase ' +
            attentionLabelColor[a.severity]
          }
        >
          {a.sectionLabel}
        </div>
        <div
          className={
            'font-display font-semibold text-[8px] tracking-[0.3em] uppercase ' +
            attentionLabelColor[a.severity]
          }
        >
          {a.severityLabel}
        </div>
      </div>
      <div className="font-serif text-xl text-ink mb-3 leading-snug">
        {a.headlinePre}
        {a.headlineEm && (
          <>
            {' '}
            <em className="text-gold not-italic font-medium italic">{a.headlineEm}</em>
          </>
        )}
        {a.headlinePost}
      </div>
      <div className="font-serif italic text-[15px] text-muted leading-relaxed mb-4">
        {a.body}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <a className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-gold cursor-pointer">
          {a.actionLabel}
        </a>
        <div className="font-serif italic text-[11px] text-muted">
          {a.actionContext}
        </div>
      </div>
    </div>
  );
}

function DestinationCard({
  featured,
  name,
  tagline,
  iconPath,
  children,
  linkLabel,
  linkMeta,
}: {
  featured?: boolean;
  name: string;
  tagline: string;
  iconPath: React.ReactNode;
  children: React.ReactNode;
  linkLabel: string;
  linkMeta: string;
}) {
  return (
    <div
      className={
        'bg-card border border-rule px-7 py-7 flex flex-col cursor-pointer transition-all hover:border-gold ' +
        (featured ? 'md:col-span-2' : '')
      }
    >
      <div className="flex items-center gap-4 mb-5">
        <div className="w-10 h-10 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {iconPath}
          </svg>
        </div>
        <div>
          <div className="font-serif font-semibold text-xl text-ink leading-tight">
            {name}
          </div>
          <div className="font-serif italic text-[13px] text-muted mt-0.5">
            {tagline}
          </div>
        </div>
      </div>

      <div className="flex-1 mb-4">{children}</div>

      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <a className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-gold">
          {linkLabel}
        </a>
        <div className="font-serif italic text-[11px] text-muted">{linkMeta}</div>
      </div>
    </div>
  );
}

function StateRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'healthy' | 'attention';
}) {
  return (
    <div
      className={
        'flex items-baseline justify-between py-2.5 border-b border-rule-soft last:border-b-0 ' +
        (tone === 'attention'
          ? 'text-attention'
          : tone === 'healthy'
            ? 'text-healthy'
            : '')
      }
    >
      <span className="font-serif text-[14px] text-muted">{label}</span>
      <strong
        className={
          'font-serif font-semibold text-[15px] ' +
          (tone === 'attention'
            ? 'text-attention'
            : tone === 'healthy'
              ? 'text-healthy'
              : 'text-ink')
        }
      >
        {value}
      </strong>
    </div>
  );
}

function AheadCard({
  sectionLabel,
  tag,
  headlinePre,
  headlineEm,
  headlinePost,
  body,
  actionLabel,
  actionContext,
}: {
  sectionLabel: string;
  tag: string;
  headlinePre: string;
  headlineEm: string;
  headlinePost: string;
  body: React.ReactNode;
  actionLabel: string;
  actionContext: string;
}) {
  return (
    <div className="bg-card border border-rule px-7 py-7 border-l-4 border-l-gold">
      <div className="flex items-baseline justify-between mb-4">
        <div className="font-display font-semibold text-[9px] tracking-[0.4em] uppercase text-gold">
          {sectionLabel}
        </div>
        <div className="font-display font-semibold text-[8px] tracking-[0.3em] uppercase text-muted px-2 py-1 border border-rule">
          {tag}
        </div>
      </div>
      <div className="font-serif text-xl text-ink mb-3 leading-snug">
        {headlinePre}
        <em className="text-gold not-italic font-medium italic">{headlineEm}</em>
        {headlinePost}
      </div>
      <div className="font-serif italic text-[15px] text-muted leading-relaxed mb-4">
        {body}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <a className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-gold cursor-pointer">
          {actionLabel}
        </a>
        <div className="font-serif italic text-[11px] text-muted">
          {actionContext}
        </div>
      </div>
    </div>
  );
}
