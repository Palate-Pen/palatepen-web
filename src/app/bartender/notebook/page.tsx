import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import type { NotebookTag } from '@/lib/notebook-shared';

export const metadata = { title: 'Notebook — Bar — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

type NotebookEntry = {
  id: string;
  title: string | null;
  body_md: string | null;
  kind: string;
  tags: NotebookTag[] | null;
  created_at: string;
};

export default async function BarNotebookPage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('notebook_entries')
    .select('id, title, body_md, kind, tags, created_at')
    .eq('site_id', ctx.siteId)
    .order('created_at', { ascending: false })
    .limit(50);

  const entries = (data ?? []) as NotebookEntry[];

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Bar Journal
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Notebook</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            Spec ideas, customer feedback, supplier notes, cocktail experiments. Shared with the kitchen on cross-over ingredients.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap print-hide">
          {entries.length > 0 && <PrintButton label="Print bar notebook" />}
          <Link
            href="/notebook"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
          >
            + Add note
          </Link>
        </div>
      </div>

      <SectionHead
        title="Recent Entries"
        meta={entries.length === 0 ? 'no entries yet' : `${entries.length} recent`}
      />

      {entries.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            Nothing in the bar journal yet. Add notes when something is worth remembering — a new spec idea, a customer comment, a supplier conversation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: NotebookEntry }) {
  return (
    <Link
      href={`/bartender/notebook/${entry.id}`}
      className="bg-card border border-rule px-7 py-5 block hover:border-gold transition-colors"
    >
      <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
        <div className="font-serif font-semibold text-lg text-ink">
          {entry.title ?? 'Note'}
        </div>
        <div className="font-serif italic text-xs text-muted">
          {dateFmt.format(new Date(entry.created_at))}
        </div>
      </div>
      {entry.body_md && (
        <p className="font-serif text-base text-ink-soft leading-relaxed whitespace-pre-line">
          {entry.body_md}
        </p>
      )}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {entry.tags.map((t, i) => (
            <span
              key={`${t.kind}-${t.text}-${i}`}
              className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2 py-0.5 border border-rule text-muted-soft"
            >
              {t.text}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
