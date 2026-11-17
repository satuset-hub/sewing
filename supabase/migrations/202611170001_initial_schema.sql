-- Rumah Jahit Siju V1 - production schema
create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'member');
create type public.booking_status as enum ('PENDING_ADMIN','AWAITING_PAYMENT','PAYMENT_REVIEW','CONFIRMED','COMPLETED','CANCELLED','EXPIRED');
create type public.payment_status as enum ('UNPAID','REPORTED_PAID','VERIFIED','REJECTED');
create type public.attendance_status as enum ('PRESENT','ABSENT','EXCUSED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null,
  phone text not null check (phone ~ '^62[0-9]{8,13}$'),
  address text not null default '',
  village text not null default '',
  city text not null default '',
  province text not null default '',
  village_code text not null default '',
  city_code text not null default '',
  province_code text not null default '',
  role public.user_role not null default 'member',
  experience_level text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_themes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description text not null,
  description text not null,
  thumbnail_url text,
  gallery_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery_urls) = 'array'),
  price numeric(12,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  recommended_sessions integer not null check (recommended_sessions > 0),
  difficulty_level text not null,
  requirements text not null default '',
  materials_info text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.theme_modules (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.class_themes(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  unique(theme_id, sequence_no)
);

create table public.class_dates (
  id uuid primary key default gen_random_uuid(),
  class_date date not null unique,
  start_time time not null,
  end_time time not null,
  theme_id uuid references public.class_themes(id) on delete restrict,
  capacity integer not null default 3 check (capacity > 0),
  is_open boolean not null default true,
  locked_by_admin boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time),
  check (not locked_by_admin or theme_id is not null)
);

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  block_date date,
  weekday smallint check (weekday between 0 and 6),
  is_recurring boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((block_date is not null)::integer + (weekday is not null)::integer = 1),
  check ((not is_recurring) or weekday is not null)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  member_id uuid not null references public.profiles(id) on delete restrict,
  class_date_id uuid not null references public.class_dates(id) on delete restrict,
  theme_id uuid not null references public.class_themes(id) on delete restrict,
  requested_module_id uuid references public.theme_modules(id) on delete set null,
  price_snapshot numeric(12,2) not null check (price_snapshot >= 0),
  status public.booking_status not null default 'PENDING_ADMIN',
  notes text,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  expires_at timestamptz,
  unique(member_id, idempotency_key)
);

create unique index bookings_one_active_member_date_idx
  on public.bookings(member_id, class_date_id)
  where status in ('PENDING_ADMIN','AWAITING_PAYMENT','PAYMENT_REVIEW','CONFIRMED','COMPLETED');
create index bookings_date_status_idx on public.bookings(class_date_id, status);
create index bookings_member_idx on public.bookings(member_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  amount_due numeric(12,2) not null check (amount_due >= 0),
  amount_received numeric(12,2) not null default 0 check (amount_received >= 0),
  status public.payment_status not null default 'UNPAID',
  method text,
  paid_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'VERIFIED' or (verified_at is not null and verified_by is not null))
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  status public.attendance_status not null,
  completed_module_id uuid references public.theme_modules(id) on delete set null,
  notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  old_status public.booking_status,
  new_status public.booking_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger themes_updated before update on public.class_themes for each row execute function public.set_updated_at();
create trigger dates_updated before update on public.class_dates for each row execute function public.set_updated_at();
create trigger bookings_updated before update on public.bookings for each row execute function public.set_updated_at();
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();

create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.profiles where id = check_user and role = 'admin');
$$;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare proposed_username text; proposed_phone text;
begin
  proposed_username := lower(coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1))) || '-' || substr(new.id::text,1,6);
  proposed_username := regexp_replace(proposed_username, '[^a-z0-9._-]', '', 'g');
  proposed_phone := regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''), '[^0-9]', '', 'g');
  if left(proposed_phone,1)='0' then proposed_phone := '62' || substr(proposed_phone,2); end if;
  insert into public.profiles(id, username, full_name, email, phone, role, experience_level)
  values(new.id, proposed_username, coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Member'), coalesce(new.email,''), proposed_phone, 'member', new.raw_user_meta_data->>'experience_level');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.protect_profile_privileges() returns trigger language plpgsql as $$
begin
  if new.role <> old.role and not public.is_admin(auth.uid()) and coalesce(current_setting('app.bootstrap_admin',true),'') <> '1' then raise exception 'ROLE_CHANGE_FORBIDDEN'; end if;
  if new.id <> old.id then raise exception 'PROFILE_ID_IMMUTABLE'; end if;
  return new;
end; $$;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile_privileges();

create or replace function public.active_booking_count(target_date_id uuid)
returns integer language sql stable as $$
  select count(*)::integer from public.bookings where class_date_id = target_date_id
  and status in ('PENDING_ADMIN','AWAITING_PAYMENT','PAYMENT_REVIEW','CONFIRMED','COMPLETED');
$$;

create or replace function public.release_theme_after_booking_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare target_id uuid; still_active integer;
begin
  target_id := coalesce(new.class_date_id, old.class_date_id);
  if (tg_op = 'UPDATE' and old.status is distinct from new.status) or tg_op = 'DELETE' then
    select public.active_booking_count(target_id) into still_active;
    if still_active = 0 then update public.class_dates set theme_id = null where id = target_id and locked_by_admin = false; end if;
  end if;
  return coalesce(new, old);
end; $$;
create trigger release_date_theme after update of status or delete on public.bookings for each row execute function public.release_theme_after_booking_change();

create or replace function public.log_booking_status() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.booking_status_history(booking_id, old_status, new_status, changed_by)
    values(new.id, case when tg_op='INSERT' then null else old.status end, new.status, auth.uid());
  end if;
  return new;
end; $$;
create trigger booking_status_audit after insert or update of status on public.bookings for each row execute function public.log_booking_status();

create or replace function public.get_setting_text(setting_key text, fallback text) returns text
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce((select value #>> '{}' from public.app_settings where key=setting_key), fallback);
$$;

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
       when blocked or not operating then 'HOLIDAY'
       when is_open = false then 'CLOSED'
       when booked >= cap then 'FULL'
       when theme_id is not null then 'THEME_LOCKED'
       else 'AVAILABLE' end,
  cap, booked, greatest(cap-booked,0), theme_id, theme_title, st, et
from calculated
where filter_theme_id is null or theme_id is null or theme_id=filter_theme_id
order by calendar_day;
$$;
grant execute on function public.get_calendar_availability(date,date,uuid) to anon, authenticated;

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
  if exists(select 1 from public.calendar_blocks where is_active and (block_date=p_class_date or (is_recurring and weekday=extract(dow from p_class_date)))) then raise exception 'DATE_UNAVAILABLE'; end if;
  if not exists(select 1 from jsonb_array_elements_text(coalesce((select value from public.app_settings where key='active_weekdays'),'[1,2,3,4,5,6]')) x where x::int=extract(dow from p_class_date)::int) then raise exception 'DATE_UNAVAILABLE'; end if;
  v_capacity := public.get_setting_text('default_capacity','3')::int; v_start := public.get_setting_text('default_start_time','09:00')::time; v_end := public.get_setting_text('default_end_time','12:00')::time;
  insert into public.class_dates(class_date,start_time,end_time,capacity,theme_id) values(p_class_date,v_start,v_end,v_capacity,p_theme_id)
  on conflict(class_date) do nothing;
  select * into v_date from public.class_dates where class_date=p_class_date for update;
  if not v_date.is_open then raise exception 'DATE_UNAVAILABLE'; end if;
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
end; $$;
revoke all on function public.create_booking(uuid,date,uuid,text,uuid) from public;
grant execute on function public.create_booking(uuid,date,uuid,text,uuid) to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.member_id<>auth.uid() and not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if b.status in ('CANCELLED','EXPIRED','COMPLETED') then raise exception 'BOOKING_CANNOT_BE_CANCELLED'; end if;
  update public.bookings set status='CANCELLED',cancelled_at=now() where id=b.id;
  update public.booking_status_history set reason=p_reason where id=(select id from public.booking_status_history where booking_id=b.id order by created_at desc limit 1);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,old_data,new_data) values(auth.uid(),'BOOKING_CANCELLED','booking',b.id,jsonb_build_object('status',b.status),jsonb_build_object('status','CANCELLED','reason',p_reason));
end; $$;
grant execute on function public.cancel_booking(uuid,text) to authenticated;

create or replace function public.admin_update_booking_status(p_booking_id uuid, p_status public.booking_status, p_reason text default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare old_b public.bookings%rowtype;
begin
  if not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select * into old_b from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if p_status='CONFIRMED' and not exists(select 1 from public.payments where booking_id=p_booking_id and status='VERIFIED') then raise exception 'PAYMENT_NOT_VERIFIED'; end if;
  if old_b.status='CONFIRMED' and p_status='EXPIRED' then raise exception 'CONFIRMED_CANNOT_EXPIRE'; end if;
  update public.bookings set status=p_status,cancelled_at=case when p_status='CANCELLED' then now() else cancelled_at end where id=p_booking_id;
  update public.booking_status_history set reason=p_reason where id=(select id from public.booking_status_history where booking_id=p_booking_id order by created_at desc limit 1);
end; $$;
grant execute on function public.admin_update_booking_status(uuid,public.booking_status,text) to authenticated;

create or replace function public.admin_verify_payment(p_payment_id uuid,p_amount numeric,p_method text,p_paid_at timestamptz,p_notes text default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.payments%rowtype;
begin
  if not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select * into p from public.payments where id=p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if p_amount < p.amount_due then raise exception 'AMOUNT_INSUFFICIENT'; end if;
  update public.payments set amount_received=p_amount,method=p_method,paid_at=p_paid_at,status='VERIFIED',verified_at=now(),verified_by=auth.uid(),notes=p_notes where id=p.id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,new_data) values(auth.uid(),'PAYMENT_VERIFIED','payment',p.id,jsonb_build_object('amount_received',p_amount,'method',p_method));
end; $$;
grant execute on function public.admin_verify_payment(uuid,numeric,text,timestamptz,text) to authenticated;

create or replace function public.admin_update_class_date(p_date date,p_start time,p_end time,p_capacity int,p_is_open boolean,p_theme uuid,p_lock boolean,p_notes text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.class_dates%rowtype; n int;
begin
  if not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_capacity<=0 or p_start>=p_end then raise exception 'INVALID_SCHEDULE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_date::text,0));
  select * into d from public.class_dates where class_date=p_date for update;
  if found then
    n:=public.active_booking_count(d.id);
    if p_capacity<n then raise exception 'CAPACITY_BELOW_ACTIVE_BOOKINGS'; end if;
    if n>0 and (p_theme is null or p_theme<>d.theme_id) then raise exception 'THEME_HAS_ACTIVE_BOOKINGS'; end if;
    update public.class_dates set start_time=p_start,end_time=p_end,capacity=p_capacity,is_open=p_is_open,theme_id=p_theme,locked_by_admin=p_lock,notes=p_notes where id=d.id;
  else
    insert into public.class_dates(class_date,start_time,end_time,capacity,is_open,theme_id,locked_by_admin,notes) values(p_date,p_start,p_end,p_capacity,p_is_open,p_theme,p_lock,p_notes);
  end if;
end; $$;
grant execute on function public.admin_update_class_date(date,time,time,int,boolean,uuid,boolean,text) to authenticated;

create or replace function public.admin_reschedule_booking(p_booking_id uuid,p_target_date date) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.bookings%rowtype; target public.class_dates%rowtype; old_date public.class_dates%rowtype; first_date date; second_date date;
begin
  if not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select * into b from public.bookings where id=p_booking_id; if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  select * into old_date from public.class_dates where id=b.class_date_id;
  first_date:=least(old_date.class_date,p_target_date); second_date:=greatest(old_date.class_date,p_target_date);
  perform pg_advisory_xact_lock(hashtextextended(first_date::text,0)); perform pg_advisory_xact_lock(hashtextextended(second_date::text,0));
  insert into public.class_dates(class_date,start_time,end_time,capacity,theme_id)
  values(p_target_date,public.get_setting_text('default_start_time','09:00')::time,public.get_setting_text('default_end_time','12:00')::time,public.get_setting_text('default_capacity','3')::int,b.theme_id)
  on conflict(class_date) do nothing;
  select * into target from public.class_dates where class_date=p_target_date for update;
  if not target.is_open then raise exception 'DATE_UNAVAILABLE'; end if;
  if target.theme_id is not null and target.theme_id<>b.theme_id then raise exception 'THEME_MISMATCH'; end if;
  if public.active_booking_count(target.id)>=target.capacity then raise exception 'CLASS_FULL'; end if;
  if exists(select 1 from public.bookings where id<>b.id and member_id=b.member_id and class_date_id=target.id and status in ('PENDING_ADMIN','AWAITING_PAYMENT','PAYMENT_REVIEW','CONFIRMED','COMPLETED')) then raise exception 'ALREADY_BOOKED'; end if;
  update public.class_dates set theme_id=b.theme_id where id=target.id and theme_id is null;
  update public.bookings set class_date_id=target.id where id=b.id;
  if public.active_booking_count(old_date.id)=0 and not old_date.locked_by_admin then update public.class_dates set theme_id=null where id=old_date.id; end if;
end; $$;
grant execute on function public.admin_reschedule_booking(uuid,date) to authenticated;

-- Row-level security
alter table public.profiles enable row level security;
alter table public.class_themes enable row level security;
alter table public.theme_modules enable row level security;
alter table public.class_dates enable row level security;
alter table public.calendar_blocks enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;
alter table public.app_settings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles own read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy "profiles own update" on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy "themes public active read" on public.class_themes for select to anon,authenticated using (is_active or public.is_admin());
create policy "themes admin all" on public.class_themes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "modules public active read" on public.theme_modules for select to anon,authenticated using (exists(select 1 from public.class_themes t where t.id=theme_id and (t.is_active or public.is_admin())));
create policy "modules admin all" on public.theme_modules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "dates admin read" on public.class_dates for select to authenticated using (public.is_admin());
create policy "dates admin all" on public.class_dates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "blocks admin all" on public.calendar_blocks for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "bookings own read" on public.bookings for select to authenticated using (member_id=auth.uid() or public.is_admin());
create policy "bookings admin all" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "payments own read" on public.payments for select to authenticated using (exists(select 1 from public.bookings b where b.id=booking_id and (b.member_id=auth.uid() or public.is_admin())));
create policy "payments admin all" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "attendance own read" on public.attendance for select to authenticated using (exists(select 1 from public.bookings b where b.id=booking_id and (b.member_id=auth.uid() or public.is_admin())));
create policy "attendance admin all" on public.attendance for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "settings admin read" on public.app_settings for select to authenticated using (public.is_admin());
create policy "settings admin all" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "history own read" on public.booking_status_history for select to authenticated using (exists(select 1 from public.bookings b where b.id=booking_id and (b.member_id=auth.uid() or public.is_admin())));
create policy "audit admin read" on public.audit_logs for select to authenticated using (public.is_admin());

-- Theme image storage (public read, admin write)
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('theme-media','theme-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "theme media public read" on storage.objects for select to public using (bucket_id='theme-media');
create policy "theme media admin insert" on storage.objects for insert to authenticated with check (bucket_id='theme-media' and public.is_admin());
create policy "theme media admin update" on storage.objects for update to authenticated using (bucket_id='theme-media' and public.is_admin()) with check (bucket_id='theme-media' and public.is_admin());
create policy "theme media admin delete" on storage.objects for delete to authenticated using (bucket_id='theme-media' and public.is_admin());

grant select on public.class_themes, public.theme_modules to anon, authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.bookings,public.payments,public.attendance,public.booking_status_history to authenticated;
grant select,insert,update,delete on public.class_themes,public.theme_modules,public.class_dates,public.calendar_blocks,public.bookings,public.payments,public.attendance,public.app_settings to authenticated;
grant select on public.audit_logs to authenticated;

