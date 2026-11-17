alter table public.profiles add column if not exists village text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists province text not null default '';

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
    id, username, full_name, email, phone, role, experience_level, address,
    village, city, province, must_change_password
  ) values (
    new.id,
    proposed_username,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Member'),
    coalesce(new.email,''),
    proposed_phone,
    'member',
    nullif(new.raw_user_meta_data->>'experience_level',''),
    coalesce(new.raw_user_meta_data->>'address',''),
    coalesce(new.raw_user_meta_data->>'village',''),
    coalesce(new.raw_user_meta_data->>'city',''),
    coalesce(new.raw_user_meta_data->>'province',''),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  return new;
end; $$;
