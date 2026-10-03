-- ============================================================
-- Order Activity Audit Access
-- Keep audit entries immutable while allowing operations users to
-- record and view activity for the orders they manage.
-- ============================================================

drop policy if exists "Admins can view audit logs" on audit_logs;

create policy "Admins and sales can view audit logs" on audit_logs
  for select using (get_jwt_role() in ('admin', 'sales'));

create policy "Admins and sales can write own audit logs" on audit_logs
  for insert with check (
    get_jwt_role() in ('admin', 'sales')
    and performed_by = auth.uid()
  );

create or replace function get_order_audit_logs(p_order_id uuid)
returns setof audit_logs
language plpgsql
security definer
set search_path = public
as $$
begin
  if get_jwt_role() not in ('admin', 'sales') then
    raise exception 'Not authorized to view order activity';
  end if;

  return query
    select * from audit_logs
    where (table_name = 'orders' and record_id = p_order_id)
      or old_data->>'order_id' = p_order_id::text
      or new_data->>'order_id' = p_order_id::text
    order by performed_at desc;
end;
$$;
