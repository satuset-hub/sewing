# Setup Supabase

## Urutan migration

1. `202611170001_initial_schema.sql` — types, tables, constraints, RPC, RLS, Storage.
2. `202611170002_admin_bootstrap.sql` — bootstrap admin pertama.
3. `202611170003_public_settings.sql` — whitelist setting publik.
4. `202611170004_asset_settings.sql` — URL aset dan kebijakan pembatalan.
5. `supabase/seed.sql` — tema, modul, dan konfigurasi awal.

Jalankan pada project `bprpcukxvjqzlpeojkyt`. Migration sengaja tidak dijalankan otomatis oleh aplikasi.

## Auth

- Site URL development: `http://localhost:3000`.
- Redirect URL: `http://localhost:3000/auth/callback`.
- Login memakai email; username adalah identitas tampilan.
- Supabase Auth menangani hashing password, session persistence, reset token, dan rate limit endpoint Auth.
- Trigger `handle_new_user` membuat profile member. User biasa tidak dapat mengubah role.

## RLS ringkas

- Guest hanya membaca tema aktif dan RPC availability/setting publik.
- Member hanya membaca profil, booking, payment, attendance, dan history sendiri.
- Member tidak memiliki policy update untuk booking/payment/attendance.
- Admin diverifikasi melalui `is_admin(auth.uid())` di database dan guard server.
- Perubahan status penting masuk ke status history/audit log.

## Verifikasi setelah migration

Periksa bahwa tabel memiliki RLS enabled, bucket `theme-media` tersedia, seed tema tampil, dan RPC berikut ada: `get_calendar_availability`, `create_booking`, `cancel_booking`, `admin_update_booking_status`, `admin_verify_payment`, `admin_update_class_date`, `admin_reschedule_booking`.
