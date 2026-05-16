'use client';

import { useState, useTransition } from 'react';
import { addPlanItem } from '@/lib/menu-plan-actions';
import {
  ACTION_LABEL,
  type MenuPlanAction,
} from '@/lib/menu-plan-shared';

export type RecipeOption = {
  id: string;
  name: string;
  menu_section: string | null;
};

const ACTIONS: MenuPlanAction[] = ['keep', 'add', 'revise', 'remove'];

export function AddPlanItemDialog({
  planId,
  candidates,
  revalidatePathname,
}: {
  planId: string;
  candidates: RecipeOption[];
  revalidatePathname: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'existing' | 'placeholder'>('existing');
  const [search, setSearch] = useState('');
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [placeholderName, setPlaceholderName] = useState('');
  const [action, setAction] = useState<MenuPlanAction>('add');
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setMode('existing');
    setSearch('');
    setRecipeId(null);
    setPlaceholderName('');
    setAction('add');
    setRating(null);
    setError(null);
  }

  function close() {
    reset();
    setOpen(false);
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await addPlanItem({
        planId,
        recipeId: mode === 'existing' ? recipeId : null,
        placeholderName: mode === 'placeholder' ? placeholderName : null,
        action,
        popularityRating: rating,
        notes: null,
        revalidatePathname,
      });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      close();
    });
  }

  const q = search.trim().toLowerCase();
  const filtered =
    q.length === 0
      ? candidates.slice(0, 25)
      : candidates
          .filter((c) => c.name.toLowerCase().includes(q))
          .slice(0, 25);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
      >
        + Add to plan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            className="bg-card border border-rule max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-rule">
              <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-gold mb-1">
                Plan a dish
              </div>
              <h3 className="font-serif text-2xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
                Add to <em className="text-gold not-italic font-semibold italic">next menu</em>
              </h3>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('existing')}
                  className={
                    'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border ' +
                    (mode === 'existing'
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-transparent text-muted border-rule hover:border-gold')
                  }
                >
                  From recipes
                </button>
                <button
                  type="button"
                  onClick={() => setMode('placeholder')}
                  className={
                    'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border ' +
                    (mode === 'placeholder'
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-transparent text-muted border-rule hover:border-gold')
                  }
                >
                  Placeholder
                </button>
              </div>

              {mode === 'existing' ? (
                <div>
                  <input
                    type="text"
                    placeholder="Search recipes by name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full font-serif text-base text-ink bg-transparent border border-rule px-3 py-2 focus:border-gold focus:outline-none mb-3"
                    autoFocus
                  />
                  <div className="max-h-64 overflow-y-auto border border-rule bg-paper-warm/30">
                    {filtered.length === 0 ? (
                      <p className="font-serif italic text-sm text-muted px-3 py-4 text-center">
                        No recipes match. Try the placeholder option for a TBD dish.
                      </p>
                    ) : (
                      filtered.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRecipeId(r.id)}
                          className={
                            'w-full text-left px-4 py-2.5 border-b border-rule-soft last:border-b-0 transition-colors ' +
                            (recipeId === r.id
                              ? 'bg-gold-bg'
                              : 'hover:bg-card-warm')
                          }
                        >
                          <div className="font-serif text-sm text-ink">
                            {r.name}
                          </div>
                          {r.menu_section && (
                            <div className="font-serif italic text-xs text-muted mt-0.5">
                              {r.menu_section}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-2 block">
                    Placeholder dish name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. summer beetroot tart — TBD"
                    value={placeholderName}
                    onChange={(e) => setPlaceholderName(e.target.value)}
                    className="w-full font-serif text-base text-ink bg-transparent border border-rule px-3 py-2 focus:border-gold focus:outline-none"
                    autoFocus
                  />
                  <p className="font-serif italic text-xs text-muted mt-2">
                    Use this when the dish isn't built yet. You can replace the placeholder with a real recipe later.
                  </p>
                </div>
              )}

              <div>
                <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-2 block">
                  Action
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIONS.map((a) => {
                    const active = action === a;
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAction(a)}
                        className={
                          'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors ' +
                          (active
                            ? 'bg-ink text-paper border-ink'
                            : 'bg-transparent text-muted border-rule hover:border-gold')
                        }
                      >
                        {ACTION_LABEL[a]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-2 block">
                  Popularity (optional now, rate later)
                </label>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = rating != null && n <= rating;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(rating === n ? null : n)}
                        className={
                          'text-xl leading-none transition-colors ' +
                          (filled ? 'text-gold' : 'text-muted-soft hover:text-gold')
                        }
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="font-serif text-sm text-urgent">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-rule flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-muted border border-rule hover:border-gold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={
                  pending ||
                  (mode === 'existing' && !recipeId) ||
                  (mode === 'placeholder' && !placeholderName.trim())
                }
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-50"
              >
                {pending ? 'Adding…' : 'Add to plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
