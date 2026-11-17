insert into public.app_settings(key, value) values
  ('business_name', '"Rumah Jahit Siju"'::jsonb),
  ('seo_title', '"Rumah Jahit Siju | Kelas Jahit Pamulang"'::jsonb),
  ('seo_description', '"Belajar menjahit dari nol dalam kelompok kecil bersama Rumah Jahit Siju."'::jsonb)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();
