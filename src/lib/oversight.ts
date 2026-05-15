import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Shared queries for the Manager + Owner oversight surfaces. Each
 * function returns a tight summary of what one page renders — pages
 * call one or two of these and lay out the result.
 *
 * Scope so far: single site (manager) or one-or-more owned sites
 * (owner). Cross-site rollup logic stays site_id-aware; for owner pages
 * the caller passes an array of site_ids.
 */

const DAYS = (n: number) => n * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------
// Team — memberships on a site
// ---------------------------------------------------------------------

export type TeamMember = {
  user_id: string;
  email: string | null;
  role: string;
  created_at: string;
};

export async function getTeam(siteId: string): Promise<TeamMember[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('memberships')
    .select('user_id, role, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true });
  const rows = (data ?? []) as Array<{
    user_id: string;
    role: string;
    created_at: string;
  }>;
  // memberships RLS doesn't expose auth.users — show what we have.
  return rows.map((r) => ({
    user_id: r.user_id,
    email: null,
    role: r.role,
    created_at: r.created_at,
  }));
}

// ---------------------------------------------------------------------
// Period spend / waste / COGS summary
// ---------------------------------------------------------------------

export type PeriodSummary = {
  invoiced_total: number;
  invoiced_count: number;
  confirmed_total: number;
  confirmed_count: number;
  flagged_count: number;
  waste_value: number;
  waste_count: number;
  cogs_estimate: number;
  top_supplier_name: string | null;
  top_supplier_spend: number;
};

export async function getPeriodSummary(
  siteId: string,
  days: number,
): Promise<PeriodSummary> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - DAYS(days))
    .toISOString()
    .slice(0, 10);

  const [{ data: invoices }, { data: waste }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, total, status, supplier_id, suppliers:supplier_id (name)')
      .eq('site_id', siteId)
      .gte('received_at', since),
    supabase
      .from('waste_entries')
      .select('id, value')
      .eq('site_id', siteId)
      .gte('logged_at', new Date(Date.now() - DAYS(days)).toISOString()),
  ]);

  const invRows = (invoices ?? []) as unknown as Array<{
    total: number | null;
    status: string;
    supplier_id: string | null;
    suppliers: { name: string | null } | null;
  }>;

  let invoiced = 0;
  let confirmed = 0;
  let confirmedCount = 0;
  let flaggedCount = 0;
  const bySupplier = new Map<
    string,
    { name: string; total: number }
  >();
  for (const inv of invRows) {
    const t = inv.total != null ? Number(inv.total) : 0;
    invoiced += t;
    if (inv.status === 'confirmed') {
      confirmed += t;
      confirmedCount += 1;
      if (inv.supplier_id) {
        const cur = bySupplier.get(inv.supplier_id) ?? {
          name: inv.suppliers?.name ?? 'Unknown',
          total: 0,
        };
        cur.total += t;
        bySupplier.set(inv.supplier_id, cur);
      }
    }
    if (inv.status === 'flagged') flaggedCount += 1;
  }

  const wasteValue = (waste ?? []).reduce(
    (sum, w) => sum + Number((w as { value: number | null }).value ?? 0),
    0,
  );
  const wasteCount = (waste ?? []).length;

  const ranked = Array.from(bySupplier.values()).sort(
    (a, b) => b.total - a.total,
  );
  const top = ranked[0] ?? null;

  return {
    invoiced_total: Math.round(invoiced * 100) / 100,
    invoiced_count: invRows.length,
    confirmed_total: Math.round(confirmed * 100) / 100,
    confirmed_count: confirmedCount,
    flagged_count: flaggedCount,
    waste_value: Math.round(wasteValue * 100) / 100,
    waste_count: wasteCount,
    // Without revenue side, COGS is approximated as confirmed-invoice spend.
    // This becomes a proper figure when POS revenue lands.
    cogs_estimate: Math.round(confirmed * 100) / 100,
    top_supplier_name: top?.name ?? null,
    top_supplier_spend: top ? Math.round(top.total * 100) / 100 : 0,
  };
}

// ---------------------------------------------------------------------
// Compliance rollup — UK FIR allergen coverage
// ---------------------------------------------------------------------

export type ComplianceItem = {
  id: string;
  name: string;
  reason: string;
};

export type ComplianceRollup = {
  total_recipes: number;
  declared: number;
  declared_pct: number;
  needs_review: ComplianceItem[];
};

export async function getComplianceRollup(
  siteId: string,
): Promise<ComplianceRollup> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('recipes')
    .select('id, name, allergens, dish_type')
    .eq('site_id', siteId)
    .is('archived_at', null);
  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    allergens: {
      contains?: string[];
      mayContain?: string[];
      nutTypes?: string[];
      glutenTypes?: string[];
    };
    dish_type: string;
  }>;

  const declared = rows.filter(
    (r) =>
      (r.allergens?.contains?.length ?? 0) > 0 ||
      (r.allergens?.mayContain?.length ?? 0) > 0,
  );
  const reviewItems: ComplianceItem[] = [];

  for (const r of rows) {
    const a = r.allergens ?? {};
    const contains = a.contains ?? [];
    if (contains.length === 0 && (a.mayContain?.length ?? 0) === 0) {
      // Food dishes need allergen review; cocktails often have none
      if (r.dish_type === 'food') {
        reviewItems.push({
          id: r.id,
          name: r.name,
          reason: 'No allergens declared',
        });
      }
      continue;
    }
    if (
      contains.includes('Nuts (tree nuts)') &&
      (a.nutTypes?.length ?? 0) === 0
    ) {
      reviewItems.push({
        id: r.id,
        name: r.name,
        reason: 'Contains nuts — specify nut sub-types',
      });
    }
    if (
      contains.includes('Cereals containing gluten') &&
      (a.glutenTypes?.length ?? 0) === 0
    ) {
      reviewItems.push({
        id: r.id,
        name: r.name,
        reason: 'Contains gluten — specify cereal sub-types',
      });
    }
  }

  return {
    total_recipes: rows.length,
    declared: declared.length,
    declared_pct:
      rows.length === 0 ? 0 : Math.round((declared.length / rows.length) * 100),
    needs_review: reviewItems.slice(0, 20),
  };
}

// ---------------------------------------------------------------------
// Margin rollup — recipes with drift, average GP
// ---------------------------------------------------------------------

export type MarginRollup = {
  costed_count: number;
  priced_count: number;
  avg_gp_pct: number;
  drift_count: number;
  drift_top: Array<{
    id: string;
    name: string;
    drift_pct: number;
    dish_type: string;
  }>;
};

const ML_UNITS = new Set(['ml', 'l']);

export async function getMarginRollup(siteId: string): Promise<MarginRollup> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('recipes')
    .select(
      'id, name, dish_type, sell_price, cost_baseline, recipe_ingredients (qty, unit, ingredients:ingredient_id (current_price, pack_volume_ml))',
    )
    .eq('site_id', siteId)
    .is('archived_at', null);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    name: string;
    dish_type: string;
    sell_price: number | null;
    cost_baseline: number | null;
    recipe_ingredients: Array<{
      qty: number;
      unit: string;
      ingredients: {
        current_price: number | null;
        pack_volume_ml: number | null;
      } | null;
    }>;
  }>;

  let costed = 0;
  let priced = 0;
  let gpTotal = 0;
  let gpCount = 0;
  const drifts: Array<{
    id: string;
    name: string;
    drift_pct: number;
    dish_type: string;
  }> = [];

  for (const r of rows) {
    if (r.cost_baseline != null && r.cost_baseline > 0) costed += 1;
    if (r.sell_price != null && r.sell_price > 0 && r.cost_baseline != null) {
      priced += 1;
      const gp =
        ((r.sell_price - r.cost_baseline) / r.sell_price) * 100;
      gpTotal += gp;
      gpCount += 1;
    }

    // Compute current cost from ingredients + bank
    let total = 0;
    for (const l of r.recipe_ingredients ?? []) {
      const ing = l.ingredients;
      if (!ing || ing.current_price == null) continue;
      const price = Number(ing.current_price);
      const qty = Number(l.qty);
      const u = (l.unit ?? '').toLowerCase();
      const pvml = ing.pack_volume_ml != null ? Number(ing.pack_volume_ml) : null;
      if (pvml != null && pvml > 0 && ML_UNITS.has(u)) {
        const ml = u === 'l' ? qty * 1000 : qty;
        total += (price / pvml) * ml;
      } else {
        total += price * qty;
      }
    }
    if (
      r.cost_baseline != null &&
      r.cost_baseline > 0 &&
      total > 0 &&
      Math.abs(total - r.cost_baseline) / r.cost_baseline > 0.03
    ) {
      drifts.push({
        id: r.id,
        name: r.name,
        drift_pct: ((total - r.cost_baseline) / r.cost_baseline) * 100,
        dish_type: r.dish_type,
      });
    }
  }
  drifts.sort((a, b) => Math.abs(b.drift_pct) - Math.abs(a.drift_pct));

  return {
    costed_count: costed,
    priced_count: priced,
    avg_gp_pct: gpCount === 0 ? 0 : gpTotal / gpCount,
    drift_count: drifts.length,
    drift_top: drifts.slice(0, 5),
  };
}

// ---------------------------------------------------------------------
// Supplier balance ledger — credit usage + total owed
// ---------------------------------------------------------------------

export type SupplierLedgerRow = {
  id: string;
  name: string;
  payment_terms: string | null;
  credit_limit: number | null;
  account_balance: number | null;
  utilisation_pct: number | null;
};

export type SupplierLedger = {
  total_owed: number;
  total_credit: number;
  rows: SupplierLedgerRow[];
  over_85pct_count: number;
};

export async function getSupplierLedger(
  siteId: string,
): Promise<SupplierLedger> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('suppliers')
    .select(
      'id, name, payment_terms, credit_limit, account_balance',
    )
    .eq('site_id', siteId)
    .order('account_balance', { ascending: false, nullsFirst: false });

  const rows: SupplierLedgerRow[] = (data ?? []).map((r) => {
    const limit = r.credit_limit != null ? Number(r.credit_limit) : null;
    const balance =
      r.account_balance != null ? Number(r.account_balance) : null;
    const utilisation =
      limit != null && limit > 0 && balance != null
        ? Math.round((balance / limit) * 100)
        : null;
    return {
      id: r.id as string,
      name: r.name as string,
      payment_terms: (r.payment_terms as string | null) ?? null,
      credit_limit: limit,
      account_balance: balance,
      utilisation_pct: utilisation,
    };
  });

  const totalOwed = rows.reduce(
    (s, r) => s + (r.account_balance ?? 0),
    0,
  );
  const totalCredit = rows.reduce(
    (s, r) => s + (r.credit_limit ?? 0),
    0,
  );
  const over85 = rows.filter(
    (r) => r.utilisation_pct != null && r.utilisation_pct >= 85,
  ).length;

  return {
    total_owed: Math.round(totalOwed * 100) / 100,
    total_credit: Math.round(totalCredit * 100) / 100,
    rows,
    over_85pct_count: over85,
  };
}

// ---------------------------------------------------------------------
// Service notes — recent shared notebook entries
// ---------------------------------------------------------------------

export type ServiceNote = {
  id: string;
  title: string;
  body_md: string | null;
  authored_by: string | null;
  created_at: string;
  kind: string;
  attachment_url: string | null;
};

export async function getServiceNotes(
  siteId: string,
  days = 7,
): Promise<ServiceNote[]> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - DAYS(days)).toISOString();
  const { data } = await supabase
    .from('notebook_entries')
    .select(
      'id, title, body_md, authored_by, created_at, kind, attachment_url',
    )
    .eq('site_id', siteId)
    .eq('shared', true)
    .is('archived_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(40);
  return (data ?? []) as ServiceNote[];
}
