import Link from 'next/link';
import { getRecentAnnouncements, getActiveAnnouncement } from '@/lib/announcements';
import { AnnouncementForm } from './AnnouncementForm';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Admin · Content & Comms — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export default async function AdminContentPage() {
  const [active, recent] = await Promise.all([
    getActiveAnnouncement(),
    getRecentAnnouncements(20),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin · Content
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
        <em className="text-gold font-semibold not-italic">Banner</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        One announcement at a time, rendered to every authenticated user. Publishing a new one deactivates the prior.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Active"
          value={active ? '1' : '0'}
          sub={active ? active.severity : 'nothing showing'}
          tone={
            active?.severity === 'urgent'
              ? 'urgent'
              : active?.severity === 'attention'
                ? 'attention'
                : active
                  ? 'healthy'
                  : undefined
          }
        />
        <KpiCard
          label="Total Published"
          value={String(recent.length)}
          sub="all time"
        />
        <KpiCard
          label="With Expiry"
          value={String(recent.filter((r) => r.expires_at).length)}
          sub="auto-deactivating"
        />
        <KpiCard
          label="Audit"
          value="Append-only"
          sub="banners never edit"
        />
      </div>

      {active && (
        <div className="mb-10">
          <SectionHead title="Currently showing" />
          <div
            className={
              'bg-card border border-l-4 px-7 py-5 ' +
              (active.severity === 'urgent'
                ? 'border-rule border-l-urgent'
                : active.severity === 'attention'
                  ? 'border-rule border-l-attention'
                  : 'border-rule border-l-gold')
            }
          >
            <div
              className={
                'font-display font-semibold text-xs tracking-[0.18em] uppercase mb-2 ' +
                (active.severity === 'urgent'
                  ? 'text-urgent'
                  : active.severity === 'attention'
                    ? 'text-attention'
                    : 'text-gold')
              }
            >
              {active.severity} · published {dateFmt.format(new Date(active.created_at))}
            </div>
            <div className="font-serif font-semibold text-lg text-ink">
              {active.title}
            </div>
            {active.body && (
              <p className="font-serif italic text-sm text-ink-soft mt-2 leading-relaxed">
                {active.body}
              </p>
            )}
            {active.expires_at && (
              <p className="font-serif italic text-xs text-muted mt-2">
                Expires {dateFmt.format(new Date(active.expires_at))}
              </p>
            )}
          </div>
        </div>
      )}

      <SectionHead title="Publish new" />
      <AnnouncementForm />

      {recent.length > 0 && (
        <div className="mt-10">
          <SectionHead title="History" meta={`last ${recent.length}`} />
          <div className="bg-card border border-rule">
            {recent.map((r, i) => (
              <div
                key={r.id}
                className={
                  'px-7 py-4 ' +
                  (i === recent.length - 1 ? '' : 'border-b border-rule-soft')
                }
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-serif font-semibold text-sm text-ink truncate">
                      {r.title}
                    </div>
                    {r.body && (
                      <div className="font-serif italic text-xs text-muted mt-0.5 truncate">
                        {r.body}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className={
                        'font-display font-semibold text-[11px] tracking-[0.18em] uppercase ' +
                        (r.severity === 'urgent'
                          ? 'text-urgent'
                          : r.severity === 'attention'
                            ? 'text-attention'
                            : 'text-gold')
                      }
                    >
                      {r.severity}
                    </span>
                    <span className="font-serif text-xs text-muted">
                      {dateFmt.format(new Date(r.created_at))}
                    </span>
                    {r.active && (
                      <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-healthy border border-healthy/40 px-1.5 py-0.5">
                        active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/admin"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Admin home
        </Link>
      </div>
    </div>
  );
}
