'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitOpeningCheckAction } from '@/lib/safety/actions';
import type { OpeningCheckRow } from '@/lib/safety/lib';

const QUESTIONS: Array<{ key: string; label: string }> = [
  { key: 'fridge_temps', label: 'Fridges + freezers reading at safe temperatures' },
  { key: 'probes_calibrated', label: 'Probes calibrated this week' },
  { key: 'cleaning_signed_off', label: "Yesterday's cleaning signed off" },
  { key: 'staff_health', label: 'No staff with reported sickness in last 48h' },
  { key: 'handwash_stocked', label: 'Hand-wash stations stocked + sanitised' },
];

export function OpeningCheckForm({
  initial,
}: {
  initial: OpeningCheckRow | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, boolean>>(() => {
    const a = (initial?.answers as Record<string, boolean>) ?? {};
    const out: Record<string, boolean> = {};
    for (const q of QUESTIONS) out[q.key] = Boolean(a[q.key]);
    return out;
  });
  const [notes, setNotes] = useState<string>(initial?.notes ?? '');
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(Boolean(initial));
  const [error, setError] = useState<string | null>(null);

  function toggle(key: string) {
    setAnswers((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitOpeningCheckAction({
        answers,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const allYes = Object.values(answers).every(Boolean);

  return (
    <div className="bg-card border border-rule mb-10">
      <ul className="divide-y divide-rule-soft">
        {QUESTIONS.map((q) => (
          <li key={q.key} className="px-7 py-4 flex items-center justify-between gap-6">
            <span className="font-serif text-base text-ink leading-snug">
              {q.label}
            </span>
            <button
              type="button"
              onClick={() => toggle(q.key)}
              disabled={pending}
              className={
                'font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2 border transition-colors ' +
                (answers[q.key]
                  ? 'bg-healthy text-paper border-healthy'
                  : 'bg-paper text-muted border-rule hover:border-gold hover:text-gold')
              }
            >
              {answers[q.key] ? 'Yes' : 'Mark Yes'}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-rule px-7 py-5">
        <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything unusual today (broken probe, late delivery, etc.)"
          className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
        />
      </div>
      <div className="border-t border-rule px-7 py-5 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={
            'font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 border transition-colors ' +
            (allYes
              ? 'bg-healthy text-paper border-healthy hover:bg-healthy/90'
              : 'bg-attention text-paper border-attention hover:bg-attention/90') +
            ' disabled:opacity-50'
          }
        >
          {pending ? 'Saving' + String.fromCharCode(0x2026) : allYes ? 'Sign off — all clear' : 'Sign off with exceptions'}
        </button>
        {saved && (
          <span className="font-serif italic text-sm text-healthy">
            {String.fromCharCode(0x2713)} Saved.
          </span>
        )}
        {error && (
          <span className="font-serif italic text-sm text-urgent">{error}</span>
        )}
      </div>
    </div>
  );
}
