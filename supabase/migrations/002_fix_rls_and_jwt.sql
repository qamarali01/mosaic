-- ============================================================
-- Fix RLS Infinite Recursion & Set Up JWT Role Claims
-- ============================================================

-- Helper function to get role from JWT claims
create or replace function get_jwt_role()
returns text language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role',
    'viewer'
  )
$$;

-- ─── Step 1: Drop the problematic recursive RLS policy ──────────────────────

drop policy if exists "Admins can manage all profiles" on user_profiles;

-- ─── Step 2: Create function to sync role to JWT app_metadata ───────────────

create or replace function sync_user_role_to_jwt(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  user_role text;
begin
  select role into user_role from user_profiles where id = p_user_id;
  
  update auth.users 
  set raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', user_role)
  where id = p_user_id;
end;
$$;

-- ─── Step 3: Create trigger to auto-sync role on user_profiles change ────────

create or replace function on_user_profile_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform sync_user_role_to_jwt(new.id);
  return new;
end;
$$;

drop trigger if exists on_user_profile_role_change_trigger on user_profiles;
create trigger on_user_profile_role_change_trigger
  after insert or update on user_profiles
  for each row execute function on_user_profile_role_change();

-- ─── Step 4: Update handle_new_user to set default role in app_metadata ──────

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  insert into public.user_profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  
  new.raw_app_meta_data := 
    coalesce(new.raw_app_meta_data, '{}'::jsonb) || 
    '{"role": "viewer"}'::jsonb;
  
  return new;
exception when others then
  return new;
end;
$func$;

-- ─── Step 5: Replace RLS policies on all tables ─────────────────────────────

-- Collections
drop policy if exists "Admins and sales can manage collections" on collections;
create policy "Admins and sales can manage collections" on collections
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Products
drop policy if exists "Admins and sales can manage products" on products;
create policy "Admins and sales can manage products" on products
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Product Images
drop policy if exists "Admins and sales can manage product images" on product_images;
create policy "Admins and sales can manage product images" on product_images
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Product Documents
drop policy if exists "Admins and sales can manage product documents" on product_documents;
create policy "Admins and sales can manage product documents" on product_documents
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Customers
drop policy if exists "Admins and sales can manage customers" on customers;
create policy "Admins and sales can manage customers" on customers
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Customer Contacts
drop policy if exists "Admins and sales can manage contacts" on customer_contacts;
create policy "Admins and sales can manage contacts" on customer_contacts
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Customer Addresses
drop policy if exists "Admins and sales can manage addresses" on customer_addresses;
create policy "Admins and sales can manage addresses" on customer_addresses
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Customer Product Mappings
drop policy if exists "Admins and sales can manage mappings" on customer_product_mappings;
create policy "Admins and sales can manage mappings" on customer_product_mappings
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Quotes
drop policy if exists "Admins and sales can manage quotes" on quotes;
create policy "Admins and sales can manage quotes" on quotes
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Quote Items
drop policy if exists "Admins and sales can manage quote items" on quote_items;
create policy "Admins and sales can manage quote items" on quote_items
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Orders
drop policy if exists "Admins and sales can manage orders" on orders;
create policy "Admins and sales can manage orders" on orders
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Order Items
drop policy if exists "Admins and sales can manage order items" on order_items;
create policy "Admins and sales can manage order items" on order_items
  for all using (get_jwt_role() in ('admin', 'sales'));

-- Audit Logs (admin only)
drop policy if exists "Admins can view audit logs" on audit_logs;
create policy "Admins can view audit logs" on audit_logs
  for select using (get_jwt_role() = 'admin');

-- User Profiles (admin can manage all, users can update own)
create policy "Admins can manage all profiles" on user_profiles
  for all using (get_jwt_role() = 'admin');

-- ─── Step 6: Sync existing users' roles to app_metadata ─────────────────────

-- This will sync all existing user profiles to their JWT claims
do $$
declare
  user_record record;
begin
  for user_record in select id from user_profiles loop
    perform sync_user_role_to_jwt(user_record.id);
  end loop;
end;
$$;
