import { SHOWCASE_BANK } from './bank';
import { buildShowcaseStock } from './stock';
import { buildShowcaseRecipesAndCostings } from './recipes';
import { buildShowcaseInvoices } from './invoices';
import { buildShowcaseMenus } from './menus';
import { buildShowcaseNotes } from './notes';
import { buildShowcaseWaste } from './waste';
import { buildShowcaseProfile } from './profile';

// Orchestrator. Returns the full user_data payload (snake_case columns as
// Postgres expects them) for a single seed run. Idempotent — every call
// produces the same structure with identical seed-* IDs, so re-running the
// admin button replaces existing seed data without duplicating rows.
//
// When a future feature lands, extend the relevant per-entity builder above
// (add ingredients, recipes, sales data, etc.) and the next button press
// will reflect the addition.

export interface ShowcasePayload {
  profile: Record<string, unknown>;
  recipes: any[];
  gp_history: any[];
  ingredients_bank: any[];
  stock_items: any[];
  invoices: any[];
  price_alerts: any[];
  menus: any[];
  notes: any[];
  waste_log: any[];
}

export function buildShowcasePayload(): ShowcasePayload {
  const { recipes, costings } = buildShowcaseRecipesAndCostings();
  const { invoices, priceAlerts } = buildShowcaseInvoices();
  return {
    profile: buildShowcaseProfile(),
    recipes,
    gp_history: costings,
    ingredients_bank: SHOWCASE_BANK,
    stock_items: buildShowcaseStock(),
    invoices,
    price_alerts: priceAlerts,
    menus: buildShowcaseMenus(),
    notes: buildShowcaseNotes(),
    waste_log: buildShowcaseWaste(),
  };
}

// Summary counts for the admin UI confirmation step ("about to replace X
// recipes, Y costings, Z invoices..."). Cheap to compute, gives the
// operator visibility into what the button is about to do.
export function showcaseSummary(): Record<string, number> {
  const p = buildShowcasePayload();
  return {
    recipes: p.recipes.length,
    costings: p.gp_history.length,
    bank: p.ingredients_bank.length,
    stock: p.stock_items.length,
    invoices: p.invoices.length,
    priceAlerts: p.price_alerts.length,
    menus: p.menus.length,
    notes: p.notes.length,
    waste: p.waste_log.length,
  };
}
