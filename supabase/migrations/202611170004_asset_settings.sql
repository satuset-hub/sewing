insert into public.app_settings(key,value) values
('logo_url','""'),('banner_url','""'),('teacher_photo_url','""'),('cancellation_policy','"Hubungi admin jika perlu membatalkan atau memindahkan jadwal."')
on conflict(key) do nothing;
create or replace function public.get_public_settings()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from public.app_settings where key in (
  'business_name','business_description','business_phone','business_address','business_maps_url','instagram_url','logo_url','banner_url','teacher_photo_url',
  'default_start_time','default_end_time','timezone','payment_instructions','cancellation_policy','website_maintenance_mode','seo_title','seo_description'
); $$;
grant execute on function public.get_public_settings() to anon,authenticated;
