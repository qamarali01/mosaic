-- ============================================================
-- PIM & Customer Catalog Management System
-- Full Database Migration
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type user_role as enum ('admin', 'sales', 'viewer');
create type record_status as enum ('active', 'archived');
create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected');
create type order_status as enum (
  'pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'
);
create type address_type as enum ('billing', 'shipping');
create type audit_action as enum ('create', 'update', 'archive', 'restore');

-- ─── User Profiles ────────────────────────────────────────────────────────────

create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'viewer',
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "Users can view all profiles" on user_profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can update own profile" on user_profiles
  for update using (auth.uid() = id);

create policy "Admins can manage all profiles" on user_profiles
  for all using (
    exists (
      select 1 from user_profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Collections ─────────────────────────────────────────────────────────────

create table collections (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text,
  cover_image_url text,
  cover_image_path text,
  status          record_status not null default 'active',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_collections_status on collections(status);
create index idx_collections_name_trgm on collections using gin(name gin_trgm_ops);

alter table collections enable row level security;

create policy "Authenticated users can view collections" on collections
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage collections" on collections
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Products ─────────────────────────────────────────────────────────────────

create table products (
  id            uuid primary key default uuid_generate_v4(),
  internal_sku  text not null unique,
  name          text not null,
  description   text,
  collection_id uuid references collections(id) on delete set null,
  status        record_status not null default 'active',
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_products_status on products(status);
create index idx_products_collection on products(collection_id);
create index idx_products_sku on products(internal_sku);
create index idx_products_name_trgm on products using gin(name gin_trgm_ops);
create index idx_products_sku_trgm on products using gin(internal_sku gin_trgm_ops);

alter table products enable row level security;

create policy "Authenticated users can view products" on products
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage products" on products
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Product Images ───────────────────────────────────────────────────────────

create table product_images (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references products(id) on delete cascade,
  url          text not null,
  storage_path text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index idx_product_images_product on product_images(product_id);

alter table product_images enable row level security;

create policy "Authenticated users can view product images" on product_images
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage product images" on product_images
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Product Documents ────────────────────────────────────────────────────────

create table product_documents (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references products(id) on delete cascade,
  name         text not null,
  url          text not null,
  storage_path text not null,
  file_size    bigint,
  mime_type    text,
  created_at   timestamptz not null default now()
);

create index idx_product_documents_product on product_documents(product_id);

alter table product_documents enable row level security;

create policy "Authenticated users can view product documents" on product_documents
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage product documents" on product_documents
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Customers ────────────────────────────────────────────────────────────────

create table customers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  currency      text not null default 'USD',
  payment_terms text,
  notes         text,
  status        record_status not null default 'active',
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_customers_status on customers(status);
create index idx_customers_name_trgm on customers using gin(name gin_trgm_ops);

alter table customers enable row level security;

create policy "Authenticated users can view customers" on customers
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage customers" on customers
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Customer Contacts ────────────────────────────────────────────────────────

create table customer_contacts (
  id          uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  title       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_customer_contacts_customer on customer_contacts(customer_id);

alter table customer_contacts enable row level security;

create policy "Authenticated users can view contacts" on customer_contacts
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage contacts" on customer_contacts
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Customer Addresses ───────────────────────────────────────────────────────

create table customer_addresses (
  id            uuid primary key default uuid_generate_v4(),
  customer_id   uuid not null references customers(id) on delete cascade,
  type          address_type not null,
  address_line1 text not null,
  address_line2 text,
  city          text not null,
  state         text,
  postal_code   text,
  country       text not null,
  created_at    timestamptz not null default now()
);

create index idx_customer_addresses_customer on customer_addresses(customer_id);

alter table customer_addresses enable row level security;

create policy "Authenticated users can view addresses" on customer_addresses
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage addresses" on customer_addresses
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Customer Product Mappings ────────────────────────────────────────────────

create table customer_product_mappings (
  id                   uuid primary key default uuid_generate_v4(),
  customer_id          uuid not null references customers(id) on delete cascade,
  product_id           uuid not null references products(id) on delete cascade,
  customer_sku         text not null,
  customer_description text,
  price                numeric(12, 2) not null,
  currency             text not null default 'USD',
  moq                  integer,
  lead_time            text,
  packaging_notes      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(customer_id, product_id)
);

create index idx_cpm_customer on customer_product_mappings(customer_id);
create index idx_cpm_product on customer_product_mappings(product_id);
create index idx_cpm_customer_sku_trgm on customer_product_mappings using gin(customer_sku gin_trgm_ops);

alter table customer_product_mappings enable row level security;

create policy "Authenticated users can view mappings" on customer_product_mappings
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage mappings" on customer_product_mappings
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Quotes ───────────────────────────────────────────────────────────────────

create table quotes (
  id           uuid primary key default uuid_generate_v4(),
  quote_number text not null unique,
  customer_id  uuid not null references customers(id) on delete restrict,
  status       quote_status not null default 'draft',
  notes        text,
  valid_until  date,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_quotes_customer on quotes(customer_id);
create index idx_quotes_status on quotes(status);

alter table quotes enable row level security;

create policy "Authenticated users can view quotes" on quotes
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage quotes" on quotes
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Quote Items ──────────────────────────────────────────────────────────────

create table quote_items (
  id                   uuid primary key default uuid_generate_v4(),
  quote_id             uuid not null references quotes(id) on delete cascade,
  product_id           uuid not null references products(id) on delete restrict,
  customer_sku         text not null,
  customer_description text,
  unit_price           numeric(12, 2) not null,
  currency             text not null,
  quantity             integer not null default 1,
  moq                  integer,
  lead_time            text,
  sort_order           integer not null default 0
);

create index idx_quote_items_quote on quote_items(quote_id);

alter table quote_items enable row level security;

create policy "Authenticated users can view quote items" on quote_items
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage quote items" on quote_items
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Orders ───────────────────────────────────────────────────────────────────

create table orders (
  id           uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  customer_id  uuid not null references customers(id) on delete restrict,
  quote_id     uuid references quotes(id) on delete set null,
  status       order_status not null default 'pending',
  notes        text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_orders_customer on orders(customer_id);
create index idx_orders_quote on orders(quote_id);
create index idx_orders_status on orders(status);

alter table orders enable row level security;

create policy "Authenticated users can view orders" on orders
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage orders" on orders
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Order Items ──────────────────────────────────────────────────────────────

create table order_items (
  id                   uuid primary key default uuid_generate_v4(),
  order_id             uuid not null references orders(id) on delete cascade,
  product_id           uuid not null references products(id) on delete restrict,
  customer_sku         text not null,
  customer_description text,
  quantity             integer not null default 1,
  unit_price           numeric(12, 2) not null,
  currency             text not null,
  sort_order           integer not null default 0
);

create index idx_order_items_order on order_items(order_id);

alter table order_items enable row level security;

create policy "Authenticated users can view order items" on order_items
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage order items" on order_items
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('admin', 'sales')
    )
  );

-- ─── Audit Logs ───────────────────────────────────────────────────────────────

create table audit_logs (
  id               uuid primary key default uuid_generate_v4(),
  table_name       text not null,
  record_id        uuid not null,
  action           audit_action not null,
  old_data         jsonb,
  new_data         jsonb,
  performed_by     uuid references auth.users(id) on delete set null,
  performed_by_name text,
  performed_at     timestamptz not null default now()
);

create index idx_audit_logs_record on audit_logs(table_name, record_id);
create index idx_audit_logs_performed_at on audit_logs(performed_at desc);

alter table audit_logs enable row level security;

create policy "Admins can view audit logs" on audit_logs
  for select using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "System can insert audit logs" on audit_logs
  for insert with check (auth.role() = 'authenticated');

-- ─── Updated_at Triggers ─────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_collections
  before update on collections
  for each row execute function update_updated_at();

create trigger set_updated_at_products
  before update on products
  for each row execute function update_updated_at();

create trigger set_updated_at_customers
  before update on customers
  for each row execute function update_updated_at();

create trigger set_updated_at_customer_product_mappings
  before update on customer_product_mappings
  for each row execute function update_updated_at();

create trigger set_updated_at_quotes
  before update on quotes
  for each row execute function update_updated_at();

create trigger set_updated_at_orders
  before update on orders
  for each row execute function update_updated_at();

-- ─── Storage Buckets (run via Supabase dashboard or CLI) ──────────────────────
-- create bucket: product-images    (public: true)
-- create bucket: collection-images (public: true)
-- create bucket: product-documents (public: false)
-- create bucket: catalogs          (public: false)
