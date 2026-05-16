-- v2 migration: populate_demo_account RPC
-- Date: 2026-05-18
-- Applied: 2026-05-18 (via Supabase MCP apply_migration; split into 3 parts due to 50KB+ size)
--   Patches after initial apply (also via MCP):
--     - menu_plans.surface: 'chef'/'bartender' -> 'kitchen'/'bar' (matches CHECK constraint)
--     - menu_plans.status: 'in_progress' -> 'draft' (matches CHECK constraint)
--     - safety_incidents.allergens: text[] -> v2.allergen_code[] (enum array)
--   Detector-input round (also 2026-05-18, post-smoke-test against hello@):
--     - Set ingredients.reorder_point = par_level * 0.75 so par_breach fires
--     - Added a delivery expected today so today_deliveries fires
--     - Added a 2nd flagged invoice WITHOUT credit note so flagged_invoices fires
--     - Clustered bar spillage to a single ingredient (Patrón x4) so spillage_pattern fires
--     - Completed stock_take + set variance_total_value so stock_take_variance fires
--     - Added an idle recipe (Game terrine, touched 45d ago) so idle_recipe fires
--   File on disk = canonical truth; live functions match.
--
-- Wipe + reseed a full 30-day populate of every surface across every
-- site of a demo or founder account. Idempotent — re-runs produce
-- the same shape.
--
-- Gated at the application layer to is_founder OR is_demo accounts only,
-- but defends in depth here too (returns error if account is neither).
--
-- Shape goals per site:
--   Kitchen (kind = 'restaurant' or anything not 'bar'):
--     - 6 suppliers
--     - 18 ingredients (mix of par-met / below-par)
--     - 12 recipes (one intentionally stale @ 35d for stale_cost_baseline)
--     - 12 prep items across last 7 days
--     - 6 invoices + 6 deliveries (1 flagged for discrepancy banner)
--     - 2 purchase orders (1 draft, 1 sent)
--     - 1 credit note (draft)
--     - 1 stock take (today)
--     - 10 waste entries spread across 30 days
--     - 5 notebook entries
--     - 1 menu plan + 8 plan items
--     - Safety: 29 of 30 days opening checks (day 24 missing -> red dot)
--     - Safety: 30 probe readings (2 failing on sauce-station fridge)
--     - Safety: 14 SFBB cleaning tasks + 28 signoffs
--     - Safety: 4 training records (mix of expiry bands)
--     - Safety: 2 incidents (1 resolved, 1 open)
--
--   Bar (kind = 'bar'):
--     - 5 suppliers (beer/wine/spirits/soft/garnish trades)
--     - 15 ingredients
--     - 10 recipes (6 cocktails + 2 wine + 1 beer + 1 soft)
--     - 6 prep items (mise / garnish prep)
--     - 5 invoices + 5 deliveries
--     - 1 purchase order
--     - 8 waste entries (spillage/breakage/comp)
--     - 3 notebook entries
--     - 1 menu plan + 6 plan items
--
-- Returns jsonb summary: { ok, account_id, sites: [{site_id, kind, counts: {...}}] }

create or replace function v2.populate_demo_account(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = v2, public
as $$
declare
  v_acc record;
  v_owner_user_id uuid;
  v_site record;
  v_today date := current_date;
  v_now timestamptz := now();
  v_site_results jsonb := '[]'::jsonb;
  v_site_counts jsonb;

  -- Per-site working IDs we generate as we go
  v_supplier_ids uuid[];
  v_ingredient_ids uuid[];
  v_recipe_ids uuid[];
  v_invoice_ids uuid[];
  v_plan_id uuid;
  v_stock_take_id uuid;
  v_po_draft_id uuid;
  v_po_sent_id uuid;
  v_credit_id uuid;
  v_flagged_invoice_id uuid;

  -- Loop helpers
  v_i integer;
  v_d integer;
  v_tmp uuid;
  v_tmp_supplier uuid;
  v_tmp_total numeric;
  v_recipe_id uuid;
  v_ingredient_id uuid;
begin
  -- 1. Validate account
  select id, name, is_demo, is_founder
    into v_acc
    from v2.accounts
   where id = p_account_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'account_not_found');
  end if;

  if not (coalesce(v_acc.is_demo, false) or coalesce(v_acc.is_founder, false)) then
    return jsonb_build_object(
      'ok', false,
      'error', 'account_not_demo_or_founder',
      'account_id', p_account_id,
      'hint', 'Set accounts.is_demo = true (or is_founder = true) before populating'
    );
  end if;

  -- 2. Owner user for attribution (earliest owner-role membership)
  select m.user_id into v_owner_user_id
    from v2.memberships m
    join v2.sites s on s.id = m.site_id
   where s.account_id = p_account_id
     and m.role = 'owner'
   order by m.created_at asc
   limit 1;

  -- 3. Loop sites
  for v_site in
    select id, name, kind from v2.sites where account_id = p_account_id order by created_at
  loop
    -- ------- WIPE -------
    delete from v2.forward_signals where site_id = v_site.id;
    delete from v2.intelligence_events where site_id = v_site.id;

    delete from v2.stock_take_lines
     where stock_take_id in (select id from v2.stock_takes where site_id = v_site.id);
    delete from v2.stock_takes where site_id = v_site.id;

    delete from v2.credit_note_lines
     where credit_note_id in (select id from v2.credit_notes where site_id = v_site.id);
    delete from v2.credit_notes where site_id = v_site.id;

    delete from v2.purchase_order_lines
     where purchase_order_id in (select id from v2.purchase_orders where site_id = v_site.id);
    delete from v2.purchase_orders where site_id = v_site.id;

    delete from v2.invoice_lines
     where invoice_id in (select id from v2.invoices where site_id = v_site.id);
    delete from v2.invoices where site_id = v_site.id;
    delete from v2.deliveries where site_id = v_site.id;

    delete from v2.waste_entries where site_id = v_site.id;
    delete from v2.notebook_entries where site_id = v_site.id;
    delete from v2.prep_items where site_id = v_site.id;

    delete from v2.menu_plan_items
     where plan_id in (select id from v2.menu_plans where site_id = v_site.id);
    delete from v2.menu_plans where site_id = v_site.id;

    delete from v2.recipe_ingredients
     where recipe_id in (select id from v2.recipes where site_id = v_site.id);
    delete from v2.recipes where site_id = v_site.id;

    delete from v2.ingredient_price_history
     where ingredient_id in (select id from v2.ingredients where site_id = v_site.id);
    delete from v2.ingredients where site_id = v_site.id;

    delete from v2.suppliers where site_id = v_site.id;

    delete from v2.safety_cleaning_signoffs where site_id = v_site.id;
    delete from v2.safety_cleaning_tasks where site_id = v_site.id;
    delete from v2.safety_opening_checks where site_id = v_site.id;
    delete from v2.safety_probe_readings where site_id = v_site.id;
    delete from v2.safety_incidents where site_id = v_site.id;
    delete from v2.safety_training where site_id = v_site.id;

    -- ------- SEED -------
    if v_site.kind = 'bar' then
      v_site_counts := v2._seed_demo_bar_site(v_site.id, v_owner_user_id, v_today);
    else
      v_site_counts := v2._seed_demo_kitchen_site(v_site.id, v_owner_user_id, v_today);
    end if;

    v_site_results := v_site_results || jsonb_build_array(
      jsonb_build_object(
        'site_id', v_site.id,
        'site_name', v_site.name,
        'kind', v_site.kind,
        'counts', v_site_counts
      )
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'account_id', p_account_id,
    'account_name', v_acc.name,
    'sites', v_site_results,
    'timestamp', v_now
  );
end $$;

comment on function v2.populate_demo_account(uuid) is
  'Wipe + reseed 30 days of demo data across every site of a demo or founder account. Idempotent. Gated to is_demo OR is_founder accounts. Returns jsonb summary.';


-- ============================================================================
-- KITCHEN SEED
-- ============================================================================
create or replace function v2._seed_demo_kitchen_site(
  p_site_id uuid,
  p_owner_user_id uuid,
  p_today date
)
returns jsonb
language plpgsql
security definer
set search_path = v2, public
as $$
declare
  v_supplier_ids uuid[] := '{}'::uuid[];
  v_ingredient_ids uuid[] := '{}'::uuid[];
  v_recipe_ids uuid[] := '{}'::uuid[];
  v_invoice_ids uuid[] := '{}'::uuid[];

  v_plan_id uuid;
  v_stock_take_id uuid;
  v_po_draft_id uuid;
  v_po_sent_id uuid;
  v_credit_id uuid;
  v_flagged_invoice_id uuid;

  v_count_signoffs integer := 0;
  v_count_probes integer := 0;
  v_count_opening integer := 0;
  v_count_invoices integer := 0;
  v_count_lines integer := 0;
  v_count_waste integer := 0;
  v_count_prep integer := 0;
  v_count_notebook integer := 0;
  v_count_recipes integer := 0;
  v_count_ingredients integer := 0;
  v_count_recipe_ings integer := 0;
  v_count_price_history integer := 0;
  v_count_pos integer := 0;
  v_count_po_lines integer := 0;
  v_count_credits integer := 0;
  v_count_plan_items integer := 0;
  v_count_training integer := 0;
  v_count_incidents integer := 0;
  v_count_cleaning_tasks integer := 0;
  v_count_stock_take_lines integer := 0;

  v_i integer;
  v_d integer;
  v_supplier_id uuid;
  v_ingredient_id uuid;
  v_recipe_id uuid;
  v_invoice_id uuid;
  v_delivery_id uuid;
  v_line_id uuid;
  v_task_id uuid;
  v_total numeric;
begin
  -- ---- Suppliers (6) ----
  for v_supplier_id in
    insert into v2.suppliers (site_id, name, contact_person, phone, email, payment_terms, notes_md)
    values
      (p_site_id, 'Bidfresh', 'Sarah Mills', '020 7946 0011', 'orders@bidfresh.co.uk', 'Net 30', 'Daily 6am drop. Fish + dairy.'),
      (p_site_id, 'Goyne Butchers', 'Tom Goyne', '020 7946 0022', 'tom@goyne.co.uk', 'Net 14', 'Dry-aged cuts. Mon/Wed/Fri.'),
      (p_site_id, 'Smith''s Greengrocer', 'Marco Smith', '020 7946 0033', 'orders@smiths.co.uk', 'Net 14', 'Mon Thu drops. Seasonal veg.'),
      (p_site_id, 'Crosswell Wines', 'Jenny Crosswell', '020 7946 0044', 'jenny@crosswell.co.uk', 'Net 30', null),
      (p_site_id, 'East End Bakery', 'Reuben Page', '020 7946 0055', 'orders@eastend.co.uk', 'Net 7', 'Daily bread + pastry.'),
      (p_site_id, 'Maturation Cheese Co.', 'Olivia Hart', '020 7946 0066', 'olivia@maturation.co.uk', 'Net 30', 'British artisan only.')
    returning id
  loop
    v_supplier_ids := v_supplier_ids || v_supplier_id;
  end loop;

  -- ---- Ingredients (18) - mix of in-stock vs below-par ----
  -- intentionally: 4 below par (reorder fires), 14 above par
  -- reorder_point = par_level * 0.75 (set as a single UPDATE below after the insert)
  for v_ingredient_id in
    insert into v2.ingredients (site_id, supplier_id, name, spec, unit, category, current_price, par_level, current_stock, allergens)
    values
      -- Bidfresh
      (p_site_id, v_supplier_ids[1], 'Cornish Hake fillet', 'Skin-on, 180g portions', 'kg', 'Fish', 22.50, 8.0, 5.2, '{"contains": ["fish"], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[1], 'Salmon side', 'Loch Duart, 2kg sides', 'kg', 'Fish', 18.00, 6.0, 7.4, '{"contains": ["fish"], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[1], 'Double cream', '40% fat, 2L', 'L', 'Dairy', 4.80, 12.0, 8.0, '{"contains": ["milk"], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[1], 'Free-range eggs', 'Large, 30/case', 'each', 'Dairy', 0.32, 60.0, 42.0, '{"contains": ["eggs"], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      -- Goyne (butcher)
      (p_site_id, v_supplier_ids[2], 'Beef short rib', 'Bone-in, 35d aged', 'kg', 'Meat', 24.00, 10.0, 3.8, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[2], 'Pork belly', 'Skin-on, ~2kg pieces', 'kg', 'Meat', 11.50, 8.0, 6.5, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[2], 'Lamb shoulder', 'Boned + rolled', 'kg', 'Meat', 16.80, 5.0, 4.1, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[2], 'Chicken thigh', 'Boneless, skin-on', 'kg', 'Meat', 8.50, 12.0, 9.5, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      -- Smith's (greengrocer)
      (p_site_id, v_supplier_ids[3], 'Heritage carrot', 'Multi-coloured bunches', 'kg', 'Veg', 3.20, 8.0, 11.0, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[3], 'King oyster mushroom', 'Whole, ~150g each', 'kg', 'Veg', 9.50, 4.0, 2.1, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[3], 'Wild garlic', 'Seasonal Apr-May', 'kg', 'Veg', 18.00, 2.0, 0.5, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[3], 'Pink fir potato', 'Cornish grown', 'kg', 'Veg', 4.20, 15.0, 18.0, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[3], 'Shallot', 'Banana shallots', 'kg', 'Veg', 5.50, 6.0, 7.5, '{"contains": [], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      -- Bakery
      (p_site_id, v_supplier_ids[5], 'Sourdough loaf', 'Country white, 800g', 'each', 'Dry', 3.80, 10.0, 4.0, '{"contains": ["cereals_with_gluten"], "nutTypes": [], "mayContain": [], "glutenTypes": ["wheat"]}'::jsonb),
      (p_site_id, v_supplier_ids[5], '00 flour', 'Italian pasta flour, 25kg', 'kg', 'Dry', 1.80, 20.0, 22.0, '{"contains": ["cereals_with_gluten"], "nutTypes": [], "mayContain": [], "glutenTypes": ["wheat"]}'::jsonb),
      -- Cheese
      (p_site_id, v_supplier_ids[6], 'Tunworth cheese', 'Soft, Hampshire', 'kg', 'Dairy', 28.00, 2.0, 1.4, '{"contains": ["milk"], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      (p_site_id, v_supplier_ids[6], 'Aged Comté', '24 months', 'kg', 'Dairy', 38.00, 1.5, 1.6, '{"contains": ["milk"], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb),
      -- Wines (sells with bottles, treat as ingredient for cellar tracking)
      (p_site_id, v_supplier_ids[4], 'Madeira (cooking)', '5yr Bual', 'L', 'Alcohol', 22.00, 3.0, 2.8, '{"contains": ["sulphites"], "nutTypes": [], "mayContain": [], "glutenTypes": []}'::jsonb)
    returning id
  loop
    v_ingredient_ids := v_ingredient_ids || v_ingredient_id;
  end loop;

  v_count_ingredients := array_length(v_ingredient_ids, 1);

  -- Set reorder_point on every ingredient as 75% of par. Detector
  -- (par_breach) only fires when current_stock <= reorder_point, so
  -- without this the Looking Ahead bar stays empty even if par is set.
  update v2.ingredients
     set reorder_point = par_level * 0.75
   where site_id = p_site_id
     and par_level is not null;

  -- ---- Ingredient price history (1-3 per ingredient, last 30 days) ----
  -- noisy realistic prices showing some drift
  for v_i in 1..v_count_ingredients loop
    insert into v2.ingredient_price_history (ingredient_id, price, source, recorded_at)
    select v_ingredient_ids[v_i],
           (select current_price from v2.ingredients where id = v_ingredient_ids[v_i]) * (1.0 + (random()*0.1 - 0.05)),
           'invoice'::v2.price_source,
           p_today - (g.day::int) * interval '1 day' - interval '8 hours'
    from generate_series(28, 4, -8) as g(day);
    get diagnostics v_d = row_count;
    v_count_price_history := v_count_price_history + v_d;
  end loop;

  -- ---- Recipes (12) ----
  -- Build a stable list. Index 1 = chocolate fondant (intentionally stale costed_at)
  for v_recipe_id in
    insert into v2.recipes (site_id, name, menu_section, serves, portion_per_cover, sell_price, dish_type, cost_baseline, costed_at, notes, method, tags)
    values
      (p_site_id, 'Chocolate fondant',           'Dessert', 1, 1.0, 9.50,  'food', 2.40, p_today - interval '35 days', 'Allow 12 minutes from order — molten centre.', '["Mix dry","Mix wet","Combine","Bake 12m at 180c"]'::jsonb, '["signature","vegetarian"]'::jsonb),
      (p_site_id, 'Cornish hake, brown butter',  'Main',    1, 1.0, 24.00, 'food', 7.20, p_today - interval '4 days',  'Pan-seared, skin-on, brown butter + capers.', '["Score skin","Sear skin-down","Baste","Plate"]'::jsonb, '["seasonal"]'::jsonb),
      (p_site_id, 'Salmon, wild garlic',         'Main',    1, 1.0, 22.00, 'food', 6.80, p_today - interval '6 days',  'Sous-vide 48c then finished in pan.', '["SV 48c x40m","Finish skin","Wild garlic oil"]'::jsonb, '["seasonal","gluten_free"]'::jsonb),
      (p_site_id, 'Short rib, red wine',         'Main',    1, 1.0, 28.00, 'food', 9.50, p_today - interval '8 days',  '8hr braise. Plate on root mash.', '["Sear","Braise 8h","Reduce sauce","Rest"]'::jsonb, '["signature"]'::jsonb),
      (p_site_id, 'Pork belly, apple',           'Main',    1, 1.0, 21.00, 'food', 5.40, p_today - interval '7 days',  'Score skin overnight. 5hr at 110c then crisp.', '["Score","Brine 6h","Slow roast 5h","Crisp top"]'::jsonb, '["weekday_special"]'::jsonb),
      (p_site_id, 'Lamb shoulder, harissa',      'Main',    2, 1.0, 32.00, 'food', 10.80,p_today - interval '5 days',  'Sharing dish. Slow-roast 6hrs.', '["Rub","Slow roast","Pull","Plate"]'::jsonb, '["sharing"]'::jsonb),
      (p_site_id, 'Heritage carrot, miso',       'Starter', 1, 1.0, 9.00,  'food', 2.80, p_today - interval '10 days', 'Charred + glazed.', '["Char","Glaze","Plate"]'::jsonb, '["vegan"]'::jsonb),
      (p_site_id, 'Mushroom + Comté tart',       'Starter', 1, 1.0, 11.00, 'food', 3.40, p_today - interval '12 days', 'Puff pastry base, king oyster.', '["Roast mushrooms","Lay","Bake 12m"]'::jsonb, '["vegetarian"]'::jsonb),
      (p_site_id, 'Tunworth + honey',            'Cheese',  1, 1.0, 8.00,  'food', 2.60, p_today - interval '14 days', 'With oatcakes.', '["Plate","Drizzle"]'::jsonb, '["vegetarian"]'::jsonb),
      (p_site_id, 'Pink fir potato hash',        'Side',    1, 1.0, 5.50,  'food', 1.40, p_today - interval '9 days',  'Confit then crisp.', '["Confit 1h","Cool","Crisp"]'::jsonb, '["gluten_free","vegan"]'::jsonb),
      (p_site_id, 'Sourdough + cultured butter', 'Snack',   1, 1.0, 5.00,  'food', 1.20, p_today - interval '15 days', 'Warm sourdough, salted butter.', '["Warm","Slice","Plate"]'::jsonb, '["vegetarian"]'::jsonb),
      (p_site_id, 'Pasta of the day',            'Main',    1, 1.0, 16.00, 'food', 4.80, p_today - interval '11 days', 'Changes daily — chef discretion.', '["Roll","Cook","Sauce","Plate"]'::jsonb, '["vegetarian"]'::jsonb),
      -- Intentionally idle: untouched > 30d, not on plan, not on prep — fires idle_recipe detector
      (p_site_id, 'Game terrine',                'Starter', 1, 1.0, 12.00, 'food', 3.60, p_today - interval '45 days', 'Winter-only — held in the book over summer.', '["Layer","Press","Slice"]'::jsonb, '["winter"]'::jsonb)
    returning id
  loop
    v_recipe_ids := v_recipe_ids || v_recipe_id;
  end loop;
  v_count_recipes := array_length(v_recipe_ids, 1);

  -- The idle recipe (last in the list) needs an old updated_at too so
  -- the detector's `updated_at > cutoff` short-circuit doesn't save it.
  update v2.recipes
     set updated_at = p_today - interval '45 days'
   where id = v_recipe_ids[v_count_recipes];

  -- ---- Recipe ingredients (3-5 per recipe) ----
  -- Link recipes to ingredients in a pragmatic way
  insert into v2.recipe_ingredients (recipe_id, ingredient_id, name, qty, unit, position)
  values
    -- Chocolate fondant (uses cream, eggs, flour)
    (v_recipe_ids[1], v_ingredient_ids[3],  'Double cream', 0.05, 'L', 0),
    (v_recipe_ids[1], v_ingredient_ids[4],  'Egg yolk', 2, 'each', 1),
    (v_recipe_ids[1], v_ingredient_ids[15], '00 flour', 0.04, 'kg', 2),
    -- Hake (uses hake, butter from cream, shallot)
    (v_recipe_ids[2], v_ingredient_ids[1],  'Cornish hake', 0.18, 'kg', 0),
    (v_recipe_ids[2], v_ingredient_ids[3],  'Double cream (brown butter)', 0.03, 'L', 1),
    (v_recipe_ids[2], v_ingredient_ids[13], 'Shallot', 0.03, 'kg', 2),
    -- Salmon, wild garlic
    (v_recipe_ids[3], v_ingredient_ids[2],  'Salmon', 0.16, 'kg', 0),
    (v_recipe_ids[3], v_ingredient_ids[11], 'Wild garlic', 0.02, 'kg', 1),
    -- Short rib
    (v_recipe_ids[4], v_ingredient_ids[5],  'Beef short rib', 0.32, 'kg', 0),
    (v_recipe_ids[4], v_ingredient_ids[18], 'Madeira', 0.08, 'L', 1),
    (v_recipe_ids[4], v_ingredient_ids[9],  'Heritage carrot', 0.06, 'kg', 2),
    -- Pork belly
    (v_recipe_ids[5], v_ingredient_ids[6],  'Pork belly', 0.20, 'kg', 0),
    (v_recipe_ids[5], v_ingredient_ids[13], 'Shallot', 0.04, 'kg', 1),
    -- Lamb shoulder (sharing)
    (v_recipe_ids[6], v_ingredient_ids[7],  'Lamb shoulder', 0.40, 'kg', 0),
    -- Heritage carrot starter
    (v_recipe_ids[7], v_ingredient_ids[9],  'Heritage carrot', 0.18, 'kg', 0),
    -- Mushroom tart
    (v_recipe_ids[8], v_ingredient_ids[10], 'King oyster mushroom', 0.12, 'kg', 0),
    (v_recipe_ids[8], v_ingredient_ids[17], 'Aged Comté', 0.04, 'kg', 1),
    -- Tunworth
    (v_recipe_ids[9], v_ingredient_ids[16], 'Tunworth cheese', 0.06, 'kg', 0),
    -- Pink fir hash
    (v_recipe_ids[10], v_ingredient_ids[12], 'Pink fir potato', 0.18, 'kg', 0),
    -- Sourdough
    (v_recipe_ids[11], v_ingredient_ids[14], 'Sourdough loaf', 0.25, 'each', 0),
    -- Pasta
    (v_recipe_ids[12], v_ingredient_ids[15], '00 flour', 0.10, 'kg', 0),
    (v_recipe_ids[12], v_ingredient_ids[4],  'Eggs', 2, 'each', 1);
  get diagnostics v_count_recipe_ings = row_count;

  -- ---- Menu plan + items ----
  insert into v2.menu_plans (site_id, surface, name, status, created_by, target_launch, notes)
  values (p_site_id, 'kitchen', 'Spring menu refresh', 'draft', p_owner_user_id, p_today + interval '14 days', 'Targeting GP 70%. Heavy seasonal lean.')
  returning id into v_plan_id;

  insert into v2.menu_plan_items (plan_id, recipe_id, action, popularity_rating, position, notes)
  values
    (v_plan_id, v_recipe_ids[2], 'keep',   5, 0, 'Best-seller. Star quadrant.'),
    (v_plan_id, v_recipe_ids[3], 'keep',   4, 1, 'Sells well, healthy GP.'),
    (v_plan_id, v_recipe_ids[4], 'keep',   5, 2, 'Signature. Hold firm.'),
    (v_plan_id, v_recipe_ids[1], 'revise', 4, 3, 'Plowhorse — pops but low GP. Look at cream %.'),
    (v_plan_id, v_recipe_ids[5], 'keep',   3, 4, 'Steady puzzle.'),
    (v_plan_id, v_recipe_ids[9], 'remove', 1, 5, 'Dog. Cheese under-orders.'),
    (v_plan_id, v_recipe_ids[7], 'keep',   3, 6, null),
    (v_plan_id, v_recipe_ids[8], 'add',    null, 7, 'New for spring.');
  get diagnostics v_count_plan_items = row_count;

  -- ---- Invoices + deliveries (6) ----
  -- one flagged for discrepancy banner
  for v_i in 1..6 loop
    v_supplier_id := v_supplier_ids[((v_i - 1) % array_length(v_supplier_ids, 1)) + 1];

    insert into v2.deliveries (site_id, supplier_id, expected_at, arrived_at, status, value_estimate, line_count_estimate)
    values (p_site_id, v_supplier_id, p_today - (v_i * 5)::int, p_today - (v_i * 5)::int, 'arrived', 120 + v_i*40, 4)
    returning id into v_delivery_id;

    v_total := round((140 + (v_i * 35.50))::numeric, 2);
    insert into v2.invoices (site_id, supplier_id, delivery_id, invoice_number, issued_at, received_at, subtotal, vat, total, status, source, delivery_confirmation, notes)
    values (
      p_site_id, v_supplier_id, v_delivery_id,
      'INV-' || to_char(p_today - (v_i * 5)::int, 'YYYYMMDD') || '-' || lpad(v_i::text, 3, '0'),
      p_today - (v_i * 5)::int, p_today - (v_i * 5)::int,
      v_total, round(v_total * 0.2, 2), round(v_total * 1.2, 2),
      case when v_i = 2 then 'flagged'::v2.invoice_status else 'confirmed'::v2.invoice_status end,
      'scanned'::v2.invoice_source,
      case when v_i = 2 then 'flagged'::v2.delivery_confirmation else 'confirmed'::v2.delivery_confirmation end,
      case when v_i = 2 then 'Two short on hake delivery — see lines' else null end
    )
    returning id into v_invoice_id;

    v_invoice_ids := v_invoice_ids || v_invoice_id;
    v_count_invoices := v_count_invoices + 1;
    if v_i = 2 then v_flagged_invoice_id := v_invoice_id; end if;

    -- 3-4 lines per invoice
    insert into v2.invoice_lines (invoice_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, vat_rate, discrepancy_qty, discrepancy_note, position)
    values
      (v_invoice_id, v_ingredient_ids[1],  'Cornish Hake fillet 180g',  2.5, 'kg', 22.50, 56.25, 0.20, case when v_i=2 then -1.0 else null end, case when v_i=2 then 'Two portions short' else null end, 0),
      (v_invoice_id, v_ingredient_ids[3],  'Double cream 2L',           2.0, 'L',  4.80,  9.60, 0.20, null, null, 1),
      (v_invoice_id, v_ingredient_ids[14], 'Sourdough loaf 800g',       6.0, 'each', 3.80, 22.80, 0.20, null, null, 2),
      (v_invoice_id, v_ingredient_ids[9],  'Heritage carrot bunch',     3.0, 'kg', 3.20,  9.60, 0.20, null, null, 3);
    v_count_lines := v_count_lines + 4;
  end loop;

  -- One additional delivery expected today (no invoice yet) so the
  -- today_deliveries detector fires + the chef sees "coming in today".
  insert into v2.deliveries (site_id, supplier_id, expected_at, status, value_estimate, line_count_estimate, notes)
  values (p_site_id, v_supplier_ids[1], p_today, 'expected'::v2.delivery_status, 180, 3, 'Bidfresh — fish + dairy run');

  -- Second flagged invoice WITHOUT a credit note so flagged_invoices
  -- detector fires (the first flagged one above is already claimed by
  -- the draft credit note below, which is correct behaviour but means
  -- nothing fires from it).
  insert into v2.deliveries (site_id, supplier_id, expected_at, arrived_at, status, value_estimate, line_count_estimate)
  values (p_site_id, v_supplier_ids[3], p_today - 1, p_today - 1, 'arrived', 95, 2)
  returning id into v_delivery_id;
  insert into v2.invoices (site_id, supplier_id, delivery_id, invoice_number, issued_at, received_at, subtotal, vat, total, status, source, delivery_confirmation, notes)
  values (
    p_site_id, v_supplier_ids[3], v_delivery_id,
    'INV-' || to_char(p_today - 1, 'YYYYMMDD') || '-099',
    p_today - 1, p_today - 1,
    95.00, 19.00, 114.00,
    'flagged'::v2.invoice_status, 'scanned'::v2.invoice_source, 'flagged'::v2.delivery_confirmation,
    'Wild garlic showed bruised on arrival — needs credit'
  )
  returning id into v_invoice_id;
  v_count_invoices := v_count_invoices + 1;
  insert into v2.invoice_lines (invoice_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, vat_rate, discrepancy_qty, discrepancy_note, position)
  values
    (v_invoice_id, v_ingredient_ids[11], 'Wild garlic',     2.0, 'kg', 18.00, 36.00, 0.20, -0.5, 'Bruised batch — half unusable', 0),
    (v_invoice_id, v_ingredient_ids[9],  'Heritage carrot', 5.0, 'kg', 3.20,  16.00, 0.20, null, null, 1);
  v_count_lines := v_count_lines + 2;

  -- ---- Purchase orders ----
  insert into v2.purchase_orders (site_id, supplier_id, reference, status, total, currency, expected_at, created_by, notes)
  values (p_site_id, v_supplier_ids[2], 'PO-' || to_char(p_today, 'YYYYMMDD') || '-001', 'draft', 285.40, 'GBP', p_today + interval '2 days', p_owner_user_id, 'Weekly butcher order')
  returning id into v_po_draft_id;

  insert into v2.purchase_order_lines (purchase_order_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, position)
  values
    (v_po_draft_id, v_ingredient_ids[5], 'Beef short rib', 6.0, 'kg', 24.00, 144.00, 0),
    (v_po_draft_id, v_ingredient_ids[7], 'Lamb shoulder',   3.0, 'kg', 16.80,  50.40, 1),
    (v_po_draft_id, v_ingredient_ids[8], 'Chicken thigh',   3.0, 'kg',  8.50,  25.50, 2);
  v_count_po_lines := v_count_po_lines + 3;

  insert into v2.purchase_orders (site_id, supplier_id, reference, status, total, currency, expected_at, sent_at, created_by, notes)
  values (p_site_id, v_supplier_ids[3], 'PO-' || to_char(p_today - 2, 'YYYYMMDD') || '-002', 'sent', 152.30, 'GBP', p_today + interval '1 day', p_today - interval '2 days', p_owner_user_id, 'Veg order — confirmed by Marco')
  returning id into v_po_sent_id;

  insert into v2.purchase_order_lines (purchase_order_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, position)
  values
    (v_po_sent_id, v_ingredient_ids[9],  'Heritage carrot',     8.0, 'kg', 3.20,  25.60, 0),
    (v_po_sent_id, v_ingredient_ids[10], 'King oyster mushroom', 3.0, 'kg', 9.50,  28.50, 1),
    (v_po_sent_id, v_ingredient_ids[12], 'Pink fir potato',     20.0, 'kg', 4.20,  84.00, 2);
  v_count_po_lines := v_count_po_lines + 3;
  v_count_pos := 2;

  -- ---- Credit note (1, draft) ----
  insert into v2.credit_notes (site_id, supplier_id, source_invoice_id, reference, status, total, currency, notes, created_by)
  values (p_site_id, (select supplier_id from v2.invoices where id = v_flagged_invoice_id), v_flagged_invoice_id, 'CN-' || to_char(p_today, 'YYYYMMDD') || '-001', 'draft', 22.50, 'GBP', 'Two portions short on hake — credit requested', p_owner_user_id)
  returning id into v_credit_id;

  insert into v2.credit_note_lines (credit_note_id, raw_name, qty, qty_unit, unit_price, line_total, reason, note, position)
  values (v_credit_id, 'Cornish Hake fillet (short)', 1.0, 'kg', 22.50, 22.50, 'short'::v2.credit_note_line_reason, 'Marked on delivery — two portions missing', 0);
  v_count_credits := 1;

  -- ---- Stock take (yesterday, completed with attention-worthy variance) ----
  -- stock_take_variance detector needs status='completed' AND
  -- variance_total_value set, |value| > £30. We'll seed -£48 (short) so
  -- it fires at 'attention' (urgent kicks in over £100).
  insert into v2.stock_takes (site_id, conducted_by, conducted_at, status, variance_total_value, completed_at, notes)
  values (p_site_id, p_owner_user_id, (p_today - 1)::timestamptz, 'completed'::v2.stock_take_status, -48.50, (p_today - 1)::timestamptz + interval '20 hours', 'Monday weekly count — variance on beef + cream')
  returning id into v_stock_take_id;

  for v_i in 1..6 loop
    insert into v2.stock_take_lines (stock_take_id, ingredient_id, expected_quantity, counted_quantity, variance_quantity, variance_value, position)
    values (
      v_stock_take_id,
      v_ingredient_ids[v_i],
      (select current_stock from v2.ingredients where id = v_ingredient_ids[v_i]),
      (select current_stock from v2.ingredients where id = v_ingredient_ids[v_i]) - (v_i * 0.1),
      -(v_i * 0.1),
      -(v_i * 0.1) * (select current_price from v2.ingredients where id = v_ingredient_ids[v_i]),
      v_i - 1
    );
    v_count_stock_take_lines := v_count_stock_take_lines + 1;
  end loop;

  -- ---- Prep items (12 across last 7 days) ----
  for v_d in 0..6 loop
    insert into v2.prep_items (site_id, prep_date, station, name, recipe_id, qty, qty_unit, status, assigned_label, started_at, finished_at)
    values
      (p_site_id, p_today - v_d, 'Sauce', 'Brown butter base', v_recipe_ids[2], 2.0, 'L',
        case when v_d = 0 then 'in_progress'::v2.prep_status else 'done'::v2.prep_status end,
        'Tom', (p_today - v_d)::timestamptz + interval '14 hours',
        case when v_d = 0 then null else (p_today - v_d)::timestamptz + interval '15 hours' end),
      (p_site_id, p_today - v_d, 'Larder', 'Pickle shallots', v_recipe_ids[5], 1.5, 'kg',
        case when v_d = 0 then 'not_started'::v2.prep_status else 'done'::v2.prep_status end,
        'Sarah', null, null);
    v_count_prep := v_count_prep + 2;
    exit when v_count_prep >= 12;
  end loop;

  -- ---- Waste entries (10 spread across 30d) ----
  for v_i in 1..10 loop
    insert into v2.waste_entries (site_id, ingredient_id, logged_by, logged_at, name, qty, qty_unit, value, category, reason_md)
    values (
      p_site_id,
      v_ingredient_ids[((v_i - 1) % v_count_ingredients) + 1],
      p_owner_user_id,
      (p_today - (v_i * 3)::int)::timestamptz + interval '16 hours',
      (select name from v2.ingredients where id = v_ingredient_ids[((v_i - 1) % v_count_ingredients) + 1]),
      0.2 + (v_i * 0.05),
      'kg',
      (0.2 + (v_i * 0.05)) * (select current_price from v2.ingredients where id = v_ingredient_ids[((v_i - 1) % v_count_ingredients) + 1]),
      (array['spoilage','trim','over_prep','accident','other']::v2.waste_category[])[((v_i - 1) % 5) + 1],
      case v_i % 4 when 0 then 'Trimmed during prep' when 1 then 'Past use-by' when 2 then 'Over-prepped service' else 'Dropped during plating' end
    );
    v_count_waste := v_count_waste + 1;
  end loop;

  -- ---- Notebook entries (5) ----
  insert into v2.notebook_entries (site_id, authored_by, kind, title, body_md, tags, linked_recipe_ids)
  values
    (p_site_id, p_owner_user_id, 'note'::v2.notebook_kind, 'Service notes — Sat dinner', 'Hake selling 28/35 covers. Push fondant — molten not setting right, check oven cal.', '["service"]'::jsonb, array[v_recipe_ids[2], v_recipe_ids[1]]),
    (p_site_id, p_owner_user_id, 'note'::v2.notebook_kind, 'Iteration: short rib glaze',  'Cut Madeira to 60ml from 80. Sweeter than I want, reduce more aggressively.', '["iteration","sauce"]'::jsonb, array[v_recipe_ids[4]]),
    (p_site_id, p_owner_user_id, 'note'::v2.notebook_kind, 'Supplier — Smith''s carrots',  'Marco bringing yellow + purple back week 12. Plan a carrot dish for the spring board.', '["supplier","planning"]'::jsonb, '{}'::uuid[]),
    (p_site_id, p_owner_user_id, 'note'::v2.notebook_kind, 'Allergen — table 14',         'Severe nut allergy. Spoke to FOH. Pre-prepped clean station for them.', '["allergen","incident"]'::jsonb, '{}'::uuid[]),
    (p_site_id, p_owner_user_id, 'note'::v2.notebook_kind, 'Dish dev: spring mushroom tart', 'Tested with king oyster + Comté. Holding well. Add to spring plan.', '["dev","spring"]'::jsonb, array[v_recipe_ids[8]]);
  v_count_notebook := 5;

  -- ============================
  -- SAFETY (kitchen-side only)
  -- ============================

  -- ---- Opening checks: 29 of last 30 days (day 24 missing) ----
  for v_d in 0..29 loop
    if v_d = 24 then continue; end if;
    insert into v2.safety_opening_checks (site_id, completed_by, check_date, answers)
    values (
      p_site_id, p_owner_user_id, p_today - v_d,
      jsonb_build_object(
        'fridge_temps_in_range', true,
        'freezer_temps_in_range', true,
        'no_pest_signs', true,
        'cleaning_completed_last_night', true,
        'bins_emptied', true,
        '_meta', jsonb_build_object(
          'fridge_temps_in_range',         jsonb_build_object('by', p_owner_user_id, 'at', ((p_today - v_d)::timestamptz + interval '7 hours')::text),
          'freezer_temps_in_range',        jsonb_build_object('by', p_owner_user_id, 'at', ((p_today - v_d)::timestamptz + interval '7 hours')::text),
          'no_pest_signs',                 jsonb_build_object('by', p_owner_user_id, 'at', ((p_today - v_d)::timestamptz + interval '7 hours')::text),
          'cleaning_completed_last_night', jsonb_build_object('by', p_owner_user_id, 'at', ((p_today - v_d)::timestamptz + interval '7 hours')::text),
          'bins_emptied',                  jsonb_build_object('by', p_owner_user_id, 'at', ((p_today - v_d)::timestamptz + interval '7 hours')::text)
        )
      )
    );
    v_count_opening := v_count_opening + 1;
  end loop;

  -- ---- Probe readings (30, with 2 failing on sauce-station fridge) ----
  for v_d in 0..14 loop
    -- one passing daily reading on the main fridge
    insert into v2.safety_probe_readings (site_id, logged_by, kind, location, temperature_c, passed, threshold_note, logged_at)
    values (p_site_id, p_owner_user_id, 'fridge'::v2.probe_kind, 'Walk-in fridge', 3.5 + (random() * 1.5), true, 'Target <5c', (p_today - v_d)::timestamptz + interval '10 hours');
    v_count_probes := v_count_probes + 1;
    -- one daily on sauce station — pass mostly, fail on days 8 + 11
    insert into v2.safety_probe_readings (site_id, logged_by, kind, location, temperature_c, passed, threshold_note, notes, logged_at)
    values (
      p_site_id, p_owner_user_id, 'fridge'::v2.probe_kind, 'Fridge — sauce station',
      case when v_d in (8, 11) then 7.2 + random() else 3.8 + random() end,
      v_d not in (8, 11),
      'Target <5c',
      case when v_d in (8, 11) then 'Above threshold — moved stock to walk-in, called engineer' else null end,
      (p_today - v_d)::timestamptz + interval '10 hours 30 minutes'
    );
    v_count_probes := v_count_probes + 1;
  end loop;

  -- ---- Cleaning tasks (SFBB-aligned, 14) + signoffs ----
  for v_task_id in
    insert into v2.safety_cleaning_tasks (site_id, area, task, frequency, notes_md)
    values
      (p_site_id, 'Kitchen',  'Wipe down all surfaces',            'daily'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Clean and sanitise chopping boards','daily'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Sweep and mop floors',              'daily'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Empty bins',                        'daily'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Wash kitchen towels',               'daily'::v2.cleaning_frequency, null),
      (p_site_id, 'Front',    'Clean front of house surfaces',     'daily'::v2.cleaning_frequency, null),
      (p_site_id, 'Front',    'Polish glassware',                  'daily'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Deep clean fridges (interior)',     'weekly'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Clean oven + extractor filters',    'weekly'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Descale dishwasher',                'weekly'::v2.cleaning_frequency, null),
      (p_site_id, 'Storage',  'Rotate dry store + check dates',    'weekly'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Deep clean walk-in freezer',        'monthly'::v2.cleaning_frequency, null),
      (p_site_id, 'Kitchen',  'Service extractor hood',            'monthly'::v2.cleaning_frequency, 'External contractor required'),
      (p_site_id, 'Whole site','Pest control inspection',          'quarterly'::v2.cleaning_frequency, null)
    returning id
  loop
    v_count_cleaning_tasks := v_count_cleaning_tasks + 1;
    -- For each daily task: sign off today + yesterday
    -- For each weekly/monthly: sign off once recent
    if v_count_cleaning_tasks <= 7 then
      -- daily
      for v_d in 0..3 loop
        insert into v2.safety_cleaning_signoffs (site_id, task_id, completed_by, completed_at, notes)
        values (p_site_id, v_task_id, p_owner_user_id, (p_today - v_d)::timestamptz + interval '23 hours', null);
        v_count_signoffs := v_count_signoffs + 1;
      end loop;
    elsif v_count_cleaning_tasks <= 11 then
      -- weekly
      insert into v2.safety_cleaning_signoffs (site_id, task_id, completed_by, completed_at, notes)
      values (p_site_id, v_task_id, p_owner_user_id, (p_today - 4)::timestamptz + interval '22 hours', null);
      v_count_signoffs := v_count_signoffs + 1;
    elsif v_count_cleaning_tasks <= 13 then
      -- monthly (one done, one intentionally not)
      if v_count_cleaning_tasks = 12 then
        insert into v2.safety_cleaning_signoffs (site_id, task_id, completed_by, completed_at, notes)
        values (p_site_id, v_task_id, p_owner_user_id, (p_today - 12)::timestamptz + interval '20 hours', null);
        v_count_signoffs := v_count_signoffs + 1;
      end if;
    end if;
    -- task 14 (pest) intentionally has no signoff so it surfaces in overdue
  end loop;

  -- ---- Training records (4, mix of expiry bands) ----
  insert into v2.safety_training (site_id, user_id, staff_name, kind, certificate_name, awarding_body, awarded_on, expires_on)
  values
    (p_site_id, p_owner_user_id, 'Jack Harrison',  'food_hygiene_l2'::v2.training_kind, 'Food Hygiene Level 2',    'CIEH',         p_today - interval '180 days', p_today + interval '550 days'),
    (p_site_id, p_owner_user_id, 'Sarah Mills',    'allergen_awareness'::v2.training_kind, 'Allergen Awareness', 'FSA',          p_today - interval '60 days',  p_today + interval '305 days'),
    (p_site_id, null,             'Marco (sous)',  'allergen_awareness'::v2.training_kind, 'Allergen Awareness', 'FSA',          p_today - interval '400 days', p_today - interval '35 days'),
    (p_site_id, null,             'Sam (CDP)',     'food_hygiene_l2'::v2.training_kind, 'Food Hygiene Level 2',    'Highfield',    p_today - interval '710 days', p_today + interval '21 days');
  v_count_training := 4;

  -- ---- Incidents (2) ----
  insert into v2.safety_incidents (site_id, logged_by, kind, occurred_at, summary, body_md, allergens, customer_name, resolved_at, resolution_md)
  values
    (p_site_id, p_owner_user_id, 'complaint'::v2.incident_kind, p_today - interval '9 days' + interval '20 hours',
     'Hake plate sent back — overcooked',
     E'severity: attention\n\nGuest at table 6 returned hake plate, said it was dry. Refired immediately, comped wine. Chef briefed on doneness.',
     null::v2.allergen_code[], 'Table 6',
     p_today - interval '9 days' + interval '21 hours', 'Refired, comped wine. Briefed sauté section.'),
    (p_site_id, p_owner_user_id, 'allergen'::v2.incident_kind, p_today - interval '2 days' + interval '21 hours',
     'Severe nut allergy — table 14',
     E'severity: urgent\n\nTable 14 booked with severe nut allergy noted on booking. Pre-prepped clean station + dedicated boards. Service ran without issue.',
     array['tree_nuts','peanuts']::v2.allergen_code[], 'Table 14',
     null, null);
  v_count_incidents := 2;

  return jsonb_build_object(
    'suppliers',       array_length(v_supplier_ids, 1),
    'ingredients',     v_count_ingredients,
    'price_history',   v_count_price_history,
    'recipes',         v_count_recipes,
    'recipe_ingredients', v_count_recipe_ings,
    'menu_plans',      1,
    'menu_plan_items', v_count_plan_items,
    'invoices',        v_count_invoices,
    'invoice_lines',   v_count_lines,
    'purchase_orders', v_count_pos,
    'po_lines',        v_count_po_lines,
    'credit_notes',    v_count_credits,
    'stock_take_lines', v_count_stock_take_lines,
    'prep_items',      v_count_prep,
    'waste_entries',   v_count_waste,
    'notebook_entries', v_count_notebook,
    'safety_opening_checks', v_count_opening,
    'safety_probe_readings', v_count_probes,
    'safety_cleaning_tasks', v_count_cleaning_tasks,
    'safety_cleaning_signoffs', v_count_signoffs,
    'safety_training', v_count_training,
    'safety_incidents', v_count_incidents
  );
end $$;

comment on function v2._seed_demo_kitchen_site(uuid, uuid, date) is
  'Internal: seeds a single kitchen site with 30 days of demo data. Called by populate_demo_account; not for direct use.';


-- ============================================================================
-- BAR SEED
-- ============================================================================
create or replace function v2._seed_demo_bar_site(
  p_site_id uuid,
  p_owner_user_id uuid,
  p_today date
)
returns jsonb
language plpgsql
security definer
set search_path = v2, public
as $$
declare
  v_supplier_ids uuid[] := '{}'::uuid[];
  v_ingredient_ids uuid[] := '{}'::uuid[];
  v_recipe_ids uuid[] := '{}'::uuid[];

  v_plan_id uuid;
  v_po_id uuid;

  v_count_invoices integer := 0;
  v_count_lines integer := 0;
  v_count_waste integer := 0;
  v_count_prep integer := 0;
  v_count_notebook integer := 0;
  v_count_recipes integer := 0;
  v_count_recipe_ings integer := 0;
  v_count_price_history integer := 0;
  v_count_po_lines integer := 0;
  v_count_plan_items integer := 0;

  v_i integer;
  v_d integer;
  v_supplier_id uuid;
  v_ingredient_id uuid;
  v_recipe_id uuid;
  v_invoice_id uuid;
  v_delivery_id uuid;
  v_total numeric;
begin
  -- ---- Suppliers (5 bar trades) ----
  for v_supplier_id in
    insert into v2.suppliers (site_id, name, contact_person, phone, email, payment_terms)
    values
      (p_site_id, 'Old Brewery Co.',  'Liam Vaughn', '020 7946 0077', 'orders@oldbrewery.co.uk',  'Net 30'),
      (p_site_id, 'Spirit Merchant',  'Anya Pollard', '020 7946 0088', 'orders@spiritmerchant.co.uk','Net 30'),
      (p_site_id, 'Crosswell Wines',  'Jenny Crosswell', '020 7946 0044', 'jenny@crosswell.co.uk', 'Net 30'),
      (p_site_id, 'Soft Stop',        'Dean Curtis', '020 7946 0099', 'orders@softstop.co.uk',   'Net 14'),
      (p_site_id, 'Ice & Garnish Co.','Mia Hayward', '020 7946 0101', 'orders@iceandgarnish.co.uk','Net 7')
    returning id
  loop
    v_supplier_ids := v_supplier_ids || v_supplier_id;
  end loop;

  -- ---- Ingredients (15) ----
  for v_ingredient_id in
    insert into v2.ingredients (site_id, supplier_id, name, spec, unit, category, current_price, par_level, current_stock, pack_volume_ml)
    values
      -- spirits
      (p_site_id, v_supplier_ids[2], 'Tanqueray gin',          '70cl',  'L', 'Spirits', 28.00, 4.0, 5.6, 700),
      (p_site_id, v_supplier_ids[2], 'Havana 7yr rum',         '70cl',  'L', 'Spirits', 32.00, 3.0, 3.8, 700),
      (p_site_id, v_supplier_ids[2], 'Buffalo Trace bourbon',  '70cl',  'L', 'Spirits', 36.00, 3.0, 2.4, 700),
      (p_site_id, v_supplier_ids[2], 'Patrón Silver tequila',  '70cl',  'L', 'Spirits', 48.00, 2.0, 1.5, 700),
      (p_site_id, v_supplier_ids[2], 'Campari',                '70cl',  'L', 'Spirits', 22.00, 2.0, 2.4, 700),
      (p_site_id, v_supplier_ids[2], 'Antica Formula vermouth','75cl',  'L', 'Spirits', 26.00, 2.0, 1.8, 750),
      -- citrus + mixers
      (p_site_id, v_supplier_ids[5], 'Fresh lemon',            'Bunch', 'each','Garnish', 0.40, 60.0, 32.0, null),
      (p_site_id, v_supplier_ids[5], 'Fresh lime',             'Bunch', 'each','Garnish', 0.35, 80.0, 90.0, null),
      (p_site_id, v_supplier_ids[5], 'Orange',                 'Each',  'each','Garnish', 0.50, 40.0, 26.0, null),
      (p_site_id, v_supplier_ids[5], 'Mint leaves',            'Bunch', 'each','Garnish', 1.20, 12.0,  6.0, null),
      -- wine + beer + soft
      (p_site_id, v_supplier_ids[3], 'House red (Tempranillo)','75cl', 'L', 'Wine', 11.00, 12.0, 8.2, 750),
      (p_site_id, v_supplier_ids[3], 'House white (Albariño)', '75cl', 'L', 'Wine', 12.50, 10.0, 11.0, 750),
      (p_site_id, v_supplier_ids[1], 'Camden Pale Ale keg',    '30L',  'L', 'Beer', 145.00, 1.0, 0.6, 30000),
      (p_site_id, v_supplier_ids[4], 'Sicilian lemonade',      '750ml','L', 'Soft', 3.20, 8.0, 6.4, 750),
      (p_site_id, v_supplier_ids[4], 'Folkington''s tonic',    '200ml','L', 'Soft', 0.85, 24.0, 18.0, 200)
    returning id
  loop
    v_ingredient_ids := v_ingredient_ids || v_ingredient_id;
  end loop;

  -- Set reorder_point on every bar ingredient as 75% of par. Without
  -- this, par_breach detector finds 0 even though several bottles are
  -- visibly below par.
  update v2.ingredients
     set reorder_point = par_level * 0.75
   where site_id = p_site_id
     and par_level is not null;

  -- ---- Price history ----
  for v_i in 1..array_length(v_ingredient_ids, 1) loop
    insert into v2.ingredient_price_history (ingredient_id, price, source, recorded_at)
    select v_ingredient_ids[v_i],
           (select current_price from v2.ingredients where id = v_ingredient_ids[v_i]) * (1.0 + (random()*0.08 - 0.04)),
           'invoice'::v2.price_source,
           p_today - g.day * interval '1 day' - interval '6 hours'
    from generate_series(28, 4, -8) as g(day);
    v_count_price_history := v_count_price_history + 4;
  end loop;

  -- ---- Recipes (10: 6 cocktails + 2 wine + 1 beer + 1 soft) ----
  for v_recipe_id in
    insert into v2.recipes (site_id, name, menu_section, serves, sell_price, dish_type, cost_baseline, costed_at, glass_type, ice_type, technique, pour_ml, garnish, notes, method)
    values
      (p_site_id, 'Negroni',               'Cocktails', 1, 12.50, 'cocktail'::v2.dish_type, 3.40, p_today - interval '4 days',  'Rocks',     'large rock', 'stir'::v2.cocktail_technique,  90,  'Orange peel',       'Stir 25 rotations.',                    '["Stir","Strain","Garnish"]'::jsonb),
      (p_site_id, 'Old Fashioned',         'Cocktails', 1, 13.00, 'cocktail'::v2.dish_type, 3.80, p_today - interval '5 days',  'Rocks',     'large rock', 'stir'::v2.cocktail_technique,  60,  'Orange peel',       null,                                    '["Sugar+bitters","Add bourbon","Stir","Garnish"]'::jsonb),
      (p_site_id, 'Margarita',             'Cocktails', 1, 12.00, 'cocktail'::v2.dish_type, 3.10, p_today - interval '6 days',  'Coupe',     'none',       'shake'::v2.cocktail_technique, 60,  'Salt rim, lime',     'Salt half the rim only.',               '["Salt rim","Shake","Strain"]'::jsonb),
      (p_site_id, 'Daiquiri',              'Cocktails', 1, 11.50, 'cocktail'::v2.dish_type, 2.80, p_today - interval '7 days',  'Coupe',     'none',       'shake'::v2.cocktail_technique, 60,  'Lime wedge',         null,                                    '["Shake hard","Double strain"]'::jsonb),
      (p_site_id, 'Aperol Spritz',         'Cocktails', 1, 11.00, 'cocktail'::v2.dish_type, 2.40, p_today - interval '8 days',  'Wine glass','cubed',      'build'::v2.cocktail_technique, 60,  'Orange wheel',       null,                                    '["Pour over ice","Top with prosecco"]'::jsonb),
      (p_site_id, 'Espresso Martini',      'Cocktails', 1, 13.50, 'cocktail'::v2.dish_type, 3.90, p_today - interval '32 days', 'Coupe',     'none',       'shake'::v2.cocktail_technique, 60,  'Coffee beans',       'Pull fresh espresso. Stale costed.',    '["Pull espresso","Shake hard"]'::jsonb),
      (p_site_id, 'House red (175ml)',     'Wine',      1, 8.00,  'wine'::v2.dish_type,    2.60, p_today - interval '12 days', null,        null,         null,                            175, null,                  'Tempranillo, served at room temp.',     '["Pour"]'::jsonb),
      (p_site_id, 'House white (175ml)',   'Wine',      1, 8.50,  'wine'::v2.dish_type,    2.90, p_today - interval '14 days', null,        null,         null,                            175, null,                  'Albariño, chilled.',                     '["Pour"]'::jsonb),
      (p_site_id, 'Camden Pale (pint)',    'Beer',      1, 6.50,  'beer'::v2.dish_type,    2.10, p_today - interval '10 days', 'Pint',      null,         null,                            568, null,                  null,                                    '["Pour clean line"]'::jsonb),
      (p_site_id, 'Sicilian lemonade',     'Soft',      1, 4.50,  'soft'::v2.dish_type,    1.20, p_today - interval '6 days',  'Highball',  'cubed',      'build'::v2.cocktail_technique, 250, 'Lemon wheel',        null,                                    '["Pour over ice"]'::jsonb)
    returning id
  loop
    v_recipe_ids := v_recipe_ids || v_recipe_id;
  end loop;
  v_count_recipes := array_length(v_recipe_ids, 1);

  -- ---- Recipe ingredients ----
  insert into v2.recipe_ingredients (recipe_id, ingredient_id, name, qty, unit, position)
  values
    -- Negroni: gin + Campari + vermouth
    (v_recipe_ids[1], v_ingredient_ids[1], 'Tanqueray gin', 30, 'ml', 0),
    (v_recipe_ids[1], v_ingredient_ids[5], 'Campari',       30, 'ml', 1),
    (v_recipe_ids[1], v_ingredient_ids[6], 'Antica Formula', 30, 'ml', 2),
    (v_recipe_ids[1], v_ingredient_ids[9], 'Orange',         0.1, 'each', 3),
    -- Old Fashioned: bourbon + orange
    (v_recipe_ids[2], v_ingredient_ids[3], 'Buffalo Trace',  60, 'ml', 0),
    (v_recipe_ids[2], v_ingredient_ids[9], 'Orange',         0.1, 'each', 1),
    -- Margarita: tequila + lime
    (v_recipe_ids[3], v_ingredient_ids[4], 'Patrón Silver',  50, 'ml', 0),
    (v_recipe_ids[3], v_ingredient_ids[8], 'Lime',           1, 'each', 1),
    -- Daiquiri: rum + lime
    (v_recipe_ids[4], v_ingredient_ids[2], 'Havana 7yr',     50, 'ml', 0),
    (v_recipe_ids[4], v_ingredient_ids[8], 'Lime',           1, 'each', 1),
    -- Aperol Spritz: simplified
    (v_recipe_ids[5], v_ingredient_ids[5], 'Aperol (Campari sub)',  60, 'ml', 0),
    (v_recipe_ids[5], v_ingredient_ids[9], 'Orange wheel',          0.15, 'each', 1),
    -- Espresso Martini: rum + bourbon-ish base
    (v_recipe_ids[6], v_ingredient_ids[2], 'Havana 7yr',     30, 'ml', 0),
    -- Wines + beer + soft
    (v_recipe_ids[7], v_ingredient_ids[11], 'House red',     175, 'ml', 0),
    (v_recipe_ids[8], v_ingredient_ids[12], 'House white',   175, 'ml', 0),
    (v_recipe_ids[9], v_ingredient_ids[13], 'Camden Pale',   568, 'ml', 0),
    (v_recipe_ids[10], v_ingredient_ids[14], 'Sicilian lemonade', 250, 'ml', 0),
    (v_recipe_ids[10], v_ingredient_ids[7],  'Lemon wheel',  0.1, 'each', 1);
  get diagnostics v_count_recipe_ings = row_count;

  -- ---- Menu plan ----
  insert into v2.menu_plans (site_id, surface, name, status, created_by, target_launch, notes)
  values (p_site_id, 'bar', 'Summer cocktail refresh', 'draft', p_owner_user_id, p_today + interval '21 days', 'Lighter spritzes for warmer months.')
  returning id into v_plan_id;

  insert into v2.menu_plan_items (plan_id, recipe_id, action, popularity_rating, position, notes)
  values
    (v_plan_id, v_recipe_ids[1], 'keep',   5, 0, 'Top seller.'),
    (v_plan_id, v_recipe_ids[5], 'keep',   5, 1, 'Summer push.'),
    (v_plan_id, v_recipe_ids[2], 'keep',   4, 2, null),
    (v_plan_id, v_recipe_ids[6], 'revise', 3, 3, 'Update costing — stale.'),
    (v_plan_id, v_recipe_ids[4], 'keep',   3, 4, null),
    (v_plan_id, v_recipe_ids[10],'add',    null, 5, 'New non-alc option.');
  v_count_plan_items := 6;

  -- ---- Invoices + deliveries (5) ----
  for v_i in 1..5 loop
    v_supplier_id := v_supplier_ids[((v_i - 1) % array_length(v_supplier_ids, 1)) + 1];

    insert into v2.deliveries (site_id, supplier_id, expected_at, arrived_at, status, value_estimate, line_count_estimate)
    values (p_site_id, v_supplier_id, p_today - (v_i * 6)::int, p_today - (v_i * 6)::int, 'arrived', 200 + v_i*60, 3)
    returning id into v_delivery_id;

    v_total := round((220 + (v_i * 48))::numeric, 2);
    insert into v2.invoices (site_id, supplier_id, delivery_id, invoice_number, issued_at, received_at, subtotal, vat, total, status, source, delivery_confirmation)
    values (
      p_site_id, v_supplier_id, v_delivery_id,
      'BAR-INV-' || to_char(p_today - (v_i * 6)::int, 'YYYYMMDD') || '-' || lpad(v_i::text, 3, '0'),
      p_today - (v_i * 6)::int, p_today - (v_i * 6)::int,
      v_total, round(v_total * 0.2, 2), round(v_total * 1.2, 2),
      'confirmed'::v2.invoice_status, 'scanned'::v2.invoice_source, 'confirmed'::v2.delivery_confirmation
    )
    returning id into v_invoice_id;
    v_count_invoices := v_count_invoices + 1;

    insert into v2.invoice_lines (invoice_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, vat_rate, position)
    values
      (v_invoice_id, v_ingredient_ids[1],  'Tanqueray gin 70cl',  3.0, 'L',    28.00, 84.00, 0.20, 0),
      (v_invoice_id, v_ingredient_ids[11], 'House red 75cl',      6.0, 'L',    11.00, 66.00, 0.20, 1),
      (v_invoice_id, v_ingredient_ids[7],  'Fresh lemon',         24.0, 'each', 0.40,  9.60, 0.20, 2);
    v_count_lines := v_count_lines + 3;
  end loop;

  -- ---- Purchase order (1 sent) ----
  insert into v2.purchase_orders (site_id, supplier_id, reference, status, total, currency, expected_at, sent_at, created_by, notes)
  values (p_site_id, v_supplier_ids[2], 'BAR-PO-' || to_char(p_today - 1, 'YYYYMMDD') || '-001', 'sent', 196.00, 'GBP', p_today + interval '2 days', p_today - interval '1 day', p_owner_user_id, 'Weekly spirits top-up')
  returning id into v_po_id;

  insert into v2.purchase_order_lines (purchase_order_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, position)
  values
    (v_po_id, v_ingredient_ids[1], 'Tanqueray gin',          4.0, 'L', 28.00, 112.00, 0),
    (v_po_id, v_ingredient_ids[4], 'Patrón Silver tequila',  1.0, 'L', 48.00,  48.00, 1),
    (v_po_id, v_ingredient_ids[5], 'Campari',                2.0, 'L', 22.00,  44.00, 2);
  v_count_po_lines := 3;

  -- ---- Prep (6) ----
  for v_d in 0..5 loop
    insert into v2.prep_items (site_id, prep_date, station, name, qty, qty_unit, status, assigned_label, started_at, finished_at)
    values (
      p_site_id, p_today - v_d, 'Bar',
      case v_d
        when 0 then 'Garnish prep — citrus twists' when 1 then 'Cordial — homemade lime'
        when 2 then 'Polish glassware'  when 3 then 'Restock back bar speed rail'
        when 4 then 'Syrup — gomme'    else 'Ice bucket fill'
      end,
      1.0, 'batch',
      case when v_d = 0 then 'in_progress'::v2.prep_status else 'done'::v2.prep_status end,
      'Mia',
      (p_today - v_d)::timestamptz + interval '15 hours',
      case when v_d = 0 then null else (p_today - v_d)::timestamptz + interval '16 hours' end
    );
    v_count_prep := v_count_prep + 1;
  end loop;

  -- ---- Waste (8: spillage / breakage) ----
  -- First 4 entries cluster on Patrón (ingredient index 4) so the
  -- spillage_pattern detector fires (needs 3+ same ingredient in 14d).
  -- Remaining 4 spread across the rest as before.
  for v_i in 1..8 loop
    insert into v2.waste_entries (site_id, ingredient_id, logged_by, logged_at, name, qty, qty_unit, value, category, spillage_reason, reason_md)
    values (
      p_site_id,
      case when v_i <= 4 then v_ingredient_ids[4]
           else v_ingredient_ids[((v_i - 1) % array_length(v_ingredient_ids, 1)) + 1]
      end,
      p_owner_user_id,
      (p_today - (v_i * 2)::int)::timestamptz + interval '20 hours',
      case when v_i <= 4 then (select name from v2.ingredients where id = v_ingredient_ids[4])
           else (select name from v2.ingredients where id = v_ingredient_ids[((v_i - 1) % array_length(v_ingredient_ids, 1)) + 1])
      end,
      0.05 + (v_i * 0.02),
      'L',
      (0.05 + (v_i * 0.02)) * case when v_i <= 4 then (select current_price from v2.ingredients where id = v_ingredient_ids[4])
                                   else (select current_price from v2.ingredients where id = v_ingredient_ids[((v_i - 1) % array_length(v_ingredient_ids, 1)) + 1])
                              end,
      'accident'::v2.waste_category,
      (array['over_pour','breakage','spillage','comp','returned']::v2.spillage_reason[])[((v_i - 1) % 5) + 1],
      case v_i % 3 when 0 then 'Glass dropped' when 1 then 'Over-pour during rush' else 'Returned drink — wrong order' end
    );
    v_count_waste := v_count_waste + 1;
  end loop;

  -- ---- Notebook (3) ----
  insert into v2.notebook_entries (site_id, authored_by, kind, title, body_md, tags, linked_recipe_ids)
  values
    (p_site_id, p_owner_user_id, 'note'::v2.notebook_kind, 'Negroni — drier ratio test', 'Tried 35/25/30 gin/Campari/vermouth — too austere. Sticking with classic 30/30/30.', '["iteration"]'::jsonb, array[v_recipe_ids[1]]),
    (p_site_id, p_owner_user_id, 'note'::v2.notebook_kind, 'Service notes — Fri',     'Espresso Martini ran 18 covers. Push more — high margin.',                                 '["service"]'::jsonb,    array[v_recipe_ids[6]]),
    (p_site_id, p_owner_user_id, 'note'::v2.notebook_kind, 'Spritz spec for summer',  'Need a low-ABV anchor on the summer board. Aperol + Lillet test next week.',              '["planning","summer"]'::jsonb, '{}'::uuid[]);
  v_count_notebook := 3;

  return jsonb_build_object(
    'suppliers',       array_length(v_supplier_ids, 1),
    'ingredients',     array_length(v_ingredient_ids, 1),
    'price_history',   v_count_price_history,
    'recipes',         v_count_recipes,
    'recipe_ingredients', v_count_recipe_ings,
    'menu_plans',      1,
    'menu_plan_items', v_count_plan_items,
    'invoices',        v_count_invoices,
    'invoice_lines',   v_count_lines,
    'purchase_orders', 1,
    'po_lines',        v_count_po_lines,
    'credit_notes',    0,
    'stock_take_lines', 0,
    'prep_items',      v_count_prep,
    'waste_entries',   v_count_waste,
    'notebook_entries', v_count_notebook,
    'safety_opening_checks', 0,
    'safety_probe_readings', 0,
    'safety_cleaning_tasks', 0,
    'safety_cleaning_signoffs', 0,
    'safety_training', 0,
    'safety_incidents', 0
  );
end $$;

comment on function v2._seed_demo_bar_site(uuid, uuid, date) is
  'Internal: seeds a single bar site with 30 days of demo data. Called by populate_demo_account; not for direct use.';
