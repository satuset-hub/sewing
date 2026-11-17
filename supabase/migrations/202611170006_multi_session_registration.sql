alter table public.profiles add column if not exists address text not null default '';
alter table public.profiles add column if not exists must_change_password boolean not null default false;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  username_base text;
  proposed_username text;
  proposed_phone text;
begin
  username_base := lower(coalesce(
    nullif(new.raw_user_meta_data->>'username',''),
    nullif(new.raw_user_meta_data->>'full_name',''),
    split_part(new.email,'@',1),
    'member'
  ));
  username_base := regexp_replace(username_base, '[^a-z0-9]+', '-', 'g');
  username_base := trim(both '-' from username_base);
  if char_length(username_base) < 3 then username_base := 'member'; end if;
  proposed_username := left(username_base, 23) || '-' || substr(new.id::text,1,6);

  proposed_phone := regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''), '[^0-9]', '', 'g');
  if left(proposed_phone,1)='0' then proposed_phone := '62' || substr(proposed_phone,2); end if;

  insert into public.profiles(
    id, username, full_name, email, phone, role, experience_level, address, must_change_password
  ) values (
    new.id,
    proposed_username,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Member'),
    coalesce(new.email,''),
    proposed_phone,
    'member',
    nullif(new.raw_user_meta_data->>'experience_level',''),
    coalesce(new.raw_user_meta_data->>'address',''),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  return new;
end; $$;

create or replace function public.create_bookings(
  p_theme_id uuid,
  p_class_dates date[],
  p_idempotency_keys uuid[]
) returns table(booking_id uuid, booking_code text, class_date date)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_theme public.class_themes%rowtype;
  v_item record;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(cardinality(p_class_dates), 0) < 1 then raise exception 'DATES_REQUIRED'; end if;
  if cardinality(p_class_dates) <> cardinality(p_idempotency_keys) then raise exception 'INVALID_IDEMPOTENCY_KEYS'; end if;
  if (select count(distinct d) from unnest(p_class_dates) d) <> cardinality(p_class_dates) then raise exception 'DUPLICATE_DATES'; end if;

  select * into v_theme from public.class_themes where id=p_theme_id and is_active for share;
  if not found then raise exception 'THEME_UNAVAILABLE'; end if;
  if cardinality(p_class_dates) > v_theme.recommended_sessions then raise exception 'SESSION_LIMIT'; end if;

  for v_item in
    select p_class_dates[i] as selected_date, p_idempotency_keys[i] as idempotency_key
    from generate_subscripts(p_class_dates, 1) i
    order by p_class_dates[i]
  loop
    return query
      select created.booking_id, created.booking_code, v_item.selected_date
      from public.create_booking(
        p_theme_id,
        v_item.selected_date,
        null,
        null,
        v_item.idempotency_key
      ) created;
  end loop;
end; $$;

revoke all on function public.create_bookings(uuid,date[],uuid[]) from public;
grant execute on function public.create_bookings(uuid,date[],uuid[]) to authenticated;
