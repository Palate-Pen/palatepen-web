'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitOpeningCheckAction } from '@/lib/safety/actions';
import type { OpeningCheckRow } from '@/lib/safety/lib';
import {
  OPENING_CHECK_GROUPS,
  type OpeningCheckDepartment,
  type OpeningCheckGroup,
  type OpeningCheckQuestion,
} from '@/lib/safety/standards';

type State = Record<string, 'done' | 'flagged' | 'pending'>;
type Meta = Record<string, { by: string; at: string }>;

function flatQuestions(groups: OpeningCheckGroup[]): OpeningCheckQuestion[] {
  return groups.flatMap((g) => g.questions);
}

function initialState(
  questions: OpeningCheckQuestion[],
  answers: Record<string, unknown> | null,
): State {
  const out: State = {};
  for (const q of questions) {
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
 * Mockup-aligned Opening Checks grid with department-scoped side tabs.
 *
 * Three departments (Kitchen / Bar / Management) each render their own
 * question set. The chef cycles each tile through:
 *   pending → done → flagged → pending
 * and on any change we autosave the full merged checklist (every
 * department's state) through submitOpeningCheckAction(), so switching
 * tabs never loses sign-offs from another department.
 */
export function OpeningChecksGrid({
  initial,
  groups,
}: {
  initial: OpeningCheckRow | null;
  /** Optional override — falls back to the hardcoded default config. */
  groups?: OpeningCheckGroup[];
}) {
  const router = useRouter();
  const resolvedGroups = groups && groups.length > 0 ? groups : OPENING_CHECK_GROUPS;
  const questions = flatQuestions(resolvedGroups);
  const initialAnswers = (initial?.answers as Record<string, unknown> | null) ?? null;
  const [state, setState] = useState<State>(() =>
    initialState(questions, initialAnswers),
  );
  const [meta] = useState<Meta>(() => initialMeta(initialAnswers));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeDept, setActiveDept] = useState<OpeningCheckDepartment>(
    resolvedGroups[0]?.department ?? 'kitchen',
  );

  const activeGroup =
    resolvedGroups.find((g) => g.department === activeDept) ?? resolvedGroups[0];

  function tabSummary(group: OpeningCheckGroup) {
    let done = 0;
    let flagged = 0;
    for (const q of group.questions) {
      if (state[q.key] === 'done') done++;
      else if (state[q.key] === 'flagged') flagged++;
    }
    return { done, flagged, total: group.questions.length };
  }

  const overallDone = Object.values(state).filter((s) => s === 'done').length;
  const overallTotal = questions.length;

  function cycle(key: string) {
    setState((prev) => {
      const next = { ...prev };
      next[key] = prev[key] === 'pending' ? 'done' : prev[key] === 'done' ? 'flagged' : 'pending';
      const answers: Record<string, boolean> = {};
      for (const q of questions) {
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
            {overallDone} / {overallTotal} Done
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 mb-6">
        {/* Side tabs */}
        <nav
          aria-label="Opening check departments"
          className="bg-card border border-rule self-start"
        >
          {OPENING_CHECK_GROUPS.map((g) => {
            const s = tabSummary(g);
            const isActive = g.department === activeDept;
            const tone: 'healthy' | 'attention' | 'pending' =
              s.flagged > 0
                ? 'attention'
                : s.done === s.total
                  ? 'healthy'
                  : 'pending';
            return (
              <button
                key={g.department}
                type="button"
                onClick={() => setActiveDept(g.department)}
                aria-pressed={isActive}
                className={
                  'block w-full text-left px-5 py-4 border-l-[3px] transition-colors ' +
                  (isActive
                    ? 'border-l-gold bg-gold-bg/50'
                    : 'border-l-transparent hover:bg-paper-warm') +
                  ' border-b border-rule-soft last:border-b-0'
                }
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={
                      'font-display font-semibold text-[12px] tracking-[0.2em] uppercase ' +
                      (isActive ? 'text-gold' : 'text-ink-soft')
                    }
                  >
                    {g.label}
                  </span>
                  <span
                    className={
                      'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 font-mono text-[11px] font-medium ' +
                      (tone === 'healthy'
                        ? 'bg-healthy/15 text-healthy'
                        : tone === 'attention'
                          ? 'bg-attention/15 text-attention'
                          : 'bg-paper-warm text-muted')
                    }
                    aria-hidden
                  >
                    {s.done}/{s.total}
                  </span>
                </div>
                <div className="font-sans text-[11px] text-muted-soft leading-snug">
                  {s.flagged > 0
                    ? `${s.flagged} flagged · ${s.total - s.done - s.flagged} pending`
                    : s.done === s.total
                      ? 'All ticked'
                      : `${s.total - s.done} pending`}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <div>
          <p className="font-serif italic text-sm text-muted mb-3 leading-snug">
            {activeGroup.blurb}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGroup.questions.map((q) => (
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
        </div>
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
