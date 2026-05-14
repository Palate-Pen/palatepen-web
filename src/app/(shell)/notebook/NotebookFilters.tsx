'use client';

import { useMemo, useState } from 'react';
import type { NotebookEntry } from '@/lib/notebook';
import { notebookDateLabel } from '@/lib/notebook';

export type FilterKey =
  | 'all'
  | 'voice'
  | 'photo'
  | 'sketch'
  | 'note'
  | 'seasonal'
  | 'shared';

const FILTERS: Array<{ key: FilterKey; label: string; divider?: boolean }> = [
  { key: 'all', label: 'All' },
  { key: 'voice', label: 'Voice' },
  { key: 'photo', label: 'Photos' },
  { key: 'sketch', label: 'Sketches' },
  { key: 'note', label: 'Notes' },
  { key: 'seasonal', label: 'Coming into season', divider: true },
  { key: 'shared', label: 'Shared with brigade' },
];

export function NotebookFilters({ entries }: { entries: NotebookEntry[] }) {
  const [active, setActive] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    if (active === 'all') return entries;
    if (active === 'seasonal') return entries.filter((e) => e.season_label != null);
    if (active === 'shared') return entries.filter((e) => e.shared);
    return entries.filter((e) => e.kind === active);
  }, [active, entries]);

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center mb-8 pb-4 border-b border-rule">
        {FILTERS.map((f) => (
          <span key={f.key} className="flex items-center gap-2">
            {f.divider && <span className="text-muted-soft">·</span>}
            <button
              type="button"
              onClick={() => setActive(f.key)}
              className={
                'font-sans font-semibold text-xs tracking-[0.08em] uppercase px-3 py-2 border transition-colors ' +
                (active === f.key
                  ? 'bg-ink border-ink text-paper'
                  : 'bg-transparent border-rule text-ink-soft hover:border-gold hover:text-ink')
              }
            >
              {f.label}
            </button>
          </span>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState filterKey={active} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((e) => (
            <EntryCardLive key={e.id} entry={e} />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyState({ filterKey }: { filterKey: FilterKey }) {
  const msg =
    filterKey === 'all'
      ? 'Nothing in the notebook yet. Tap Note above to capture the first thought.'
      : filterKey === 'shared'
        ? 'No brigade-visible entries match this filter.'
        : `No ${filterKey} entries yet.`;
  return (
    <div className="bg-card border border-rule px-10 py-12 text-center">
      <p className="font-serif italic text-muted">{msg}</p>
    </div>
  );
}

const ribbonClass: Record<'peak' | 'ending' | 'arriving', string> = {
  peak: 'bg-gold text-paper',
  ending: 'bg-attention text-paper',
  arriving: 'bg-gold text-paper',
};

const tagClass: Record<'dish' | 'detected' | 'plain', string> = {
  dish: 'bg-gold-bg text-gold border-gold/30',
  detected:
    "bg-paper-warm text-ink-soft border-rule before:content-['•'] before:text-gold before:mr-1 before:font-bold",
  plain: 'bg-paper-warm text-ink-soft border-rule',
};

const kindLabel: Record<NotebookEntry['kind'], string> = {
  voice: 'Voice memo',
  photo: 'Photo',
  sketch: 'Sketch',
  note: 'Note',
};

function EntryCardLive({ entry }: { entry: NotebookEntry }) {
  const dateLabel = notebookDateLabel(entry.created_at);

  return (
    <div className="bg-card border border-rule px-6 py-5 flex flex-col gap-3 hover:border-rule-gold transition-colors">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold">
          {kindLabel[entry.kind]}
        </div>
        <div className="font-sans text-xs text-muted-soft whitespace-nowrap">
          {dateLabel}
        </div>
      </div>

      <div className="font-serif font-semibold text-lg text-ink leading-snug">
        {entry.title}
      </div>

      {entry.kind === 'voice' && entry.voice_duration_seconds != null && (
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-gold text-paper flex items-center justify-center flex-shrink-0 hover:bg-gold-dark transition-colors"
            aria-label="Play voice memo (capture & playback coming next)"
            title="Voice playback in the next iteration"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-0.5 h-6">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className="bg-gold-light/60 inline-block w-[3px]"
                style={{
                  height: `${4 + Math.abs(Math.sin(i * 1.7)) * 18}px`,
                }}
              />
            ))}
          </div>
          <div className="font-sans text-xs text-muted-soft whitespace-nowrap">
            {formatDuration(entry.voice_duration_seconds)}
          </div>
        </div>
      )}

      {entry.body_md && (
        <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
          {entry.body_md}
        </p>
      )}

      {entry.season_label && entry.season_tone && (
        <div
          className={
            'font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-2.5 py-1 self-start ' +
            ribbonClass[entry.season_tone]
          }
        >
          {entry.season_tone === 'peak'
            ? 'Peak'
            : entry.season_tone === 'ending'
              ? 'Ending soon'
              : 'Arriving'}
          {' · '}
          {entry.season_label}
        </div>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {entry.tags.map((t, i) => (
            <span
              key={`${t.text}-${i}`}
              className={
                'font-sans text-xs leading-none px-2 py-1 border ' +
                tagClass[t.kind]
              }
            >
              {t.text}
            </span>
          ))}
        </div>
      )}

      {!entry.shared && (
        <div className="font-sans font-semibold text-[10px] tracking-[0.3em] uppercase text-muted-soft mt-auto pt-2">
          Private · just you
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
