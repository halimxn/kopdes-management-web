# Checklist produk aktif — 5 Oktober 2026

Implementasi, bukti pemeriksaan dan penerimaan dibedakan. STATUS adalah keadaan terbaru; CHANGELOG dan laporan QA menyimpan sejarah. Daftar lama yang mengulang angka tes dan instruksi layout usang telah diringkas.

## Dunia Koperasi

- [x] Analisis empat frame video dan referensi interior; simpan referensi/gaya untuk AI berikutnya.
- [x] Halaman dunia pada navigasi aplikasi, layar penuh/dock, sesi dan data workspace.
- [x] Exterior/interior Three.js, kamera ortografis, zoom/putar/reset dan penanda HTML.
- [x] Kantor membuka interior; tujuh lahan terisi otomatis dari unit yang dimuat.
- [x] Meja rapat, workstation tugas, arsip/buku dan treadmill kegiatan dengan tautan modul.
- [x] Maskot modular, bubble, animasi berbasis data dan pratinjau gerakan.
- [x] Cuaca simulasi/waktu WIB/pakaian; preferensi lokal tervalidasi.
- [x] Tes adapter/UI, typecheck, lint dan production build. Cakupan aktual di STATUS.
- [x] QA lokal kosong exterior/interior 360/768/1024/1440, tanpa luapan; penanda masuk kantor/bubble/pratinjau rapat-gym.
- [x] Kawasan 62 × 50: jalan, gerbang, parkir truk/mobil, gudang empat dok, kantor, taman, boulevard tujuh lahan; pemilih zona dan kamera mulus (paket 2).
- [x] Siang lebih terang, malam terbaca, chip Suasana di header; pilihan tersimpan setelah reload (paket 1/3). Bawaan waktu tetap Otomatis WIB.
- [x] Truk boks dari data Pengiriman di dok/antre dengan kartu; dua mobil suasana bergerak berlabel simulasi (paket 6).
- [x] Manajer berjalan ke briefing, meja staf dengan tugas lewat tenggat, atau dok; bubble otomatis 7 detik tiap 2,5 menit (paket 8).
- [x] Interior kantor bersekat: ruang rapat (duduk), meja seksi, pantry, arsip, area kegiatan; maskot ke gym saat kegiatan hari ini (paket 7).
- [ ] Penerimaan pemilik atas kualitas dan kemiripan final dengan video.
- [ ] Semua interaksi/state, raycast objek langsung, semua cuaca/waktu, keyboard/reduced-motion dan fallback WebGL.
- [ ] Semua target sentuh/kontras, perangkat fisik, WebGL perangkat rendah dan benchmark performa.
- [ ] UAT pemetaan/sinkronisasi dengan data nyata dan paginasi.
- [x] Slot lahan permanen lewat kolom Gerai (paket 2).
- [ ] Editor lingkungan dan preferensi/layout lintas perangkat.
- [x] Pengiriman, Mutasi stok atomik (migrasi 8 dijalankan pemilik), kategori Suplier/Ekspedisi, gudang dan rak dari data Barang (paket 4–6).
- [x] Karakter dari catatan Tim dengan jadwal teruji dan keterangan bukan kehadiran (paket 7–8).
- [ ] AI chat; belum tersedia.
- [x] QA contoh development 360/768/1024/1440 tanpa luapan; 74 draw call di 1440 (paket 10).

## Fitur operasional tersedia

- [x] Proyek fleksibel, properti, catatan, tugas/milestone dan progres bersama.
- [x] Tugas daftar/papan/harian/kalender/Gantt, filter, subtugas, dependensi dan pengulangan.
- [x] Riwayat berupa tab horizontal Proyek; alias lama redirect, tugas historis tetap tersedia.
- [x] Beranda/Hari Ini dari data asli, kegiatan terpisah dari tugas.
- [x] Rapat/ICS, koordinasi, dokumen, risiko, jurnal dan laporan snapshot.
- [x] Anggota, kas, barang dan opname dengan gerbang kemampuan database.
- [x] PIN/sesi/RLS/Origin, profil dan cadangan JSON.
- [x] Paket perbaikan anotasi sebelumnya; bukti/batas di QA-ANOTASI.md, QA-TATA-LETAK.md dan QA-POPUP.md.

## Penerimaan operasional dan cloud terbuka

- [ ] Konfirmasi PIN/simpan setelah reset serta keadaan migrasi cloud 6/7.
- [ ] UAT data nyata dan konsistensi lintas tampilan, cadangan/pemulihan di lingkungan uji.
- [ ] Audit UI legacy: lint:ui/check:ui belum diulang; laporan sebelumnya 111 temuan CSS dan enam kontrol mentah.
- [ ] Sel kalender panel sempit, semua modul/tema/state/akses dan perangkat fisik.
- [ ] Lighthouse/performa data besar dan smoke test produksi setelah deployment yang diizinkan.

## Pengembangan di luar paket ini

- [ ] Editor blok bebas, kolaborasi real-time, PWA/offline dan unggah berkas.
- [ ] Baseline/jalur kritis, penjadwalan otomatis dependensi dan impor CSV buku.

SQL cloud tetap memerlukan penjelasan berkas, dampak, proyek tujuan dan persetujuan pemilik. Migrasi 8 (pengiriman/mutasi) dijalankan pemilik 6 Oktober 2026. Program 90 hari bukan instruksi aktif.
