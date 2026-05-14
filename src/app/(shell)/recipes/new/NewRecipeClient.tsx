'use client';

import { useState, useTransition } from 'react';
import { RecipeForm, type BankIngredientOption } from '../RecipeForm';
import { EMPTY_ALLERGENS, type AllergenState } from '@/lib/allergens';
import type { MenuSection } from '../actions';

type ExtractedRecipe = {
  title?: string;
  description?: string;
  servings?: string;
  prep_time?: string;
  cook_time?: string;
  ingredients?: Array<{ name?: string; qty?: number; unit?: string }>;
  method?: string[];
  chef_notes?: string;
  menu_section?: string;
};

const MENU_SECTION_VALUES: MenuSection[] = [
  'starters',
  'mains',
  'grill',
  'sides',
  'desserts',
  'drinks',
];

function normaliseMenuSection(
  v: string | undefined | null,
): MenuSection | null {
  if (!v) return null;
  const lc = v.toLowerCase().trim();
  return MENU_SECTION_VALUES.includes(lc as MenuSection)
    ? (lc as MenuSection)
    : null;
}

function parseServings(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildInitial(
  bank: BankIngredientOption[],
  extracted: ExtractedRecipe | null,
): {
  name: string;
  menu_section: MenuSection | null;
  serves: number | null;
  portion_per_cover: number | null;
  sell_price: number | null;
  notes: string | null;
  allergens: AllergenState;
  locked: boolean;
  ingredients: Array<{
    name: string;
    qty: number;
    unit: string;
    ingredient_id: string | null;
  }>;
} | undefined {
  if (!extracted) return undefined;
  const bankByName = new Map(
    bank.map((b) => [b.name.toLowerCase().trim(), b.id]),
  );
  return {
    name: extracted.title ?? '',
    menu_section: normaliseMenuSection(extracted.menu_section),
    serves: parseServings(extracted.servings),
    portion_per_cover: 1,
    sell_price: null,
    notes: composeNotes(extracted),
    allergens: { ...EMPTY_ALLERGENS },
    locked: false,
    ingredients: (extracted.ingredients ?? [])
      .filter((i) => i.name && i.name.trim() !== '')
      .map((i) => {
        const name = (i.name ?? '').trim();
        const id = bankByName.get(name.toLowerCase()) ?? null;
        return {
          name,
          qty: Number.isFinite(i.qty) && (i.qty ?? 0) > 0 ? (i.qty as number) : 0,
          unit: (i.unit ?? 'each').trim() || 'each',
          ingredient_id: id,
        };
      }),
  };
}

function composeNotes(r: ExtractedRecipe): string {
  const parts: string[] = [];
  if (r.description) parts.push(r.description.trim());
  if (r.prep_time || r.cook_time) {
    const t = [r.prep_time && `prep ${r.prep_time}`, r.cook_time && `cook ${r.cook_time}`]
      .filter(Boolean)
      .join(' · ');
    if (t) parts.push(t);
  }
  if (r.method && r.method.length > 0) {
    parts.push('Method:');
    r.method.forEach((s, i) => parts.push(`${i + 1}. ${s.trim()}`));
  }
  if (r.chef_notes) {
    parts.push('');
    parts.push(`Chef notes: ${r.chef_notes.trim()}`);
  }
  return parts.join('\n').trim();
}

export function NewRecipeClient({
  bankIngredients,
}: {
  bankIngredients: BankIngredientOption[];
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [prefill, setPrefill] = useState<ExtractedRecipe | null>(null);
  // Key on prefill identity so RecipeForm remounts when a new import lands.
  const [renderKey, setRenderKey] = useState(0);

  function submit() {
    if (pending) return;
    setError(null);
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      setError('Use a full http(s) URL.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/palatable/import-recipe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          extracted?: ExtractedRecipe;
          source_kind?: string;
          error?: string;
          detail?: string;
        };
        if (!json.ok || !json.extracted) {
          setError(
            humaniseError(json.error ?? 'unknown_error', json.detail),
          );
          return;
        }
        setPrefill(json.extracted ?? null);
        setRenderKey((k) => k + 1);
        setUrl('');
      } catch (e) {
        setError(`Network error: ${(e as Error).message ?? 'unknown'}`);
      }
    });
  }

  const initial = buildInitial(bankIngredients, prefill);

  return (
    <>
      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-6 mb-6">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-2">
          Import from a URL
        </div>
        <p className="font-serif italic text-sm text-muted mb-4 leading-relaxed">
          Paste any recipe page — Bon Appétit, NYT Cooking, BBC Good Food, your favourite blog. Haiku reads it and pre-fills the form below. Review every line before saving.
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="https://..."
            className="flex-1 min-w-[260px] px-3 py-2 border border-rule bg-card font-mono text-sm text-ink focus:outline-none focus:border-gold"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending || !url.trim()}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {pending ? 'Reading…' : 'Import'}
          </button>
        </div>
        {error && (
          <div className="mt-3 font-serif italic text-sm text-urgent">{error}</div>
        )}
        {pending && (
          <div className="mt-3 font-serif italic text-sm text-muted">
            Fetching the page and reading the recipe — usually 5–10 seconds.
          </div>
        )}
        {prefill && !pending && !error && (
          <div className="mt-3 font-serif italic text-sm text-healthy">
            ✓ Imported. Review the form below, then hit Create recipe.
          </div>
        )}
      </div>

      <RecipeForm
        key={renderKey}
        mode="create"
        initial={initial}
        bankIngredients={bankIngredients}
      />
    </>
  );
}

function humaniseError(code: string, detail?: string): string {
  switch (code) {
    case 'invalid_url':
      return detail ?? 'That URL doesn’t look right.';
    case 'scrape_failed':
      return detail ?? 'Couldn’t load that page.';
    case 'no_recipe_found':
      return detail ?? 'That page doesn’t have a recognisable recipe.';
    case 'missing_anthropic_key':
      return 'AI is currently unavailable. Add the recipe by hand for now.';
    case 'unauthorized':
      return 'Sign back in and try again.';
    case 'extraction_failed':
      return 'Haiku had trouble reading that page. Try a different source.';
    case 'parse_failed':
      return 'Haiku returned something we couldn’t parse. Try again or add by hand.';
    case 'malformed_json':
      return 'Haiku returned malformed JSON. Try again.';
    default:
      return detail ?? code;
  }
}
