-- Idempotent development/initial production content. No fake bookings, payments, or users.
insert into public.class_themes(title,slug,short_description,description,price,duration_minutes,recommended_sessions,difficulty_level,requirements,materials_info,is_active,sort_order)
values(
  'Pelatihan Jahit Dasar — Membuat Dress Sendiri',
  'pelatihan-jahit-dasar-membuat-dress-sendiri',
  'Belajar menjahit dari nol hingga menyelesaikan dress sederhana.',
  'Belajar menjahit dari nol, mengenal alat, membuat pola, memotong bahan, menjahit, dan menyelesaikan dress sederhana dalam kelompok kecil dengan bimbingan langsung.',
  80000,180,3,'Pemula','Tidak memerlukan pengalaman menjahit.','Bawa alat tulis. Informasi kain dan perlengkapan akan dikonfirmasi admin.',true,1
) on conflict(slug) do update set title=excluded.title,short_description=excluded.short_description,description=excluded.description,price=excluded.price,duration_minutes=excluded.duration_minutes,recommended_sessions=excluded.recommended_sessions,difficulty_level=excluded.difficulty_level,requirements=excluded.requirements,materials_info=excluded.materials_info;

insert into public.theme_modules(theme_id,sequence_no,title,description)
select t.id,m.sequence_no,m.title,m.description from public.class_themes t cross join (values
  (1,'Pengenalan alat, pengukuran, dan dasar pola','Mengenal mesin dan alat jahit, mengambil ukuran, lalu menyusun pola dasar.'),
  (2,'Memotong kain dan teknik menjahit','Memindahkan pola, memotong kain, dan mempraktikkan teknik jahit utama.'),
  (3,'Merakit dress, finishing, dan evaluasi','Menyatukan bagian dress, finishing yang rapi, dan mengevaluasi hasil karya.')
) as m(sequence_no,title,description)
where t.slug='pelatihan-jahit-dasar-membuat-dress-sendiri'
on conflict(theme_id,sequence_no) do update set title=excluded.title,description=excluded.description;

insert into public.app_settings(key,value) values
('business_name','"Rumah Jahit Siju"'),
('business_description','"Kelas jahit privat yang hangat, ramah pemula, dan berkelompok kecil."'),
('business_phone','""'),
('business_address','"Pamulang, Tangerang Selatan"'),
('business_maps_url','""'),
('instagram_url','"https://instagram.com/juylaikhas"'),
('default_capacity','3'),
('default_start_time','"09:00"'),
('default_end_time','"12:00"'),
('timezone','"Asia/Jakarta"'),
('active_weekdays','[1,2,3,4,5,6]'),
('reservation_timeout_enabled','false'),
('reservation_timeout_hours','24'),
('booking_advance_limit_days','90'),
('booking_cutoff_hours','24'),
('payment_bank_name','""'),
('payment_account_number','""'),
('payment_account_holder','""'),
('payment_instructions','"Admin akan mengirimkan instruksi pembayaran melalui WhatsApp."'),
('whatsapp_booking_template','"Halo {name}, pendaftaran {booking_code} untuk kelas {theme} pada {date} sudah kami terima."'),
('whatsapp_payment_template','"Halo {name}, berikut informasi pembayaran untuk booking {booking_code} sebesar {amount}."'),
('website_maintenance_mode','false'),
('seo_title','"Rumah Jahit Siju | Kelas Jahit Pamulang"'),
('seo_description','"Belajar menjahit dari nol dalam kelompok kecil bersama Rumah Jahit Siju."')
on conflict(key) do nothing;
