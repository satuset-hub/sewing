# Rumah Jahit Siju V1

Aplikasi Next.js App Router untuk pendaftaran dan manajemen kelas jahit. Data operasional, autentikasi, kalender, booking, pembayaran, kehadiran, progres, dan pengaturan menggunakan Supabase.

## Status implementasi

- Website publik: landing page, katalog, detail tema, kalender kompatibel tema, pendaftaran, login, reset password.
- Member: dashboard, seluruh booking, detail/cancel, kelas baru, riwayat berdasarkan kehadiran valid, profil dan password.
- Admin: dashboard, kalender/kuota/tema terkunci/hari off, CRUD tema dan modul, booking, WhatsApp, pembayaran, reschedule, member, kehadiran, laporan CSV, pengaturan.
- Database: migration versioned, RLS, Storage policy, seed idempotent, audit, status history, RPC booking/reschedule transaksional.
- QA: unit test aturan domain kritis, strict TypeScript, ESLint, production build.

Tidak ada booking, pembayaran, atau akun palsu dalam seed. Placeholder lokal digunakan untuk gambar sampai admin mengunggah aset sendiri.

## Persyaratan

- Node.js 20 atau lebih baru
- npm
- Project Supabase
- Supabase CLI (opsional, direkomendasikan untuk migration lokal)

## Environment

Salin `.env.example` menjadi `.env.local`, lalu isi key asli:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bprpcukxvjqzlpeojkyt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon atau publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service role key, hanya server>
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_BOOTSTRAP_SECRET=<random-secret-sementara>
```

Jangan pernah memakai service-role key sebagai public key atau mengeksposnya ke browser. Project saat ini sengaja membiarkan key kosong karena key belum diberikan.

## Menyiapkan Supabase

1. Buka Supabase Dashboard → Project Settings → API.
2. Salin `anon`/publishable key ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Salin service-role key ke `SUPABASE_SERVICE_ROLE_KEY`. Key ini tidak digunakan di Client Components.
4. Jalankan migration secara berurutan dari folder `supabase/migrations` menggunakan Supabase CLI:

   ```bash
   supabase link --project-ref bprpcukxvjqzlpeojkyt
   supabase db push
   supabase db execute --file supabase/seed.sql
   ```

   Jika CLI tidak tersedia, jalankan isi setiap file migration berurutan melalui SQL Editor, lalu jalankan `supabase/seed.sql` sekali. Seed aman dijalankan ulang.

5. Di Authentication → URL Configuration, set Site URL `http://localhost:3000` dan redirect URL `http://localhost:3000/auth/callback` untuk development.
6. Atur email confirmation sesuai alur operasional. Jika konfirmasi aktif, pendaftar baru diminta verifikasi lalu login sebelum booking; akun tidak ditinggalkan tanpa profil karena trigger database membuat profil atomik saat user dibuat.
7. Storage bucket `theme-media` dibuat oleh migration. Hanya admin yang dapat menulis; file dapat dibaca publik.

## Menetapkan admin pertama

Tidak ada password admin default.

1. Isi `ADMIN_BOOTSTRAP_SECRET` dengan secret acak yang kuat.
2. Daftar sebagai member melalui form kelas atau buat user di Supabase Auth dengan metadata `full_name`, `username`, dan nomor telepon format `62...`.
3. Login, lalu buka `/bootstrap-admin`.
4. Masukkan secret. Fungsi database menolak jika sudah ada admin.
5. Hapus `ADMIN_BOOTSTRAP_SECRET` dari `.env.local` dan restart server.

Detail tambahan ada di [docs/ADMIN_BOOTSTRAP.md](docs/ADMIN_BOOTSTRAP.md).

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Untuk pemeriksaan sebelum commit:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Pengujian integrasi remote dapat dijalankan setelah environment Supabase terisi dan project ditautkan:

```bash
npm run test:e2e:supabase
```

Test ini membuat user, tema, jadwal, booking, pembayaran, kehadiran, dan file Storage sementara dengan prefix unik. Password dibuat acak hanya di memori. Blok cleanup menghapus hanya ID dan prefix yang dibuat oleh run tersebut.

## Integritas booking

Frontend hanya menampilkan availability. Keputusan akhir selalu dibuat oleh RPC `create_booking` di PostgreSQL. Fungsi tersebut:

- memakai transaction-level advisory lock berdasarkan tanggal dan row lock;
- memvalidasi user, tanggal, hari aktif/off, tema, modul, kuota, dan duplikasi;
- mengunci tema saat booking pertama;
- membuat booking dan tagihan dalam transaksi yang sama;
- mendukung idempotency key untuk retry/double-click;
- dibantu partial unique index agar satu member tidak memiliki dua booking aktif pada sesi yang sama.

Pembatalan melepas kursi dan hanya melepas tema jika tidak ada booking aktif serta tema tidak dikunci admin. Reschedule memakai urutan lock tanggal deterministik.

## Struktur penting

- `app/` — route publik/member/admin, Server Actions, CSV handlers.
- `components/` — komponen reusable shadcn-style dan domain UI.
- `lib/` — Supabase clients, auth guard, data layer, validasi, aturan domain.
- `supabase/migrations/` — schema, RPC, RLS, storage, bootstrap.
- `supabase/seed.sql` — tema awal, tiga modul, pengaturan.
- `tests/` — automated unit tests aturan booking.
- `docs/` — setup database, bootstrap, dan panduan operasional.

## Batasan V1 yang disengaja

- Pembayaran dan WhatsApp manual; tidak ada payment gateway atau WhatsApp API.
- Reservation timeout disimpan sebagai setting, tetapi expiry dilakukan manual karena V1 tidak memiliki scheduler.
- Satu pengajar dan satu sesi per tanggal. Schema siap dikembangkan, tetapi UI multi-pengajar tidak termasuk V1.
- Pengujian integrasi terhadap project Supabase remote baru dapat dijalankan setelah key asli tersedia dan migration diterapkan.
