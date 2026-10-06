# Status produk — 7 Oktober 2026

Dokumen ini mencatat keadaan aktif. Riwayat paket ada pada CHANGELOG dan laporan QA; arahan desain terbaru ada pada DESAIN-ANTARMUKA dan DUNIA-KOPERASI. Jangan memakai bagian historis sebagai instruksi yang mengalahkan permintaan terbaru.

## Prioritas aktif

Rencana Dunia Koperasi v2 disetujui pemilik 6 Oktober 2026 dan disimpan di DUNIA-KOPERASI; urutan paket 0–10. Paket 0 (rapikan folder) selesai: dokumen historis di docs/arsip/, modul catatan bersama (Records, Editor, catalog, schemas, query, service) di src/features/records/, audit:ui menulis docs/arsip/AUDIT.md. Tanpa perubahan perilaku; 266 tes/44 berkas, typecheck, lint dan build lulus. Paket 1 (fondasi dunia) selesai: berkas dunia dipecah, kualitas grafis Tinggi/Sedang/Hemat, pencahayaan siang lebih cerah dan malam terbaca; 269 tes lulus. Paket 2 (peta baru) selesai: kawasan dengan gudang, dok, gerbang, taman dan boulevard; pemilih zona; slot lahan Gerai; 129 draw call; 271 tes lulus. Paket 3 (UI kartu ala video) selesai: KPI, kartu detail, kartu Daftar bertab, pelacak jadwal, lembar bawah ponsel, kotak sorot objek; 271 tes lulus. Paket 4 (gudang dari data Barang) selesai: interior gudang enam rak, kolom Rak gudang, pin dan KPI stok minimum, keadaan pencatatan belum aktif; 274 tes lulus. Paket 5 (data logistik web) selesai secara lokal: migrasi 8 Pengiriman/Mutasi stok atomik diuji PGlite, halaman /pengiriman, kategori suplier, kolom Tim; 283 tes lulus. Migrasi 8 sudah dijalankan pemilik di cloud. Paket 6 (kendaraan dari data pengiriman) selesai: truk di dok/antre, pelacak pengiriman, mobil suasana berlabel; 285 tes lulus. Paket 7 (kantor bersekat dan karakter Tim) selesai; 288 tes lulus. Paket 8 (manajer dan interaksi karakter) selesai; 290 tes lulus. Paket 9 (ide tambahan) selesai; 291 tes lulus. Paket 10 (penutup) selesai tanpa personal.css (ditunda pemilik): QA contoh development 360/768/1024/1440 tanpa luapan, 74 draw call di 1440. Belum: perangkat fisik, UAT data cloud, penerimaan visual pemilik.

**7 Oktober 2026 — arah baru Dunia Koperasi (berlaku):** 2D pixel top-down ala Eastward dengan PixiJS, palet nada tanah + grading Eastward, desa modern Indonesia. Kontrak: DUNIA-KOPERASI; acuan gambar: docs/dunia-pixel/. P1 (preview, disetujui) dan P0 (hapus 3D) selesai: kode/dependensi Three.js, enam skill 3D, docs/referensi-dunia, scripts/denah-dunia.mjs dan halaman /dev/dunia-koperasi/aset dihapus (riwayat di tag `arsip/dunia-3d-20261007`). P2 selesai: mesin PixiJS (`src/features/cooperative-world/pixel/`) menampilkan denah greybox, avatar manajer, penanda dan kamera ikut; diuji di browser 1440 dan 375 px tanpa galat konsol. 309 tes lulus, typecheck, lint dan build lulus. P3a selesai: sprite bangunan, 9 rumah, 6 pohon (255 KB) dari generator, lapisan malam aditif, grading bersama; diperiksa di browser siang dan malam. P3b selesai: 13 sprite kendaraan (truk boks/pendingin/bak kayu tampak samping/depan/belakang, angkot, pikap, motor, roda tiga), 8 kendaraan suasana berlajur kiri, truk Pengiriman di dok/antre dengan animasi datang lalu mundur ke dok; klik truk membuka kartu Pengiriman. 313 tes lulus; aset 349 KB. 303 tes/45 berkas lulus, typecheck lulus, lint 0 galat (5 peringatan variabel kamera yang dipakai lagi di P2). Bagian 3D di bawah adalah riwayat.

## Aset Nyata & Diorama Komplek Terpadu (Cozy Village Co-op Compound) — 6 Oktober 2026

Selesai lokal (berdasarkan instruksi langsung pemilik "buat cozy sperti ini, jangan pecah2 grafik nya, buatkan dulu asetnya seperti apa real nyasample dulu agar dapat gambaran"):
1. **Grafik Bersih & Halus (Tanpa Downsampling / Pecah-pecah)**:
   - Pixelated downsampling dinonaktifkan total: `downsampleScale` dikembalikan ke `1`, `pixelRatio` ke native device (1.5x - 2x) dengan `antialias: true` dan `PCFSoftShadowMap`.
   - `world.css` dibersihkan dari `image-rendering: pixelated; crisp-edges` sehingga garis, teks, dan bayangan 3D tampil bersih, mulus, dan tajam di semua layar.
2. **Aset Nyata Sesuai Gambar Referensi Pemilik**:
   - **Gudang WH-04 (Co-op Logistics Depot)**: Plang atap 3D besar `"CO-OP LOGISTICS DEPOT"`, tulisan dinding `"WAREHOUSE WH-04"`, kanopi miring berpenyangga besi diagonal di atas pintu dok, garis serong hazard kuning-hitam di lantai dok, dok D1 & D2 terbuka berisi palet, dok D3 rolling shutter tertutup, dan deretan jendela kisi clerestory horizontal.
   - **Kantor Koperasi HQ (Rural Cooperative HQ)**: Gedung 2 lantai dengan dinding kayu hangat (*timber slats*), lis beton putih pemisah lantai 1 & 2, papan nama horizontal gelap `"RURAL COOPERATIVE HQ"`, pita jendela kaca horizontal membentang, pot tanaman hijau, dan taman bunga berbingkai beton di depan kantor.
   - **Pohon Voxel Bertingkat**: Tajuk daun kubus bertingkat (*clustered voxel foliage*) dengan tiga gradasi hijau alami dan batang silinder kayu.
   - **Rumah Pedesaan (Village House)**: Atap pelana genteng terakota, cerobong asap bata, dinding krem kayu, pintu dan jendela kaca berbingkai putih.
3. **Sample Diorama Komplek Terpadu (`/dev/dunia-koperasi/aset`)**:
   - Menghadirkan visualisasi nyata komplek satu kavling berpagar: Gudang WH-04 berdampingan langsung dengan Kantor Koperasi HQ di halaman yang sama, truk CO-OP bersandar di dok D2, truk pickup di parkir, forklift aktif membawa palet, tumpukan kardus & kontainer, pohon voxel berjajar, pagar keliling berpos gerbang, jalan raya beraspal dengan marka garis putus-putus dan trotoar, serta rumah-rumah pedesaan di seberang jalan.
4. **Verifikasi Kualitas & Stabilitas**:
   - 304 tes Vitest lulus (45 berkas, 100%), typecheck 0 error, lint 0 error.
   - Tangkapan layar visual browser mengonfirmasi rendering tajam anti-aliased tanpa jagged pixels.

## Blueprint visual v3 (6 Oktober, arahan pemilik: semirip mungkin dengan video)

Implementasi lokal, belum dinilai pemilik. Aset baru dari kode: gudang dok ala video (atap pelana biru bergaris, dinding bergelombang, kusen dok biru bernomor, palet di ambang, AC dan logo atap), truk cab-over empat skema warna, forklift detail, palet kardus berlakban/kemasan biru, rak palet luar, kontainer teal, kantor dan gerai baru (pita kaca, tenda bergaris), pagar kaca, rumput, pohon berbaris, blok kota di latar. Interaksi: klik truk menampilkan kotak seleksi bersiku, label biru, garis rute (pita dilalui + titik sisa + pin dok) dan kamera terbang; forklift suasana bergerak. Kartu: ilustrasi isometrik WorldIcon, baris inventaris ala video, kartu truk berprogres, tab bersegmen dengan tab Dok, label lahan kosong ringkas, penanda ponsel ikon saja. Panduan: bagian Blueprint visual v3 di DUNIA-KOPERASI, folder docs/referensi-dunia/blueprint (denah, lembar aset, contoh kartu, bukti implementasi), halaman dev /dev/dunia-koperasi/aset, skill dunia-koperasi dan ui-ux-kopdes diperbarui.

Bukti: 296 tes/45 berkas, typecheck, lint dan build lulus. Tangkapan headless Chromium (SwiftShader) data contoh pada 375, 768, 1024, 1280 dan 1440 px; 58–89 draw call. Belum: perangkat fisik, rekaman gerak, data cloud, penilaian pemilik. Di 1024–1279 px dock masih menutupi baris bawah kartu Daftar (keadaan lama).

## Field Pengiriman Lengkap (6 Oktober, menu web pendukung)

Selesai lokal (belum di-push): skema `deliveries` kini menerima nama sopir (`driver_name`), nomor plat (`license_plate`), dan estimasi jam tiba (`arrival_time` WIB). Data lama kompatibel otomatis dengan default ''. Form Editor menyediakan input time untuk jam tiba serta placeholder & helper untuk pengemudi dan plat nomor; halaman `/pengiriman` di Records menampilkan badge arah, dok, jam tiba WIB, plat nomor, nama sopir, dan rincian barang. Di Dunia Koperasi, DetailCard, TodayTracker, dan ListCard (tab Dok) menampilkan informasi plat nomor, nama pengemudi, serta estimasi jam tiba. Bukti: 304 tes / 45 berkas lulus, typecheck, lint dan build Next.js lulus.

## Distrik ala video v4 (6 Oktober, denah disetujui pemilik)

Selesai lokal (belum di-push): denah distrik kota grid dari `district.ts`, bangunan unit KDMP per Jenis Gerai, gudang WH-04 + cold storage WH-03 berlantai dok tinggi, kota bervariasi, warna sampel video + pastel, AO, bawaan siang; kartu transparan, pemilih zona berdata, bar chart, klik pergi ke tempat; kendaraan berbelok halus dan truk mundur ke dok; interior cold storage dan empat jenis gerai. Bukti: tes Vitest lulus, typecheck/lint/build, tangkapan headless 375–1440 px (render headless ±2–3 fps sehingga animasi hanya diperiksa lewat tangkapan berjeda dan tes fungsi murni). Belum: perangkat fisik, rekaman gerak di GPU asli, data cloud, penilaian pemilik. Kolom Rak barang kini menerima C1–C3 (Zod/katalog, tanpa migrasi).

## Perbaikan kecil v3.1 (6 Oktober, hasil wawancara pemilik)

Selesai lokal: tanah tak berujung berkabut tanpa tepi pink saat zoom keluar, batas zoom; skylight menggantikan logo atap, pin peti dihapus; penunjuk kotak bersiku tebal mengikuti objek bergerak; kamera mengikuti objek bergerak terpilih; maskot tanpa tombol/bubble, bubble hanya percakapan. Bukti: 296 tes lulus, typecheck/lint/build, tangkapan headless (forklift diikuti, zoom senja). Belum: perangkat fisik, rekaman gerak percakapan manajer.

## Penilaian pemilik terbaru

Versi sekarang belum diterima: kawasan kecil/sepi, mobil belum ada, tampilan agak gelap, pengaturan waktu tidak mudah ditemukan dan perpindahan karakter belum terlihat. Gym aktif serta patroli manajer sesekali belum tersedia. Kontrol manual/animasi pose ada dalam kode, tetapi bukan bukti pengalaman tersebut memenuhi permintaan. Rencana paket revisi ada hanya di [DUNIA-KOPERASI](DUNIA-KOPERASI.md); pembaruan ini dokumentasi, belum implementasi runtime.

## Implementasi Dunia Koperasi

- `/dunia-koperasi` terdaftar pada navigasi, menggunakan sesi aplikasi dan data workspace, dengan layar penuh/dock khusus.
- `/dev/dunia-koperasi` hanya development, workspace kosong tanpa akses database.
- Three.js: kamera ortografis, cahaya/bayangan, kontrol kamera, penanda HTML dan raycast objek gedung/karakter/lahan.
- Exterior: kantor koperasi, tujuh lahan yang diisi dari domain units, jalan, pohon, bangku dan area rencana logistik.
- Interior: meja rapat, komputer/tugas, arsip/buku, treadmill kegiatan. Detail membuka halaman operasional asli.
- Maskot bergerak berdasarkan rapat aktif WIB, jurnal hari ini atau tugas proses; pratinjau gerakan dan bubble tersedia. Maskot tidak mewakili kehadiran pegawai nyata.
- Cuaca cerah/berawan/hujan merupakan simulasi. Waktu WIB otomatis/manual; pakaian dan suasana disimpan lokal dengan Zod/usePreference.
- Style dunia terisolasi di world.css. Backdrop blur dihapus; kesamaan final dengan video belum dinilai/disetujui pemilik.

## Pemeriksaan paket terbaru

- `npm test -- --maxWorkers=2`: **266 tes / 44 berkas lulus**. Enam tes adapter dan empat tes UI baru. Percobaan awal tanpa batas worker dihentikan karena membebani mesin.
- `npm run typecheck`: **lulus** setelah opsi Testing Library yang tidak sah diperbaiki.
- `npm run lint`: **lulus**.
- `npm run build`: **lulus**, termasuk route dunia dan pratinjau development yang ber-guard notFound pada produksi.
- QA browser lokal workspace kosong: exterior/interior diperiksa pada **360, 768, 1024, 1440 px**; pengukuran scrollWidth sama dengan viewport, tanpa luapan halaman.
- Masuk kantor via penanda, bubble maskot, pilihan pencahayaan siang, serta pratinjau duduk rapat/olahraga diuji. Screenshot terpilih disimpan pada docs/referensi-dunia; seluruh bukti lokal pada artifacts/world-reference/qa.
- Tes UI memakai scene tiruan. Belum UAT data cloud, semua kombinasi cuaca/waktu, reduced-motion, raycast langsung seluruh objek, fallback WebGL, target sentuh/kontras lengkap, atau perangkat fisik.

## Halaman operasional yang tersedia

Proyek fleksibel, tugas daftar/papan/kalender/Gantt/harian, milestone, subtugas/dependensi/pengulangan, catatan terformat, kegiatan, rapat/ICS, dokumen, risiko, tim/koordinasi, laporan snapshot, profil/PIN/cadangan, anggota/kas/barang/opname. Riwayat proyek berupa tab `/proyek?tab=riwayat`; URL lama mengalihkan ke tab.

Paket anotasi sebelumnya: 256 tes/42 berkas dan QA terang 360/383/768/1024/1440 px. Bukti historis: QA-ANOTASI.md. Pemeriksaan gelap tambahan belum lengkap. Audit UI legacy sebelumnya mencatat 111 temuan CSS dan enam kontrol mentah; audit tersebut belum diulang pada paket dunia.

## Batas dunia dan pekerjaan berikutnya

1. Nilai desain bersama pemilik, tingkatkan detail lingkungan/karakter sesuai referensi, dan selesaikan QA interaksi/akses/performa.
2. Slot gerai adalah urutan created_at lalu ID. Penghapusan unit dapat menggeser slot; layout permanen/editor posisi belum tersedia.
3. Ringkasan hanya catatan yang dimuat lewat paginasi workspace; belum total global atau sinkronisasi real-time.
4. Suplier/pengiriman/mobil ekspedisi, karakter pegawai, AI chat, editor lingkungan dan preferensi/layout cloud masih rencana.
5. Dunia membuka modul sumber untuk input; belum form tambah gerai langsung di scene. Tidak ada tabel baru atau migrasi SQL paket ini.

## Cloud dan batas produk

Target Supabase: mqycnhebhzqaziouipet. Migrasi awal/pencatatan kedua dan reset kosong pernah dilaporkan terkonfirmasi sebelumnya; bukan pemeriksaan cloud pada sesi ini. PIN/simpan setelah reset, indeks paginasi migrasi 6, relasi dokumen migrasi 7 dan smoke test produksi masih perlu dikonfirmasi. Jangan menjalankan ulang migrasi/reset berdasarkan tes lokal.

Belum tersedia: editor blok bebas, kolaborasi real-time, PWA/offline, unggah berkas, baseline/jalur kritis dan penjadwalan otomatis dependensi. Kas hanya uang masuk/keluar tercatat; opname tidak otomatis mengubah stok. Tidak ada deployment atau SQL cloud pada paket ini.

## Git dan kelanjutan

Cabang kerja codex/dunia-koperasi. Perubahan pemilik pada tujuh berkas UI/tema dan PLAN-ASTRA-Kopdes.md dipertahankan; daftar pada LANJUTAN-AI.md. Commit dunia hanya mencakup paket dunia dan dokumentasinya. Selalu periksa ulang Git sebelum melanjutkan.
