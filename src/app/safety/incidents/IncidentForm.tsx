'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logIncidentAction } from '@/lib/safety/actions';
import {
  ALL_ALLERGENS,
  ALLERGEN_LABEL,
  type AllergenCode,
} from '@/lib/safety/standards';
import { DishPicker, type DishPickerValue } from '@/components/safety/DishPicker';
import type { DishPickerBands } from '@/lib/safety/dish-picker';

type Kind = 'complaint' | 'allergen' | 'near_miss' | 'illness';
type Severity = 'low' | 'medium' | 'high';

const KIND_CONFIG: Array<{
  key: Kind;
  label: string;
  tone: 'urgent' | 'attention';
  icon: React.ReactNode;
}> = [
  {
    key: 'complaint',
    label: 'Complaint',
    tone: 'attention',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    key: 'allergen',
    label: 'Allergy',
    tone: 'urgent',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    key: 'near_miss',
    label: 'Near-Miss',
    tone: 'attention',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'illness',
    label: 'Illness',
    tone: 'urgent',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
      </svg>
    ),
  },
];

const SEVERITY_CONFIG: Array<{
  key: Severity;
  label: string;
  desc: string;
  tone: string;
}> = [
  {
    key: 'low',
    label: 'Low',
    desc: 'Minor complaint, no harm',
    tone: 'border-healthy/40 text-ink hover:border-healthy bg-healthy/[0.04]',
  },
  {
    key: 'medium',
    label: 'Medium',
    desc: 'Minor reaction or risk',
    tone: 'border-attention/40 text-ink hover:border-attention bg-attention/[0.04]',
  },
  {
    key: 'high',
    label: 'High',
    desc: 'Hospital, severe reaction',
    tone: 'border-urgent/40 text-ink hover:border-urgent bg-urgent/[0.04]',
  },
];

const SEVERITY_ACTIVE: Record<Severity, string> = {
  low: 'border-healthy bg-healthy/10 text-healthy',
  medium: 'border-attention bg-attention/10 text-attention',
  high: 'border-urgent bg-urgent/10 text-urgent',
};

const CORRECTIVE_ACTIONS: Array<{ key: string; label: string }> = [
  { key: 'dish_removed', label: 'Dish removed from guest immediately' },
  { key: 'foh_alerted', label: 'FOH team alerted; service briefed on allergen handling' },
  { key: 'stock_isolated', label: 'Affected stock isolated for review' },
  { key: 'docs_reviewed', label: 'Allergen documentation reviewed and updated' },
  { key: 'guest_contact', label: 'Guest contact details obtained for follow-up' },
  { key: 'eho_notified', label: 'Local authority (Environmental Health) notified' },
  { key: 'insurer_notified', label: 'Insurer notified' },
];

export function IncidentForm({ bands }: { bands: DishPickerBands }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('complaint');
  const [severity, setSeverity] = useState<Severity>('low');
  const [allergens, setAllergens] = useState<AllergenCode[]>([]);
  const [dish, setDish] = useState<DishPickerValue>({ recipe_id: null, text: '' });
  const [dateLabel, setDateLabel] = useState(() => formatDate(new Date()));
  const [service, setService] = useState('');
  const [narrative, setNarrative] = useState('');
  const [actions, setActions] = useState<Set<string>>(new Set());
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kindCfg = KIND_CONFIG.find((c) => c.key === kind)!;

  function toggleAllergen(a: AllergenCode) {
    setAllergens((p) =>
      p.includes(a) ? p.filter((x) => x !== a) : [...p, a],
    );
  }

  function toggleAction(key: string) {
    setActions((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submit(asDraft: boolean) {
    setError(null);
    setSaved(false);
    if (narrative.trim() === '') {
      setError('Tell the story — even one line is better than nothing.');
      return;
    }

    const dishText = dish.text.trim();
    const summary = buildSummary({
      kindLabel: kindCfg.label,
      dish: dishText,
      narrative: narrative.trim(),
    });

    const body = buildBody({
      severity,
      service: service.trim(),
      dish: dishText,
      actions: CORRECTIVE_ACTIONS.filter((a) => actions.has(a.key)).map(
        (a) => a.label,
      ),
      narrative: narrative.trim(),
      draft: asDraft,
    });

    startTransition(async () => {
      const res = await logIncidentAction({
        kind,
        summary,
        body_md: body,
        recipe_id: dish.recipe_id,
        allergens: allergens.length > 0 ? allergens : null,
        customer_name:
          customerName.trim() === '' ? null : customerName.trim(),
        customer_contact:
          customerContact.trim() === '' ? null : customerContact.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (!asDraft) {
        setNarrative('');
        setActions(new Set());
        setAllergens([]);
        setDish({ recipe_id: null, text: '' });
        setService('');
        setCustomerName('');
        setCustomerContact('');
        setSeverity('low');
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-7 py-6">
      <FormSection label="Issue Type" meta="what happened?">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KIND_CONFIG.map((c) => {
            const isActive = kind === c.key;
            const tone =
              c.tone === 'urgent' ? 'urgent' : 'attention';
            const activeRing =
              tone === 'urgent'
                ? 'border-urgent bg-urgent/10'
                : 'border-attention bg-attention/10';
            const activeIcon =
              tone === 'urgent' ? 'text-urgent' : 'text-attention';
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setKind(c.key)}
                className={
                  'flex flex-col items-center gap-2 px-4 py-4 border transition-colors ' +
                  (isActive
                    ? activeRing
                    : 'border-rule bg-paper-warm hover:border-gold')
                }
              >
                <div
                  className={
                    'w-9 h-9 flex items-center justify-center ' +
                    (isActive ? activeIcon : 'text-muted')
                  }
                >
                  <span className="w-5 h-5 inline-flex">{c.icon}</span>
                </div>
                <div
                  className={
                    'font-display font-semibold text-[11px] tracking-[0.18em] uppercase ' +
                    (isActive
                      ? tone === 'urgent'
                        ? 'text-urgent'
                        : 'text-attention'
                      : 'text-ink')
                  }
                >
                  {c.label}
                </div>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection
        label="Severity"
        meta="honest assessment — high severity escalates"
      >
        <div className="grid grid-cols-3 gap-3">
          {SEVERITY_CONFIG.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSeverity(s.key)}
              className={
                'flex flex-col items-start px-4 py-4 border transition-colors ' +
                (severity === s.key ? SEVERITY_ACTIVE[s.key] : s.tone)
              }
            >
              <div
                className={
                  'font-display font-semibold text-[12px] tracking-[0.18em] uppercase mb-1 ' +
                  (severity === s.key
                    ? s.key === 'high'
                      ? 'text-urgent'
                      : s.key === 'medium'
                        ? 'text-attention'
                        : 'text-healthy'
                    : 'text-ink')
                }
              >
                {s.label}
              </div>
              <div className="font-serif text-xs text-muted text-left">
                {s.desc}
              </div>
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection
        label="Allergen Involved"
        meta="all 14 regulated allergens · select any that apply"
      >
        <div className="flex flex-wrap gap-2 mb-3">
          {ALL_ALLERGENS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAllergen(a)}
              className={
                'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors rounded-sm ' +
                (allergens.includes(a)
                  ? 'bg-urgent text-paper border-urgent'
                  : 'bg-paper text-ink-soft border-rule hover:border-urgent hover:text-urgent')
              }
            >
              {ALLERGEN_LABEL[a]}
            </button>
          ))}
        </div>
        <a
          className="font-sans text-xs text-gold hover:text-gold-dark transition-colors inline-flex items-center gap-1"
          href="https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses"
          target="_blank"
          rel="noopener noreferrer"
        >
          ↗ FSA allergen guidance for food businesses
        </a>
      </FormSection>

      <div className="mb-7">
        <DishPicker
          bands={bands}
          value={dish}
          onChange={setDish}
          label="Dish Involved"
          meta="pick from today's menu / prep / library · staff food can be typed"
        />
      </div>

      <FormSection label="When It Happened" meta="date and service">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
              Date
            </label>
            <input
              type="text"
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
              Service
            </label>
            <input
              type="text"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="Dinner — 20:45"
              className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        label="What Happened"
        meta="the more detail, the better the record"
      >
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={6}
          placeholder="Describe what happened — guest reaction, time symptoms started, what was ordered, what was said by FOH, what action was taken…"
          className="w-full px-3 py-3 border border-rule bg-paper font-serif text-sm text-ink-soft leading-relaxed focus:border-gold focus:outline-none"
        />
      </FormSection>

      <FormSection
        label="Corrective Actions Taken"
        meta="what did you do? — tick all that apply"
      >
        <div className="space-y-2">
          {CORRECTIVE_ACTIONS.map((a) => {
            const checked = actions.has(a.key);
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggleAction(a.key)}
                className={
                  'w-full flex items-start gap-3 px-4 py-3 border text-left transition-colors ' +
                  (checked
                    ? 'border-healthy bg-healthy/[0.06]'
                    : 'border-rule bg-paper hover:border-gold')
                }
              >
                <div
                  className={
                    'w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ' +
                    (checked
                      ? 'bg-healthy border-healthy text-paper'
                      : 'bg-card border-rule')
                  }
                >
                  {checked && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="w-3 h-3"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </div>
                <span
                  className={
                    'font-serif text-sm leading-snug ' +
                    (checked ? 'text-ink' : 'text-ink-soft')
                  }
                >
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection label="Customer (Optional)" meta="for follow-up if needed">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Name"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
          <input
            type="text"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
            placeholder="Email or phone"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </FormSection>

      <div className="flex items-center justify-between gap-4 flex-wrap pt-5 border-t border-rule mt-2">
        <div className="font-serif italic text-sm text-muted">
          <strong className="font-display not-italic font-semibold text-[11px] tracking-[0.18em] uppercase text-ink-soft mr-1.5">
            Logged by:
          </strong>
          You · {dateLabel}, {nowTime()}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {saved && (
            <span className="font-serif italic text-sm text-healthy">
              ✓ Saved.
            </span>
          )}
          {error && (
            <span className="font-serif italic text-sm text-urgent">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={pending}
            className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-5 py-2.5 bg-paper text-ink-soft border border-rule hover:border-gold disabled:opacity-50 transition-colors"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={pending}
            className={
              'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-6 py-2.5 text-paper border disabled:opacity-50 transition-colors ' +
              (severity === 'high' || kindCfg.tone === 'urgent'
                ? 'bg-urgent border-urgent hover:bg-urgent/90'
                : 'bg-gold border-gold hover:bg-gold-dark')
            }
          >
            {pending ? 'Logging…' : 'Log Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({
  label,
  meta,
  children,
}: {
  label: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <div className="font-display font-semibold text-[12px] tracking-[0.25em] uppercase text-ink">
          {label}
        </div>
        <div className="font-serif italic text-xs text-muted">{meta}</div>
      </div>
      {children}
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function nowTime(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function buildSummary({
  kindLabel,
  dish,
  narrative,
}: {
  kindLabel: string;
  dish: string;
  narrative: string;
}): string {
  const prefix = dish ? `${kindLabel} · ${dish}` : kindLabel;
  const head = narrative.split(/[.\n]/)[0]?.trim() ?? narrative;
  const tail = head.length > 90 ? head.slice(0, 87) + '…' : head;
  return prefix + ' — ' + tail;
}

function buildBody({
  severity,
  service,
  dish,
  actions,
  narrative,
  draft,
}: {
  severity: Severity;
  service: string;
  dish: string;
  actions: string[];
  narrative: string;
  draft: boolean;
}): string {
  const lines: string[] = [];
  lines.push(
    `**Severity:** ${severity.charAt(0).toUpperCase() + severity.slice(1)}`,
  );
  if (service) lines.push(`**Service:** ${service}`);
  if (dish) lines.push(`**Dish:** ${dish}`);
  if (draft) lines.push(`**Status:** Draft`);
  lines.push('');
  lines.push(narrative);
  if (actions.length > 0) {
    lines.push('');
    lines.push('**Corrective actions taken:**');
    for (const a of actions) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}
