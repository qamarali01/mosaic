-- ============================================================
-- Shipment consolidation and confirmed packing-list workflow
-- ============================================================

create type packing_proposal_status as enum ('pending_review', 'confirmed', 'rejected');
create type generated_document_status as enum ('queued', 'processing', 'completed', 'failed');
create type generated_document_kind as enum ('proforma', 'commercial_invoice', 'packing_list');

create table shipments (
  id uuid primary key default uuid_generate_v4(),
  shipment_number text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  status shipment_status not null default 'draft',
  transport_mode text,
  shipment_date date,
  shipping_bill_number text,
  shipping_bill_date date,
  leo_date date,
  bill_of_lading_or_awb_number text,
  vessel_or_flight_number text,
  place_of_receipt text,
  port_of_loading text,
  port_of_discharge text,
  final_destination text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shipments_customer_id_idx on shipments(customer_id);
create trigger set_shipments_updated_at before update on shipments
  for each row execute function update_updated_at();

alter table shipments enable row level security;
create policy "Authenticated users can view shipments" on shipments
  for select using (auth.role() = 'authenticated');
create policy "Admins and sales can manage shipments" on shipments
  for all using (get_jwt_role() in ('admin', 'sales'));

create table shipment_orders (
  shipment_id uuid not null references shipments(id) on delete cascade,
  order_id uuid not null unique references orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (shipment_id, order_id)
);

alter table shipment_orders enable row level security;
create policy "Authenticated users can view shipment orders" on shipment_orders
  for select using (auth.role() = 'authenticated');
create policy "Admins and sales can manage shipment orders" on shipment_orders
  for all using (get_jwt_role() in ('admin', 'sales'));

create table shipment_cartons (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  carton_number text not null,
  quantity integer not null default 1 check (quantity > 0),
  length numeric(10,2),
  width numeric(10,2),
  height numeric(10,2),
  dimension_unit text not null default 'in',
  gross_weight_kg numeric(12,3) not null check (gross_weight_kg >= 0),
  tare_weight_kg numeric(12,3) not null default 2.5 check (tare_weight_kg = 2.5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shipment_id, carton_number)
);

create trigger set_shipment_cartons_updated_at before update on shipment_cartons
  for each row execute function update_updated_at();
alter table shipment_cartons enable row level security;
create policy "Authenticated users can view shipment cartons" on shipment_cartons
  for select using (auth.role() = 'authenticated');
create policy "Admins and sales can manage shipment cartons" on shipment_cartons
  for all using (get_jwt_role() in ('admin', 'sales'));

create table shipment_carton_items (
  id uuid primary key default uuid_generate_v4(),
  carton_id uuid not null references shipment_cartons(id) on delete cascade,
  order_item_id uuid not null references order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

alter table shipment_carton_items enable row level security;
create policy "Authenticated users can view carton items" on shipment_carton_items
  for select using (auth.role() = 'authenticated');
create policy "Admins and sales can manage carton items" on shipment_carton_items
  for all using (get_jwt_role() in ('admin', 'sales'));

create table packing_proposals (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  revision integer not null default 1,
  status packing_proposal_status not null default 'pending_review',
  source_filename text,
  extraction_notes text,
  extracted_data jsonb not null,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (shipment_id, revision)
);

alter table packing_proposals enable row level security;
create policy "Authenticated users can view packing proposals" on packing_proposals
  for select using (auth.role() = 'authenticated');
create policy "Admins and sales can manage packing proposals" on packing_proposals
  for all using (get_jwt_role() in ('admin', 'sales'));

create table generated_documents (
  id uuid primary key default uuid_generate_v4(),
  kind generated_document_kind not null,
  quote_id uuid references quotes(id) on delete set null,
  shipment_id uuid references shipments(id) on delete set null,
  proposal_id uuid references packing_proposals(id) on delete set null,
  source_snapshot jsonb not null,
  template_version text not null default '2026-01',
  status generated_document_status not null default 'queued',
  xlsx_storage_path text,
  pdf_storage_path text,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index generated_documents_quote_idx on generated_documents(quote_id);
create index generated_documents_shipment_idx on generated_documents(shipment_id);
alter table generated_documents enable row level security;
create policy "Authenticated users can view generated documents" on generated_documents
  for select using (auth.role() = 'authenticated');
create policy "Admins and sales can manage generated documents" on generated_documents
  for all using (get_jwt_role() in ('admin', 'sales'));
