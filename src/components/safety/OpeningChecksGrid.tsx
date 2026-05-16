'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitOpeningCheckAction } from '@/lib/safety/actions';
import type { OpeningCheckRow } from '@/lib/safety/lib';
import { OPENING_CHECK_QUESTIONS as QUESTIONS } from '@/lib/safety/standards';

type State = Record<string, 'done' | 'flagged' | 'pending'>;
type Meta = Record<string, { by: string; at: string }>;

function initialState(answers: Record<string, unknown> | null): State {
  const out: State = {};
  for (const q of QUESTIONS) {
    if (answers === null || !(q.key in answers)) {
      out[q.key] = 'pending';
    } else {
      const val = answers[q.key];
      out[q.key] = val === true ? 'done' : val === false ? 'flagged' : 'pending';
    }
  }
  return out;
}

function initialMeta(answers: Record<string, unknown> | null): Meta {
  if (!answers) return {};
  const m = answers._meta;
  if (!m || typeof m !== 'object') return {};
  return m as Meta;
}

/**
 * Mockup-aligned Opening Checks grid. Each question renders as a
 * SafetyCheckCard with three states the chef can cycle through:
 *   pending → done → flagged → pending
 *
 * On any change we autosave the whole checklist through
 * submitOpeningCheckAction(), so the chef never loses a state by
 * forgetting to sign off.
 */
export function OpeningChecksGrid({ initial }: { initial: OpeningCheckRow | null }) {
  const router = useRouter();
  const initialAnswers = (initial?.answers as Record<string, unknown> | null) ?? null;
  const [state, setState] = useState<State>(() => initialState(initialAnswers));
  const [meta] = useState<Meta>(() => initialMeta(initialAnswers));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doneCount = Object.values(state).filter((s) => s === 'done').length;

  function cycle(key: string) {
    setState((prev) => {
      const next = { ...prev };
      next[key] = prev[key] === 'pending' ? 'done' : prev[key] === 'done' ? 'flagged' : 'pending';
      const answers: Record<string, boolean> = {};
      for (const q of QUESTIONS) {
        if (next[q.key] === 'done') answers[q.key] = true;
        else if (next[q.key] === 'flagged') answers[q.key] = false;
      }
      setError(null);
      startTransition(async () => {
        const res = await submitOpeningCheckAction({ answers, notes: null });
        if (!res.ok) setError(res.error);
        router.refresh();
      });
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold">
          Opening Checks
        </h2>
        <div className="font-serif italic text-sm text-muted">
          {pending ? 'Saving…' : freshestMetaLabel(meta) ?? `Logged ${nowLabel()}`}
          <strong className="font-display not-italic font-semibold text-ink text-[11px] tracking-[0.25em] uppercase ml-2">
            {doneCount} / {QUESTIONS.length} Done
          </strong>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {QUESTIONS.map((q) => (
          <CheckTile
            key={q.key}
            label={q.label}
            detail={q.detail}
            state={state[q.key]}
            attribution={meta[q.key]}
            onClick={() => cycle(q.key)}
          />
        ))}
      </div>
      {error && (
        <div className="bg-urgent/10 border border-urgent/40 px-5 py-3 mb-6 font-serif italic text-sm text-urgent">
          {error}
        </div>
      )}
    </div>
  );
}

function CheckTile({
  label,
  detail,
  state,
  attribution,
  onClick,
}: {
  label: string;
  detail: string;
  state: 'done' | 'flagged' | 'pending';
  attribution?: { by: string; at: string };
  onClick: () => void;
}) {
  const wrapper =
    state === 'done'
      ? 'bg-healthy/[0.08] border border-healthy/40 border-l-[3px] border-l-healthy pl-[19px] pr-[22px] py-5'
      : state === 'flagged'
        ? 'bg-attention/[0.08] border border-attention/40 border-l-[3px] border-l-attention pl-[19px] pr-[22px] py-5'
        : 'bg-card border border-dashed border-rule px-[22px] py-5';

  const mark =
    state === 'done' ? (
      <div className="w-6 h-6 rounded-full bg-healthy border-2 border-healthy text-paper flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
    ) : state === 'flagged' ? (
      <div className="w-6 h-6 rounded-full bg-attention border-2 border-attention text-paper flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
    ) : (
      <div className="w-6 h-6 rounded-full border-2 border-rule bg-paper-warm flex-shrink-0" />
    );

  return (
    <button
      type="button"
      onClick={onClick}
      className={'text-left transition-colors w-full ' + wrapper + ' hover:border-gold'}
    >
      <div className="flex items-start gap-3.5">
        {mark}
        <div className="flex-1 min-w-0">
          <div
            className={
              'font-serif font-semibold text-base leading-tight mb-1 ' +
              (state === 'pending' ? 'text-muted' : 'text-ink')
            }
          >
            {label}
          </div>
          <div className="font-sans text-[13px] text-muted">{detail}</div>
          {state === 'pending' && (
            <div className="font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-gold pt-2">
              Tap to log →
            </div>
          )}
          {state === 'flagged' && (
            <div className="font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-attention pt-2">
              Flagged · tap to revisit
            </div>
          )}
          {state !== 'pending' && attribution && (
            <div className="font-sans text-xs text-muted-soft pt-2 flex items-center gap-1.5">
              <span className="font-display font-semibold text-[10px] tracking-[0.2em] text-ink-soft">
                {new Date(attribution.at).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
              <span>·</span>
              <span>{attribution.by}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function nowLabel(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function freshestMetaLabel(meta: Meta): string | null {
  let latest: { by: string; at: string } | null = null;
  for (const entry of Object.values(meta)) {
    if (!latest || entry.at > latest.at) latest = entry;
  }
  if (!latest) return null;
  const time = new Date(latest.at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `Logged ${time} by ${latest.by}`;
}
