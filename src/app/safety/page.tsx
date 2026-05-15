import { getShellContext } from '@/lib/shell/context';
import { getSafetyHomeBundle } from '@/lib/safety/home';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { DiaryCalendar } from '@/components/safety/DiaryCalendar';
import { SafetyDateStrip } from '@/components/safety/SafetyDateStrip';
import { SafetyLookingAhead } from '@/components/safety/SafetyLookingAhead';
import { OpeningChecksGrid } from '@/components/safety/OpeningChecksGrid';
import { SafetyCheckCard } from '@/components/safety/SafetyCheckCard';
import { SafetyEhoExport } from '@/components/safety/SafetyEhoExport';
import { SafetyQuickAction } from '@/components/safety/SafetyQuickAction';

export const metadata = { title: "Today's safety log · Palatable" };

export default async function SafetyHomePage() {
  const ctx = await getShellContext();
  const bundle = await getSafetyHomeBundle(ctx.siteId);

  const todayMonth = new Date().toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const tone: 'healthy' | 'attention' | 'urgent' =
    bundle.failing_probes.length > 0
      ? 'attention'
      : bundle.expiring_certs.some(
            (c) => c.expiry_band === 'expired' || c.expiry_band === 'today',
          )
        ? 'urgent'
        : 'healthy';
  const toneLabel =
    tone === 'healthy'
      ? 'On Track'
      : tone === 'attention'
        ? 'Worth A Look'
        : 'Action Needed';

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-3">
        Safety {String.fromCharCode(0x00b7)} Today
      </div>
      <h1 className="font-display text-4xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-1.5">
        Today&apos;s <em className="text-gold italic font-medium">safety log</em>.
      </h1>
      <p className="font-serif italic text-base text-muted mb-2">
        The cooking is the easy bit. Keeping the records straight is the bit
        we&apos;ll help with.
      </p>

      <SafetyDateStrip serviceStart="18:30" tone={tone} toneLabel={toneLabel} />

      <SafetyLookingAhead items={bundle.looking_ahead} />

      <OpeningChecksGrid initial={bundle.todays_check} />

      <AutoLoggedSection bundle={bundle} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 mt-10">
        <div>
          <SectionHead
            title="12-Week Diary"
            meta={todayMonth + ' · the SFBB record'}
          />
          <DiaryCalendar entries={bundle.recent_checks} />
        </div>
        <div>
          <SectionHead title="Quick Actions" meta="Logged on the floor" />
          <SafetyQuickAction
            href="/safety/probe"
            title="Log a probe reading"
            sub="Cooking / hot holding / cooling"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4.5 h-4.5"
              >
                <path d="M12 2v20M5 8l7 -6 7 6M5 16l7 6 7 -6" />
              </svg>
            }
          />
          <SafetyQuickAction
            href="/safety/incidents"
            title="Log an issue"
            sub="Complaint, allergy, near-miss"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4.5 h-4.5"
              >
                <path d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z" />
              </svg>
            }
          />
          <SafetyQuickAction
            href="/safety/cleaning"
            title="Cleaning schedule"
            sub="Tick off SFBB-aligned tasks"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4.5 h-4.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            }
          />
          <SafetyQuickAction
            href="/safety/training"
            title="Training records"
            sub={
              bundle.expiring_certs.length > 0
                ? bundle.expiring_certs.length +
                  ' certificate' +
                  (bundle.expiring_certs.length === 1 ? '' : 's') +
                  ' expiring'
                : 'All certificates in date'
            }
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4.5 h-4.5"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
          />
          <SafetyEhoExport rollup={bundle.eho} />
        </div>
      </div>

      <FsaReferenceStrip surface="opening_checks" variant="full" />

      <LiabilityFooter />
    </div>
  );
}

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2 mt-9">
      <h2 className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold">
        {title}
      </h2>
      <span className="font-serif italic text-sm text-muted">{meta}</span>
    </div>
  );
}

function AutoLoggedSection({
  bundle,
}: {
  bundle: Awaited<ReturnType<typeof getSafetyHomeBundle>>;
}) {
  const cards: Array<React.ReactNode> = [];

  for (const d of bundle.auto_logged.deliveries) {
    cards.push(
      <SafetyCheckCard
        key={'d-' + d.id}
        state="done"
        title={d.supplier_name + ' delivery'}
        detail={
          d.line_count_estimate
            ? d.line_count_estimate + ' items received · invoice scanned'
            : 'Marked as arrived'
        }
        data={[
          ...(d.value_estimate !== null
            ? [
                {
                  label: 'Value',
                  value: '£' + d.value_estimate.toFixed(0),
                  tone: 'healthy' as const,
                },
              ]
            : []),
          ...(d.line_count_estimate !== null
            ? [{ label: 'Items', value: String(d.line_count_estimate) }]
            : []),
        ]}
        timestamp="today"
        loggedBy="auto"
      />,
    );
  }
  for (const p of bundle.auto_logged.probe_readings) {
    cards.push(
      <SafetyCheckCard
        key={'p-' + p.id}
        state={p.passed ? 'done' : 'flagged'}
        title={p.location || 'Probe reading'}
        detail={p.threshold_note ?? p.kind.replace(/_/g, ' ')}
        data={[
          {
            label: 'Reading',
            value: p.temperature_c + '°C',
            tone: p.passed ? ('healthy' as const) : ('warn' as const),
          },
        ]}
        timestamp={new Date(p.logged_at).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
        loggedBy="chef"
      />,
    );
  }
  if (bundle.auto_logged.waste.today_count > 0) {
    cards.push(
      <SafetyCheckCard
        key="waste"
        state="done"
        title="Waste logged"
        detail={
          bundle.auto_logged.waste.today_count + ' entries · pulled from Waste tab'
        }
        data={[
          {
            label: 'Items',
            value: String(bundle.auto_logged.waste.today_count),
          },
          ...(bundle.auto_logged.waste.top_category
            ? [
                {
                  label: 'Top reason',
                  value: humanCategory(bundle.auto_logged.waste.top_category),
                },
              ]
            : []),
        ]}
        timestamp="today"
        loggedBy="auto"
      />,
    );
  }

  cards.push(
    <SafetyCheckCard
      key="hot-holding"
      state="pending"
      title="Hot holding check"
      detail="Service from 18:30 · log at first plate-up"
      cta="Scheduled for 18:30 →"
    />,
  );

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2 mt-9">
        <h2 className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold">
          During Service · Auto-Logged
        </h2>
        <span className="font-serif italic text-sm text-muted">
          Records pulled from your Palatable activity
        </span>
      </div>
      {cards.length === 1 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            Nothing has come through yet today. Deliveries, probe readings, and
            waste entries from other tabs appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{cards}</div>
      )}
    </div>
  );
}

function humanCategory(c: string): string {
  return (
    (
      {
        over_prep: 'Over-prep',
        spoilage: 'Spoilage',
        trim: 'Trim',
        accident: 'Accident',
        customer_return: 'Returned',
        other: 'Other',
      } as Record<string, string>
    )[c] ?? c
  );
}
