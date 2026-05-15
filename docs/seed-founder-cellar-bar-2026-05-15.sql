-- Founder demo seed for the second site: Palatable Cellar Bar.
-- Paste into Supabase SQL editor.
--
-- Adds a second site under the founder account so the /owner shell
-- rollups, cross-site Bank comparison, and group dashboard tiles
-- actually have multi-site data to render.
--
-- The new site is a bar venue: bar-relevant ingredients (spirits,
-- wines, beers, soft), bar suppliers (Liberty Wines, Speciality
-- Drinks, etc.), and a handful of priced cocktail specs.
--
-- Two ingredients deliberately overlap with the main kitchen so the
-- cross-site Bank comparison surfaces "olive oil costs X here, Y there".

do $$
declare
  v_account_id uuid := '1299af05-8556-4011-b059-12e353d6f833'; -- founder account
  v_main_site_id uuid := '9dc96352-d0eb-407e-a0aa-e59cbd7c0220'; -- existing kitchen
  v_bar_site_id uuid;
  v_jack_user_id uuid;

  v_sup_liberty uuid;
  v_sup_speciality uuid;
  v_sup_local_brew uuid;

  v_ing_aperol uuid;
  v_ing_prosecco uuid;
  v_ing_campari uuid;
  v_ing_gin uuid;
  v_ing_tonic uuid;
  v_ing_lime uuid;
  v_ing_orange_bitters uuid;
  v_ing_sweet_vermouth uuid;
  v_ing_neck_oil uuid;
  v_ing_olive_oil uuid;
  v_ing_picon uuid;
  v_ing_soda uuid;

  v_rec_spritz uuid;
  v_rec_negroni uuid;
  v_rec_g_and_t uuid;
  v_rec_white_lady uuid;
  v_rec_americano uuid;
begin
  -- ---- 1. Jack@ user_id from existing membership ----------------
  select user_id into v_jack_user_id
  from v2.memberships
  where site_id = v_main_site_id and role = 'owner'
  limit 1;

  if v_jack_user_id is null then
    raise exception 'No owner membership on main founder site — seed aborted.';
  end if;

  -- Bail early if Cellar Bar already exists (idempotent re-run)
  select id into v_bar_site_id
  from v2.sites
  where account_id = v_account_id and name = 'Palatable Cellar Bar'
  limit 1;

  if v_bar_site_id is not null then
    raise notice 'Palatable Cellar Bar already seeded (site_id %). Skipping.', v_bar_site_id;
    return;
  end if;

  -- ---- 2. Site + membership --------------------------------------
  insert into v2.sites (account_id, name, kind)
  values (v_account_id, 'Palatable Cellar Bar', 'bar')
  returning id into v_bar_site_id;

  insert into v2.memberships (user_id, site_id, role)
  values (v_jack_user_id, v_bar_site_id, 'owner');

  -- ---- 3. Suppliers ---------------------------------------------
  insert into v2.suppliers (site_id, name, contact_person, phone, email, payment_terms)
  values
    (v_bar_site_id, 'Liberty Wines', 'Tom Reeves', '020 7720 5350', 'orders@libertywines.co.uk', '30 days'),
    (v_bar_site_id, 'Speciality Drinks', 'Hannah Patel', '020 8838 8845', 'trade@specialitydrinks.com', '14 days'),
    (v_bar_site_id, 'Local Brew Co', 'Marcus Lin', NULL, 'orders@localbrewco.uk', '7 days')
  returning id, name into v_sup_liberty;
  -- Re-read by name (only one returns via RETURNING when multi-row inserts; safer to query)
  select id into v_sup_liberty from v2.suppliers
    where site_id = v_bar_site_id and name = 'Liberty Wines';
  select id into v_sup_speciality from v2.suppliers
    where site_id = v_bar_site_id and name = 'Speciality Drinks';
  select id into v_sup_local_brew from v2.suppliers
    where site_id = v_bar_site_id and name = 'Local Brew Co';

  -- ---- 4. Ingredients (bar-relevant) -----------------------------
  insert into v2.ingredients
    (site_id, supplier_id, name, spec, unit, category, current_price, last_seen_at,
     par_level, current_stock, reorder_point)
  values
    (v_bar_site_id, v_sup_liberty, 'Aperol', '700ml',  'ml', 'spirits',   0.0228, now() - interval '3 days', 4, 2, 2),
    (v_bar_site_id, v_sup_liberty, 'Prosecco', '750ml','ml', 'wine',      0.0150, now() - interval '5 days', 12, 14, 8),
    (v_bar_site_id, v_sup_speciality, 'Campari', '700ml','ml','spirits',  0.0291, now() - interval '7 days', 3, 1, 2),
    (v_bar_site_id, v_sup_speciality, 'Sipsmith Gin','700ml','ml','spirits',0.0418,now() - interval '2 days', 4, 3, 2),
    (v_bar_site_id, v_sup_speciality, 'Sweet Vermouth','750ml','ml','spirits',0.0181,now() - interval '4 days', 3, 4, 2),
    (v_bar_site_id, v_sup_speciality, 'Orange Bitters','100ml','ml','spirits',0.1450,now() - interval '14 days', 1, 1, 1),
    (v_bar_site_id, v_sup_local_brew, 'Fever-Tree Tonic','200ml','ml','soft',0.0140,now() - interval '1 day', 50, 32, 24),
    (v_bar_site_id, v_sup_local_brew, 'Soda Water','200ml','ml','soft',     0.0050,now() - interval '1 day', 40, 48, 20),
    (v_bar_site_id, v_sup_local_brew, 'Beavertown Neck Oil','330ml','ml','beer',0.0091,now() - interval '2 days', 60, 36, 30),
    -- Fresh / garnish
    (v_bar_site_id, NULL,             'Lime','each',   'each','garnish',  0.30,   now() - interval '1 day', 30, 18, 12),
    -- Two intentionally overlap with kitchen: olive oil + picon (so cross-site Bank shows them)
    (v_bar_site_id, v_sup_liberty,    'Olive Oil','1L', 'ml',  'oil',     0.0145, now() - interval '6 days', 2, 1, 1),
    (v_bar_site_id, v_sup_speciality, 'Amer Picon','750ml','ml','spirits',0.0623, now() - interval '10 days', 2, 2, 1);

  -- Pull ids by name for the recipes below
  select id into v_ing_aperol from v2.ingredients where site_id = v_bar_site_id and name = 'Aperol';
  select id into v_ing_prosecco from v2.ingredients where site_id = v_bar_site_id and name = 'Prosecco';
  select id into v_ing_campari from v2.ingredients where site_id = v_bar_site_id and name = 'Campari';
  select id into v_ing_gin from v2.ingredients where site_id = v_bar_site_id and name = 'Sipsmith Gin';
  select id into v_ing_tonic from v2.ingredients where site_id = v_bar_site_id and name = 'Fever-Tree Tonic';
  select id into v_ing_lime from v2.ingredients where site_id = v_bar_site_id and name = 'Lime';
  select id into v_ing_sweet_vermouth from v2.ingredients where site_id = v_bar_site_id and name = 'Sweet Vermouth';
  select id into v_ing_soda from v2.ingredients where site_id = v_bar_site_id and name = 'Soda Water';
  select id into v_ing_orange_bitters from v2.ingredients where site_id = v_bar_site_id and name = 'Orange Bitters';

  -- ---- 5. Cocktail specs (priced) --------------------------------
  insert into v2.recipes
    (site_id, name, dish_type, menu_section, serves, portion_per_cover, sell_price,
     glass_type, ice_type, technique, pour_ml)
  values
    (v_bar_site_id, 'Aperol Spritz',  'cocktail', 'classics',   1, 1, 9.50,  'wine glass',   'cubed','build', 165),
    (v_bar_site_id, 'Negroni',        'cocktail', 'classics',   1, 1, 11.00, 'rocks',        'big cube','stir', 90),
    (v_bar_site_id, 'Gin & Tonic',    'cocktail', 'classics',   1, 1, 8.50,  'highball',     'cubed','build', 250),
    (v_bar_site_id, 'Americano',      'cocktail', 'classics',   1, 1, 10.00, 'highball',     'cubed','build', 175),
    (v_bar_site_id, 'White Lady',     'cocktail', 'signatures', 1, 1, 12.00, 'coupe',        'none', 'shake', 100);

  select id into v_rec_spritz from v2.recipes where site_id = v_bar_site_id and name = 'Aperol Spritz';
  select id into v_rec_negroni from v2.recipes where site_id = v_bar_site_id and name = 'Negroni';
  select id into v_rec_g_and_t from v2.recipes where site_id = v_bar_site_id and name = 'Gin & Tonic';
  select id into v_rec_americano from v2.recipes where site_id = v_bar_site_id and name = 'Americano';
  select id into v_rec_white_lady from v2.recipes where site_id = v_bar_site_id and name = 'White Lady';

  insert into v2.recipe_ingredients
    (recipe_id, ingredient_id, name, qty, unit, position)
  values
    -- Aperol Spritz: 50ml aperol, 75ml prosecco, 30ml soda
    (v_rec_spritz, v_ing_aperol,   'Aperol',         50, 'ml', 0),
    (v_rec_spritz, v_ing_prosecco, 'Prosecco',       75, 'ml', 1),
    (v_rec_spritz, v_ing_soda,     'Soda Water',     30, 'ml', 2),
    -- Negroni: 30/30/30
    (v_rec_negroni, v_ing_gin,            'Sipsmith Gin',     30, 'ml', 0),
    (v_rec_negroni, v_ing_campari,        'Campari',          30, 'ml', 1),
    (v_rec_negroni, v_ing_sweet_vermouth, 'Sweet Vermouth',   30, 'ml', 2),
    -- G&T
    (v_rec_g_and_t, v_ing_gin,   'Sipsmith Gin',         50, 'ml', 0),
    (v_rec_g_and_t, v_ing_tonic, 'Fever-Tree Tonic',     200,'ml', 1),
    -- Americano: 30/30/120 soda
    (v_rec_americano, v_ing_campari,        'Campari',         30, 'ml', 0),
    (v_rec_americano, v_ing_sweet_vermouth, 'Sweet Vermouth',  30, 'ml', 1),
    (v_rec_americano, v_ing_soda,           'Soda Water',      120,'ml', 2),
    -- White Lady: 40 gin / 20 cointreau (sub: orange bitters as placeholder) / 20 lemon
    (v_rec_white_lady, v_ing_gin,            'Sipsmith Gin',    40, 'ml', 0),
    (v_rec_white_lady, v_ing_orange_bitters, 'Orange Bitters',   3, 'ml', 1);

  -- Bake cost_baseline so margins show as healthy from the start
  update v2.recipes
  set cost_baseline = coalesce(
    (select sum(coalesce(ri.qty, 0) * coalesce(i.current_price, 0))
     from v2.recipe_ingredients ri
     left join v2.ingredients i on i.id = ri.ingredient_id
     where ri.recipe_id = v2.recipes.id),
    0
  ),
  costed_at = now()
  where site_id = v_bar_site_id;

  -- ---- 6. Sample PO (sent, awaiting delivery) --------------------
  declare
    v_po_id uuid;
    v_date_str text := to_char(now(), 'YYYYMMDD');
  begin
    insert into v2.purchase_orders
      (site_id, supplier_id, reference, status, total, currency, sent_at, expected_at, notes)
    values
      (v_bar_site_id, v_sup_speciality, 'PO-' || v_date_str || '-BAR0001',
       'sent', 0, 'GBP',
       now() - interval '2 days',
       (now() + interval '1 day')::date,
       'Weekly bar restock. Campari + gin running low.')
    returning id into v_po_id;

    insert into v2.purchase_order_lines
      (purchase_order_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, position)
    values
      (v_po_id, v_ing_campari, 'Campari',       3, '700ml bottle', 20.40, 61.20, 0),
      (v_po_id, v_ing_gin,     'Sipsmith Gin',  6, '700ml bottle', 29.26, 175.56, 1);

    update v2.purchase_orders
    set total = coalesce(
      (select sum(line_total) from v2.purchase_order_lines where purchase_order_id = v_po_id),
      0
    )
    where id = v_po_id;
  end;

  raise notice 'Palatable Cellar Bar seeded successfully (site_id %).', v_bar_site_id;
end $$;

-- Verify
select s.name, s.kind, s.id,
  (select count(*) from v2.ingredients i where i.site_id = s.id) as ingredients,
  (select count(*) from v2.recipes r where r.site_id = s.id) as recipes,
  (select count(*) from v2.suppliers su where su.site_id = s.id) as suppliers,
  (select count(*) from v2.purchase_orders po where po.site_id = s.id) as purchase_orders
from v2.sites s
where s.account_id = '1299af05-8556-4011-b059-12e353d6f833'
order by s.created_at;
