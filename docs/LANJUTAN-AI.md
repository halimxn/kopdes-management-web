# Serah terima AI — 6 Oktober 2026

## Arahan aktif (7 Oktober 2026)

Dunia Koperasi diganti menjadi **2D pixel ala Eastward (PixiJS)**. Baca DUNIA-KOPERASI (kontrak dan paket P0–P8) dan docs/dunia-pixel/. P1, P0 dan P2 (mesin PixiJS greybox) selesai; berikutnya **P3 eksterior**: ganti greybox di `pixel/engine.ts` dengan aset dari generator (atlas PNG). P3–P5 (aset) perlu reasoning tinggi: beri tahu pemilik sebelum mulai. Commit lokal per paket; push setelah semua tahap selesai. Bagian di bawah tentang 3D adalah riwayat.

## Arahan lama (riwayat 3D)


Kerjakan **Rencana Dunia Koperasi v2** pada bagian terakhir [DUNIA-KOPERASI](DUNIA-KOPERASI.md). Rencana ini disetujui pemilik 6 Oktober 2026: tetap 3D low-poly yang ringan, kawasan ± 4× lebih luas dengan gudang besar, NPC karyawan per seksi dan manajer, UI kartu mengikuti delapan frame video dan rapi di ponsel, serta fitur web Pengiriman dan Mutasi stok.

## Keadaan Git

- Pekerjaan dunia v1 (16 commit, 5 Oktober) dinilai pemilik kacau. Diarsipkan pada tag `arsip/dunia-v1-20261005`, lalu merge PR #3 dibatalkan di main dengan commit 9551476. Isi main sama dengan ecddd85.
- Jangan menggabungkan ulang tag arsip secara massal. Ambil gagasan atau berkas tertentu setelah diperiksa; karena merge sudah di-revert, gunakan cherry-pick/salin manual, bukan merge.
- Cabang kerja: `codex/dunia-koperasi`, melacak origin. Jangan force-push.
- Cabang `codex/manager-workspace-polish`, `codex/reset-database-kosong`, `codex/workspace-redesign` sudah masuk main dan belum dihapus; tunggu izin pemilik.

## Skill proyek

`.claude/skills/`: hemat-token, dunia-koperasi, ui-ux-kopdes, backend-kopdes, clean-code (merujuk `.agents/skills/clean-code`), serta pihak ketiga caveman, grill-me/grilling, 3d-graphics (sumber dan lisensi di `.claude/skills/SUMBER.md`). Pakai sesuai pekerjaan; hemat-token di setiap sesi panjang.

## Urutan melanjutkan

1. Periksa Git, AGENTS, STATUS dan rencana v2.
2. Mulai paket berikutnya yang belum selesai. Saat penulisan: rencana v2 paket 0–10 selesai (personal.css ditunda pemilik). Pemilik akan merevisi tampilan 3D berikutnya; tunggu arahannya. Belum: perangkat fisik, UAT data cloud, penerimaan visual pemilik, PR ke main. Migrasi 8 sudah dijalankan pemilik di cloud. Pemilik meminta hemat token: kelompokkan perubahan, batasi screenshot. Pemilik meminta push GitHub setelah semua tahap selesai; commit lokal saja sampai saat itu.
3. Sebelum tiap paket buat tag checkpoint; commit kecil per paket; PR ke main hanya setelah pemilik menilai screenshot/rekaman.
4. Akhir paket: perbarui bagian "Paket terakhir" di bawah, STATUS dan CHANGELOG.

## Paket selesai (menunggu penilaian pemilik): Distrik ala video v4 (keputusan pemilik 6 Oktober, wawancara kedua)

Acuan tunggal: video. Zip pemilik (PANDUAN_AGENT/dunia-koperasi-referensi-luas.html) hanya gambaran, bukan panduan. Jangan berpatokan pada denah lama.
Keputusan: distrik kota grid berjalan berlajur + zebra cross; kavling berpagar rapi (halaman, parkir, rumput/pohon), tidak berdempetan. Kavling: Logistik (gudang gaya WH-04 + lingkungannya) + Cold storage (gaya WH-03) berbagi halaman dok berlantai tinggi, marka kuning, parkir truk, cas forklift, kardus staging dari barang tanpa rak; Administrasi (kantor + simpan pinjam + parkir); Kesehatan (klinik + apotek berdampingan); Niaga (sembako + kavling gerai tambahan); Lahan pertanian L1–L6 kosong. Posisi unit KDMP tetap; bangunan tampil dari data Gerai, belum buka = kavling rencana. Warna dasar = sampel video (tanah #e4ecfc, #d4dcf4, #bccce4; dinding #ececfc; biru #2f6be8/#1454cc); warna lain improvisasi pastel senada. Bayangan berona biru, sudut membulat, AO di Tinggi, bayangan kontak di Sedang/Hemat. Bawaan siang cerah, cuaca/waktu manual di Suasana. Kamera bawaan dekat, halus. Kartu putih 82–88 % + blur desktop, 95 % tanpa blur ponsel/Hemat; ikon ilustrasi biru; bar chart (stok vs minimum, progres dok, mini 7 hari dari data nyata, sembunyi bila tanpa riwayat). Pemilih zona ala video (kavling + bar + ringkasan data). Klik item daftar pergi ke tempatnya (rapat→ruang rapat, tugas→meja, stok→rak, Tim→karakter, Dok→truk). Truk data masuk, belok halus, mundur ke dok; kendaraan suasana keliling grid. Penunjuk tanah kosong = kotak biru rendah saat dipilih. Interior baru: cold storage (lokasi barang cold storage, rak C1–C3) dan gerai per jenis (sembako, apotek, klinik, simpan pinjam; barang/staf dari data). Angka hanya dari data.

- [x] 1. (DISETUJUI pemilik; catatan: blok kota putih jangan kaku/seragam, ukuran/tinggi/jarak bervariasi, beberapa bangunan kecil per blok) Pasang skill Three.js ringan dari GitHub; denah distrik ala video (tampak atas + sketsa isometrik) → BERHENTI untuk persetujuan pemilik.
- [x] 2. Sub-langkah, commit masing-masing:
  - [x] 2a. world-model: unit Gerai dipetakan ke bangunan district menurut Jenis (tes); layout.ts menunjuk nilai district (gudang, kantor, petak truk, gerbang, zona kamera); aplikasi tetap terkompilasi.
  - [x] 2b. Lingkungan dari district.ts: tanah, jalan bertrotoar bersudut bulat, kavling berpagar, parkir, taman/pohon, lahan, blok kota bervariasi.
  - [x] 2c. (draf; dipoles di 2d) Bangunan per gaya: gudang WH-04 (dari rect), cold storage WH-03 baru, kantor, loket simpan pinjam, toko, apotek, klinik; kavling rencana bertahap.
  - [x] 2d. Palet video + pastel, sudut membulat, bayangan biru, AO Tinggi/bayangan kontak, kamera dekat.
  Palet, kavling, jalan, pagar, parkir, gudang WH-04, cold storage WH-03, bangunan membulat, AO.
- [x] 3. Kartu transparan, pemilih zona ala video, bar chart, klik pergi ke tempat.
- [x] 4. Animasi truk (belok, mundur ke dok), kendaraan suasana di grid, kamera halus.
- [x] 5. Interior cold storage.
- [x] 6. Interior gerai.

## Paket selesai: perbaikan kecil v3.1 (keputusan pemilik 6 Oktober, hasil wawancara)

Kerjakan berurutan; satu commit lokal per langkah (tanpa push). Centang di sini saat selesai.

- [x] 1. Tanah tak berujung + kabut yang memudar ke warna langit (pink senja dipertahankan); batasi zoom keluar sampai kawasan + sedikit kota (1280 px).
- [x] 2. Gudang: logo bulat atap diganti deretan skylight. Pin biru di atas peti staging dihapus (peringatan cukup label kuning gudang). Pin dok tujuan rute dipertahankan, lebih kecil.
- [x] 3. Penunjuk kotak 3D ala video: siku tebal 0,1 dan ±25 % sisi di 8 sudut, garis tepi 50 %, isi 8–10 %, cahaya lantai; diperbarui tiap frame agar ikut objek bergerak (forklift, kendaraan jalan, karakter Tim, maskot). Semua objek bergerak dapat dipilih, tanpa label tambahan.
- [x] 4. Kamera mengikuti objek bergerak terpilih; berhenti bila pengguna geser/putar/zoom, memilih objek lain, menutup kartu, atau kendaraan melompat ke ujung jalan. Klik lagi untuk mengikuti.
- [x] 5. Manajer: hapus tombol balon biru di atas kepala dan bubble otomatis; maskot dipilih dengan klik badan; alasan rencana tampil di kartu detail maskot. Bubble "…" hanya untuk percakapan: Tim berpapasan (sudah ada) dan manajer saat berhenti di meja staf/dok (3–5 detik, di atas manajer dan lawan bicara).
- [x] 6. Perbarui Blueprint v3 di DUNIA-KOPERASI, lembar aset, STATUS, CHANGELOG; tes/typecheck/lint/build; tag checkpoint/v3-1 sebelum langkah 1.

## Paket terakhir

- 6 Oktober, **Distrik Mini Kompak & 3D Pixel Downsampling** selesai lokal (commit `5ed67dd`, tag `checkpoint/dunia-kompak-pixel`). Menjawab keluhan performa pemilik via sesi `/grill-me`:
  - Peta diringkas menjadi 1 perempatan jalan ringkas (`Jalan Raya` × `Jalan Koperasi`) yang menghubungkan 4 kavling aktif (Logistik, Administrasi, Kesehatan, Niaga). 4 jalan lingkar luar, 16 blok kota latar belakang, dan 6 petak lahan kosong 128m dihapus (>70% pengurangan geometri).
  - Kunci penuh mode 3D Pixel Downsampling permanen: kanvas WebGL di-downsample internal (skala 0.5x Tinggi, 0.4x Sedang, 0.33x Hemat) lalu di-upscale tajam secara crisp dengan CSS `image-rendering: pixelated; crisp-edges`.
  - Performa ringan: GTAOPass dimatikan total, bayangan disederhanakan ke BasicShadowMap 512 tajam retro, lantai diperkecil ke 360×360, dan fog dirapatkan ke 85–140. Menghemat beban GPU ~80% dan berjalan 60 FPS stabil.
  - 304 tes / 45 berkas lulus 100%, typecheck 0 error, lint 0 error, build Next.js sukses (7.8s), uji browser subagent 0 error.

- 6 Oktober, **Field Pengiriman Lengkap** (kolom sopir, nomor plat, estimasi jam tiba WIB) selesai lokal (tag checkpoint/pengiriman-detail). Skema Zod `deliveries`, form Editor input time/helper, kartu `/pengiriman` di Records, serta kartu `DetailCard`, `TodayTracker`, dan `ListCard` (dok) di Dunia Koperasi. 304 tes lulus, typecheck, lint, build lulus.

- 6 Oktober, **Distrik v4** selesai lokal (commit per langkah, tag checkpoint/v4). Berikutnya: penilaian pemilik, lalu menu web tambahan (mis. data lahan pertanian). Port 3000 dipakai dev server pemilik; tangkapan headless memakai Chromium ms-playwright via CDP (lihat paket v3).

- 6 Oktober, **Blueprint visual v3** (arahan pemilik: semirip mungkin video, fokus tampilan): aset baru, rute truk, kartu ilustrasi; panduan di DUNIA-KOPERASI bagian Blueprint visual v3 dan docs/referensi-dunia/blueprint. Berikutnya menunggu penilaian pemilik, lalu menu web tambahan. Cara membuat ulang bahan blueprint: (1) lembar aset = buka /dev/dunia-koperasi/aset dan potret 1400 × 1380; (2) denah = transpile layout.ts + truck-routes.ts dengan typescript lalu gambar SVG (skrip satu kali di sesi 6 Oktober; tulis ulang sebagai scripts/ bila sering dipakai); (3) kartu-contoh.html memakai WorldIcon yang dirender renderToStaticMarkup. Tangkapan WebGL: pane browser berhenti menggambar saat tersembunyi; pakai Chromium headless (ms-playwright) via CDP dengan --use-angle=swiftshader. Jangan menyunting berkas UTF-8 dengan Set-Content PowerShell 5.1.

- 6 Oktober, paket 10: QA empat lebar dengan contoh, perbaikan tombol tur, CHECKLIST/STATUS. personal.css ditunda.
- 6 Oktober, paket 9: tur, pencarian Enter, linimasa, tindakan cepat, gerai bertahap, papan pengumuman, cahaya malam. Tag lokal checkpoint/paket-9. Belum di-push.
- 6 Oktober, paket 8: briefing, manajer keliling berbasis data, obrolan berpapasan, kardus bongkar, bubble otomatis; skill proyek. Tag lokal checkpoint/paket-8. Belum di-push.
- 6 Oktober, paket 7: kantor bersekat, karakter Tim berjadwal dan bergerak, tab Tim. Tag lokal checkpoint/paket-7. Belum di-push.
- 6 Oktober, paket 6: truk dari Pengiriman di dok/antre, pelacak pengiriman, mobil suasana berlabel. Tag lokal checkpoint/paket-6. Belum di-push.
- 6 Oktober, paket 5: migrasi 8 (Pengiriman, Mutasi stok atomik), halaman /pengiriman, kategori Suplier/Ekspedisi, kolom Tim untuk dunia. Tag lokal checkpoint/paket-5. Belum di-push.
- 6 Oktober, paket 4: interior gudang dari data Barang, kolom Rak gudang, pin/KPI stok minimum, tab Stok, contoh development ?contoh=1. Tag lokal checkpoint/paket-4. Belum di-push.
- 6 Oktober, paket 3: UI kartu ala video (ui/), lembar bawah ponsel, label/kotak sorot objek, fokus kamera menghindari kartu. Tag checkpoint/paket-3 menandai keadaan sebelumnya.
- 6 Oktober, paket 2: kawasan baru dengan gudang/dok/gerbang/taman/boulevard, pemilih zona, kamera mulus, kolom slot Gerai, mesh statis digabung (129 draw call). Tag checkpoint/paket-2 menandai keadaan sebelumnya.
- 6 Oktober, paket 1: berkas dunia dipecah (layout.ts, objects/, lighting.ts, render-quality.ts), kualitas grafis Tinggi/Sedang/Hemat, siang lebih cerah, malam terbaca. Tag checkpoint/paket-1 menandai keadaan sebelumnya.
- 6 Oktober, paket 0: dokumen historis ke docs/arsip/, modul catatan bersama ke src/features/records/. Tag checkpoint/paket-0 menandai keadaan sebelumnya. Pemeriksaan lengkap lulus.
- 6 Oktober: rencana v2 dan delapan frame video disimpan. Dokumentasi saja; tidak ada perubahan runtime atau tes aplikasi baru.

## Keadaan kode (v0 + paket 1)

- `/dunia-koperasi`: navigasi aplikasi, sesi yang sudah ada, data workspace; AppShell menyerahkan layar penuh.
- `/dev/dunia-koperasi`: hanya development, workspace kosong tanpa database.
- Three.js: kamera ortografis, OrbitControls, cahaya/bayangan, zoom/putar/reset, raycast gedung/karakter/lahan, penanda HTML aksesibel.
- Berkas: layout.ts (koordinat), objects/ (mesh), lighting.ts, render-quality.ts, world-model.ts (adapter), WorldScene.tsx, CooperativeWorld.tsx.
- Exterior: kawasan 62 × 50 dengan gudang, dok, gerbang, kantor, taman, boulevard tujuh lahan (lihat Exterior di DUNIA-KOPERASI). Interior: meja rapat, meja tugas, arsip, treadmill.
- Maskot: rapat aktif → duduk; jurnal hari ini → olahraga; tugas proses → bekerja; lainnya → idle.
- Style: `world.css`, dibatasi `.cooperative-world` dan kelas `cw-*`. Tanpa backdrop blur.

## Batas yang harus diteruskan

- Implementasi perlu penilaian pemilik; jangan klaim identik dengan video atau sudah disetujui.
- Migrasi untuk `deliveries`/`stock-movements` hanya dijalankan di cloud setelah dijelaskan dan disetujui sesuai [MIGRASI-SQL](MIGRASI-SQL.md).
- NPC adalah visualisasi jadwal/tugas, bukan kehadiran nyata. Jangan mengarang nama, pengiriman atau angka.
- Jalankan `npm test -- --maxWorkers=2`; catat hanya hasil yang selesai.

## Perubahan pemilik

Pertahankan perubahan pemilik pada DateField.tsx, Select.tsx, Dashboard.tsx, SprintModal.tsx, RecursiveScheduleModal.tsx, TaskDetailDrawer.tsx, ThemeContext.tsx bila muncul sebagai perubahan lokal; periksa diff sebelum commit. next-env.d.ts berubah saat Next.js dijalankan; periksa sebelum memulihkannya.
