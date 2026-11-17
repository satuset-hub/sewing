# Bootstrap Admin Pertama

Bootstrap hanya untuk satu kali pemakaian dan tidak membuat password default.

1. Buat secret acak minimal 32 karakter dan isi `ADMIN_BOOTSTRAP_SECRET` di server lokal.
2. Pastikan migration `202611170002_admin_bootstrap.sql` sudah diterapkan.
3. Login sebagai akun yang akan menjadi admin.
4. Buka `http://localhost:3000/bootstrap-admin` dan masukkan secret.
5. Logout/login kembali agar profil dan navigasi termuat ulang.
6. Hapus environment variable `ADMIN_BOOTSTRAP_SECRET` dan restart aplikasi.

Fungsi database hanya menerima user yang sedang terautentikasi dan menolak operasi bila admin sudah ada. Aktivitas dicatat di audit log. Admin tidak pernah dapat melihat password member.
