---
name: dunia-koperasi
description: Membangun dan mengubah Dunia Koperasi 3D (Three.js) — tata letak, mesh, karakter/NPC, kendaraan, kamera, performa. Pakai saat menyentuh src/features/cooperative-world.
---

# Dunia Koperasi 3D

Kontrak gaya dan rencana: `docs/DUNIA-KOPERASI.md` (satu-satunya). Video acuan: `docs/referensi-dunia/referensi_desain_video/`.

## Peta berkas
- `layout.ts` semua koordinat (kawasan, gudang, interior kantor/gudang, kursi, jalur keliling, zona kamera).
- `objects/` mesh: `primitives` (palet, `box/sphere/cylinder/sign`, `mergeStatic`), `props`, `office`, `exterior`, `warehouse`, `warehouse-interior`, `vehicles`, `characters`.
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
