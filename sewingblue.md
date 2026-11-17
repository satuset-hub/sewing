# MASTER BLUEPRINT — JUYLAIKHAS SEWING CLASS V1

## 0. ROLE & OBJECTIVE

Bertindak sebagai Senior Full-Stack Engineer, Software Architect, Database Engineer, dan UI/UX Designer.

Bangun aplikasi web production-ready bernama **Juylaikhas Sewing Class**, sebuah sistem pendaftaran dan manajemen les jahit dengan database Supabase.

**Project root (Windows):**
`D:\Buildapps\sewing`

Seluruh source code, konfigurasi, migration SQL, dan dokumentasi harus berada di dalam folder tersebut.

Buat aplikasi yang benar-benar berfungsi end-to-end, bukan hanya landing page atau UI dummy.

Gunakan arsitektur yang bersih, modular, aman, responsif, dan mudah dikembangkan.

### Prinsip utama

1. Semua data operasional tersimpan di Supabase.
2. Seluruh pengaturan operasional dilakukan melalui dashboard admin.
3. Satu akun member dapat memiliki banyak pendaftaran.
4. Satu tanggal hanya memiliki satu sesi dengan satu tema.
5. Maksimal tiga peserta per tanggal secara default.
6. Peserta pertama menentukan tema pada tanggal kosong.
7. Peserta berikutnya wajib mengikuti tema yang sama.
8. Pendaftaran belum dibayar tetap menahan kursi sementara.
9. Pembayaran dilakukan manual melalui WhatsApp.
10. Admin mengonfirmasi pembayaran dan menyetujui pendaftaran.
11. Kalender publik dan admin selalu menggunakan data database yang sama.
12. Tidak boleh ada double booking atau overcapacity.
13. Jangan mengimplementasikan data palsu sebagai data produksi.

---

# 1. TECH STACK

Gunakan:

- Next.js dengan App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Supabase PostgreSQL
- Supabase Authentication
- Supabase Storage
- React Hook Form
- Zod Validation
- date-fns
- Server Components dan Server Actions/Route Handlers sesuai kebutuhan
- Deployment-ready untuk Vercel

Gunakan versi stabil yang kompatibel satu sama lain.

Buat file `.env.example` dengan:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Jika menggunakan Supabase versi yang menyebut public key sebagai publishable key, sesuaikan nama variabel secara konsisten.

Service role key hanya boleh digunakan di server. Jangan pernah mengeksposnya ke browser.

Jangan mengarang Supabase URL, API key, atau kredensial. Jika belum tersedia, siapkan konfigurasi dan dokumentasikan cara pengisiannya.

---

# 2. BRAND IDENTITY & DESIGN SYSTEM

Nama brand: **Juylaikhas Sewing Class**

Referensi visual: flyer Sewing Private Class bersama @juylaikhas, dengan karakter feminin, hangat, kreatif, modern, ramah pemula, dan profesional.

## Color Palette

- Primary Rose: `#C85D71`
- Cream Background: `#FCF3EC`
- Coral Accent: `#F28B72`
- Soft Yellow: `#F4CE82`
- Espresso Text: `#432D2A`
- White Surface: `#FFFFFF`
- Muted Text: `#806C65`
- Border: `#EBDDD5`
- Success: `#28845A`
- Warning: `#B77925`
- Danger: `#C64C4C`

Gunakan warna rose sebagai primary action, cream sebagai background, putih untuk card, dan espresso sebagai warna teks utama.

Gunakan font serif elegan untuk heading dan font sans-serif bersih untuk teks, formulir, tabel, dan dashboard.

## UI Guidelines

- Mobile-first.
- Responsive untuk ponsel, tablet, dan desktop.
- Rounded card, soft shadow, dan whitespace lega.
- Animasi ringan dengan memperhatikan reduced motion.
- Tombol utama rose dengan teks putih.
- Sidebar dashboard desktop dan navigasi mobile yang nyaman.
- Loading skeleton.
- Empty state.
- Toast notification.
- Form validation.
- Dialog konfirmasi untuk tindakan penting.
- Visual kalender dengan status warna dan label teks.
- Aksesibilitas keyboard, label form, dan kontras yang memadai.

Branding, judul, logo, banner, gambar tema, dan kontak harus bisa disesuaikan admin.

Jangan meng-hardcode seluruh konten website.

---

# 3. MODEL BISNIS V1

## Operasional

Saat ini terdapat:

- 1 pengajar.
- 1 sesi les setiap tanggal.
- Default kapasitas 3 peserta.
- Hanya 1 tema les dalam satu tanggal.
- Peserta boleh mengikuti beberapa pertemuan pada tanggal yang tidak berurutan.
- Peserta tidak diwajibkan mengambil tiga pertemuan sekaligus.
- Pembayaran manual melalui WhatsApp.
- Konfirmasi pembayaran oleh admin.

Buat arsitektur database yang masih memungkinkan penambahan banyak pengajar dan sesi di masa depan, tetapi jangan membangun fitur multi-pengajar yang belum dibutuhkan.

## Tema Awal

**Pelatihan Jahit Dasar — Membuat Dress Sendiri**

Deskripsi:
Belajar menjahit dari nol, mengenal alat, membuat pola, memotong bahan, menjahit, dan menyelesaikan dress sederhana.

Harga: Rp80.000 per pertemuan.

Rekomendasi: 3 pertemuan.

Total estimasi tiga pertemuan: Rp240.000.

Target: pemula.

Lokasi awal: Pamulang, Tangerang Selatan. Detail alamat dapat diatur admin.

Tahapan rekomendasi:

1. Pengenalan alat, pengukuran, dan dasar pola.
2. Memotong kain dan praktik teknik menjahit.
3. Merakit dress, finishing, dan evaluasi hasil.

Tahapan tersebut merupakan konten awal yang dapat diedit admin.

Setiap tema wajib memiliki properti:

- Nama tema.
- Slug.
- Deskripsi singkat.
- Deskripsi lengkap.
- Gambar thumbnail.
- Galeri foto (opsional).
- Harga per pertemuan.
- Durasi per sesi.
- Jumlah pertemuan rekomendasi.
- Daftar modul/tahapan belajar.
- Tingkat kesulitan.
- Persyaratan peserta.
- Apa yang perlu dibawa.
- Status aktif/nonaktif.
- Urutan tampilan.

Jangan menganggap tiga pertemuan sebagai paket wajib.

---

# 4. USER ROLES

Terdapat tiga level akses:

## Guest

Dapat:
- Membuka landing page.
- Melihat katalog tema.
- Melihat detail tema.
- Melihat kalender ketersediaan.
- Mengisi formulir pendaftaran.
- Login.

Tidak dapat:
- Melihat data pribadi member lain.
- Mengubah booking.
- Mengakses admin.

## Member

Dapat:
- Melihat dashboard pribadi.
- Mendaftar banyak pertemuan.
- Melihat seluruh booking.
- Melihat pembayaran dan status.
- Melihat riwayat kelas.
- Melihat progres per tema.
- Mengubah profil.
- Mengubah password.
- Melakukan logout.

Tidak boleh melihat booking atau pembayaran milik member lain.

## Admin

Dapat:
- Mengakses semua modul manajemen.
- Mengelola tema.
- Mengelola kalender dan kapasitas.
- Melihat serta memproses booking.
- Menghubungi peserta melalui WhatsApp.
- Memverifikasi pembayaran.
- Menyetujui dan membatalkan booking.
- Mencatat kehadiran.
- Mengelola member.
- Melihat laporan.
- Mengubah pengaturan website dan operasional.

Verifikasi role admin wajib dilakukan di server/database, bukan hanya menyembunyikan tombol di frontend.

---

# 5. PUBLIC WEBSITE

## Route Structure

```text
/
 /kelas
 /kelas/[slug]
 /daftar/[slug]
 /pendaftaran/berhasil
 /login
 /lupa-password
```

## 5.1 Landing Page

Buat landing page dengan bagian:

1. Navbar dengan logo, Beranda, Kelas Jahit, Cara Daftar, Login.
2. Hero banner.
3. CTA "Lihat Kelas" dan "Daftar Sekarang".
4. Daftar tema les.
5. Mengapa belajar bersama Juylaikhas.
6. Proses pendaftaran.
7. Galeri kegiatan.
8. FAQ.
9. Lokasi dan kontak.
10. Footer.

Hero copy awal:

"Yuk, Belajar Menjahit dan Bikin Karya Sendiri!"

Subheading:

"Belajar dari nol dengan suasana nyaman, kelompok kecil, dan bimbingan langsung. Pilih tema dan tanggal yang cocok untukmu."

Gunakan foto yang diunggah admin. Jika belum tersedia, gunakan placeholder lokal yang jelas dan tidak menampilkan foto orang lain seolah-olah pengajar.

## 5.2 Katalog Tema

Buat card dengan:

- Foto.
- Nama tema.
- Level.
- Deskripsi.
- Harga per pertemuan.
- Rekomendasi jumlah pertemuan.
- Tombol detail.
- Tombol daftar.

Tema nonaktif tidak menerima pendaftaran.

## 5.3 Detail Tema

Tampilkan:

- Hero foto.
- Nama dan deskripsi tema.
- Harga per pertemuan.
- Jumlah pertemuan rekomendasi.
- Tahapan pembelajaran.
- Fasilitas.
- Persyaratan.
- Info lokasi.
- Jadwal tersedia.
- CTA daftar.

## 5.4 Form Pendaftaran

Urutan:

1. Peserta memilih tema.
2. Form menampilkan informasi tema terpilih.
3. Peserta mengisi data.
4. Peserta memilih tanggal pada kalender.
5. Form menampilkan ringkasan.
6. Peserta menyetujui ketentuan.
7. Submit.

Data pendaftar baru:

- Nama lengkap.
- Nomor WhatsApp.
- Email.
- Username yang tersedia atau dihasilkan otomatis.
- Password yang dibuat peserta melalui proses aman.
- Konfirmasi password.
- Pengalaman menjahit (opsional).
- Catatan tambahan (opsional).

Bila pengguna sudah login, formulir langsung menggunakan data profilnya dan tidak membuat akun baru.

Jangan membuat akun duplikat untuk email atau identitas login yang sudah digunakan. Arahkan pengguna lama untuk login.

Pastikan nomor WhatsApp dinormalisasi ke format internasional Indonesia.

Jika autentikasi email mengharuskan verifikasi, alur aktivasi akun harus ditangani dengan benar. Jangan membuat akun yang tidak bisa diakses akibat konfigurasi email yang belum siap.

## 5.5 Halaman Pendaftaran Berhasil

Setelah server benar-benar berhasil membuat booking, tampilkan:

- Icon sukses.
- Judul "Pendaftaran Berhasil!"
- Nomor booking.
- Nama peserta.
- Tema.
- Tanggal.
- Jam.
- Harga.
- Status "Menunggu Admin".
- Username member.
- Informasi bahwa password adalah password yang telah dibuat saat pendaftaran.
- Tombol "Login Member".
- Tombol "Lihat Kelas Lain".

Pesan:

"Terima kasih sudah mendaftar di Juylaikhas Sewing Class. Pendaftaranmu sudah kami terima. Admin akan menghubungimu melalui WhatsApp untuk informasi pembayaran. Jadwalmu akan dikonfirmasi setelah pembayaran diverifikasi."

Jangan pernah menampilkan password pengguna dari database, menyimpan password plaintext, atau mengirim password lewat WhatsApp.

Bila ingin menyediakan password sementara yang dibuat sistem, gunakan mekanisme aman, sekali tampil, dan wajib ganti password. Utamakan peserta membuat password sendiri.

---

# 6. CALENDAR & BOOKING ENGINE

Bagian ini merupakan prioritas tertinggi.

## Fundamental Rules

- Satu tanggal = satu sesi.
- Satu sesi = satu tema.
- Satu sesi = default 3 peserta.
- Tema ditentukan pendaftar pertama jika belum dikunci admin.
- Tema terkunci selama masih ada booking aktif.
- Peserta selanjutnya hanya boleh mendaftar dengan tema yang sama.
- Tanggal penuh tidak dapat dipilih.
- Tanggal off tidak dapat dipilih.
- Tanggal lampau tidak dapat dipilih.
- Satu member tidak boleh memiliki dua booking aktif pada tanggal yang sama.
- Member boleh membuat booking pada banyak tanggal yang berbeda.

## Availability States

Gunakan status:

- AVAILABLE: belum ada booking, tema belum terkunci.
- THEME_LOCKED: masih ada kursi, tetapi tema sudah ditentukan.
- FULL: kuota habis.
- CLOSED: ditutup admin.
- HOLIDAY: tidak tersedia karena hari libur.
- PAST: tanggal telah lewat.

Setiap respons kalender harus dapat menyampaikan:

- Tanggal.
- Status.
- Kapasitas.
- Jumlah booking aktif.
- Kursi tersisa.
- Tema yang terkunci (jika ada).
- Jam pertemuan.

Saat pengguna datang dari detail tema, kalender harus memfilter tanggal yang kompatibel dengan tema tersebut.

## Race Condition Protection

Implementasikan booking melalui PostgreSQL function/RPC yang menggunakan transaksi dan row-level locking atau strategi concurrency control setara.

Operasi booking harus bersifat atomik:

1. Verifikasi member.
2. Verifikasi tanggal.
3. Verifikasi jadwal aktif.
4. Verifikasi tema aktif.
5. Kunci row jadwal yang terkait.
6. Verifikasi jumlah booking aktif.
7. Verifikasi kecocokan tema.
8. Jika belum terkunci, tentukan tema.
9. Verifikasi member belum mempunyai booking aktif pada tanggal yang sama.
10. Buat booking.
11. Return nomor booking dan hasil transaksi.

Jangan menerapkan pola check availability di frontend lalu insert booking biasa tanpa proteksi transaksi.

Gunakan database constraint dan unique index untuk menjaga integritas tambahan.

## Cancellation Rules

Jika booking dibatalkan:

- Booking tidak dihitung sebagai kursi aktif.
- Kursi kembali tersedia.
- Tema tetap terkunci jika masih ada booking aktif.
- Jika semua booking dibatalkan, tema dapat kembali kosong selama tidak dikunci admin.
- Semua perubahan dicatat di audit log.

Admin dapat mengubah tanggal booking dengan memvalidasi tanggal tujuan secara atomik.

---

# 7. PAYMENT WORKFLOW

Pembayaran V1 dilakukan melalui WhatsApp dan diverifikasi manual admin.

## Booking Status

Gunakan status booking:

- PENDING_ADMIN
- AWAITING_PAYMENT
- PAYMENT_REVIEW
- CONFIRMED
- COMPLETED
- CANCELLED
- EXPIRED

## Payment Status

Gunakan:

- UNPAID
- REPORTED_PAID
- VERIFIED
- REJECTED

Jangan mencampur payment status dengan attendance status.

## Alur Pembayaran

1. Peserta submit pendaftaran.
2. Booking dibuat dengan status PENDING_ADMIN.
3. Kursi dipesan sementara.
4. Admin melihat booking baru.
5. Admin klik tombol WhatsApp.
6. WhatsApp terbuka dengan template pesan pembayaran.
7. Admin mengirim pesan.
8. Admin mengubah status menjadi AWAITING_PAYMENT.
9. Peserta melakukan pembayaran melalui jalur manual.
10. Jika peserta melaporkan pembayaran, admin dapat menandai PAYMENT_REVIEW.
11. Admin memverifikasi pembayaran.
12. Admin klik Approve.
13. Payment menjadi VERIFIED.
14. Booking menjadi CONFIRMED.
15. Dashboard member otomatis memperlihatkan perubahan status.

Tombol Approve harus meminta konfirmasi admin dan memastikan informasi pembayaran telah diverifikasi.

Catat:

- Nominal tagihan.
- Nominal diterima.
- Metode pembayaran.
- Waktu pembayaran (jika diketahui).
- Waktu verifikasi.
- Admin yang memverifikasi.
- Catatan pembayaran.

Buat tautan WhatsApp menggunakan URL `https://wa.me/` dengan nomor yang sudah dinormalisasi dan pesan yang di-URL-encode.

V1 tidak memerlukan WhatsApp API atau payment gateway.

## Reservation Timeout

Sediakan setting:

- `reservation_timeout_enabled`
- `reservation_timeout_hours`

Default V1: penanganan kedaluwarsa manual oleh admin.

Jangan mengklaim expiry otomatis jika belum ada scheduler yang benar-benar berjalan.

Booking tidak boleh di-expire setelah pembayaran diverifikasi tanpa prosedur pembatalan/refund yang jelas.

---

# 8. MEMBER DASHBOARD

Route:

```text
/member
/member/kelas
/member/kelas/[bookingId]
/member/daftar
/member/riwayat
/member/profil
```

## Dashboard

Tampilkan:

- Sapaan member.
- Jumlah kelas terdaftar.
- Kelas mendatang.
- Jumlah kelas selesai.
- Status pembayaran terakhir.
- Tombol daftar kelas baru.
- Ringkasan progres belajar.

## Kelas Saya

Tampilkan semua booking berdasarkan kategori:

- Menunggu admin.
- Menunggu pembayaran.
- Terkonfirmasi.
- Selesai.
- Dibatalkan.

Setiap card memuat:

- Tema.
- Tanggal.
- Jam.
- Lokasi.
- Pertemuan/tahapan belajar.
- Harga.
- Status.
- Detail.

## Riwayat Belajar

Tampilkan histori berdasarkan tema.

Contoh:

Pelatihan Jahit Dasar:
- Pertemuan selesai: 1.
- Rekomendasi: 3.
- Progress: 1/3.
- Tahap yang sudah dipelajari.
- Catatan pengajar (jika ada).

Progress tidak boleh dihitung hanya dari jumlah booking yang dibuat. Hitung dari pertemuan yang benar-benar diselesaikan.

Jika satu modul diikuti berulang, simpan riwayat dengan benar dan jangan menggandakan progres tanpa aturan yang jelas.

## Profil

Member dapat:
- Mengubah nama.
- Mengubah nomor WhatsApp.
- Mengubah data pendukung.
- Mengubah password.
- Logout.

Perubahan email harus menggunakan alur autentikasi aman.

---

# 9. ADMIN DASHBOARD

Route:

```text
/admin
/admin/kalender
/admin/tema
/admin/tema/tambah
/admin/tema/[id]/edit
/admin/pendaftaran
/admin/pendaftaran/[id]
/admin/member
/admin/member/[id]
/admin/pembayaran
/admin/kehadiran
/admin/laporan
/admin/pengaturan
```

## 9.1 Dashboard Overview

Tampilkan:

- Total member.
- Total pendaftaran.
- Booking baru.
- Menunggu pembayaran.
- Menunggu verifikasi.
- Total booking terkonfirmasi.
- Kelas hari ini.
- Kelas mendatang.
- Total pembayaran terverifikasi.
- Pendaftaran terbaru.
- Jadwal berikutnya.

Gunakan data asli dari Supabase.

## 9.2 Kalender Admin

Tampilkan kalender bulanan dengan status warna.

Klik tanggal membuka detail:

- Tanggal.
- Jam.
- Tema.
- Kapasitas.
- Kursi terisi.
- Kursi tersisa.
- Daftar peserta.
- Status pembayaran masing-masing.
- Tombol WhatsApp.
- Edit jadwal.
- Aktif/nonaktif.
- Kunci tema.
- Ubah kapasitas.

Admin bisa menentukan:

- Hari operasional default.
- Hari libur.
- Tanggal off khusus.
- Jam pertemuan.
- Kapasitas default.
- Kapasitas per tanggal.
- Tema yang dikunci.

Jika admin mengurangi kapasitas di bawah booking aktif, sistem harus menolak perubahan atau meminta admin menyelesaikan konflik terlebih dahulu.

Jika ada booking, perubahan tema atau penutupan tanggal wajib memperlihatkan peringatan dan dampaknya.

Jangan otomatis membatalkan peserta tanpa tindakan eksplisit admin.

## 9.3 Manajemen Tema

CRUD tema:

- Create.
- Read.
- Update.
- Soft deactivate.

Field tema:
- Nama.
- Slug.
- Deskripsi.
- Harga.
- Rekomendasi sesi.
- Durasi.
- Level.
- Foto.
- Modul belajar.
- Status aktif.

Tema yang pernah dipakai booking tidak boleh dihapus permanen begitu saja.

## 9.4 Pendaftaran

Buat tabel:

- Nomor booking.
- Nama.
- WhatsApp.
- Tema.
- Tanggal.
- Harga.
- Status.
- Waktu daftar.
- Action.

Filter:
- Status.
- Tanggal.
- Tema.
- Nama.
- Nomor WhatsApp.

Action:
- Detail.
- Hubungi WhatsApp.
- Ubah status pembayaran.
- Approve.
- Batalkan.
- Pindah jadwal.
- Catatan admin.

## 9.5 Manajemen Member

Tampilkan:

- Nama.
- Username.
- Email.
- Nomor WhatsApp.
- Tanggal bergabung.
- Total booking.
- Total kelas selesai.
- Riwayat pendaftaran.

Admin tidak boleh dapat membaca password member.

Jika perlu pemulihan akun, gunakan alur reset password aman.

## 9.6 Pembayaran

Tabel pembayaran dengan:

- Nomor booking.
- Nama member.
- Tema.
- Nominal.
- Metode.
- Status.
- Tanggal verifikasi.
- Admin verifikator.

Sediakan filter dan laporan ringkas.

## 9.7 Kehadiran

Pada tanggal kelas:

- Tampilkan peserta terkonfirmasi.
- Admin mencatat hadir/tidak hadir.
- Admin menandai kelas selesai.
- Admin bisa menentukan modul yang diselesaikan.
- Admin menambahkan catatan perkembangan.

Jangan otomatis menandai kehadiran hanya karena pembayaran berhasil.

## 9.8 Pengaturan

Sediakan halaman setting untuk:

### Identitas
- Nama brand.
- Deskripsi.
- Logo.
- Banner.
- Foto pengajar.
- Alamat.
- Maps URL.
- WhatsApp admin.
- Instagram.

### Operasional
- Kuota default.
- Hari aktif.
- Jam mulai.
- Jam selesai.
- Zona waktu Asia/Jakarta.
- Batas pemesanan sebelum kelas.
- Kebijakan pembatalan.

### Pembayaran
- Nama rekening.
- Bank.
- Nomor rekening.
- Instruksi pembayaran.
- Template WhatsApp.
- Batas waktu pembayaran.

### Sistem
- Mode maintenance.
- SEO title.
- SEO description.
- Konfigurasi dasar lainnya.

Semua pengaturan sensitif harus divalidasi dan dibatasi untuk admin.

---

# 10. SUPABASE DATABASE DESIGN

Gunakan PostgreSQL migrations yang version-controlled.

Buat tabel berikut:

## 10.1 profiles

```text
id UUID PK REFERENCES auth.users(id)
username TEXT UNIQUE
full_name TEXT
email TEXT
phone TEXT
role TEXT
experience_level TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Role: `admin`, `member`.

Gunakan proteksi agar pengguna biasa tidak dapat mengubah role sendiri.

## 10.2 class_themes

```text
id UUID PK
title TEXT
slug TEXT UNIQUE
short_description TEXT
description TEXT
thumbnail_url TEXT
price NUMERIC(12,2)
duration_minutes INTEGER
recommended_sessions INTEGER
difficulty_level TEXT
requirements TEXT
materials_info TEXT
is_active BOOLEAN
sort_order INTEGER
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Harga tidak boleh negatif. Jumlah rekomendasi harus positif.

## 10.3 theme_modules

```text
id UUID PK
theme_id UUID FK
sequence_no INTEGER
title TEXT
description TEXT
created_at TIMESTAMPTZ
```

Gunakan unique constraint `theme_id + sequence_no`.

## 10.4 class_dates

```text
id UUID PK
class_date DATE UNIQUE
start_time TIME
end_time TIME
theme_id UUID NULL FK
capacity INTEGER DEFAULT 3
is_open BOOLEAN DEFAULT TRUE
locked_by_admin BOOLEAN DEFAULT FALSE
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Pastikan start_time lebih kecil dari end_time dan capacity lebih dari nol.

Jika sebuah tanggal tidak memiliki row eksplisit, gunakan aturan jadwal default untuk menentukan statusnya.

Ketika peserta pertama melakukan booking, buat atau kunci row tanggal tersebut dalam transaksi aman.

## 10.5 calendar_blocks

```text
id UUID PK
title TEXT
block_date DATE NULL
weekday INTEGER NULL
is_recurring BOOLEAN
is_active BOOLEAN
created_at TIMESTAMPTZ
```

Gunakan ini untuk hari libur dan hari off berulang. Definisikan standar weekday secara konsisten.

## 10.6 bookings

```text
id UUID PK
booking_code TEXT UNIQUE
member_id UUID FK
class_date_id UUID FK
theme_id UUID FK
requested_module_id UUID NULL FK
price_snapshot NUMERIC(12,2)
status TEXT
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
cancelled_at TIMESTAMPTZ NULL
expires_at TIMESTAMPTZ NULL
```

Gunakan status enum/check constraint.

Buat partial unique index untuk mencegah member mempunyai lebih dari satu booking aktif pada class_date yang sama.

Booking aktif:
- PENDING_ADMIN
- AWAITING_PAYMENT
- PAYMENT_REVIEW
- CONFIRMED
- COMPLETED

Booking CANCELLED dan EXPIRED tidak menahan kursi.

Untuk perhitungan kursi sebelum pertemuan, COMPLETED secara historis tetap dianggap menempati kursi pada tanggal tersebut agar kapasitas hari lampau konsisten.

## 10.7 payments

```text
id UUID PK
booking_id UUID FK
amount_due NUMERIC(12,2)
amount_received NUMERIC(12,2)
status TEXT
method TEXT
paid_at TIMESTAMPTZ NULL
verified_at TIMESTAMPTZ NULL
verified_by UUID NULL FK
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

V1 menggunakan satu tagihan per booking. Sediakan desain yang dapat diperluas untuk pembayaran parsial di masa depan.

## 10.8 attendance

```text
id UUID PK
booking_id UUID UNIQUE FK
status TEXT
completed_module_id UUID NULL FK
notes TEXT
recorded_by UUID FK
recorded_at TIMESTAMPTZ
```

Status:
- PRESENT
- ABSENT
- EXCUSED

## 10.9 app_settings

```text
key TEXT PK
value JSONB
updated_at TIMESTAMPTZ
updated_by UUID NULL
```

Gunakan schema validation untuk nilai pengaturan.

## 10.10 booking_status_history

```text
id UUID PK
booking_id UUID FK
old_status TEXT
new_status TEXT
changed_by UUID NULL
reason TEXT
created_at TIMESTAMPTZ
```

## 10.11 audit_logs

```text
id UUID PK
actor_id UUID NULL
action TEXT
entity_type TEXT
entity_id UUID NULL
old_data JSONB NULL
new_data JSONB NULL
created_at TIMESTAMPTZ
```

Jangan mencatat password, token, secret, atau data sensitif yang tidak diperlukan.

---

# 11. ROW LEVEL SECURITY

Aktifkan RLS pada seluruh tabel yang terpapar melalui Supabase API.

## Policies

### Guest
- Hanya boleh membaca tema aktif dan data ketersediaan publik yang aman.
- Tidak boleh membaca identitas peserta.
- Tidak boleh membaca pembayaran.
- Tidak boleh mengakses tabel admin.

### Member
- Boleh membaca/mengubah field profil yang diizinkan pada profil sendiri.
- Boleh membaca booking sendiri.
- Boleh membaca pembayaran sendiri.
- Boleh membaca riwayat kehadiran sendiri.
- Tidak dapat mengubah status booking atau pembayaran secara langsung.

### Admin
- Dapat mengelola data operasional melalui endpoint/server action yang memverifikasi role.
- Tidak dapat membaca password pengguna.
- Perubahan penting dicatat di audit log.

Buat fungsi pemeriksaan role yang aman dari eskalasi hak akses.

Hindari recursive RLS policy dan SECURITY DEFINER yang terlalu permisif.

Jangan mengandalkan service role key untuk seluruh query umum jika query dapat dilakukan menggunakan sesi pengguna dan RLS.

---

# 12. AUTHENTICATION & REGISTRATION

Gunakan Supabase Auth.

Flow pendaftaran baru:

1. Validate form dengan Zod.
2. Periksa login/account existing.
3. Buat akun melalui Supabase Auth.
4. Buat profile member.
5. Jalankan proses booking atomik.
6. Return booking sukses.
7. Tampilkan halaman berhasil.

Pembuatan akun dan booking melibatkan layanan berbeda, sehingga harus ada strategi pemulihan jika salah satu tahap gagal.

Jangan meninggalkan user account tanpa profile yang valid.

Jika booking gagal karena kursi sudah penuh, akun yang baru dibuat tetap dapat digunakan dan pengguna harus diberi opsi memilih tanggal lain.

Jangan menganggap pembuatan akun dan booking sebagai satu transaksi PostgreSQL jika operasi Auth terjadi di luar transaksi tersebut.

Sediakan:
- Login.
- Logout.
- Forgot password.
- Password reset.
- Session persistence.
- Protected routes.
- Server-side session validation.
- Login rate limiting.

Username harus unik. Jika login berbasis username digunakan, implementasikan resolver username secara aman agar tidak membocorkan identitas pengguna.

Alternatif yang lebih sederhana untuk V1 adalah login menggunakan email dengan username hanya sebagai identitas member yang ditampilkan.

---

# 13. BOOKING API / SERVER FUNCTIONS

Buat fungsi domain minimal:

```text
getPublicThemes()
getThemeDetails(slug)
getCalendarAvailability(month, themeId)
createBooking(memberId, themeId, classDate, moduleId)
getMemberBookings(memberId)
getBookingDetails(bookingId)
getAdminBookings(filters)
updateBookingStatus(bookingId, status)
verifyPayment(paymentId, details)
cancelBooking(bookingId, reason)
rescheduleBooking(bookingId, targetDate)
updateClassDate(date, settings)
getAdminDashboardStats()
```

Buat validasi otorisasi, input, dan error yang konsisten pada setiap operasi.

Jangan mempercayai `memberId`, `price`, atau `role` yang dikirim browser tanpa verifikasi server.

Harga booking harus diambil dari database saat pendaftaran dan disalin ke price_snapshot.

Gunakan idempotency protection untuk submit booking agar double-click atau retry tidak membuat booking ganda.

Refresh kalender saat kembali ke halaman, setelah booking, dan secara berkala bila diperlukan. Validasi akhir tetap harus dilakukan database.

---

# 14. COMPONENT ARCHITECTURE

Komponen reusable yang dibutuhkan:

```text
components/
  layout/
    PublicNavbar
    PublicFooter
    MemberSidebar
    AdminSidebar
    MobileNavigation

  themes/
    ThemeCard
    ThemeDetail
    ThemeModules
    ThemeForm

  calendar/
    BookingCalendar
    AdminCalendar
    DateStatusBadge
    DayDetailPanel
    AvailabilityLegend

  booking/
    RegistrationForm
    BookingSummary
    BookingStatusBadge
    BookingCard
    BookingDetail
    RescheduleDialog

  payment/
    PaymentStatusBadge
    PaymentDetail
    PaymentApprovalDialog
    WhatsAppContactButton

  admin/
    StatsCard
    BookingTable
    MemberTable
    ThemeTable
    SettingsForm

  shared/
    PageHeader
    EmptyState
    LoadingSkeleton
    ErrorState
    ConfirmDialog
```

Gunakan komponen shadcn/ui untuk form, table, calendar primitives, dialog, badge, tabs, popover, dropdown, dan toast.

---

# 15. ADMIN SETTINGS AS SINGLE SOURCE OF TRUTH

Jangan hardcode aturan bisnis di berbagai file.

Buat central configuration yang memuat:

```text
business_name
business_description
business_phone
business_address
business_maps_url
instagram_url

default_capacity = 3
default_start_time
default_end_time
timezone = Asia/Jakarta

reservation_timeout_enabled = false
reservation_timeout_hours = 24

booking_advance_limit_days
booking_cutoff_hours

payment_bank_name
payment_account_number
payment_account_holder
payment_instructions

whatsapp_booking_template
whatsapp_payment_template

website_maintenance_mode
```

Harga disimpan per tema, bukan sebagai pengaturan global.

Pengaturan kalender tertentu harus dapat meng-override default operasional.

---

# 16. REPORTING V1

Admin memiliki laporan dasar:

- Total pendaftaran per bulan.
- Total pendaftaran per tema.
- Jumlah kelas terlaksana.
- Total member unik.
- Tingkat keterisian kelas.
- Pembayaran terverifikasi.
- Pembayaran belum terverifikasi.
- Peserta yang belum menyelesaikan rekomendasi sesi.

Pendapatan harus dihitung dari pembayaran yang benar-benar diverifikasi, bukan seluruh booking.

Sediakan ekspor CSV untuk data pendaftaran dan pembayaran dengan pembatasan akses admin.

---

# 17. ERROR HANDLING

Berikan pesan ramah pengguna.

Contoh:

- "Maaf, kuota pada tanggal ini sudah penuh."
- "Tanggal ini sudah digunakan untuk tema lain."
- "Tanggal yang dipilih sedang tidak tersedia."
- "Kamu sudah terdaftar pada tanggal tersebut."
- "Pendaftaran belum berhasil. Silakan coba kembali."
- "Sesi login telah berakhir. Silakan login kembali."
- "Perubahan jadwal tidak dapat disimpan karena masih ada peserta terdaftar."

Log detail teknis hanya di server, tanpa mengekspos query SQL, secret, atau stack trace kepada pengguna.

---

# 18. DATABASE SEED

Buat seed terpisah, aman untuk development.

Isi awal:

Nama usaha:
Juylaikhas Sewing Class

Tema:
Pelatihan Jahit Dasar — Membuat Dress Sendiri

Harga:
80000

Recommended sessions:
3

Capacity:
3

Timezone:
Asia/Jakarta

Location:
Pamulang, Tangerang Selatan

Buat tiga modul rekomendasi sesuai penjelasan awal.

Jangan membuat data pembayaran atau booking fiktif di database produksi.

Seed harus idempotent.

Jangan pernah membuat akun admin dengan password default yang mudah ditebak.

Sediakan prosedur aman untuk menetapkan admin pertama melalui environment/server-side bootstrap yang hanya dijalankan secara eksplisit, lalu dinonaktifkan.

---

# 19. QUALITY ASSURANCE

Buat unit tests dan integration tests untuk aturan paling kritis.

Test wajib:

1. Tanggal kosong menerima tema pertama.
2. Pendaftaran kedua dengan tema sama berhasil.
3. Pendaftaran dengan tema berbeda ditolak.
4. Pendaftaran keempat ditolak.
5. Dua permintaan bersamaan tidak melebihi kuota.
6. Dua permintaan pertama dengan tema berbeda tidak mengunci dua tema sekaligus.
7. Pendaftaran dibatalkan mengembalikan kursi.
8. Tema tidak terlepas jika masih ada booking aktif.
9. Tema terlepas jika semua booking aktif dibatalkan dan tidak dikunci admin.
10. Admin override tema tidak merusak booking existing.
11. Member lama dapat mendaftar tanggal lain.
12. Member tidak bisa mendaftar dua kali pada tanggal sama.
13. Member tidak bisa membaca data peserta lain.
14. Member tidak bisa mengubah payment status.
15. Member tidak bisa mengubah role menjadi admin.
16. Admin dapat memverifikasi pembayaran.
17. Booking confirmed tidak otomatis expired.
18. Riwayat belajar hanya bertambah berdasarkan kehadiran yang valid.
19. Form tidak membuat booking ganda saat submit dua kali.
20. Perubahan kuota di bawah jumlah booking aktif ditolak.
21. Reschedule tidak menyebabkan double booking.
22. Tanggal dan waktu konsisten dengan Asia/Jakarta.

Tambahkan smoke test untuk halaman utama dan navigasi admin/member.

---

# 20. DEVELOPMENT PHASES

Kerjakan secara berurutan.

## PHASE 1 — Foundation

- Inisialisasi Next.js.
- Konfigurasi TypeScript.
- Setup Tailwind dan shadcn/ui.
- Definisikan design tokens.
- Setup Supabase client/server.
- Buat SQL migrations.
- Implementasikan authentication.
- Implementasikan protected routes.
- Siapkan role-based access.
- Siapkan seed tema awal.

## PHASE 2 — Public Registration

- Landing page.
- Katalog tema.
- Detail tema.
- Kalender ketersediaan.
- Form pendaftaran.
- Pembuatan akun member.
- Booking atomic.
- Halaman pendaftaran berhasil.

## PHASE 3 — Admin

- Dashboard overview.
- Kalender admin.
- CRUD tema.
- Manajemen booking.
- Tombol WhatsApp.
- Verifikasi pembayaran.
- Approve/cancel/reschedule.
- Manajemen member.
- Pengaturan aplikasi.

## PHASE 4 — Member

- Dashboard member.
- Kelas saya.
- Riwayat belajar.
- Progress tema.
- Detail booking.
- Profil dan password.

## PHASE 5 — QA & Polish

- Semua unit/integration tests.
- Responsiveness.
- Accessibility.
- Error handling.
- Loading states.
- Security review.
- Optimasi database.
- Build production.
- Dokumentasi.
- Deployment readiness.

---

# 21. ACCEPTANCE CRITERIA

Aplikasi dinyatakan V1 COMPLETE jika:

- Public website dapat diakses.
- Tema dapat ditambah/edit oleh admin.
- Tema ditampilkan otomatis di website publik.
- Kalender dapat diatur oleh admin.
- Kalender publik sinkron dengan data jadwal.
- Pendaftaran membuat booking nyata di Supabase.
- Pendaftar baru mendapatkan akun member.
- Member lama dapat mendaftar kelas berikutnya.
- Kuota tiga peserta bekerja.
- Tema otomatis terkunci sesuai pendaftar pertama.
- Overbooking dicegah di database.
- Status booking tampil konsisten di admin dan member.
- Admin dapat membuka WhatsApp peserta dengan template pesan.
- Admin dapat memverifikasi pembayaran.
- Booking dapat di-approve.
- Kursi dapat dilepas setelah pembatalan.
- Admin dapat mengelola kehadiran.
- Riwayat belajar dapat dilihat member.
- Pengaturan utama tersedia di dashboard admin.
- Data member tidak bisa diakses member lain.
- UI responsif dan mengikuti palet brand.
- `npm run build` berhasil.
- Test kritis lulus.
- Tidak ada secret bocor di client.
- Tidak ada data dummy tersisa sebagai data produksi.

---

# 22. REQUIRED DELIVERABLES

Di dalam `D:\Buildapps\sewing`, hasilkan:

1. Source code lengkap.
2. SQL migrations.
3. Seed tema awal.
4. Supabase client/server configuration.
5. `.env.example`.
6. README.md.
7. Dokumentasi setup Supabase.
8. Dokumentasi bootstrap admin.
9. Dokumentasi operasional admin.
10. Automated tests.
11. Build production yang lulus pemeriksaan.

Setelah implementasi, berikan laporan:

- Fitur selesai.
- Fitur yang masih membutuhkan konfigurasi.
- File utama yang dibuat.
- Migration yang harus dijalankan.
- Environment variables yang diperlukan.
- Cara menjalankan lokal.
- Cara mengakses admin.
- Hasil build/test.
- Masalah atau batasan yang belum terselesaikan.

Jangan mengklaim fitur berhasil sebelum benar-benar diuji.

---

# 23. CODING EXECUTION RULES

1. Kerjakan langsung di `D:\Buildapps\sewing`.
2. Jika folder belum ada, buat folder.
3. Jika sudah berisi proyek, periksa sebelum memodifikasi.
4. Gunakan struktur kode modular.
5. Jangan menghapus file existing tanpa alasan.
6. Jangan menambahkan fitur di luar scope V1 tanpa kebutuhan nyata.
7. Hindari dependency berlebihan.
8. Jangan membuat seluruh aplikasi dalam satu file.
9. Utamakan keamanan dan integritas database.
10. Semua data nyata harus dari Supabase.
11. Jika kredensial Supabase belum tersedia, siapkan seluruh file dan instruksi konfigurasi tanpa memalsukan koneksi.
12. Selesaikan implementasi sejauh memungkinkan dalam sesi kerja.
13. Jalankan lint, typecheck, test, dan build.
14. Laporkan hasil sebenarnya.

**PENTING:**
Tidak cukup hanya membuat mockup. Bangun aplikasi fungsional beserta aturan database, autentikasi, dan dashboard.

Saat aplikasi siap dijalankan, gunakan perintah development server dan berikan URL localhost.

Jangan melakukan deployment production tanpa persetujuan pengguna.

---

# FINAL DESIGN DIRECTION

Juylaikhas Sewing Class harus terasa seperti studio jahit privat yang hangat dan personal, bukan software enterprise yang kaku.

Prioritaskan pengalaman pendaftaran yang singkat, kalender yang jelas, serta dashboard admin yang mudah digunakan oleh pengelola nonteknis.

Hasil akhir harus menjadi fondasi jangka panjang untuk menambahkan lebih banyak tema, peserta, jadwal, dan pengajar di masa depan tanpa perlu membangun ulang sistem.