import { getRecipes, type Recipe } from '@/lib/recipes';
import { BAR_DISH_TYPES, FOOD_DISH_TYPES } from '@/lib/bar';
import {
  getActiveMenuPlan,
  computePlanKpis,
  planLookingAhead,
  ACTION_LABEL,
  type MenuPlanSurface,
  type MenuPlanAction,
} from '@/lib/menu-plan';
import { KpiCard } from '@/components/shell/KpiCard';
import { MenuEngineeringMatrix } from './MenuEngineeringMatrix';
import { PlanItemRow } from './PlanItemRow';
import { AddPlanItemDialog, type RecipeOption } from './AddPlanItemDialog';
import { PlanHeaderEditor } from './PlanHeaderEditor';
import { CreatePlanButton } from './CreatePlanButton';

const ACTION_ORDER: MenuPlanAction[] = ['keep', 'add', 'revise', 'remove'];

/**
 * Server component. Loads the active plan (or shows the empty state),
 * computes KPIs + matrix + Looking Ahead, and renders the planner UI.
 *
 * Hosted at chef Menus (?mode=planning), bar Menus (?mode=planning),
 * and manager Menu Builder (Planning sub-tab) — the same component,
 * fed different `surface` + `revalidatePathname` props.
 */
export async function PlannerView({
  siteId,
  surface,
  revalidatePathname,
}: {
  siteId: string;
  surface: MenuPlanSurface;
  revalidatePathname: string;
}) {
  const plan = await getActiveMenuPlan(siteId, surface);

  if (!plan) {
    return <PlannerEmpty siteId={siteId} surface={surface} />;
  }

  const dishTypes = surface === 'bar' ? BAR_DISH_TYPES : FOOD_DISH_TYPES;
  const candidatesAll = await getRecipes(siteId, { dishTypes });
  const usedIds = new Set(
    plan.items
      .map((i) => i.recipe_id)
      .filter((id): id is string => !!id),
  );
  const candidates: RecipeOption[] = candidatesAll
    .filter((r) => !usedIds.has(r.id))
    .map((r) => ({ id: r.id, name: r.name, menu_section: r.menu_section }));

  const kpis = computePlanKpis(plan);
  const lookingAhead = planLookingAhead(plan);

  const byAction = new Map<MenuPlanAction, typeof plan.items>();
  for (const a of ACTION_ORDER) byAction.set(a, []);
  for (const item of plan.items) {
    byAction.get(item.action)!.push(item);
  }

  return (
    <div>
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <PlanHeaderEditor
          planId={plan.id}
          initialName={plan.name}
          initialTargetLaunch={plan.target_launch}
          revalidatePathname={revalidatePathname}
        />
        <AddPlanItemDialog
          planId={plan.id}
          candidates={candidates}
          revalidatePathname={revalidatePathname}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Items On The Plan"
          value={String(kpis.total_items)}
          sub={
            kpis.net_change > 0
              ? `${kpis.net_change} more than today`
              : kpis.net_change < 0
                ? `${Math.abs(kpis.net_change)} fewer than today`
                : 'same size'
          }
        />
        <KpiCard
          label="Planned GP"
          value={kpis.planned_gp_pct == null ? '—' : `${kpis.planned_gp_pct.toFixed(0)}%`}
          sub={
            kpis.current_menu_gp_pct == null
              ? 'set sell prices to read GP'
              : `today ${kpis.current_menu_gp_pct.toFixed(0)}%`
          }
        />
        <KpiCard
          label="Target Launch"
          value={
            kpis.target_launch_days == null
              ? '—'
              : kpis.target_launch_days < 0
                ? `${Math.abs(kpis.target_launch_days)}d ago`
                : `${kpis.target_launch_days}d`
          }
          sub={plan.target_launch ?? 'no date set'}
        />
        <KpiCard
          label="Status"
          value={plan.status === 'draft' ? 'Draft' : plan.status === 'finalised' ? 'Finalised' : 'Archived'}
          sub={
            plan.finalised_at
              ? `finalised ${new Date(plan.finalised_at).toLocaleDateString('en-GB')}`
              : 'work in progress'
          }
        />
      </div>

      <div className="mb-10">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
          Menu Engineering
        </div>
        <h2 className="font-display text-xl font-semibold uppercase tracking-[0.04em] text-ink mb-2">
          Where each dish sits
        </h2>
        <p className="font-serif italic text-sm text-muted mb-5 leading-relaxed">
          Popularity (your 1–5 rating) on one axis, GP% on the other. Stars carry the menu; plowhorses sell but need their margin fixed; puzzles need repositioning; dogs need to go.
        </p>
        <MenuEngineeringMatrix items={plan.items} />
      </div>

      <div className="mb-10">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
          The Plan
        </div>
        <h2 className="font-display text-xl font-semibold uppercase tracking-[0.04em] text-ink mb-5">
          Every dish, every decision
        </h2>
        {plan.items.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-16 text-center">
            <div className="font-serif text-2xl text-ink mb-2">
              Plan's empty.
            </div>
            <p className="font-serif italic text-muted">
              Pull in dishes from your existing recipes to start mapping the next menu.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {ACTION_ORDER.map((action) => {
              const items = byAction.get(action) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={action}>
                  <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted mb-2">
                    {ACTION_LABEL[action]} · {items.length}
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <PlanItemRow
                        key={item.id}
                        item={item}
                        revalidatePathname={revalidatePathname}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
          Looking Ahead
        </div>
        <h2 className="font-display text-xl font-semibold uppercase tracking-[0.04em] text-ink mb-5">
          What sits on the path to launch
        </h2>
        {lookingAhead.length === 0 ? (
          <p className="font-serif italic text-muted">
            Nothing flagging right now. Add ratings and dishes to surface forward risks.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lookingAhead.map((card) => (
              <div
                key={card.id}
                className={
                  'border bg-card px-5 py-4 ' +
                  (card.tone === 'urgent'
                    ? 'border-l-4 border-l-urgent border-rule'
                    : card.tone === 'attention'
                      ? 'border-l-4 border-l-attention border-rule'
                      : card.tone === 'healthy'
                        ? 'border-l-4 border-l-healthy border-rule'
                        : 'border-rule')
                }
              >
                <div
                  className={
                    'font-display font-semibold text-xs tracking-[0.08em] uppercase mb-1.5 ' +
                    (card.tone === 'urgent'
                      ? 'text-urgent'
                      : card.tone === 'attention'
                        ? 'text-attention'
                        : card.tone === 'healthy'
                          ? 'text-healthy'
                          : 'text-muted')
                  }
                >
                  {card.headline}
                </div>
                <p className="font-serif text-sm text-ink-soft leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlannerEmpty({
  siteId,
  surface,
}: {
  siteId: string;
  surface: MenuPlanSurface;
}) {
  const surfaceLabel = surface === 'bar' ? 'drinks list' : 'menu';
  return (
    <div className="bg-card border border-rule px-10 py-16 text-center max-w-2xl mx-auto">
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
        Forward planning
      </div>
      <h2 className="font-display text-3xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        Plan the <em className="text-gold not-italic font-semibold italic">next {surfaceLabel}</em>
      </h2>
      <p className="font-serif italic text-muted mb-6 leading-relaxed">
        Pull in your current dishes, rate each one 1–5 for popularity, and decide what stays, goes, and gets reworked. The system computes the menu engineering matrix and surfaces forward risks as you go.
      </p>
      <CreatePlanButton siteId={siteId} surface={surface} />
    </div>
  );
}
