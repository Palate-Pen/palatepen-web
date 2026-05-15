'use client';

import { useState, useTransition } from 'react';
import {
  updatePlanItem,
  deletePlanItem,
} from '@/lib/menu-plan-actions';
import {
  ACTION_LABEL,
  type MenuPlanAction,
  type MenuPlanItem,
} from '@/lib/menu-plan-shared';

const ACTIONS: MenuPlanAction[] = ['keep', 'add', 'revise', 'remove'];

const ACTION_TONE: Record<MenuPlanAction, string> = {
  keep: 'bg-paper-warm text-ink border-rule',
  add: 'bg-healthy/10 text-healthy border-healthy/40',
  revise: 'bg-attention/10 text-attention border-attention/40',
  remove: 'bg-urgent/10 text-urgent border-urgent/40',
};

export function PlanItemRow({
  item,
  revalidatePathname,
}: {
  item: MenuPlanItem;
  revalidatePathname: string;
}) {
  const [pending, start] = useTransition();
  const [rating, setRating] = useState<number | null>(item.popularity_rating);
  const [action, setAction] = useState<MenuPlanAction>(item.action);
  const [notes, setNotes] = useState<string>(item.notes ?? '');

  function applyRating(next: number) {
    const target = rating === next ? null : next;
    setRating(target);
    start(async () => {
      await updatePlanItem({
        itemId: item.id,
        popularityRating: target,
        revalidatePathname,
      });
    });
  }

  function applyAction(next: MenuPlanAction) {
    setAction(next);
    start(async () => {
      await updatePlanItem({
        itemId: item.id,
        action: next,
        revalidatePathname,
      });
    });
  }

  function saveNotes() {
    if ((item.notes ?? '') === notes) return;
    start(async () => {
      await updatePlanItem({
        itemId: item.id,
        notes,
        revalidatePathname,
      });
    });
  }

  function remove() {
    start(async () => {
      await deletePlanItem(item.id, revalidatePathname);
    });
  }

  return (
    <div className="border border-rule bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div className="flex-1 min-w-[200px]">
          <div className="font-serif font-semibold text-base text-ink">
            {item.display_name}
            {!item.recipe && item.placeholder_name && (
              <span className="ml-2 font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted-soft">
                placeholder
              </span>
            )}
          </div>
          {item.recipe && (
            <div className="font-serif text-xs text-muted mt-0.5">
              {item.recipe.menu_section ?? 'unsectioned'}
              {item.gp_pct != null && ` · ${item.gp_pct.toFixed(0)}% GP`}
              {item.recipe.sell_price != null && ` · £${item.recipe.sell_price.toFixed(2)}`}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {ACTIONS.map((a) => {
            const active = action === a;
            return (
              <button
                key={a}
                type="button"
                disabled={pending}
                onClick={() => applyAction(a)}
                className={
                  'font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 border transition-colors disabled:opacity-50 ' +
                  (active
                    ? ACTION_TONE[a]
                    : 'bg-transparent text-muted border-rule hover:border-gold cursor-pointer')
                }
              >
                {ACTION_LABEL[a]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
            Popularity
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = rating != null && n <= rating;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={pending}
                  onClick={() => applyRating(n)}
                  className={
                    'text-lg leading-none transition-colors disabled:opacity-50 ' +
                    (filled ? 'text-gold' : 'text-muted-soft hover:text-gold cursor-pointer')
                  }
                  aria-label={`Rate ${n}`}
                >
                  ★
                </button>
              );
            })}
          </div>
          {rating != null && (
            <span className="font-serif text-xs text-muted">
              {rating}/5
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="ml-auto font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted hover:text-urgent transition-colors disabled:opacity-50"
        >
          Drop
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Notes — supplier change, photo needed, prep concerns…"
        rows={1}
        className="mt-3 w-full font-serif text-sm text-ink bg-transparent border border-rule px-3 py-2 focus:border-gold focus:outline-none resize-y placeholder:text-muted-soft placeholder:italic"
      />
    </div>
  );
}
