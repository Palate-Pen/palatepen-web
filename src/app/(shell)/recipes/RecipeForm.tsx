'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createRecipe,
  updateRecipe,
  archiveRecipe,
  MENU_SECTIONS,
  type MenuSection,
  type RecipeFormInput,
} from './actions';
import { EMPTY_ALLERGENS, type AllergenState } from '@/lib/allergens';
import { AllergenPanel } from '@/components/allergens/AllergenPanel';

export type BankIngredientOption = {
  id: string;
  name: string;
  unit: string | null;
  current_price: number | null;
};

type IngredientRow = {
  key: string; // local-only key for React list
  name: string;
  qty: string;
  unit: string;
  ingredient_id: string | null;
};

const UNIT_OPTIONS = [
  'g',
  'kg',
  'ml',
  'L',
  'each',
  'portions',
  'tbsp',
  'tsp',
  'pinch',
];

function newRow(): IngredientRow {
  return {
    key: cryptoRandomId(),
    name: '',
    qty: '',
    unit: 'g',
    ingredient_id: null,
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function RecipeForm({
  mode,
  recipeId,
  initial,
  bankIngredients,
}: {
  mode: 'create' | 'edit';
  recipeId?: string;
  initial?: {
    name: string;
    menu_section: MenuSection | null;
    serves: number | null;
    portion_per_cover: number | null;
    sell_price: number | null;
    notes: string | null;
    allergens: AllergenState;
    locked: boolean;
    method: string[];
    ingredients: Array<{
      name: string;
      qty: number;
      unit: string;
      ingredient_id: string | null;
    }>;
  };
  bankIngredients: BankIngredientOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [menuSection, setMenuSection] = useState<MenuSection | ''>(
    initial?.menu_section ?? '',
  );
  const [serves, setServes] = useState<string>(
    initial?.serves != null ? String(initial.serves) : '',
  );
  const [portion, setPortion] = useState<string>(
    initial?.portion_per_cover != null
      ? String(initial.portion_per_cover)
      : '',
  );
  const [sellPrice, setSellPrice] = useState<string>(
    initial?.sell_price != null ? String(initial.sell_price) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [allergens, setAllergens] = useState<AllergenState>(
    initial?.allergens ?? { ...EMPTY_ALLERGENS },
  );
  const [locked, setLocked] = useState<boolean>(initial?.locked ?? false);
  const [method, setMethod] = useState<string[]>(
    initial?.method && initial.method.length > 0 ? initial.method : [''],
  );
  const [rows, setRows] = useState<IngredientRow[]>(
    initial && initial.ingredients.length > 0
      ? initial.ingredients.map((i) => ({
          key: cryptoRandomId(),
          name: i.name,
          qty: String(i.qty),
          unit: i.unit,
          ingredient_id: i.ingredient_id,
        }))
      : [newRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [archiving, startArchive] = useTransition();

  // Build a fast lookup: lowercase name → bank ingredient
  const bankByName = new Map<string, BankIngredientOption>(
    bankIngredients.map((b) => [b.name.toLowerCase().trim(), b]),
  );

  function updateRow(key: string, patch: Partial<IngredientRow>) {
    setRows((cur) =>
      cur.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if ('name' in patch) {
          const match = bankByName.get(next.name.toLowerCase().trim());
          next.ingredient_id = match?.id ?? null;
          if (match?.unit && r.unit === 'g') {
            next.unit = match.unit;
          }
        }
        return next;
      }),
    );
  }

  function addRow() {
    setRows((cur) => [...cur, newRow()]);
  }

  function removeRow(key: string) {
    setRows((cur) => (cur.length === 1 ? cur : cur.filter((r) => r.key !== key)));
  }

  function buildInput(): RecipeFormInput | { error: string } {
    const trimmedName = name.trim();
    if (!trimmedName) return { error: 'Give the recipe a name.' };

    const servesNum = serves.trim() === '' ? null : Number(serves);
    if (servesNum != null && (!Number.isFinite(servesNum) || servesNum <= 0)) {
      return { error: 'Serves must be a positive number, or leave blank.' };
    }
    const portionNum = portion.trim() === '' ? null : Number(portion);
    if (portionNum != null && (!Number.isFinite(portionNum) || portionNum <= 0)) {
      return { error: 'Portion per cover must be a positive number.' };
    }
    const priceNum = sellPrice.trim() === '' ? null : Number(sellPrice);
    if (priceNum != null && (!Number.isFinite(priceNum) || priceNum < 0)) {
      return { error: 'Sell price must be a positive number.' };
    }

    const ingredients = rows
      .filter((r) => r.name.trim() !== '' || r.qty.trim() !== '')
      .map((r) => {
        const qtyNum = Number(r.qty);
        return {
          name: r.name.trim(),
          qty: Number.isFinite(qtyNum) ? qtyNum : 0,
          unit: r.unit.trim() || 'each',
          ingredient_id: r.ingredient_id,
        };
      });
    for (const ing of ingredients) {
      if (!ing.name) return { error: 'Every ingredient row needs a name.' };
      if (!Number.isFinite(ing.qty) || ing.qty <= 0) {
        return { error: `Quantity for ${ing.name} must be positive.` };
      }
    }

    return {
      name: trimmedName,
      menu_section: (menuSection || null) as MenuSection | null,
      serves: servesNum,
      portion_per_cover: portionNum,
      sell_price: priceNum,
      notes: notes.trim() || null,
      allergens,
      locked,
      method: method.map((s) => s.trim()).filter((s) => s.length > 0),
      ingredients,
    };
  }

  function save() {
    if (pending) return;
    setError(null);
    const built = buildInput();
    if ('error' in built) {
      setError(built.error);
      return;
    }

    startTransition(async () => {
      const res =
        mode === 'create'
          ? await createRecipe(built)
          : await updateRecipe(recipeId!, built);
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      router.push(`/recipes/${res.id}`);
    });
  }

  function archive() {
    if (!recipeId || archiving) return;
    if (
      !confirm(
        `Archive "${name}"? It'll disappear from Recipes and Margins. You can re-add it later.`,
      )
    ) {
      return;
    }
    startArchive(async () => {
      const res = await archiveRecipe(recipeId);
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      router.push('/recipes');
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <datalist id="bank-ingredient-names">
        {bankIngredients.map((b) => (
          <option key={b.id} value={b.name} />
        ))}
      </datalist>

      <Section title="Dish">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hummus, Lamb Shawarma, Lemon Posset"
            maxLength={120}
            className="w-full px-3 py-2 border border-rule bg-card font-serif font-semibold text-base text-ink focus:outline-none focus:border-gold"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Menu section">
            <select
              value={menuSection}
              onChange={(e) =>
                setMenuSection(e.target.value as MenuSection | '')
              }
              className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
            >
              <option value="">— pick a section —</option>
              {MENU_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sell price (£)">
            <input
              type="number"
              step="0.25"
              min="0"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="e.g. 18.50"
              className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Serves (batch yield)">
            <input
              type="number"
              step="1"
              min="1"
              value={serves}
              onChange={(e) => setServes(e.target.value)}
              placeholder="e.g. 4"
              className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
            />
          </Field>
          <Field label="Portion per cover">
            <input
              type="number"
              step="0.1"
              min="0"
              value={portion}
              onChange={(e) => setPortion(e.target.value)}
              placeholder="e.g. 1"
              className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
            />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Method notes, plating, allergens, anything the chef should know."
            className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink-soft resize-y min-h-[80px] focus:outline-none focus:border-gold"
            maxLength={4000}
          />
        </Field>
      </Section>

      <Section
        title="Method"
        sub="Numbered steps. One step per row — add as many as the recipe needs. Steps render as a numbered list on the detail page and on print-outs."
      >
        <div className="flex flex-col gap-2">
          {method.map((step, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[28px_1fr_28px] gap-2 items-start"
            >
              <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold pt-2">
                {idx + 1}.
              </div>
              <textarea
                value={step}
                onChange={(e) => {
                  const next = [...method];
                  next[idx] = e.target.value;
                  setMethod(next);
                }}
                rows={2}
                placeholder={`Step ${idx + 1}…`}
                disabled={locked}
                className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink-soft resize-y min-h-[44px] focus:outline-none focus:border-gold disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => {
                  if (method.length === 1) {
                    setMethod(['']);
                  } else {
                    setMethod(method.filter((_, i) => i !== idx));
                  }
                }}
                disabled={locked}
                title="Remove this step"
                aria-label="Remove step"
                className="self-start mt-2 w-7 h-7 flex items-center justify-center text-muted-soft hover:text-urgent transition-colors disabled:opacity-30"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMethod([...method, ''])}
          disabled={locked}
          className="self-start mt-3 font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors bg-transparent border-0 p-0 cursor-pointer disabled:opacity-30"
        >
          + Add step
        </button>
      </Section>

      <Section
        title="Allergens"
        sub="UK FIR 14 mandatory allergens. Set the dish-level state — chef-edited, overrides what's inherited from Bank ingredients."
      >
        <AllergenPanel
          value={allergens}
          onChange={setAllergens}
          readOnly={locked}
        />
      </Section>

      <Section
        title="Ingredients"
        sub="Type a name. If it matches an ingredient in The Bank, the cost flows live. Anything else is free-text — useful for new ingredients you'll bank later."
      >
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <IngredientRowEditor
              key={r.key}
              row={r}
              canRemove={rows.length > 1}
              matchedBankName={
                r.ingredient_id != null
                  ? bankIngredients.find((b) => b.id === r.ingredient_id)?.name ?? null
                  : null
              }
              onChange={(patch) => updateRow(r.key, patch)}
              onRemove={() => removeRow(r.key)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="self-start mt-3 font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors bg-transparent border-0 p-0 cursor-pointer"
        >
          + Add ingredient
        </button>
      </Section>

      {error && (
        <div className="bg-card border border-l-4 border-l-urgent border-rule px-5 py-4 font-serif italic text-sm text-ink-soft">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={recipeId ? `/recipes/${recipeId}` : '/recipes'}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
          >
            ← Cancel
          </Link>
          {mode === 'edit' && recipeId && (
            <button
              type="button"
              onClick={archive}
              disabled={archiving || pending}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-urgent hover:text-urgent/70 transition-colors bg-transparent border-0 p-0 cursor-pointer disabled:opacity-40"
            >
              {archiving ? 'Archiving…' : 'Archive recipe'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setLocked((v) => !v)}
            disabled={pending || archiving}
            className={
              'font-display font-semibold text-xs tracking-[0.18em] uppercase transition-colors bg-transparent border-0 p-0 cursor-pointer disabled:opacity-40 ' +
              (locked ? 'text-gold hover:text-gold-dark' : 'text-muted hover:text-gold')
            }
            title={
              locked
                ? 'Unlock to allow edits'
                : 'Lock to prevent accidental edits'
            }
          >
            {locked ? '🔒 Locked' : 'Lock recipe'}
          </button>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending || archiving}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create recipe'
              : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function IngredientRowEditor({
  row,
  canRemove,
  matchedBankName,
  onChange,
  onRemove,
}: {
  row: IngredientRow;
  canRemove: boolean;
  matchedBankName: string | null;
  onChange: (patch: Partial<IngredientRow>) => void;
  onRemove: () => void;
}) {
  const linked = row.ingredient_id != null;
  return (
    <div className="grid grid-cols-[1fr_90px_100px_30px] gap-2 items-start">
      <div>
        <input
          type="text"
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          list="bank-ingredient-names"
          placeholder="Ingredient name"
          className={
            'w-full px-3 py-2 border bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold ' +
            (linked ? 'border-healthy/40' : 'border-rule')
          }
        />
        <div className="font-serif italic text-[11px] mt-0.5 min-h-[14px] truncate">
          {linked ? (
            <span className="text-healthy">
              ● linked to The Bank ·{' '}
              {matchedBankName && matchedBankName !== row.name
                ? `as ${matchedBankName}`
                : 'live cost'}
            </span>
          ) : row.name.trim() ? (
            <span className="text-muted-soft">○ free-text · no live cost</span>
          ) : (
            <span className="text-muted-soft">&nbsp;</span>
          )}
        </div>
      </div>
      <input
        type="number"
        step="0.001"
        min="0"
        value={row.qty}
        onChange={(e) => onChange({ qty: e.target.value })}
        placeholder="qty"
        className="w-full px-2 py-2 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
      />
      <select
        value={row.unit}
        onChange={(e) => onChange({ unit: e.target.value })}
        className="w-full px-2 py-2 border border-rule bg-card font-sans text-sm text-ink focus:outline-none focus:border-gold"
      >
        {UNIT_OPTIONS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        title={canRemove ? 'Remove this ingredient' : 'At least one row required'}
        className="self-center w-7 h-7 flex items-center justify-center text-muted-soft hover:text-urgent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Remove ingredient"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-rule px-7 py-6 flex flex-col gap-4">
      <div>
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold">
          {title}
        </div>
        {sub && (
          <div className="font-serif italic text-sm text-muted mt-1.5">
            {sub}
          </div>
        )}
      </div>
      {children}
    </section>
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
  if (code.startsWith('ingredient_') && code.endsWith('_name_required')) {
    return 'Every ingredient row needs a name. Remove the blank row or fill it in.';
  }
  if (code.startsWith('ingredient_') && code.endsWith('_invalid_qty')) {
    return 'Every ingredient row needs a quantity above zero.';
  }
  if (code.startsWith('ingredient_') && code.endsWith('_unit_required')) {
    return 'Every ingredient row needs a unit.';
  }
  switch (code) {
    case 'name_required':
      return 'Give the recipe a name.';
    case 'invalid_serves':
      return 'Serves must be a positive number.';
    case 'invalid_portion':
      return 'Portion per cover must be a positive number.';
    case 'invalid_sell_price':
      return 'Sell price must be a positive number.';
    case 'invalid_menu_section':
      return 'Pick a valid menu section.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    case 'insert_failed':
      return "The system couldn't save that. Try again.";
    default:
      return code;
  }
}
