# Warung Kita — Cooking & Restaurant Simulator

Game simulasi memasak dan manajemen warung berbasis HTML, CSS, dan JavaScript. Dibuat responsif untuk browser HP maupun laptop.

## Fitur single-player saat ini
- Alur memasak tiga tahap: siapkan bahan, masak, lalu sajikan.
- Pesanan pelanggan menjadi acuan; menu yang tidak cocok tidak dapat dimasak untuk pesanan tersebut.
- Memasak memakai timer per resep dan mini-game aksi tepat waktu untuk meningkatkan kualitas.
- Stok dikurangi saat proses memasak dimulai, bukan saat melihat atau menyiapkan menu.
- Timer memasak dan status pesanan aktif dipulihkan dari penyimpanan lokal setelah halaman dimuat ulang.
- Tujuh menu yang dapat berkembang: nasi goreng spesial, mi goreng Jawa, bakso kuah, es teh manis, ayam geprek, soto ayam, dan sate ayam.
- Menu baru terbuka berdasarkan total pelanggan yang berhasil dilayani.
- Pengelolaan uang kas, modal bahan, stok, omzet, tip, reputasi, dan jumlah pelanggan.
- Pelanggan memiliki kesabaran; pelayanan lambat dapat mengurangi reputasi dan tip.
- Upgrade kompor, tambah meja, belanja stok, rekrut asisten dapur, dan promosi.
- Misi harian dengan hadiah uang dan reputasi.
- Peringkat usaha berdasarkan jumlah pelanggan, dari warung pemula menuju calon juragan restoran.
- Hari operasional, bonus pergantian hari, ringkasan omzet dan pelanggan.
- Progres disimpan di browser dengan LocalStorage.
- UI responsif dan ilustrasi warung digambar dengan Canvas.

## Add Team / Teman — fondasi multiplayer

Panel **Teman** menyiapkan alur akun, buat/gabung tim dengan kode undangan, roster dan peran, catatan aktivitas append-only, pembaruan realtime untuk roster/feed, serta laporan privat untuk perlindungan reputasi. Batas awal tim adalah 8 pemain dan satu akun hanya dapat menjadi anggota satu tim pada satu waktu. Riwayat lokal single-player tidak diubah atau otomatis dibagikan ke tim.

### Mengaktifkan backend Supabase

1. Buat proyek Supabase sendiri dan aktifkan provider Email di Authentication. Atur konfirmasi email sesuai kebutuhan.
2. Buka **SQL Editor** pada proyek tersebut dan jalankan berurutan isi `supabase/migrations/202610240001_add_team.sql`, `supabase/migrations/202610240002_multiplayer_game_state.sql`, lalu `supabase/migrations/202610240003_team_management_core.sql`. Jalankan pada proyek pengujian dahulu dan tinjau kebijakan RLS sebelum produksi.
3. Branch ini sudah dikonfigurasi dengan Project URL dan **publishable key** proyek `warung-kita-multiplayer`. Publishable key memang boleh digunakan di frontend; jangan pernah memasukkan `service_role` atau secret key ke file frontend. Jika mengganti proyek, perbarui `team-config.js`.
4. Atur **Authentication → URL Configuration** pada Supabase: Site URL ke URL GitHub Pages produksi dan tambahkan URL GitHub Pages yang sama pada Redirect URLs. Setelah PR digabung/deploy, uji buat akun, masuk, buat tim, bergabung memakai kode di browser/perangkat lain, pembaruan realtime, simpan progres tim, muat progres tim, dan laporan privat.
5. Periksa Supabase Database → Replication jika tabel roster/feed/progres belum dikirim melalui Realtime. Migrasi mencoba menambahkan tabel ke publikasi `supabase_realtime`; jika publikasi tidak tersedia, atur dari dashboard dan ulangi pengujian.

### Fitur manajemen tim tahap 3

- Lowongan terbuka dengan lamaran dan keputusan terima/tolak oleh pemilik/pengelola.
- Jabatan kerja (koki, kasir, pelayan, pengelola stok, manajer operasional) dipisahkan dari peran akses (pemilik/pengelola/anggota).
- Pemilik dapat menetapkan jabatan, mengatur kompensasi game, aturan dana cadangan/bagi hasil, dan mentransfer kepemilikan.
- Buku kas game mencatat pendapatan, biaya, gaji, bonus, cadangan, dan distribusi keuntungan sebagai ledger append-only; catatan ini bukan transaksi uang sungguhan dan pembayaran tidak otomatis dijalankan.
- Alur perselisihan mendukung tanggapan kedua pihak, mediasi/evaluasi formal, dan penyelesaian oleh pengelola yang tidak terlibat langsung.
- Anggota dapat meminta keluar; pemilik/pengelola meninjau permintaan. Catatan audit mencatat tindakan manajemen.
- Status online menggunakan Supabase Realtime Presence saat sesi terhubung; status ini bukan jaminan bahwa pemain sedang aktif bermain.
- Migrasi tahap 3 sudah diterapkan pada proyek Free `warung-kita-multiplayer`. UI tahap 3 baru aktif setelah PR ini digabung/deploy; jika memakai proyek Supabase lain, jalankan migrasi `202610240003_team_management_core.sql` setelah dua migrasi sebelumnya.

### Batasan Add Team saat ini

- Proyek Supabase Free `warung-kita-multiplayer` di Singapura sudah memiliki ketiga migrasi; tabel dan RLS terverifikasi aktif serta tabel multiplayer/manajemen terdaftar pada publikasi Realtime. Masih perlu mengatur URL Authentication, menggabungkan/deploy UI, dan menguji dengan dua akun nyata sebelum multiplayer dinyatakan aktif.
- Sinkronisasi progres saat ini berupa **snapshot manual**: anggota memilih “Simpan progres ke tim” atau “Muat progres tim”. Ini bukan sinkronisasi aksi langsung per detik dan tidak menggabungkan perubahan otomatis. Revisi mencegah snapshot lama menimpa snapshot baru; jika ada konflik, muat progres terbaru sebelum menyimpan.
- Pemilik tim belum dapat keluar atau mentransfer kepemilikan lewat UI; fitur transfer/penutupan tim perlu tahap berikutnya.
- Laporan reputasi bersifat privat dan tidak mengubah reputasi game secara otomatis. Alur peninjauan lanjutan, bukti/attachment, banding, rate limiting dan moderasi belum diselesaikan.
- Realtime dan kebijakan akses perlu diuji pada proyek Supabase yang benar-benar dikonfigurasi sebelum digunakan pemain sungguhan.

## Menjalankan
Buka `index.html` lewat browser atau kunjungi GitHub Pages:
https://dink2v.github.io/adventure-game-web/

## GitHub Pages
Pengaturan publikasi tetap: Settings → Pages → Deploy from a branch → `main` → `/(root)`.

## Batasan versi saat ini
- Single-player tetap memakai LocalStorage per browser/perangkat. Snapshot tim masih disimpan/dimuat secara manual; aksi memasak, pesanan, stok, dan kas belum tersinkron langsung sebagai satu simulasi realtime antar pemain.
- Belum ada simulasi gameplay otoritatif di server, perhitungan gaji/bonus otomatis dari kinerja, distribusi keuntungan otomatis, lowongan berbasis undangan langsung ke akun tertentu, atau proses banding/moderasi lengkap.
- Ilustrasi warung masih berbasis Canvas; belum menggunakan aset 3D realistis.
- Efek suara dan musik belum aktif.
- Gameplay dan tampilan perlu pengujian langsung di browser HP setelah deployment.

## Pengembangan berikutnya
- Animasi memasak dan indikator waktu/progres yang lebih interaktif.
- Sistem pelanggan/antrean yang lebih hidup serta laporan keuangan terperinci.
- Efek suara dan musik.
- Sinkronisasi aksi gameplay realtime dengan aturan kepemilikan/konflik yang lebih rinci; saat ini yang tersedia adalah snapshot manual bersama.
