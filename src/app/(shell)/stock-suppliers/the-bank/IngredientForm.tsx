'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createIngredient, updateIngredient } from './actions';
import { EMPTY_ALLERGENS, type AllergenState } from '@/lib/allergens';
import { AllergenPanel } from '@/components/allergens/AllergenPanel';
import { type NutritionState } from '@/lib/nutrition';
import { NutritionPanel } from '@/components/nutrition/NutritionPanel';

export type SupplierOption = {
  id: string;
  name: string;
};

const COMMON_UNITS = [
  'g',
  'kg',
  'ml',
  'L',
  'each',
  'case',
  'bunch',
  'punnet',
  'box',
];

const COMMON_CATEGORIES = [
  'Meat',
  'Fish',
  'Dairy',
  'Produce',
  'Pantry',
  'Spice',
  'Bakery',
  'Drinks',
];

export function IngredientForm({
  mode,
  ingredientId,
  initial,
  suppliers,
}: {
  mode: 'create' | 'edit';
  ingredientId?: string;
  initial?: {
    name: string;
    supplier_id: string | null;
    spec: string | null;
    unit: string | null;
    category: string | null;
    current_price: number | null;
    allergens: AllergenState;
    nutrition: NutritionState;
  };
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [supplierId, setSupplierId] = useState<string>(
    initial?.supplier_id ?? '',
  );
  const [spec, setSpec] = useState(initial?.spec ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? 'kg');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [currentPrice, setCurrentPrice] = useState<string>(
    initial?.current_price != null ? String(initial.current_price) : '',
  );
  const [allergens, setAllergens] = useState<AllergenState>(
    initial?.allergens ?? { ...EMPTY_ALLERGENS },
  );
  const [nutrition, setNutrition] = useState<NutritionState>(
    initial?.nutrition ?? {},
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (pending) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Give the ingredient a name.');
      return;
    }

    const priceNum =
      currentPrice.trim() === '' ? null : Number(currentPrice);
    if (priceNum != null && (!Number.isFinite(priceNum) || priceNum < 0)) {
      setError('Price must be a positive number, or leave blank.');
      return;
    }

    startTransition(async () => {
      const res =
        mode === 'create'
          ? await createIngredient({
              name: trimmedName,
              supplier_id: supplierId || null,
              spec: spec.trim() || null,
              unit: unit.trim() || null,
              category: category.trim() || null,
              current_price: priceNum,
              allergens,
              nutrition,
            })
          : await updateIngredient(ingredientId!, {
              name: trimmedName,
              supplier_id: supplierId || null,
              spec: spec.trim() || null,
              unit: unit.trim() || null,
              category: category.trim() || null,
              allergens,
              nutrition,
            });
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      router.push(`/stock-suppliers/the-bank/${res.id}`);
    });
  }

  return (
    <div className="bg-card border border-rule px-7 py-6 flex flex-col gap-4">
      <Field label="Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lamb shoulder, Tahini, Lemon"
          maxLength={120}
          className="w-full px-3 py-2 border border-rule bg-card font-serif font-semibold text-base text-ink focus:outline-none focus:border-gold"
          autoFocus
        />
      </Field>

      <Field label="Spec (optional)">
        <input
          type="text"
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          placeholder="e.g. boneless · 3kg average · jar 500g"
          maxLength={200}
          className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink-soft focus:outline-none focus:border-gold"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Supplier">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          >
            <option value="">— no supplier set —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Category">
          <input
            type="text"
            list="bank-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Meat, Fish, Dairy"
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
          <datalist id="bank-category-options">
            {COMMON_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Unit">
          <input
            type="text"
            list="bank-unit-options"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. kg, g, L, each"
            maxLength={20}
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
          <datalist id="bank-unit-options">
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>

        {mode === 'create' && (
          <Field label="Opening price (£, optional)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="leave blank to set later"
              className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
            />
          </Field>
        )}
      </div>

      <div className="pt-2 border-t border-rule-soft">
        <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
          Allergens
        </div>
        <p className="font-serif italic text-xs text-muted mb-3">
          Set the FIR allergens at the Bank level. Every recipe that links to this ingredient inherits them automatically.
        </p>
        <AllergenPanel value={allergens} onChange={setAllergens} />
      </div>

      <div className="pt-2 border-t border-rule-soft">
        <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
          Nutrition (per 100g / 100ml)
        </div>
        <NutritionPanel value={nutrition} onChange={setNutrition} />
      </div>

      {error && (
        <div className="bg-card border border-l-4 border-l-urgent border-rule px-4 py-3 font-serif italic text-sm text-ink-soft">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
        <Link
          href={
            ingredientId
              ? `/stock-suppliers/the-bank/${ingredientId}`
              : '/stock-suppliers/the-bank'
          }
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Cancel
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending
            ? mode === 'create'
              ? 'Adding…'
              : 'Saving…'
            : mode === 'create'
              ? 'Add to The Bank'
              : 'Save changes'}
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
      <span className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'name_required':
      return 'Give the ingredient a name.';
    case 'invalid_price':
      return 'Price must be a positive number.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    case 'insert_failed':
      return "The system couldn't save that. Try again.";
    default:
      return code;
  }
}
