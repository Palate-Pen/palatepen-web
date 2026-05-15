-- Founder demo seed for purchase orders.
-- Paste into Supabase SQL editor AFTER running 20260515_v2_purchase_orders.sql.
--
-- Generates three illustrative POs on the founder site
-- (9dc96352-d0eb-407e-a0aa-e59cbd7c0220):
--
--   1. PO-{today}-DRAFT01 — draft for the top supplier, 3 lines
--   2. PO-{today}-SENT001 — sent yesterday, awaiting receipt, 4 lines
--   3. PO-{today}-RECVD01 — received last week, closed, 3 lines

do $$
declare
  v_site_id uuid := '9dc96352-d0eb-407e-a0aa-e59cbd7c0220';
  v_supplier_a uuid;
  v_supplier_b uuid;
  v_supplier_c uuid;
  v_ing_1 uuid; v_ing_2 uuid; v_ing_3 uuid;
  v_po_draft uuid;
  v_po_sent uuid;
  v_po_recvd uuid;
  v_date_str text := to_char(now(), 'YYYYMMDD');
begin
  -- Pick three suppliers that have ingredients linked to them.
  select s.id into v_supplier_a
  from v2.suppliers s
  where s.site_id = v_site_id
  order by s.created_at asc
  limit 1;

  select s.id into v_supplier_b
  from v2.suppliers s
  where s.site_id = v_site_id and s.id <> v_supplier_a
  order by s.created_at asc
  offset 1 limit 1;

  select s.id into v_supplier_c
  from v2.suppliers s
  where s.site_id = v_site_id and s.id <> v_supplier_a and s.id <> v_supplier_b
  order by s.created_at asc
  offset 2 limit 1;

  if v_supplier_a is null then
    raise notice 'No suppliers on founder site — seed skipped.';
    return;
  end if;

  -- ---- DRAFT --------------------------------------------------------
  insert into v2.purchase_orders
    (site_id, supplier_id, reference, status, total, currency, notes)
  values
    (v_site_id, v_supplier_a, 'PO-' || v_date_str || '-DRAFT01',
     'draft', 0, 'GBP',
     'Auto-drafted from items below par. Review qty and price before sending.')
  returning id into v_po_draft;

  -- Pick three ingredients from this supplier
  select i.id into v_ing_1 from v2.ingredients i
    where i.site_id = v_site_id and i.supplier_id = v_supplier_a
    order by i.name limit 1;
  select i.id into v_ing_2 from v2.ingredients i
    where i.site_id = v_site_id and i.supplier_id = v_supplier_a and i.id <> v_ing_1
    order by i.name offset 1 limit 1;
  select i.id into v_ing_3 from v2.ingredients i
    where i.site_id = v_site_id and i.supplier_id = v_supplier_a and i.id <> v_ing_1 and i.id <> v_ing_2
    order by i.name offset 2 limit 1;

  insert into v2.purchase_order_lines
    (purchase_order_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, position)
  select
    v_po_draft,
    i.id,
    i.name,
    case row_number() over (order by i.name) when 1 then 5 when 2 then 8 else 3 end,
    coalesce(i.unit, 'each'),
    i.current_price,
    case row_number() over (order by i.name)
      when 1 then coalesce(i.current_price, 0) * 5
      when 2 then coalesce(i.current_price, 0) * 8
      else        coalesce(i.current_price, 0) * 3
    end,
    row_number() over (order by i.name) - 1
  from v2.ingredients i
  where i.id in (v_ing_1, v_ing_2, v_ing_3)
    and i.id is not null;

  update v2.purchase_orders po
  set total = coalesce(
    (select sum(line_total) from v2.purchase_order_lines where purchase_order_id = po.id),
    0
  )
  where id = v_po_draft;

  -- ---- SENT ---------------------------------------------------------
  if v_supplier_b is not null then
    insert into v2.purchase_orders
      (site_id, supplier_id, reference, status, total, currency,
       sent_at, expected_at, notes)
    values
      (v_site_id, v_supplier_b, 'PO-' || v_date_str || '-SENT001',
       'sent', 0, 'GBP',
       now() - interval '1 day',
       (now() + interval '2 days')::date,
       'Standard weekly order. Confirmed by phone.')
    returning id into v_po_sent;

    insert into v2.purchase_order_lines
      (purchase_order_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, position)
    select
      v_po_sent,
      i.id,
      i.name,
      case row_number() over (order by i.name) when 1 then 10 when 2 then 6 when 3 then 4 else 2 end,
      coalesce(i.unit, 'each'),
      i.current_price,
      case row_number() over (order by i.name)
        when 1 then coalesce(i.current_price, 0) * 10
        when 2 then coalesce(i.current_price, 0) * 6
        when 3 then coalesce(i.current_price, 0) * 4
        else        coalesce(i.current_price, 0) * 2
      end,
      row_number() over (order by i.name) - 1
    from v2.ingredients i
    where i.site_id = v_site_id and i.supplier_id = v_supplier_b
    order by i.name
    limit 4;

    update v2.purchase_orders po
    set total = coalesce(
      (select sum(line_total) from v2.purchase_order_lines where purchase_order_id = po.id),
      0
    )
    where id = v_po_sent;
  end if;

  -- ---- RECEIVED -----------------------------------------------------
  if v_supplier_c is not null then
    insert into v2.purchase_orders
      (site_id, supplier_id, reference, status, total, currency,
       sent_at, confirmed_at, received_at, expected_at, notes)
    values
      (v_site_id, v_supplier_c, 'PO-' || v_date_str || '-RECVD01',
       'received', 0, 'GBP',
       now() - interval '8 days',
       now() - interval '7 days',
       now() - interval '6 days',
       (now() - interval '6 days')::date,
       'Closed cycle. Lines came in at quoted prices — Bank updated via invoice scan.')
    returning id into v_po_recvd;

    insert into v2.purchase_order_lines
      (purchase_order_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, position)
    select
      v_po_recvd,
      i.id,
      i.name,
      case row_number() over (order by i.name) when 1 then 4 when 2 then 6 else 8 end,
      coalesce(i.unit, 'each'),
      i.current_price,
      case row_number() over (order by i.name)
        when 1 then coalesce(i.current_price, 0) * 4
        when 2 then coalesce(i.current_price, 0) * 6
        else        coalesce(i.current_price, 0) * 8
      end,
      row_number() over (order by i.name) - 1
    from v2.ingredients i
    where i.site_id = v_site_id and i.supplier_id = v_supplier_c
    order by i.name
    limit 3;

    update v2.purchase_orders po
    set total = coalesce(
      (select sum(line_total) from v2.purchase_order_lines where purchase_order_id = po.id),
      0
    )
    where id = v_po_recvd;
  end if;
end $$;

-- Verify
select status, count(*) as n, sum(total) as total_value
from v2.purchase_orders
where site_id = '9dc96352-d0eb-407e-a0aa-e59cbd7c0220'
group by status
order by status;
