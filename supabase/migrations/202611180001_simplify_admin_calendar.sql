-- A class_dates row is an explicit admin override, including for a weekday that is normally off.
create or replace function public.get_calendar_availability(date_from date, date_to date, filter_theme_id uuid default null)
returns table(class_date date, status text, capacity integer, active_bookings integer, remaining_seats integer, theme_id uuid, theme_title text, start_time time, end_time time)
language sql stable security definer set search_path=public,pg_temp as $$
with days as (
  select d::date as calendar_day from generate_series(date_from, date_to, interval '1 day') d
), cfg as (
  select
    public.get_setting_text('default_capacity','3')::int default_capacity,
    public.get_setting_text('default_start_time','09:00')::time default_start,
    public.get_setting_text('default_end_time','12:00')::time default_end,
    coalesce((select array_agg((x)::int) from jsonb_array_elements_text(coalesce((select value from public.app_settings where key='active_weekdays'),'[1,2,3,4,5,6]'::jsonb)) x), array[1,2,3,4,5,6]) active_days
), calculated as (
  select days.calendar_day, cd.id date_id, coalesce(cd.capacity,cfg.default_capacity) cap,
    coalesce(cd.start_time,cfg.default_start) st, coalesce(cd.end_time,cfg.default_end) et,
    cd.theme_id, cd.is_open, ct.title theme_title,
    coalesce(public.active_booking_count(cd.id),0) booked,
    exists(select 1 from public.calendar_blocks cb where cb.is_active and (cb.block_date=days.calendar_day or (cb.is_recurring and cb.weekday=extract(dow from days.calendar_day)))) blocked,
    extract(dow from days.calendar_day)::int = any(cfg.active_days) operating
  from days cross join cfg left join public.class_dates cd on cd.class_date=days.calendar_day left join public.class_themes ct on ct.id=cd.theme_id
)
select calendar_day,
  case when calendar_day < (now() at time zone 'Asia/Jakarta')::date then 'PAST'
       when date_id is not null and is_open = false then 'CLOSED'
       when date_id is null and (blocked or not operating) then 'HOLIDAY'
       when booked >= cap then 'FULL'
       when theme_id is not null then 'THEME_LOCKED'
       else 'AVAILABLE' end,
  cap, booked, greatest(cap-booked,0), theme_id, theme_title, st, et
from calculated
where filter_theme_id is null or theme_id is null or theme_id=filter_theme_id
order by calendar_day;
$$;

create or replace function public.admin_toggle_class_date(p_date date, p_is_open boolean) returns void
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
  perform pg_advisory_xact_lock(hashtextextended(p_date::text,0));

  select * into d from public.class_dates where class_date=p_date for update;
  if found then
    active_count := public.active_booking_count(d.id);
    if not p_is_open and active_count > 0 then raise exception 'DATE_HAS_ACTIVE_BOOKINGS'; end if;
    update public.class_dates set is_open=p_is_open where id=d.id;
  else
    default_capacity := public.get_setting_text('default_capacity','3')::int;
    default_start := public.get_setting_text('default_start_time','09:00')::time;
    default_end := public.get_setting_text('default_end_time','12:00')::time;
    insert into public.class_dates(class_date,start_time,end_time,capacity,is_open)
    values(p_date,default_start,default_end,default_capacity,p_is_open);
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,new_data)
  values(auth.uid(),'CLASS_DATE_TOGGLED','class_date',jsonb_build_object('class_date',p_date,'is_open',p_is_open));
end;
$$;
revoke all on function public.admin_toggle_class_date(date,boolean) from public;
grant execute on function public.admin_toggle_class_date(date,boolean) to authenticated;

create or replace function public.create_booking(
  p_theme_id uuid, p_class_date date, p_module_id uuid default null, p_notes text default null, p_idempotency_key uuid default gen_random_uuid()
) returns table(booking_id uuid, booking_code text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member uuid := auth.uid(); v_theme public.class_themes%rowtype; v_date public.class_dates%rowtype; v_count int; v_code text; v_id uuid; v_capacity int; v_start time; v_end time;
begin
  if v_member is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_class_date < (now() at time zone 'Asia/Jakarta')::date then raise exception 'DATE_IN_PAST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_class_date::text, 0));
  select * into v_theme from public.class_themes where id=p_theme_id and is_active for share;
  if not found then raise exception 'THEME_UNAVAILABLE'; end if;
  if p_module_id is not null and not exists(select 1 from public.theme_modules where id=p_module_id and theme_id=p_theme_id) then raise exception 'INVALID_MODULE'; end if;

  select * into v_date from public.class_dates where class_date=p_class_date for update;
  if found then
    if not v_date.is_open then raise exception 'DATE_UNAVAILABLE'; end if;
  else
    if exists(select 1 from public.calendar_blocks where is_active and (block_date=p_class_date or (is_recurring and weekday=extract(dow from p_class_date)))) then raise exception 'DATE_UNAVAILABLE'; end if;
    if not exists(select 1 from jsonb_array_elements_text(coalesce((select value from public.app_settings where key='active_weekdays'),'[1,2,3,4,5,6]')) x where x::int=extract(dow from p_class_date)::int) then raise exception 'DATE_UNAVAILABLE'; end if;
    v_capacity := public.get_setting_text('default_capacity','3')::int;
    v_start := public.get_setting_text('default_start_time','09:00')::time;
    v_end := public.get_setting_text('default_end_time','12:00')::time;
    insert into public.class_dates(class_date,start_time,end_time,capacity,theme_id)
    values(p_class_date,v_start,v_end,v_capacity,p_theme_id)
    returning * into v_date;
  end if;

  if v_date.theme_id is not null and v_date.theme_id <> p_theme_id then raise exception 'THEME_MISMATCH'; end if;
  if v_date.theme_id is null then update public.class_dates set theme_id=p_theme_id where id=v_date.id; end if;
  select b.id,b.booking_code into v_id,v_code from public.bookings b where b.member_id=v_member and b.idempotency_key=p_idempotency_key;
  if found then return query select v_id,v_code; return; end if;
  select public.active_booking_count(v_date.id) into v_count;
  if v_count >= v_date.capacity then raise exception 'CLASS_FULL'; end if;
  if exists(select 1 from public.bookings where member_id=v_member and class_date_id=v_date.id and status in ('PENDING_ADMIN','AWAITING_PAYMENT','PAYMENT_REVIEW','CONFIRMED','COMPLETED')) then raise exception 'ALREADY_BOOKED'; end if;
  v_code := 'JSC-' || to_char(p_class_date,'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.bookings(booking_code,member_id,class_date_id,theme_id,requested_module_id,price_snapshot,notes,idempotency_key)
  values(v_code,v_member,v_date.id,p_theme_id,p_module_id,v_theme.price,nullif(trim(p_notes),''),p_idempotency_key) returning id into v_id;
  insert into public.payments(booking_id,amount_due) values(v_id,v_theme.price);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,new_data) values(v_member,'BOOKING_CREATED','booking',v_id,jsonb_build_object('booking_code',v_code,'class_date',p_class_date,'theme_id',p_theme_id));
  return query select v_id,v_code;
end;
$$;
revoke all on function public.create_booking(uuid,date,uuid,text,uuid) from public;
grant execute on function public.create_booking(uuid,date,uuid,text,uuid) to authenticated;
