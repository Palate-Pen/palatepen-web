import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getServiceNotes } from '@/lib/oversight';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Service Notes — Manager — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export default async function ManagerServiceNotesPage() {
  const ctx = await getShellContext();
  const notes = await getServiceNotes(ctx.siteId, 7);

  const byDay = new Map<string, typeof notes>();
  for (const n of notes) {
    const day = n.created_at.slice(0, 10);
    const arr = byDay.get(day) ?? [];
    arr.push(n);
    byDay.set(day, arr);
  }

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · The Daily Log
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            Service{' '}
            <em className="text-gold font-semibold not-italic">Notes</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            Brigade-shared notebook entries from the last 7 days — anything
            the kitchen or bar flagged worth knowing.
          </p>
        </div>
        <div className="print-hide">
          {notes.length > 0 && <PrintButton label="Print service log" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Last 7 Days"
          value={String(notes.length)}
          sub="shared entries"
        />
        <KpiCard
          label="Active Days"
          value={String(byDay.size)}
          sub="of last 7"
        />
        <KpiCard
          label="Photos"
          value={String(notes.filter((n) => n.kind === 'photo').length)}
          sub="with attached photo"
        />
      </div>

      <SectionHead
        title="Recent"
        meta={notes.length === 0 ? 'quiet week' : `${notes.length} entries`}
      />
      {notes.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            Nothing in the service log for the last 7 days. Notes go here when
            chefs + bartenders mark them "share with brigade" in the Notebook.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byDay.entries()).map(([day, items]) => (
            <div key={day}>
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-3">
                {dateFmt.format(new Date(day))}
              </div>
              <div className="bg-card border border-rule divide-y divide-rule-soft">
                {items.map((n) => (
                  <div key={n.id} className="px-7 py-4">
                    <div className="font-serif font-semibold text-base text-ink">
                      {n.title}
                    </div>
                    {n.body_md && (
                      <p className="font-serif italic text-sm text-muted mt-1 leading-relaxed">
                        {n.body_md}
                      </p>
                    )}
                    {n.attachment_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={n.attachment_url}
                        alt={n.title}
                        className="mt-3 max-h-[180px] object-cover border border-rule"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/notebook"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          Open full Notebook →
        </Link>
      </div>
    </div>
  );
}
