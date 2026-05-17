import Link from 'next/link';
import { ALLERGENS } from '@/lib/allergens';
import type { AllergenMatrix } from '@/lib/oversight';

/**
 * Dish × 14-allergen grid. Server component — receives the matrix
 * already computed by getAllergenMatrix and renders the table.
 *
 * Cell legend (matches the brand v8 tones):
 *   ● filled gold dot = Contains
 *   ○ ring outline   = May contain
 *   blank            = None / not declared
 *
 * Rows group by `category` (menu section) with a sub-head between
 * groups. Recipes without a category appear under "Unsorted".
 *
 * Designed to print cleanly on landscape A4 — the column heads carry
 * the FSA short codes (GL CR EG FI PE SO MI NU CE MU SE SU LU MO),
 * full names in the legend below.
 */
export function AllergenMatrix({ matrix }: { matrix: AllergenMatrix }) {
  if (matrix.rows.length === 0) {
    return (
      <div className="bg-card border border-rule px-7 py-8 text-center">
        <p className="font-serif italic text-muted">
          No recipes on file yet — once you start adding dishes the matrix
          fills here automatically.
        </p>
      </div>
    );
  }

  // Group by category, preserving insertion order from the query (which
  // ordered category then name).
  const groups = new Map<string, typeof matrix.rows>();
  for (const r of matrix.rows) {
    const key = r.category ?? 'Unsorted';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  // Column-total tone — flag any allergen present on >50% of the menu
  // as worth a chef glance (cross-contact risk).
  const menuCount = matrix.rows.filter((r) => r.on_menu).length || matrix.rows.length;

  return (
    <div className="bg-card border border-rule overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-paper-warm border-b border-rule">
            <th className="text-left font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-muted px-4 py-3 w-[260px] sticky left-0 bg-paper-warm">
              Dish
            </th>
            {ALLERGENS.map((a) => (
              <th
                key={a.key}
                title={a.label}
                className="font-display font-semibold text-[10px] tracking-[0.15em] uppercase text-muted px-1.5 py-3 w-[38px]"
              >
                {a.short}
              </th>
            ))}
            <th className="font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-muted px-3 py-3 w-[80px] text-right">
              Sub-types
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from(groups.entries()).map(([category, items]) => (
            <CategoryGroup
              key={category}
              category={category}
              items={items}
            />
          ))}
          <tr className="border-t-2 border-ink/20 bg-paper-warm">
            <td className="px-4 py-2.5 font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-ink-soft sticky left-0 bg-paper-warm">
              On menu / declared
            </td>
            {ALLERGENS.map((a) => {
              const t = matrix.totals[a.key] ?? { contains: 0, may: 0 };
              const heavy = t.contains > menuCount / 2;
              return (
                <td
                  key={a.key}
                  className={
                    'px-1.5 py-2.5 text-center font-mono text-[11px] ' +
                    (heavy ? 'text-attention font-medium' : 'text-muted')
                  }
                >
                  {t.contains}
                  {t.may > 0 && (
                    <span className="text-muted-soft text-[9px]">
                      {' '}/{t.may}
                    </span>
                  )}
                </td>
              );
            })}
            <td className="px-3 py-2.5"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CategoryGroup({
  category,
  items,
}: {
  category: string;
  items: AllergenMatrix['rows'];
}) {
  return (
    <>
      <tr className="bg-paper-warm/50">
        <td
          colSpan={16}
          className="px-4 pt-4 pb-1.5 font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold sticky left-0 bg-paper-warm/50"
        >
          {category}{' '}
          <span className="ml-2 text-muted-soft normal-case tracking-normal font-serif italic text-xs">
            {items.length} dish{items.length === 1 ? '' : 'es'}
          </span>
        </td>
      </tr>
      {items.map((r) => (
        <DishRow key={r.id} row={r} />
      ))}
    </>
  );
}

function DishRow({ row }: { row: AllergenMatrix['rows'][number] }) {
  const subTypeIssue = row.has_nuts_no_subtype || row.has_gluten_no_subtype;
  return (
    <tr className="border-b border-rule-soft hover:bg-paper-warm/40 transition-colors">
      <td className="px-4 py-2 sticky left-0 bg-card hover:bg-paper-warm/40 transition-colors">
        <Link
          href={`/recipes/${row.id}/edit`}
          className="block group"
        >
          <div className="font-serif text-sm text-ink leading-tight group-hover:text-gold transition-colors">
            {row.name}
          </div>
          <div className="font-sans text-[10px] text-muted-soft mt-0.5 uppercase tracking-wider">
            {row.on_menu ? 'On menu' : 'Off menu'}
            {row.dish_type === 'bar' && ' · Bar'}
          </div>
        </Link>
      </td>
      {ALLERGENS.map((a) => {
        const state = row.states[a.key] ?? 'none';
        return (
          <td
            key={a.key}
            className="px-1.5 py-2 text-center"
            aria-label={`${row.name}: ${a.label} — ${state}`}
          >
            <AllergenCell state={state} />
          </td>
        );
      })}
      <td className="px-3 py-2 text-right">
        {subTypeIssue && (
          <span
            title={
              row.has_nuts_no_subtype && row.has_gluten_no_subtype
                ? 'Nuts + cereals: sub-types missing'
                : row.has_nuts_no_subtype
                  ? 'Nut sub-types missing'
                  : 'Cereal sub-types missing'
            }
            className="inline-flex font-display font-semibold text-[9px] tracking-[0.2em] uppercase text-attention bg-attention/10 border border-attention/40 px-1.5 py-0.5"
          >
            !
          </span>
        )}
      </td>
    </tr>
  );
}

function AllergenCell({ state }: { state: 'contains' | 'may' | 'none' }) {
  if (state === 'contains') {
    return (
      <span
        className="inline-block w-3 h-3 rounded-full bg-gold border border-gold"
        aria-label="contains"
      />
    );
  }
  if (state === 'may') {
    return (
      <span
        className="inline-block w-3 h-3 rounded-full border border-gold"
        aria-label="may contain"
      />
    );
  }
  return <span className="inline-block w-3 h-3" aria-hidden />;
}
