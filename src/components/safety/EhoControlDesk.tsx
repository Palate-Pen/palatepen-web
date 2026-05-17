'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  startEhoVisitAction,
  endEhoVisitAction,
  addEhoLogEntryAction,
  updateEhoVisitInspectorAction,
} from '@/lib/safety/actions';
import {
  EHO_TAG_LABEL,
  EHO_TAG_TONE,
  EHO_VISIT_TYPE_LABEL,
  EHO_OUTCOME_LABEL,
  type EhoVisitRow,
  type EhoVisitTag,
  type EhoVisitType,
  type EhoVisitOutcome,
} from '@/lib/safety/eho-visit';

export type ComplianceMetric = {
  label: string;
  value: string;
  detail: string;
  tone: 'healthy' | 'attention' | 'urgent';
};

export type EvidenceTileSpec = {
  title: string;
  status: string;
  tone: 'healthy' | 'attention' | 'urgent';
  num?: string;
  numSub?: string;
  detail: React.ReactNode;
  href?: string;
  hrefLabel?: string;
};

type ClientProps = {
  siteId: string;
  visit: EhoVisitRow | null;
  recentVisits: EhoVisitRow[];
  posture: ComplianceMetric[];
  tiles: EvidenceTileSpec[];
};

const TAG_OPTIONS: EhoVisitTag[] = ['note', 'observed', 'requested', 'action'];

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function fmtElapsed(start: string, end: string | null): string {
  const endMs = end ? new Date(end).getTime() : Date.now();
  const ms = Math.max(0, endMs - new Date(start).getTime());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function EhoControlDesk({
  siteId,
  visit,
  recentVisits,
  posture,
  tiles,
}: ClientProps) {
  if (visit) {
    return (
      <LiveVisitDesk
        visit={visit}
        posture={posture}
        tiles={tiles}
      />
    );
  }
  return (
    <PreVisitView
      siteId={siteId}
      recentVisits={recentVisits}
      posture={posture}
      tiles={tiles}
    />
  );
}

// =====================================================================
// PRE-VISIT — start CTA + recent visit history + evidence preview
// =====================================================================
function PreVisitView({
  siteId,
  recentVisits,
  posture,
  tiles,
}: {
  siteId: string;
  recentVisits: EhoVisitRow[];
  posture: ComplianceMetric[];
  tiles: EvidenceTileSpec[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [authority, setAuthority] = useState('');
  const [idShown, setIdShown] = useState('');
  const [visitType, setVisitType] = useState<EhoVisitType>('routine');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startVisit() {
    setError(null);
    startTransition(async () => {
      const res = await startEhoVisitAction({
        siteId,
        inspectorName: name.trim() || null,
        inspectorAuthority: authority.trim() || null,
        inspectorIdShown: idShown.trim() || null,
        visitType,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="bg-ink text-paper border-l-[3px] border-l-gold px-8 py-7 mb-8 flex flex-wrap items-center gap-6 justify-between">
        <div className="flex-1 min-w-[280px]">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold-light mb-2">
            EHO at the door?
          </div>
          <div className="font-serif text-[26px] text-paper leading-tight mb-2">
            <em className="text-gold-light italic font-medium">
              Open the inspection control desk.
            </em>
          </div>
          <p className="font-serif italic text-sm text-paper/75 leading-relaxed">
            Tap the button. Show the iPad. Walk the inspector through 90 days
            of records in 30 seconds. The PDF export is one tap away when they
            ask for a copy.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 min-w-[220px]">
          {open ? null : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-7 py-4 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors text-center"
            >
              Enter EHO mode
            </button>
          )}
          <a
            href="/api/safety/eho/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-7 py-3 bg-transparent text-paper/85 border border-paper/30 hover:border-gold hover:text-gold transition-colors text-center"
          >
            Export 90-day PDF
          </a>
        </div>
      </div>

      {open && (
        <div className="bg-card border border-gold border-l-[3px] border-l-gold px-7 py-6 mb-8">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
            Capture inspector details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <LabeledInput
              label="Inspector name"
              value={name}
              onChange={setName}
              placeholder="e.g. Catherine Reid"
              autoFocus
            />
            <LabeledInput
              label="Authority"
              value={authority}
              onChange={setAuthority}
              placeholder="e.g. Hackney Council · Environmental Health"
            />
            <LabeledInput
              label="ID shown"
              value={idShown}
              onChange={setIdShown}
              placeholder="Badge / warrant number"
            />
            <div>
              <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1.5">
                Visit type
              </div>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as EhoVisitType)}
                className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
              >
                {(Object.keys(EHO_VISIT_TYPE_LABEL) as EhoVisitType[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {EHO_VISIT_TYPE_LABEL[k]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          {error && (
            <p className="font-serif italic text-sm text-urgent mb-3">{error}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={startVisit}
              disabled={pending}
              className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
            >
              {pending ? 'Starting' + String.fromCharCode(0x2026) : 'Start visit'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-5 py-3 bg-paper text-ink border border-rule hover:border-gold disabled:opacity-50 transition-colors"
            >
              Not yet — close
            </button>
            <p className="font-serif italic text-xs text-muted">
              You can fill in or correct the inspector details after the visit starts too.
            </p>
          </div>
        </div>
      )}

      <PostureRow posture={posture} />
      <EvidenceGrid tiles={tiles} />

      {recentVisits.length > 0 && (
        <section className="mb-10">
          <div className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold mb-3">
            Recent visits
          </div>
          <div className="bg-card border border-rule">
            {recentVisits.map((v, i) => (
              <div
                key={v.id}
                className={
                  'px-6 py-4 flex flex-wrap items-baseline gap-4 ' +
                  (i < recentVisits.length - 1 ? 'border-b border-rule-soft' : '')
                }
              >
                <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted w-32">
                  {dateFmt.format(new Date(v.visit_start_at))}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-serif font-semibold text-sm text-ink">
                    {v.inspector_name ?? 'Inspector (no name captured)'}
                    {v.inspector_authority && (
                      <span className="font-serif italic text-muted ml-2">
                        · {v.inspector_authority}
                      </span>
                    )}
                  </div>
                  <div className="font-sans text-xs text-muted mt-0.5">
                    {v.visit_type ? EHO_VISIT_TYPE_LABEL[v.visit_type] : 'Visit'} · {v.visit_log.length} log entries
                  </div>
                </div>
                {v.outcome && (
                  <span
                    className={
                      'inline-flex font-display font-semibold text-[10px] tracking-[0.25em] uppercase px-2 py-0.5 border ' +
                      (v.outcome === 'pass'
                        ? 'bg-healthy/10 text-healthy border-healthy/40'
                        : v.outcome === 'improvements_required'
                          ? 'bg-attention/10 text-attention border-attention/40'
                          : 'bg-urgent/10 text-urgent border-urgent/40')
                    }
                  >
                    {EHO_OUTCOME_LABEL[v.outcome]}
                  </span>
                )}
                {v.rating_after != null && (
                  <span className="font-mono text-xs text-muted">
                    FHRS {v.rating_after}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// =====================================================================
// LIVE VISIT DESK
// =====================================================================
function LiveVisitDesk({
  visit,
  posture,
  tiles,
}: {
  visit: EhoVisitRow;
  posture: ComplianceMetric[];
  tiles: EvidenceTileSpec[];
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() =>
    fmtElapsed(visit.visit_start_at, visit.visit_end_at),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(fmtElapsed(visit.visit_start_at, visit.visit_end_at));
    }, 1000);
    return () => clearInterval(t);
  }, [visit.visit_start_at, visit.visit_end_at]);

  return (
    <>
      <CommandHeader visit={visit} />
      <VisitStatusRow visit={visit} elapsed={elapsed} />
      <PostureRow posture={posture} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-8 mb-10">
        <div>
          <EvidenceGrid tiles={tiles} />
        </div>
        <div className="flex flex-col gap-6">
          <InspectorCard visit={visit} onPatched={() => router.refresh()} />
          <VisitLog visit={visit} onLogged={() => router.refresh()} />
          <EndVisitCard visit={visit} onEnded={() => router.refresh()} />
        </div>
      </div>
    </>
  );
}

function CommandHeader({ visit }: { visit: EhoVisitRow }) {
  return (
    <div className="bg-ink text-paper border-l-[3px] border-l-gold px-8 py-7 mb-6 flex flex-wrap items-center gap-6 justify-between">
      <div className="flex-1 min-w-[280px]">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold-light mb-2">
          EHO Visit Mode · Live
        </div>
        <div className="font-serif text-[26px] text-paper leading-tight mb-2">
          Your{' '}
          <em className="text-gold-light italic font-medium">
            inspection control desk
          </em>
          .
        </div>
        <p className="font-serif italic text-sm text-paper/75 leading-relaxed">
          Everything Palatable knows about this kitchen, ready to show. Take a
          breath — the records are there.
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-3 min-w-[220px]">
        <a
          href="/api/safety/eho/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-7 py-4 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors text-center"
        >
          Export 90-day PDF
        </a>
        {visit.id && (
          <a
            href={`/api/safety/haccp/${''}`}
            className="hidden"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

function VisitStatusRow({
  visit,
  elapsed,
}: {
  visit: EhoVisitRow;
  elapsed: string;
}) {
  return (
    <div className="bg-card border border-rule border-l-[3px] border-l-healthy px-7 py-4 mb-8 flex flex-wrap items-center gap-5">
      <span className="relative flex w-2.5 h-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-healthy/60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-healthy" />
      </span>
      <div className="flex-1 min-w-[260px]">
        <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-healthy">
          Visit in progress
        </div>
        <div className="font-serif italic text-sm text-muted mt-1">
          Started{' '}
          <em className="text-ink-soft not-italic font-medium">
            {timeFmt.format(new Date(visit.visit_start_at))}
          </em>
          {visit.inspector_name && (
            <>
              {' · '}
              <strong className="not-italic font-semibold text-ink-soft">
                {visit.inspector_name}
              </strong>
            </>
          )}
          {visit.inspector_authority && (
            <>
              {' · '}
              <span className="not-italic text-ink-soft">
                {visit.inspector_authority}
              </span>
            </>
          )}
          {visit.visit_type && (
            <>
              {' · '}
              {EHO_VISIT_TYPE_LABEL[visit.visit_type]}
            </>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono font-medium text-[28px] text-ink leading-none tabular-nums">
          {elapsed}
        </div>
        <div className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-muted mt-1">
          Elapsed
        </div>
      </div>
    </div>
  );
}

function PostureRow({ posture }: { posture: ComplianceMetric[] }) {
  if (posture.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-rule border border-rule mb-8">
      {posture.map((m) => (
        <div
          key={m.label}
          className={
            'bg-card px-5 py-4 ' +
            (m.tone === 'urgent'
              ? 'border-l-[3px] border-l-urgent'
              : m.tone === 'attention'
                ? 'border-l-[3px] border-l-attention'
                : '')
          }
        >
          <div
            className={
              'font-display font-semibold text-[10px] tracking-[0.3em] uppercase mb-2 ' +
              (m.tone === 'urgent'
                ? 'text-urgent'
                : m.tone === 'attention'
                  ? 'text-attention'
                  : 'text-muted')
            }
          >
            {m.label}
          </div>
          <div className="font-mono font-medium text-[24px] text-ink leading-none mb-2 tabular-nums">
            {m.value}
          </div>
          <div className="font-serif italic text-xs text-muted leading-snug">
            {m.detail}
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceGrid({ tiles }: { tiles: EvidenceTileSpec[] }) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold">
          Evidence on file — last 90 days
        </h2>
        <span className="font-serif italic text-sm text-muted">
          tap a tile for full detail
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiles.map((t) => (
          <EvidenceTile key={t.title} tile={t} />
        ))}
      </div>
    </section>
  );
}

function EvidenceTile({ tile }: { tile: EvidenceTileSpec }) {
  const toneBorder =
    tile.tone === 'attention'
      ? 'border-attention/40 border-l-[3px] border-l-attention'
      : tile.tone === 'urgent'
        ? 'border-urgent/40 border-l-[3px] border-l-urgent'
        : 'border-rule';
  const toneText =
    tile.tone === 'attention'
      ? 'text-attention'
      : tile.tone === 'urgent'
        ? 'text-urgent'
        : 'text-healthy';
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="font-serif font-semibold text-base text-ink leading-tight">
          {tile.title}
        </div>
        <span
          className={
            'font-display font-semibold text-[10px] tracking-[0.25em] uppercase ' +
            toneText
          }
        >
          {tile.status}
        </span>
      </div>
      {tile.num && (
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-mono font-medium text-[26px] text-ink leading-none">
            {tile.num}
          </span>
          {tile.numSub && (
            <span className="font-sans text-xs text-muted">{tile.numSub}</span>
          )}
        </div>
      )}
      <div className="font-serif text-sm text-ink-soft leading-relaxed mb-3">
        {tile.detail}
      </div>
      {tile.href && tile.hrefLabel && (
        <span className="font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-gold inline-flex items-center gap-1">
          {tile.hrefLabel} →
        </span>
      )}
    </>
  );
  const cls = 'block bg-card border px-6 py-5 transition-colors hover:border-gold ' + toneBorder;
  if (!tile.href) {
    return <div className={cls}>{inner}</div>;
  }
  return tile.href.startsWith('http') || tile.href.startsWith('/api') ? (
    <a href={tile.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={tile.href} className={cls}>
      {inner}
    </Link>
  );
}

function InspectorCard({
  visit,
  onPatched,
}: {
  visit: EhoVisitRow;
  onPatched: () => void;
}) {
  const [name, setName] = useState(visit.inspector_name ?? '');
  const [authority, setAuthority] = useState(visit.inspector_authority ?? '');
  const [idShown, setIdShown] = useState(visit.inspector_id_shown ?? '');
  const [visitType, setVisitType] = useState<EhoVisitType>(
    visit.visit_type ?? 'routine',
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateEhoVisitInspectorAction({
        visitId: visit.id,
        inspectorName: name.trim() || null,
        inspectorAuthority: authority.trim() || null,
        inspectorIdShown: idShown.trim() || null,
        visitType,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(timeFmt.format(new Date()));
      onPatched();
    });
  }

  return (
    <div className="bg-paper-warm border border-rule px-6 py-5">
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
        Inspector details
      </div>
      <div className="space-y-2.5">
        <LabeledInput
          label="Name"
          value={name}
          onChange={setName}
          placeholder="EHO name"
        />
        <LabeledInput
          label="Authority"
          value={authority}
          onChange={setAuthority}
          placeholder="Council · Environmental Health"
        />
        <LabeledInput
          label="ID shown"
          value={idShown}
          onChange={setIdShown}
          placeholder="Warrant or badge number"
        />
        <div>
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1">
            Visit type
          </div>
          <select
            value={visitType}
            onChange={(e) => setVisitType(e.target.value as EhoVisitType)}
            className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
          >
            {(Object.keys(EHO_VISIT_TYPE_LABEL) as EhoVisitType[]).map((k) => (
              <option key={k} value={k}>
                {EHO_VISIT_TYPE_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving' + String.fromCharCode(0x2026) : 'Save'}
        </button>
        {error ? (
          <span className="font-serif italic text-xs text-urgent">{error}</span>
        ) : savedAt ? (
          <span className="font-serif italic text-xs text-healthy">
            Saved · {savedAt}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VisitLog({
  visit,
  onLogged,
}: {
  visit: EhoVisitRow;
  onLogged: () => void;
}) {
  const [tag, setTag] = useState<EhoVisitTag>('note');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const entries = useMemo(
    () => [...visit.visit_log].sort((a, b) => a.at.localeCompare(b.at)),
    [visit.visit_log],
  );

  function add() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await addEhoLogEntryAction({
        visitId: visit.id,
        tag,
        body: body.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody('');
      onLogged();
    });
  }

  return (
    <div className="bg-card border border-rule">
      <div className="px-6 py-4 border-b border-rule flex items-baseline justify-between gap-3 flex-wrap">
        <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-ink">
          Live visit log
        </div>
        <span className="font-serif italic text-xs text-muted">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · auto-saved
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {entries.length === 0 ? (
          <p className="px-6 py-5 font-serif italic text-sm text-muted">
            Nothing logged yet — capture the first event as it happens.
          </p>
        ) : (
          entries.map((e, i) => (
            <div
              key={i}
              className={
                'px-6 py-3.5 flex items-start gap-3 ' +
                (i < entries.length - 1 ? 'border-b border-rule-soft' : '')
              }
            >
              <div className="font-mono text-xs text-muted-soft w-12 flex-shrink-0 pt-1">
                {timeFmt.format(new Date(e.at))}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={
                    'inline-flex font-display font-semibold text-[9px] tracking-[0.25em] uppercase px-2 py-0.5 border mb-1 ' +
                    EHO_TAG_TONE[e.tag]
                  }
                >
                  {EHO_TAG_LABEL[e.tag]}
                </span>
                <div className="font-serif text-sm text-ink leading-snug">
                  {e.body}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-4 py-3 border-t border-rule bg-paper-warm/50">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={body}
            onChange={(ev) => setBody(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                add();
              }
            }}
            placeholder="Type the next event as it happens…"
            className="flex-1 min-w-[160px] px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
          />
          <select
            value={tag}
            onChange={(ev) => setTag(ev.target.value as EhoVisitTag)}
            className="px-2.5 py-2 border border-rule bg-paper font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-ink focus:border-gold focus:outline-none"
          >
            {TAG_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {EHO_TAG_LABEL[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={pending || !body.trim()}
            className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-4 py-2 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold disabled:opacity-40 transition-colors"
          >
            {pending ? 'Adding' + String.fromCharCode(0x2026) : 'Add'}
          </button>
        </div>
        {error && (
          <p className="font-serif italic text-xs text-urgent mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}

function EndVisitCard({
  visit,
  onEnded,
}: {
  visit: EhoVisitRow;
  onEnded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<EhoVisitOutcome | ''>('');
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function end() {
    setError(null);
    const r = rating.trim() === '' ? null : Number(rating);
    if (r != null && (!Number.isFinite(r) || r < 0 || r > 5)) {
      setError('Rating must be between 0 and 5.');
      return;
    }
    startTransition(async () => {
      const res = await endEhoVisitAction({
        visitId: visit.id,
        outcome: outcome === '' ? null : outcome,
        ratingAfter: r,
        notesMd: notes.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onEnded();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-5 py-3 bg-paper text-ink-soft border border-rule hover:border-urgent hover:text-urgent transition-colors text-center"
      >
        End visit + capture outcome
      </button>
    );
  }

  return (
    <div className="bg-paper-warm border border-rule border-l-[3px] border-l-attention px-6 py-5">
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-attention mb-3">
        End the visit
      </div>
      <div className="space-y-2.5 mb-3">
        <div>
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1">
            Outcome (optional)
          </div>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as EhoVisitOutcome | '')}
            className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
          >
            <option value="">— not stated —</option>
            {(Object.keys(EHO_OUTCOME_LABEL) as EhoVisitOutcome[]).map((k) => (
              <option key={k} value={k}>
                {EHO_OUTCOME_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <LabeledInput
          label="FHRS rating after (0–5, optional)"
          value={rating}
          onChange={setRating}
          placeholder="e.g. 5"
        />
        <div>
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1">
            Closing notes (optional)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any follow-up actions agreed, items flagged, etc."
            className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>
      {error && (
        <p className="font-serif italic text-xs text-urgent mb-2">{error}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={end}
          disabled={pending}
          className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-4 py-2.5 bg-urgent text-paper border border-urgent hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {pending ? 'Ending' + String.fromCharCode(0x2026) : 'Confirm — end visit'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-3 py-2.5 bg-transparent text-muted border border-rule hover:text-ink disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Shared
// =====================================================================
function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1 block">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
      />
    </label>
  );
}
