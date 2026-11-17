# Panduan Operasional Admin

## Pendaftaran dan pembayaran

1. Buka **Pendaftaran**, pilih booking baru.
2. Gunakan tombol WhatsApp; pesan berisi kode, tema, tanggal, dan nominal.
3. Ubah booking menjadi `AWAITING_PAYMENT` setelah instruksi dikirim.
4. Gunakan `PAYMENT_REVIEW` bila peserta melaporkan pembayaran.
5. Isi nominal, metode, waktu, dan catatan pada panel pembayaran lalu verifikasi.
6. Setelah pembayaran berstatus `VERIFIED`, ubah booking menjadi `CONFIRMED`. Database menolak confirm jika pembayaran belum verified.

## Kalender

- Klik tanggal untuk mengatur jam, kapasitas, buka/tutup, tema, dan kunci admin.
- Kapasitas tidak dapat diturunkan di bawah booking aktif.
- Tema tidak dapat diganti saat masih ada booking aktif.
- Menutup tanggal tidak membatalkan peserta secara otomatis.
- Tambahkan block untuk hari libur khusus atau hari off mingguan.

## Kehadiran dan progres

- Hanya peserta confirmed/completed tampil di halaman kehadiran.
- Pilih status kehadiran dan modul yang benar-benar diselesaikan.
- Progres member dihitung dari modul unik pada kehadiran `PRESENT`, bukan jumlah booking.

## Tema dan konten

- Tema yang pernah digunakan sebaiknya dinonaktifkan, bukan dihapus.
- Upload gambar ke bucket `theme-media`, lalu simpan URL publik pada tema/pengaturan.
- Placeholder lokal akan tampil jika URL gambar kosong.

## Laporan

Pendapatan hanya memakai payment `VERIFIED`. Ekspor CSV hanya tersedia bagi admin terautentikasi.
