create or replace function public.admin_lock_class_date(p_date date, p_theme_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  d public.class_dates%rowtype;
  active_count integer;
  default_capacity integer;
  default_start time;
  default_end time;
begin
  if not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_date < (now() at time zone 'Asia/Jakarta')::date then raise exception 'DATE_IN_PAST'; end if;
  if not exists(select 1 from public.class_themes where id=p_theme_id and is_active) then raise exception 'THEME_UNAVAILABLE'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_date::text,0));
  select * into d from public.class_dates where class_date=p_date for update;

  if found then
    if not d.is_open then raise exception 'DATE_UNAVAILABLE'; end if;
    active_count := public.active_booking_count(d.id);
    if active_count > 0 and d.theme_id is distinct from p_theme_id then raise exception 'THEME_HAS_ACTIVE_BOOKINGS'; end if;
    update public.class_dates set theme_id=p_theme_id,locked_by_admin=true where id=d.id;
  else
    if exists(select 1 from public.calendar_blocks where is_active and (block_date=p_date or (is_recurring and weekday=extract(dow from p_date)))) then raise exception 'DATE_UNAVAILABLE'; end if;
    if not exists(select 1 from jsonb_array_elements_text(coalesce((select value from public.app_settings where key='active_weekdays'),'[1,2,3,4,5,6]'::jsonb)) x where x::int=extract(dow from p_date)::int) then raise exception 'DATE_UNAVAILABLE'; end if;
    default_capacity := public.get_setting_text('default_capacity','3')::int;
    default_start := public.get_setting_text('default_start_time','09:00')::time;
    default_end := public.get_setting_text('default_end_time','12:00')::time;
    insert into public.class_dates(class_date,start_time,end_time,capacity,is_open,theme_id,locked_by_admin)
    values(p_date,default_start,default_end,default_capacity,true,p_theme_id,true);
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,new_data)
  values(auth.uid(),'CLASS_DATE_THEME_LOCKED','class_date',jsonb_build_object('class_date',p_date,'theme_id',p_theme_id));
end;
$$;

revoke all on function public.admin_lock_class_date(date,uuid) from public;
grant execute on function public.admin_lock_class_date(date,uuid) to authenticated;
