-- Explicit one-time bootstrap. Requires authenticated user and no existing admin.
create or replace function public.bootstrap_first_admin(bootstrap_user uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or auth.uid()<>bootstrap_user then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from public.profiles where role='admin') then raise exception 'ADMIN_ALREADY_EXISTS'; end if;
  perform set_config('app.bootstrap_admin','1',true);
  update public.profiles set role='admin' where id=bootstrap_user;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(bootstrap_user,'FIRST_ADMIN_BOOTSTRAPPED','profile',bootstrap_user);
end; $$;
revoke all on function public.bootstrap_first_admin(uuid) from public;
grant execute on function public.bootstrap_first_admin(uuid) to authenticated;
