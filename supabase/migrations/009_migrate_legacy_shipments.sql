-- ============================================================
-- Migrate legacy order-specific shipments into shared shipments
-- ============================================================

do $$
declare
  legacy record;
  new_shipment_id uuid;
begin
  for legacy in
    select os.*, o.customer_id
    from order_shipments os
    join orders o on o.id = os.order_id
    where not exists (
      select 1 from shipment_orders so where so.order_id = os.order_id
    )
  loop
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
      legacy.shipment_number,
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
    on conflict (shipment_number) do update set updated_at = excluded.updated_at
    returning id into new_shipment_id;

    insert into shipment_orders (shipment_id, order_id, created_at)
    values (new_shipment_id, legacy.order_id, legacy.created_at)
    on conflict (shipment_id, order_id) do nothing;

    update export_documents
    set shipment_id = legacy.id
    where order_id = legacy.order_id and shipment_id is null;
  end loop;
end $$;



