-- ============================================================
-- Order Export Shipments & Documents
-- Documents may belong directly to an order or to a shipment.
-- ============================================================

alter type audit_action add value if not exists 'delete';

create type shipment_status as enum ('draft', 'shipped', 'documents_complete');

create type export_document_type as enum (
  'buyer_purchase_order', 'proforma_invoice', 'commercial_invoice',
  'packing_list', 'shipping_bill', 'leo_copy', 'bill_of_lading',
  'air_waybill', 'e_way_bill', 'certificate_of_origin',
  'insurance_certificate', 'inward_remittance', 'ebrc', 'other'
);

create table order_shipments (
  id                            uuid primary key default uuid_generate_v4(),
  order_id                      uuid not null references orders(id) on delete cascade,
  shipment_number               text not null,
  status                        shipment_status not null default 'draft',
  transport_mode                text,
  shipment_date                 date,
  shipping_bill_number          text,
  shipping_bill_date            date,
  leo_date                      date,
  bill_of_lading_or_awb_number text,
  notes                         text,
  created_by                    uuid references auth.users(id) on delete set null,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (order_id, shipment_number)
);

create index order_shipments_order_id_idx on order_shipments(order_id);
create index order_shipments_shipping_bill_number_idx on order_shipments(shipping_bill_number) where shipping_bill_number is not null;
create index order_shipments_transport_document_idx on order_shipments(bill_of_lading_or_awb_number) where bill_of_lading_or_awb_number is not null;

create trigger set_order_shipments_updated_at before update on order_shipments
  for each row execute function update_updated_at();

alter table order_shipments enable row level security;
create policy "Authenticated users can view order shipments" on order_shipments for select using (auth.role() = 'authenticated');
create policy "Admins and sales can manage order shipments" on order_shipments for all using (get_jwt_role() in ('admin', 'sales'));

create table export_documents (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references orders(id) on delete cascade,
  shipment_id     uuid references order_shipments(id) on delete cascade,
  document_type   export_document_type not null,
  document_number text,
  document_date   date,
  filename        text not null,
  storage_path    text not null unique,
  mime_type       text,
  file_size       bigint,
  notes           text,
  uploaded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index export_documents_order_id_idx on export_documents(order_id);
create index export_documents_shipment_id_idx on export_documents(shipment_id) where shipment_id is not null;
create index export_documents_document_number_idx on export_documents(document_number) where document_number is not null;

create or replace function validate_export_document_shipment()
returns trigger language plpgsql as $$
begin
  if new.shipment_id is not null and not exists (
    select 1 from order_shipments
    where id = new.shipment_id and order_id = new.order_id
  ) then
    raise exception 'Export document shipment must belong to its order';
  end if;
  return new;
end;
$$;

create trigger validate_export_document_shipment_trigger
  before insert or update of order_id, shipment_id on export_documents
  for each row execute function validate_export_document_shipment();

alter table export_documents enable row level security;
create policy "Authenticated users can view export documents" on export_documents for select using (auth.role() = 'authenticated');
create policy "Admins and sales can manage export documents" on export_documents for all using (get_jwt_role() in ('admin', 'sales'));

insert into storage.buckets (id, name, public) values ('export-documents', 'export-documents', false)
on conflict (id) do update set public = false;

create policy "Authenticated users can view export files" on storage.objects for select using (bucket_id = 'export-documents' and auth.role() = 'authenticated');
create policy "Admins and sales can upload export files" on storage.objects for insert with check (bucket_id = 'export-documents' and get_jwt_role() in ('admin', 'sales'));
create policy "Admins and sales can update export files" on storage.objects for update using (bucket_id = 'export-documents' and get_jwt_role() in ('admin', 'sales'));
create policy "Admins and sales can delete export files" on storage.objects for delete using (bucket_id = 'export-documents' and get_jwt_role() in ('admin', 'sales'));
