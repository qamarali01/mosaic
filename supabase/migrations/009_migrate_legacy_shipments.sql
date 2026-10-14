-- ============================================================
-- Migrate legacy order-specific shipments into shared shipments
-- ============================================================

do $$
declare
  legacy record;
  existing_shipment_id uuid;
  new_shipment_id uuid;
  candidate_number text;
begin
  -- Keep the most recently updated legacy shipment when bad/test data contains
  -- more than one shipment row for the same order.
  for legacy in
    select *
    from (
      select
        os.*,
        o.customer_id,
        row_number() over (
          partition by os.order_id
          order by os.updated_at desc nulls last, os.created_at desc, os.id desc
        ) as row_number
      from order_shipments os
      join orders o on o.id = os.order_id
    ) ranked
    where ranked.row_number = 1
  loop
    -- Never reassign an order that is already attached to a shared shipment.
    select so.shipment_id
      into existing_shipment_id
      from shipment_orders so
      where so.order_id = legacy.order_id;

    if existing_shipment_id is not null then
      continue;
    end if;

    candidate_number := coalesce(nullif(trim(legacy.shipment_number), ''), 'LEGACY-' || left(legacy.id::text, 8));

    -- Legacy shipment numbers were only unique per order. Add a short suffix
    -- when two historical orders used the same number.
    if exists (select 1 from shipments where shipment_number = candidate_number) then
      candidate_number := left(candidate_number, 88) || '-' || left(legacy.id::text, 8);
    end if;

    insert into shipments (
      shipment_number,
      customer_id,
      status,
      transport_mode,
      shipment_date,
      shipping_bill_number,
      shipping_bill_date,
      leo_date,
      bill_of_lading_or_awb_number,
      notes,
      created_by,
      created_at,
      updated_at
    ) values (
      candidate_number,
      legacy.customer_id,
      legacy.status,
      legacy.transport_mode,
      legacy.shipment_date,
      legacy.shipping_bill_number,
      legacy.shipping_bill_date,
      legacy.leo_date,
      legacy.bill_of_lading_or_awb_number,
      legacy.notes,
      legacy.created_by,
      legacy.created_at,
      legacy.updated_at
    )
    returning id into new_shipment_id;

    insert into shipment_orders (shipment_id, order_id, created_at)
    values (new_shipment_id, legacy.order_id, legacy.created_at)
    on conflict (order_id) do nothing;
  end loop;
end $$;


