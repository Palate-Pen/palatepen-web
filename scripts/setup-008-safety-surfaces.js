/* eslint-disable no-console */
/*
 * setup-008-safety-surfaces.js
 *
 * Five Week-2 safety surfaces + their /safety layout + a 14-day
 * forward calendar component.
 *
 *   src/app/(shell)/safety/layout.tsx
 *   src/app/(shell)/safety/page.tsx
 *   src/app/(shell)/safety/probe/page.tsx + ProbeForm.tsx
 *   src/app/(shell)/safety/incidents/page.tsx + IncidentForm.tsx
 *   src/app/(shell)/safety/cleaning/page.tsx + CleaningTickRow.tsx
 *   src/app/(shell)/safety/training/page.tsx + TrainingForm.tsx
 *   src/components/safety/OpeningCheckForm.tsx
 *   src/components/safety/DiaryCalendar.tsx
 *   src/components/safety/ForwardCalendar.tsx (14-day strip — used on home + safety home)
 *   src/lib/safety/forward-calendar.ts (data aggregator)
 *
 * Run: node scripts/setup-008-safety-surfaces.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function write(rel, body) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, { encoding: 'utf8' });
  console.log('wrote', out);
}

// ---------------------------------------------------------------------
// /safety/layout.tsx — wraps everything in SafetyShellGate
// ---------------------------------------------------------------------
const safetyLayout = `import { SafetyShellGate } from '@/components/safety/SafetyShellGate';

export default function SafetyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SafetyShellGate>{children}</SafetyShellGate>;
}
`;

// ---------------------------------------------------------------------
// /safety/page.tsx — Safety home
// ---------------------------------------------------------------------
const safetyHome = `import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getSafetyHomeData } from '@/lib/safety/lib';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { OpeningCheckForm } from '@/components/safety/OpeningCheckForm';
import { DiaryCalendar } from '@/components/safety/DiaryCalendar';
import { ForwardCalendar } from '@/components/safety/ForwardCalendar';
import { getForwardCalendar } from '@/lib/safety/forward-calendar';

export const metadata = { title: 'Safety \\u00b7 Palatable' };

export default async function SafetyHomePage() {
  const ctx = await getShellContext();
  const [data, calendar] = await Promise.all([
    getSafetyHomeData(ctx.siteId),
    getForwardCalendar(ctx.siteId, 14),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        SFBB Diary \\u00b7 The Inspector's First Question
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Safety</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Daily-use diary, not a compliance shield. Use it consistently and the records build themselves.
      </p>

      <FsaReferenceStrip surface="opening_checks" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Today's check"
          value={data.todays_check ? 'Done' : 'Pending'}
          sub={data.todays_check ? 'submitted' : 'opening checks not signed off'}
          tone={data.todays_check ? 'healthy' : 'attention'}
        />
        <KpiCard
          label="Failing probes"
          value={String(data.recent_failing_probes.length)}
          sub="in last 30 days"
          tone={data.recent_failing_probes.length > 0 ? 'urgent' : 'healthy'}
        />
        <KpiCard
          label="Unresolved"
          value={String(data.unresolved_incidents.length)}
          sub="open incidents"
          tone={data.unresolved_incidents.length > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Certs expiring"
          value={String(data.expiring_certs_30d.length)}
          sub="within 30 days"
          tone={data.expiring_certs_30d.length > 0 ? 'attention' : undefined}
        />
      </div>

      <ForwardCalendar days={14} items={calendar} />

      <SectionHead
        title="Today's opening checks"
        meta={data.todays_check ? 'submitted earlier today' : 'awaiting sign-off'}
      />
      <OpeningCheckForm initial={data.todays_check} />

      <SectionHead title="Diary calendar" meta="last 12 weeks" />
      <DiaryCalendar weeks={12} entries={data.recent_checks} />

      <SectionHead title="Open a workspace" meta="four daily-use surfaces" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SafetyTile
          name="Probe"
          tagline="log temperature readings"
          href="/safety/probe"
        />
        <SafetyTile
          name="Incidents"
          tagline="complaint / allergen / near-miss / illness"
          href="/safety/incidents"
        />
        <SafetyTile
          name="Cleaning"
          tagline="tick off SFBB-aligned tasks"
          href="/safety/cleaning"
        />
        <SafetyTile
          name="Training"
          tagline="staff certifications + expiry"
          href="/safety/training"
        />
      </div>

      <LiabilityFooter />
    </div>
  );
}

function SafetyTile({
  name,
  tagline,
  href,
}: {
  name: string;
  tagline: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-rule px-7 py-7 flex flex-col gap-2 hover:border-gold transition-colors"
    >
      <div className="font-serif font-semibold text-xl text-ink leading-tight">
        {name}
      </div>
      <div className="font-serif italic text-sm text-muted">{tagline}</div>
      <div className="mt-3 pt-3 border-t border-rule">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
          Open {String.fromCharCode(0x2192)}
        </span>
      </div>
    </Link>
  );
}
`;

// ---------------------------------------------------------------------
// OpeningCheckForm — client component
// ---------------------------------------------------------------------
const openingCheckForm = `'use client';

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
`;

// ---------------------------------------------------------------------
// DiaryCalendar — 12-week grid of pass/fail
// ---------------------------------------------------------------------
const diaryCalendar = `import type { OpeningCheckRow } from '@/lib/safety/lib';

/**
 * Renders a 12-week wall calendar grid. Each cell = one day. Green if
 * the opening check that day passed all questions; amber if any
 * exceptions; gold border on today; empty grey for past days with no
 * entry; faint border on future days.
 *
 * Server component — no interactivity. Click-through to a per-day
 * detail page lands with the HACCP wizard build (Slice 7).
 */
export function DiaryCalendar({
  weeks,
  entries,
}: {
  weeks: number;
  entries: OpeningCheckRow[];
}) {
  const byDate = new Map<string, OpeningCheckRow>();
  for (const e of entries) byDate.set(e.check_date, e);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build the date matrix anchored to today, working backwards in
  // 7-day rows. First column is the oldest week, last column is this
  // week. Within each column, the day-of-week order matches the locale.

  const cells: Array<{ date: Date; iso: string; row?: OpeningCheckRow | null; isToday: boolean; isFuture: boolean }> = [];
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: d,
      iso,
      row: byDate.get(iso) ?? null,
      isToday: d.getTime() === today.getTime(),
      isFuture: d.getTime() > today.getTime(),
    });
  }

  return (
    <div className="bg-card border border-rule p-5 mb-10 overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 min-w-[420px]" style={{ gridTemplateRows: 'repeat(' + weeks + ', minmax(0, 1fr))' }}>
        {cells.map((c) => {
          const passed = c.row && allYes(c.row.answers as Record<string, boolean>);
          const exceptions = c.row && !passed;
          return (
            <div
              key={c.iso}
              title={
                c.row
                  ? exceptions
                    ? c.iso + ' \\u00b7 exceptions logged'
                    : c.iso + ' \\u00b7 signed off'
                  : c.isFuture
                    ? c.iso
                    : c.iso + ' \\u00b7 no entry'
              }
              className={
                'aspect-square border ' +
                (c.isFuture
                  ? 'border-rule-soft bg-paper'
                  : c.row
                    ? exceptions
                      ? 'bg-attention/30 border-attention'
                      : 'bg-healthy/30 border-healthy'
                    : 'border-rule bg-paper-warm') +
                (c.isToday ? ' ring-2 ring-gold' : '')
              }
            />
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 flex-wrap font-serif text-xs text-muted italic">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-healthy/30 border border-healthy" /> all clear</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-attention/30 border border-attention" /> exceptions logged</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-paper-warm border border-rule" /> no entry</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-paper border border-rule-soft" /> future</span>
      </div>
    </div>
  );
}

function allYes(a: Record<string, boolean>): boolean {
  return Object.values(a).every(Boolean);
}
`;

// ---------------------------------------------------------------------
// ForwardCalendar — 14-day horizontal strip
// ---------------------------------------------------------------------
const forwardCalendar = `import type { CalendarItem } from '@/lib/safety/forward-calendar';

const SOURCE_TONE: Record<CalendarItem['source'], string> = {
  signal: 'border-gold',
  delivery: 'border-attention',
  menu_plan: 'border-gold',
  training_expiry: 'border-urgent',
  eho_due: 'border-urgent',
};

const SOURCE_LABEL: Record<CalendarItem['source'], string> = {
  signal: 'Signal',
  delivery: 'Delivery',
  menu_plan: 'Menu plan',
  training_expiry: 'Cert',
  eho_due: 'EHO',
};

const DAY = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

/**
 * Horizontal 14-day strip showing dated events from across the
 * platform. Each cell = one day; items inside ordered by source then
 * urgency. Renders on chef home, manager home, owner home, and safety
 * home — all reading the same getForwardCalendar() aggregator.
 */
export function ForwardCalendar({
  days,
  items,
}: {
  days: number;
  items: CalendarItem[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: Array<{ iso: string; date: Date; items: CalendarItem[] }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      iso,
      date: d,
      items: items.filter((it) => it.date_iso === iso),
    });
  }

  const totalCount = items.length;

  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-rule">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          Next {days} Days
        </div>
        <div className="font-serif italic text-sm text-muted">
          {totalCount === 0
            ? 'nothing scheduled'
            : totalCount + (totalCount === 1 ? ' thing' : ' things') + ' on the calendar'}
        </div>
      </div>
      <div className="grid grid-cols-7 lg:grid-cols-14 gap-2">
        {cells.map((c, i) => {
          const isToday = i === 0;
          return (
            <div
              key={c.iso}
              className={
                'bg-card border px-3 py-3 min-h-[120px] flex flex-col ' +
                (isToday ? 'border-gold border-2' : 'border-rule')
              }
            >
              <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1">
                {DAY[c.date.getDay()]}
              </div>
              <div className="font-serif font-semibold text-base text-ink leading-none mb-3">
                {c.date.getDate()}
              </div>
              <div className="flex flex-col gap-1.5">
                {c.items.slice(0, 3).map((it) => (
                  <a
                    key={it.id}
                    href={it.action_target ?? '#'}
                    title={it.title}
                    className={
                      'block px-2 py-1 border-l-2 bg-paper-warm/60 font-serif text-[11px] text-ink leading-tight hover:bg-paper-warm transition-colors ' +
                      SOURCE_TONE[it.source]
                    }
                  >
                    <span className="font-display font-semibold tracking-[0.12em] uppercase text-[9px] text-muted block">
                      {SOURCE_LABEL[it.source]}
                    </span>
                    <span className="line-clamp-2">{it.title}</span>
                  </a>
                ))}
                {c.items.length > 3 && (
                  <span className="font-serif italic text-[10px] text-muted">
                    +{c.items.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
`;

// ---------------------------------------------------------------------
// src/lib/safety/forward-calendar.ts
// ---------------------------------------------------------------------
const forwardCalendarLib = `import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CalendarItem = {
  id: string;
  date_iso: string;
  source: 'signal' | 'delivery' | 'menu_plan' | 'training_expiry' | 'eho_due';
  title: string;
  action_target: string | null;
};

/**
 * Aggregates dated forward events into a single list, ordered by date.
 * Each source contributes items within the next \\\`days\\\` window:
 *
 *   - forward_signals.expires_at  -> signal (only when expires_at falls
 *     in the window AND the signal is still live)
 *   - deliveries.expected_at      -> delivery
 *   - menu_plans.launch_date      -> menu_plan
 *   - safety_training.expires_on  -> training_expiry
 *   - safety_eho_visits.due_at    -> eho_due
 *
 * Surfaces (chef / manager / owner / safety home) read the same
 * aggregator so the calendar is consistent across the platform.
 */
export async function getForwardCalendar(
  siteId: string,
  days = 14,
): Promise<CalendarItem[]> {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(today.getDate() + days);

  const todayIso = today.toISOString().slice(0, 10);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const out: CalendarItem[] = [];

  // 1. forward_signals — only emit signals with a real expires_at in the window
  const { data: signals } = await supabase
    .from('forward_signals')
    .select('id, section_label, headline_em, headline_pre, headline_post, expires_at, action_target')
    .eq('site_id', siteId)
    .is('dismissed_at', null)
    .not('expires_at', 'is', null)
    .gte('expires_at', today.toISOString())
    .lt('expires_at', horizon.toISOString());
  for (const s of signals ?? []) {
    const exp = s.expires_at as string;
    out.push({
      id: 'signal:' + (s.id as string),
      date_iso: new Date(exp).toISOString().slice(0, 10),
      source: 'signal',
      title:
        (s.section_label as string) +
        ' \\u00b7 ' +
        ((s.headline_pre as string | null) ?? '') +
        ((s.headline_em as string | null) ?? '') +
        ((s.headline_post as string | null) ?? ''),
      action_target: (s.action_target as string | null) ?? null,
    });
  }

  // 2. deliveries
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, expected_at, suppliers:supplier_id (name)')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .gte('expected_at', todayIso)
    .lte('expected_at', horizonIso);
  for (const d of deliveries ?? []) {
    const supplier = (d.suppliers as unknown as { name?: string } | null)?.name ?? 'Supplier';
    out.push({
      id: 'delivery:' + (d.id as string),
      date_iso: d.expected_at as string,
      source: 'delivery',
      title: supplier + ' delivery',
      action_target: '/stock-suppliers/deliveries',
    });
  }

  // 3. menu_plans
  const { data: plans } = await supabase
    .from('menu_plans')
    .select('id, name, launch_date')
    .eq('site_id', siteId)
    .not('launch_date', 'is', null)
    .gte('launch_date', todayIso)
    .lte('launch_date', horizonIso);
  for (const p of plans ?? []) {
    out.push({
      id: 'menu_plan:' + (p.id as string),
      date_iso: p.launch_date as string,
      source: 'menu_plan',
      title: (p.name as string) + ' launches',
      action_target: '/menus/plan/' + (p.id as string),
    });
  }

  // 4. training expiries
  try {
    const { data: trainings } = await supabase
      .from('safety_training')
      .select('id, staff_name, certificate_name, kind, expires_on')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .not('expires_on', 'is', null)
      .gte('expires_on', todayIso)
      .lte('expires_on', horizonIso);
    for (const t of trainings ?? []) {
      out.push({
        id: 'training:' + (t.id as string),
        date_iso: t.expires_on as string,
        source: 'training_expiry',
        title:
          (t.staff_name as string) +
          ' \\u00b7 ' +
          ((t.certificate_name as string | null) ?? (t.kind as string)) +
          ' expires',
        action_target: '/safety/training',
      });
    }
  } catch {
    // safety tables may not exist yet in fresh installs
  }

  // 5. EHO due
  try {
    const { data: eho } = await supabase
      .from('safety_eho_visits')
      .select('id, due_at, inspector_authority')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .not('due_at', 'is', null)
      .gte('due_at', todayIso)
      .lte('due_at', horizonIso);
    for (const e of eho ?? []) {
      out.push({
        id: 'eho:' + (e.id as string),
        date_iso: e.due_at as string,
        source: 'eho_due',
        title: 'EHO visit due',
        action_target: '/safety/eho',
      });
    }
  } catch {
    // safety tables may not exist yet
  }

  return out.sort((a, b) => a.date_iso.localeCompare(b.date_iso));
}
`;

// ---------------------------------------------------------------------
// /safety/probe + form
// ---------------------------------------------------------------------
const probePage = `import { getShellContext } from '@/lib/shell/context';
import { getRecentProbeReadings } from '@/lib/safety/lib';
import { PROBE_KIND_LABEL } from '@/lib/safety/standards';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { ProbeForm } from './ProbeForm';

export const metadata = { title: 'Probe Reading \\u00b7 Safety \\u00b7 Palatable' };

const tempFmt = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function ProbeReadingPage() {
  const ctx = await getShellContext();
  const readings = await getRecentProbeReadings(ctx.siteId, 50);

  const failingLast24h = readings.filter((r) => {
    if (r.passed) return false;
    return Date.now() - new Date(r.logged_at).getTime() < 24 * 60 * 60 * 1000;
  }).length;
  const totalLast24h = readings.filter(
    (r) => Date.now() - new Date(r.logged_at).getTime() < 24 * 60 * 60 * 1000,
  ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Safety \\u00b7 Probe
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Probe</em> Reading
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Log temperatures. Pass/fail is automatic against FSA-aligned thresholds and stored against the reading so the audit trail survives rule changes.
      </p>

      <FsaReferenceStrip surface="probe_readings" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Logged"
          value={String(totalLast24h)}
          sub="in last 24 hours"
        />
        <KpiCard
          label="Failing"
          value={String(failingLast24h)}
          sub="below or above safe range"
          tone={failingLast24h > 0 ? 'urgent' : 'healthy'}
        />
        <KpiCard
          label="On file"
          value={String(readings.length)}
          sub="last 50 readings"
        />
        <KpiCard label="Source" value="Manual" sub="bluetooth probe \\u00b7 next batch" />
      </div>

      <SectionHead title="New reading" />
      <ProbeForm />

      <SectionHead title="Recent" meta={readings.length === 0 ? 'no readings yet' : readings.length + ' on file'} />
      {readings.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No readings yet. Log the first one above and the audit trail starts to build.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[120px_120px_1.4fr_110px_120px_100px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['When', 'Kind', 'Location', 'Temperature', 'Status', 'Notes'].map(
              (h) => (
                <div
                  key={h}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {readings.map((r, i) => (
            <div
              key={r.id}
              className={
                'grid grid-cols-1 md:grid-cols-[120px_120px_1.4fr_110px_120px_100px] gap-4 px-7 py-4 items-center' +
                (i < readings.length - 1 ? ' border-b border-rule-soft' : '')
              }
            >
              <div className="font-serif italic text-xs text-muted">
                {new Date(r.logged_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                {PROBE_KIND_LABEL[r.kind as keyof typeof PROBE_KIND_LABEL] ?? r.kind}
              </div>
              <div className="font-serif text-sm text-ink">{r.location}</div>
              <div className="font-serif font-semibold text-base text-ink">
                {tempFmt.format(r.temperature_c)} {String.fromCharCode(0xb0)}C
              </div>
              <div
                className={
                  'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
                  (r.passed ? 'text-healthy' : 'text-urgent')
                }
              >
                {r.passed ? 'PASS' : 'FAIL'}
              </div>
              <div className="font-serif italic text-xs text-muted line-clamp-2">
                {r.notes ?? ''}
              </div>
            </div>
          ))}
        </div>
      )}

      <LiabilityFooter />
    </div>
  );
}
`;

const probeForm = `'use client';

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
            {result.passed ? String.fromCharCode(0x2713) + ' Logged \\u00b7 PASS' : String.fromCharCode(0x2717) + ' Logged \\u00b7 FAIL'}
          </span>
        )}
        {error && <span className="font-serif italic text-sm text-urgent">{error}</span>}
      </div>
    </div>
  );
}
`;

// ---------------------------------------------------------------------
// /safety/incidents
// ---------------------------------------------------------------------
const incidentsPage = `import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecentIncidents } from '@/lib/safety/lib';
import { INCIDENT_KIND_LABEL } from '@/lib/safety/standards';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { IncidentForm } from './IncidentForm';

export const metadata = { title: 'Incidents \\u00b7 Safety \\u00b7 Palatable' };

export default async function IncidentsPage() {
  const ctx = await getShellContext();
  const incidents = await getRecentIncidents(ctx.siteId);
  const open = incidents.filter((i) => !i.resolved_at);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Safety \\u00b7 Incidents
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Log</em> an Incident
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Complaints, allergens, near-misses, suspected illness. Log it now, resolve it later, keep the record either way.
      </p>

      <FsaReferenceStrip surface="incidents" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Open"
          value={String(open.length)}
          sub="awaiting resolution"
          tone={open.length > 0 ? 'attention' : 'healthy'}
        />
        <KpiCard
          label="Allergens"
          value={String(incidents.filter((i) => i.kind === 'allergen').length)}
          sub="of last 50"
          tone={incidents.filter((i) => i.kind === 'allergen').length > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Complaints"
          value={String(incidents.filter((i) => i.kind === 'complaint').length)}
          sub="of last 50"
        />
        <KpiCard
          label="Near misses"
          value={String(incidents.filter((i) => i.kind === 'near_miss').length)}
          sub="of last 50"
        />
      </div>

      <SectionHead title="New incident" />
      <IncidentForm />

      <SectionHead title="Recent" meta={incidents.length + ' on file'} />
      {incidents.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            Nothing on file. Hopefully that stays the case.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule mb-10">
          {incidents.map((inc, i) => (
            <div
              key={inc.id}
              className={
                'px-7 py-5 ' +
                (i < incidents.length - 1 ? 'border-b border-rule-soft' : '')
              }
            >
              <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
                <div className="font-serif font-semibold text-base text-ink">
                  {inc.summary}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                    {INCIDENT_KIND_LABEL[inc.kind]}
                  </span>
                  <span
                    className={
                      'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
                      (inc.resolved_at ? 'text-healthy' : 'text-attention')
                    }
                  >
                    {inc.resolved_at ? 'Resolved' : 'Open'}
                  </span>
                </div>
              </div>
              <div className="font-serif italic text-xs text-muted mb-2">
                {new Date(inc.occurred_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {inc.allergens && inc.allergens.length > 0 && (
                  <> \\u00b7 {inc.allergens.join(', ')}</>
                )}
              </div>
              {inc.body_md && (
                <p className="font-serif text-sm text-ink-soft leading-relaxed whitespace-pre-line">
                  {inc.body_md}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <LiabilityFooter />
    </div>
  );
}
`;

const incidentForm = `'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logIncidentAction } from '@/lib/safety/actions';
import {
  ALL_ALLERGENS,
  ALLERGEN_LABEL,
  INCIDENT_KIND_LABEL,
  type AllergenCode,
} from '@/lib/safety/standards';

const INCIDENT_KINDS = Object.keys(
  INCIDENT_KIND_LABEL,
) as Array<keyof typeof INCIDENT_KIND_LABEL>;

export function IncidentForm() {
  const router = useRouter();
  const [kind, setKind] = useState<keyof typeof INCIDENT_KIND_LABEL>('complaint');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [allergens, setAllergens] = useState<AllergenCode[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAllergen(a: AllergenCode) {
    setAllergens((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  }

  function submit() {
    setError(null);
    setSaved(false);
    if (summary.trim() === '') {
      setError('Add a short summary.');
      return;
    }
    startTransition(async () => {
      const res = await logIncidentAction({
        kind,
        summary: summary.trim(),
        body_md: body.trim() === '' ? null : body.trim(),
        allergens: kind === 'allergen' && allergens.length > 0 ? allergens : null,
        customer_name: customerName.trim() === '' ? null : customerName.trim(),
        customer_contact:
          customerContact.trim() === '' ? null : customerContact.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setSummary('');
      setBody('');
      setAllergens([]);
      setCustomerName('');
      setCustomerContact('');
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-7 py-7 mb-10">
      <div className="flex flex-wrap gap-2 mb-5">
        {INCIDENT_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border transition-colors ' +
              (kind === k
                ? 'bg-gold text-paper border-gold'
                : 'bg-paper text-muted border-rule hover:border-gold hover:text-gold')
            }
          >
            {INCIDENT_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
        Summary
      </label>
      <input
        type="text"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="one line: what happened"
        className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none mb-4"
      />

      <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
        Detail
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="dish involved, who was on station, what was done, who was told"
        className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none mb-4"
      />

      {kind === 'allergen' && (
        <>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Allergens involved (14 UK FIR list)
          </label>
          <div className="flex flex-wrap gap-2 mb-5">
            {ALL_ALLERGENS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAllergen(a)}
                className={
                  'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors ' +
                  (allergens.includes(a)
                    ? 'bg-urgent text-paper border-urgent'
                    : 'bg-paper text-muted border-rule hover:border-urgent hover:text-urgent')
                }
              >
                {ALLERGEN_LABEL[a]}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Customer name (optional)
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Contact (optional)
          </label>
          <input
            type="text"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
            placeholder="email or phone"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-rule">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-urgent text-paper border border-urgent hover:bg-urgent/90 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Logging' + String.fromCharCode(0x2026) : 'Log incident'}
        </button>
        {saved && <span className="font-serif italic text-sm text-healthy">{String.fromCharCode(0x2713)} Saved.</span>}
        {error && <span className="font-serif italic text-sm text-urgent">{error}</span>}
      </div>
    </div>
  );
}
`;

// ---------------------------------------------------------------------
// /safety/cleaning
// ---------------------------------------------------------------------
const cleaningPage = `import { getShellContext } from '@/lib/shell/context';
import { getCleaningSchedule } from '@/lib/safety/lib';
import { CLEANING_FREQ_LABEL } from '@/lib/safety/standards';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { CleaningTickRow } from './CleaningTickRow';
import { seedDefaultCleaningTasksAction } from '@/lib/safety/actions';

export const metadata = { title: 'Cleaning \\u00b7 Safety \\u00b7 Palatable' };

export default async function CleaningPage() {
  const ctx = await getShellContext();
  const tasks = await getCleaningSchedule(ctx.siteId);

  const grouped = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!grouped.has(t.area)) grouped.set(t.area, []);
    grouped.get(t.area)!.push(t);
  }

  const dailyDone = tasks.filter((t) => {
    if (t.frequency !== 'daily' || !t.last_completed_at) return false;
    const today = new Date().toISOString().slice(0, 10);
    const last = t.last_completed_at.slice(0, 10);
    return last === today;
  }).length;
  const dailyTotal = tasks.filter((t) => t.frequency === 'daily').length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Safety \\u00b7 Cleaning
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Cleaning</em> Schedule
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        SFBB-aligned cleaning checklist. Tick each task as you go and the diary builds itself.
      </p>

      <FsaReferenceStrip surface="cleaning" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Daily progress"
          value={dailyDone + ' / ' + dailyTotal}
          sub="ticked today"
          tone={dailyDone === dailyTotal && dailyTotal > 0 ? 'healthy' : 'attention'}
        />
        <KpiCard label="Tasks on file" value={String(tasks.length)} sub="across all frequencies" />
        <KpiCard label="Areas" value={String(grouped.size)} sub="distinct zones" />
        <KpiCard label="Last sign-off" value={(tasks[0]?.last_completed_at ? new Date(tasks[0].last_completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '\\u2014')} sub="most recent" />
      </div>

      {tasks.length === 0 ? (
        <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-7 mb-10">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-3">
            No cleaning schedule yet
          </div>
          <p className="font-serif italic text-base text-ink-soft leading-relaxed mb-5">
            We can seed a default SFBB-aligned schedule with 14 tasks across kitchen, front of house, bar, and storage. You can edit every row afterwards.
          </p>
          <form action={seedDefaultCleaningTasksAction}>
            <button
              type="submit"
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
            >
              Seed default schedule
            </button>
          </form>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([area, items]) => (
          <section key={area} className="mb-10">
            <SectionHead title={area} meta={items.length + (items.length === 1 ? ' task' : ' tasks')} />
            <div className="bg-card border border-rule">
              {items.map((t, i) => (
                <CleaningTickRow
                  key={t.id}
                  task={t}
                  freqLabel={CLEANING_FREQ_LABEL[t.frequency]}
                  isLast={i === items.length - 1}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <LiabilityFooter />
    </div>
  );
}
`;

const cleaningTickRow = `'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signoffCleaningTaskAction } from '@/lib/safety/actions';
import type { CleaningTaskRow } from '@/lib/safety/lib';

export function CleaningTickRow({
  task,
  freqLabel,
  isLast,
}: {
  task: CleaningTaskRow;
  freqLabel: string;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const doneToday =
    task.last_completed_at && task.last_completed_at.slice(0, 10) === today;

  function tick() {
    startTransition(async () => {
      await signoffCleaningTaskAction(task.id);
      router.refresh();
    });
  }

  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[1.6fr_120px_160px_120px] gap-3 px-7 py-4 items-center ' +
        (isLast ? '' : 'border-b border-rule-soft')
      }
    >
      <div className="font-serif text-base text-ink">{task.task}</div>
      <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
        {freqLabel}
      </div>
      <div className="font-serif italic text-xs text-muted">
        {task.last_completed_at
          ? 'Last: ' +
            new Date(task.last_completed_at).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Not yet ticked'}
      </div>
      <button
        type="button"
        onClick={tick}
        disabled={pending}
        className={
          'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border transition-colors disabled:opacity-50 ' +
          (doneToday
            ? 'bg-healthy text-paper border-healthy'
            : 'bg-paper text-muted border-rule hover:border-gold hover:text-gold')
        }
      >
        {pending ? 'Saving' + String.fromCharCode(0x2026) : doneToday ? 'Done today' : 'Tick done'}
      </button>
    </div>
  );
}
`;

// ---------------------------------------------------------------------
// /safety/training
// ---------------------------------------------------------------------
const trainingPage = `import { getShellContext } from '@/lib/shell/context';
import { getTrainingRecords } from '@/lib/safety/lib';
import { TRAINING_KIND_LABEL } from '@/lib/safety/standards';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { TrainingForm } from './TrainingForm';

export const metadata = { title: 'Training \\u00b7 Safety \\u00b7 Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const BAND_LABEL: Record<string, string> = {
  expired: 'Expired',
  today: 'Expires today',
  this_week: 'This week',
  two_weeks: 'Next two weeks',
  month: 'This month',
  safe: 'Current',
  no_expiry: 'No expiry on file',
};

const BAND_TONE: Record<string, string> = {
  expired: 'text-urgent',
  today: 'text-urgent',
  this_week: 'text-urgent',
  two_weeks: 'text-attention',
  month: 'text-attention',
  safe: 'text-healthy',
  no_expiry: 'text-muted',
};

export default async function TrainingPage() {
  const ctx = await getShellContext();
  const rows = await getTrainingRecords(ctx.siteId);

  const expired = rows.filter((r) => r.expiry_band === 'expired').length;
  const within30 = rows.filter((r) =>
    ['today', 'this_week', 'two_weeks', 'month'].includes(r.expiry_band),
  ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Safety \\u00b7 Training
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Training</em> Records
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Staff certifications and their expiry dates. The Looking Ahead engine flags 30 / 14 / 7 / 0 days out.
      </p>

      <FsaReferenceStrip surface="training" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="On file"
          value={String(rows.length)}
          sub="across all staff"
        />
        <KpiCard
          label="Expired"
          value={String(expired)}
          sub="needs renewal"
          tone={expired > 0 ? 'urgent' : 'healthy'}
        />
        <KpiCard
          label="Within 30 days"
          value={String(within30)}
          sub="action this month"
          tone={within30 > 0 ? 'attention' : 'healthy'}
        />
        <KpiCard
          label="Staff covered"
          value={String(new Set(rows.map((r) => r.staff_name)).size)}
          sub="distinct names"
        />
      </div>

      <SectionHead title="Add training" />
      <TrainingForm />

      <SectionHead title="Current records" meta={rows.length + ' on file'} />
      {rows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No training records yet. Add the first above.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[1.4fr_1.2fr_140px_140px_130px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Staff', 'Certification', 'Awarded', 'Expires', 'Status'].map(
              (h) => (
                <div
                  key={h}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={
                'grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_140px_140px_130px] gap-4 px-7 py-4 items-center' +
                (i < rows.length - 1 ? ' border-b border-rule-soft' : '')
              }
            >
              <div className="font-serif font-semibold text-base text-ink">
                {r.staff_name}
              </div>
              <div className="font-serif text-sm text-ink-soft">
                {r.certificate_name ||
                  TRAINING_KIND_LABEL[
                    r.kind as keyof typeof TRAINING_KIND_LABEL
                  ] ||
                  r.kind}
                {r.awarding_body && (
                  <span className="text-muted-soft"> \\u00b7 {r.awarding_body}</span>
                )}
              </div>
              <div className="font-serif italic text-xs text-muted">
                {dateFmt.format(new Date(r.awarded_on))}
              </div>
              <div className="font-serif italic text-xs text-muted">
                {r.expires_on ? dateFmt.format(new Date(r.expires_on)) : '\\u2014'}
              </div>
              <div
                className={
                  'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
                  BAND_TONE[r.expiry_band]
                }
              >
                {BAND_LABEL[r.expiry_band]}
                {r.days_until_expiry != null &&
                  r.expiry_band !== 'safe' &&
                  r.expiry_band !== 'no_expiry' && (
                    <span className="ml-1 text-muted-soft">
                      ({r.days_until_expiry}d)
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LiabilityFooter />
    </div>
  );
}
`;

const trainingForm = `'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTrainingAction } from '@/lib/safety/actions';
import { TRAINING_KIND_LABEL } from '@/lib/safety/standards';

const KINDS = Object.keys(
  TRAINING_KIND_LABEL,
) as Array<keyof typeof TRAINING_KIND_LABEL>;

export function TrainingForm() {
  const router = useRouter();
  const [staffName, setStaffName] = useState('');
  const [kind, setKind] = useState<keyof typeof TRAINING_KIND_LABEL>(
    'food_hygiene_l2',
  );
  const [certName, setCertName] = useState('');
  const [awardingBody, setAwardingBody] = useState('');
  const [awardedOn, setAwardedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expiresOn, setExpiresOn] = useState('');
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    setSaved(false);
    if (staffName.trim() === '') {
      setError('Staff name is required.');
      return;
    }
    startTransition(async () => {
      const res = await addTrainingAction({
        staff_name: staffName.trim(),
        kind,
        certificate_name: certName.trim() === '' ? null : certName.trim(),
        awarding_body: awardingBody.trim() === '' ? null : awardingBody.trim(),
        awarded_on: awardedOn,
        expires_on: expiresOn === '' ? null : expiresOn,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setStaffName('');
      setCertName('');
      setAwardingBody('');
      setExpiresOn('');
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-7 py-7 mb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Staff name
          </label>
          <input
            type="text"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Kind
          </label>
          <select
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as keyof typeof TRAINING_KIND_LABEL)
            }
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {TRAINING_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Certificate name (optional)
          </label>
          <input
            type="text"
            value={certName}
            onChange={(e) => setCertName(e.target.value)}
            placeholder="e.g. CIEH Level 2 Food Safety"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Awarding body (optional)
          </label>
          <input
            type="text"
            value={awardingBody}
            onChange={(e) => setAwardingBody(e.target.value)}
            placeholder="e.g. CIEH, RSPH"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Awarded
          </label>
          <input
            type="date"
            value={awardedOn}
            onChange={(e) => setAwardedOn(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Expires (optional)
          </label>
          <input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-rule">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving' + String.fromCharCode(0x2026) : 'Add record'}
        </button>
        {saved && <span className="font-serif italic text-sm text-healthy">{String.fromCharCode(0x2713)} Saved.</span>}
        {error && <span className="font-serif italic text-sm text-urgent">{error}</span>}
      </div>
    </div>
  );
}
`;

write('src/app/(shell)/safety/layout.tsx', safetyLayout);
write('src/app/(shell)/safety/page.tsx', safetyHome);
write('src/components/safety/OpeningCheckForm.tsx', openingCheckForm);
write('src/components/safety/DiaryCalendar.tsx', diaryCalendar);
write('src/components/safety/ForwardCalendar.tsx', forwardCalendar);
write('src/lib/safety/forward-calendar.ts', forwardCalendarLib);
write('src/app/(shell)/safety/probe/page.tsx', probePage);
write('src/app/(shell)/safety/probe/ProbeForm.tsx', probeForm);
write('src/app/(shell)/safety/incidents/page.tsx', incidentsPage);
write('src/app/(shell)/safety/incidents/IncidentForm.tsx', incidentForm);
write('src/app/(shell)/safety/cleaning/page.tsx', cleaningPage);
write('src/app/(shell)/safety/cleaning/CleaningTickRow.tsx', cleaningTickRow);
write('src/app/(shell)/safety/training/page.tsx', trainingPage);
write('src/app/(shell)/safety/training/TrainingForm.tsx', trainingForm);

console.log('\ndone');
