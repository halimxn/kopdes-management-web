---
name: dunia-koperasi
description: Membangun dan mengubah Dunia Koperasi 3D (Three.js) — tata letak, mesh, karakter/NPC, kendaraan, kamera, performa. Pakai saat menyentuh src/features/cooperative-world.
---

# Dunia Koperasi 3D

Kontrak gaya dan rencana: `docs/DUNIA-KOPERASI.md` (satu-satunya). Video acuan: `docs/referensi-dunia/referensi_desain_video/`.

## Mulai dari Blueprint v3 (wajib)
Baca bagian "Blueprint visual v3" di DUNIA-KOPERASI lalu buka, sesuai pekerjaan:
- `docs/referensi-dunia/blueprint/lembar-aset.png` (hidup: `/dev/dunia-koperasi/aset`) — bentuk/warna aset dari kode.
- `docs/referensi-dunia/blueprint/denah-kawasan.svg` — denah tampak atas dari `layout.ts`.
- `docs/referensi-dunia/blueprint/kartu-contoh.html` — kartu stok, truk, Dok, pelacak, label.
- Frame interaksi video `09_22s-rute-truk.jpg`, `10_53s-rute-dok.jpg`.
Bandingkan tangkapan 1280 × 740 dengan frame video sejenis sebelum melapor; ikuti "Daftar periksa anti-meleset".

## Peta berkas
- `layout.ts` semua koordinat (kawasan, gudang + `roofRise`, rak luar, kontainer, jalur forklift, interior kantor/gudang, kursi, zona kamera).
- `truck-routes.ts` fungsi murni tanpa Three.js: `truckPose`, `truckRoute`, `truckFocus`, `pathPose` (teruji).
- `objects/` mesh: `primitives` (palet, `box/sphere/cylinder/cone/gable/sign/badge`, `mergeStatic`, `mergeTransparent`), `props` (pohon, palet, forklift, pagar kaca, rak luar, kontainer, pin), `office` (kantor/gerai), `exterior` (kawasan + kota), `warehouse`, `warehouse-interior`, `vehicles` (truk, kendaraan suasana, forklift halaman), `route` (garis rute), `highlight` (kotak seleksi), `characters`.
- Objek sementara (seleksi, rute) dibuang dengan `disposeGroup`, yang tidak membuang sumber daya bersama.
- `npc/schedule.ts` jadwal murni (teruji); `npc/movement.ts` gerak per frame.
- `world-model.ts` adapter data (slot lahan, inventaris, truk, rapat). `lighting.ts`, `render-quality.ts`.
- `WorldScene.tsx` WebGL/kamera/raycast/penanda; `CooperativeWorld.tsx` state + tata letak; `ui/` kartu.

## Aturan
- Data asli saja: gerai, barang, pengiriman, tim, rapat, tugas. Simulasi (mobil suasana, kardus pemandangan) diberi label; jangan mengarang nama/angka. Loading/galat/pencatatan belum aktif ≠ nol.
- Objek statis: bangun lalu `mergeStatic(group)` (satu mesh berwarna per titik per objek). Objek dapat diklik: `group.userData.selection = id`, merge di grup itu sendiri.
- Hindari permukaan sebidang (z-fighting): beri selisih kedalaman ≥ 0,02.
- Animasi berbasis `delta`, tanpa rebuild scene per tick; data per menit lewat ref (`plans`, `motion`). Reduced-motion: taruh di tujuan, hentikan gerak.
- Anggaran: desktop < 150 draw call (cek `window.__cwRenderInfo` di dev), ponsel < 80; kualitas Tinggi/Sedang/Hemat.
- Kamera: fokus lewat `focus/zoom/recenter`; area tertutup kartu lewat `occlusion`.

## Verifikasi
- Tes unit untuk fungsi murni baru di `tests/unit/cooperative-world.test.ts`.
- Lihat hasil di `/dev/dunia-koperasi?contoh=1` (data contoh development) pada 1280 dan 375 px.
- Perbarui bagian terkait DUNIA-KOPERASI, CHANGELOG, STATUS, LANJUTAN-AI.
