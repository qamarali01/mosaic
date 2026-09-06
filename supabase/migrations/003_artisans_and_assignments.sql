-- ============================================================
-- Artisans & Production Assignments
-- ============================================================

-- ─── Enum ─────────────────────────────────────────────────────────────────────

create type assignment_status as enum (
  'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
);

-- ─── Artisans ─────────────────────────────────────────────────────────────────

create table artisans (
  id                uuid          primary key default uuid_generate_v4(),
  name              text          not null,
  phone             text,
  email             text,
  location          text,
  specializations   text,
  notes             text,
  status            record_status not null default 'active',
  created_by        uuid          references auth.users(id) on delete set null,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

-- Trigram index for fast name search
create index artisans_name_trgm_idx on artisans using gin (name gin_trgm_ops);

-- updated_at trigger (reuses the existing helper function)
create trigger set_artisans_updated_at
  before update on artisans
  for each row execute function update_updated_at();

alter table artisans enable row level security;

create policy "Authenticated users can view artisans" on artisans
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage artisans" on artisans
  for all using (get_jwt_role() in ('admin', 'sales'));

-- ─── Artisan Assignments ──────────────────────────────────────────────────────

create table artisan_assignments (
  id                      uuid              primary key default uuid_generate_v4(),
  order_id                uuid              not null references orders(id) on delete cascade,
  order_item_id           uuid              not null references order_items(id) on delete cascade,
  artisan_id              uuid              not null references artisans(id) on delete restrict,
  quantity                integer           not null check (quantity > 0),
  rate                    numeric(12, 2),   -- INR cost per unit paid to artisan
  status                  assignment_status not null default 'pending',
  expected_delivery_date  date,
  actual_delivery_date    date,
  notes                   text,
  created_by              uuid              references auth.users(id) on delete set null,
  created_at              timestamptz       not null default now(),
  updated_at              timestamptz       not null default now()
);

-- Indexes
create index artisan_assignments_order_id_idx      on artisan_assignments(order_id);
create index artisan_assignments_order_item_id_idx on artisan_assignments(order_item_id);
create index artisan_assignments_artisan_id_idx    on artisan_assignments(artisan_id);
create index artisan_assignments_status_idx        on artisan_assignments(status);

-- updated_at trigger
create trigger set_artisan_assignments_updated_at
  before update on artisan_assignments
  for each row execute function update_updated_at();

alter table artisan_assignments enable row level security;

create policy "Authenticated users can view assignments" on artisan_assignments
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage assignments" on artisan_assignments
  for all using (get_jwt_role() in ('admin', 'sales'));
