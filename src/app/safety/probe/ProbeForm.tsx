'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logProbeReadingAction } from '@/lib/safety/actions';
import {
  PROBE_KIND_LABEL,
  PROBE_RULES,
  type ProbeKind,
} from '@/lib/safety/standards';

const KINDS = Object.keys(PROBE_KIND_LABEL) as ProbeKind[];

export function ProbeForm() {
  const router = useRouter();
  const [kind, setKind] = useState<ProbeKind>('fridge');
  const [location, setLocation] = useState('');
  const [temp, setTemp] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = (() => {
    const t = Number(temp);
    if (!Number.isFinite(t)) return null;
    const rule = PROBE_RULES[kind];
    return { passes: rule.passes(t), note: rule.note };
  })();

  function submit() {
    setError(null);
    setResult(null);
    const t = Number(temp);
    if (!Number.isFinite(t)) {
      setError('Enter a valid temperature in degrees Celsius.');
      return;
    }
    if (location.trim() === '') {
      setError('Where was the reading taken?');
      return;
    }
    startTransition(async () => {
      const res = await logProbeReadingAction({
        kind,
        location: location.trim(),
        temperature_c: t,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult({ passed: res.data?.passed ?? false });
      setTemp('');
      setLocation('');
      setNotes('');
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-7 py-7 mb-10">
      <div className="grid grid-cols-1 md:grid-cols-[180px_1.2fr_140px] gap-4 mb-4">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Kind
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ProbeKind)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {PROBE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Where
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="walk-in fridge, hot pass, etc."
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Temperature ({String.fromCharCode(0xb0)}C)
          </label>
          <input
            type="number"
            step="0.1"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="4.0"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
        Notes
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="optional context"
        className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none mb-4"
      />

      {preview && (
        <div
          className={
            'border-l-4 px-4 py-3 mb-4 ' +
            (preview.passes ? 'bg-healthy/10 border-l-healthy' : 'bg-urgent/10 border-l-urgent')
          }
        >
          <div className={'font-display font-semibold text-xs tracking-[0.18em] uppercase mb-1 ' + (preview.passes ? 'text-healthy' : 'text-urgent')}>
            Preview: would {preview.passes ? 'PASS' : 'FAIL'}
          </div>
          <p className="font-serif italic text-sm text-muted">{preview.note}</p>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-rule">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
        >
          {pending ? 'Logging' + String.fromCharCode(0x2026) : 'Log reading'}
        </button>
        {result && (
          <span className={'font-serif italic text-sm ' + (result.passed ? 'text-healthy' : 'text-urgent')}>
            {result.passed ? String.fromCharCode(0x2713) + ' Logged \u00b7 PASS' : String.fromCharCode(0x2717) + ' Logged \u00b7 FAIL'}
          </span>
        )}
        {error && <span className="font-serif italic text-sm text-urgent">{error}</span>}
      </div>
    </div>
  );
}
