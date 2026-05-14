'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAccountPreferences } from './account-preferences-actions';
import type {
  AccountPreferences,
  KitchenSize,
  StockDay,
} from '@/lib/account-preferences';

const KITCHEN_SIZE_OPTIONS: Array<{ value: KitchenSize | ''; label: string }> = [
  { value: '', label: '— not set —' },
  { value: 'small', label: 'Small (< 30 covers)' },
  { value: 'medium', label: 'Medium (30–80 covers)' },
  { value: 'large', label: 'Large (80+ covers)' },
];

const STOCK_DAY_OPTIONS: Array<{ value: StockDay | ''; label: string }> = [
  { value: '', label: '— not set —' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const CURRENCY_OPTIONS = [
  { value: 'GBP', label: 'GBP · £' },
  { value: 'EUR', label: 'EUR · €' },
  { value: 'USD', label: 'USD · $' },
];

export function AccountPreferencesPanel({
  initial,
  canEdit,
}: {
  initial: AccountPreferences;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initial.currency);
  const [gpTarget, setGpTarget] = useState(String(initial.gp_target_pct));
  const [kitchenSize, setKitchenSize] = useState<KitchenSize | ''>(
    initial.kitchen_size ?? '',
  );
  const [kitchenLocation, setKitchenLocation] = useState(
    initial.kitchen_location ?? '',
  );
  const [stockDay, setStockDay] = useState<StockDay | ''>(
    initial.stock_day ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (pending || !canEdit) return;
    setError(null);
    const gpNum = Number(gpTarget);
    if (!Number.isFinite(gpNum) || gpNum <= 0 || gpNum > 100) {
      setError('GP target must be a number between 1 and 100.');
      return;
    }
    startTransition(async () => {
      const res = await setAccountPreferences({
        currency,
        gp_target_pct: gpNum,
        kitchen_size: kitchenSize || null,
        kitchen_location: kitchenLocation.trim() || null,
        stock_day: stockDay || null,
      });
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <div className="px-7 py-5 flex flex-col gap-4">
      <p className="font-serif italic text-xs text-muted leading-relaxed">
        Kitchen-wide settings. The chef shell uses these for everything that involves money or GP percentages — recipes, margins, the what-if slider, the cost-spike detector.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={!canEdit || pending}
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold disabled:opacity-50"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="GP target %">
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={gpTarget}
            onChange={(e) => setGpTarget(e.target.value)}
            disabled={!canEdit || pending}
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold disabled:opacity-50"
          />
        </Field>
      </div>

      <Field label="Kitchen size">
        <select
          value={kitchenSize}
          onChange={(e) => setKitchenSize(e.target.value as KitchenSize | '')}
          disabled={!canEdit || pending}
          className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold disabled:opacity-50"
        >
          {KITCHEN_SIZE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Kitchen location">
        <input
          type="text"
          value={kitchenLocation}
          onChange={(e) => setKitchenLocation(e.target.value)}
          disabled={!canEdit || pending}
          placeholder="e.g. Shoreditch, London"
          maxLength={140}
          className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold disabled:opacity-50"
        />
      </Field>

      <Field label="Stock count day">
        <select
          value={stockDay}
          onChange={(e) => setStockDay(e.target.value as StockDay | '')}
          disabled={!canEdit || pending}
          className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold disabled:opacity-50"
        >
          {STOCK_DAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {error && (
        <div className="bg-card border border-l-4 border-l-urgent border-rule px-4 py-3 font-serif italic text-sm text-ink-soft">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="font-serif italic text-xs text-muted">
          {!canEdit
            ? 'Owner-only — ask the account owner to change these.'
            : savedAt
              ? '✓ Saved'
              : 'Changes apply across the whole site.'}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!canEdit || pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'not_owner':
      return 'Only the account owner can change these.';
    case 'invalid_gp_target':
      return 'GP target must be between 1 and 100.';
    case 'invalid_currency':
      return 'Currency must be a 3-letter ISO code.';
    default:
      return code;
  }
}
