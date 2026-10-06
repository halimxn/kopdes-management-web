---
name: dunia-koperasi
description: Membangun dan mengubah Dunia Koperasi 2D pixel (PixiJS) ala Eastward — aset generator, denah, karakter/NPC, kendaraan, kamera, interaksi, performa. Pakai saat menyentuh src/features/cooperative-world atau scripts/dunia-pixel.
---

# Dunia Koperasi pixel

Kontrak gaya dan rencana: `docs/DUNIA-KOPERASI.md` (satu-satunya). Acuan gambar: `docs/dunia-pixel/`.

## Peta berkas
- `scripts/dunia-pixel/aset.mjs` sprite aplikasi → `public/dunia/` (ukuran dari `pixel/map.ts`); `scripts/dunia-pixel/preview.mjs` generator adegan dan pustaka gambar (Node murni, tanpa dependensi): palet `K`, `person()` (pose, hijab/peci/caping/helm), kendaraan serong, bangunan (`win`, `roofTiles`, `pastelWall`, `awning`), `grade()` per suasana (bawaan `eastward`).
- `world-model.ts` adapter data (unit, barang, pengiriman, tim, rapat); `npc/schedule.ts` jadwal murni; `lighting.ts` fase hari; `district.ts`/`layout.ts`/`truck-routes.ts` lama dipakai sampai denah tile P3.
- `CooperativeWorld.tsx` state + tata letak; `ui/` kartu; mesin PixiJS menyusul (P2).

## Aturan
- Data asli saja; simulasi berlabel; belum aktif/galat ≠ nol; tanpa nama atau angka karangan.
- Skala piksel bilangan bulat; garis tepi gelap berwarna; palet nada tanah + grading Eastward; merah-putih KDMP aksen.
- Orang ±30×56, pintu ±70 px; kendaraan sebanding orang.
- Animasi berbasis delta; reduced-motion menghentikan gerak; render berhenti saat tersembunyi.
- Anggaran: desktop 60 fps, Android kelas bawah ≥ 30 fps, aset awal < 1 MB.

## Verifikasi
- Render ulang acuan: `node scripts/dunia-pixel/preview.mjs`, salin yang berubah ke `docs/dunia-pixel/`.
- Tes unit fungsi murni di `tests/unit/cooperative-world.test.ts`; lihat `/dev/dunia-koperasi?contoh=1` pada 1280 dan 375 px.
- Perbarui DUNIA-KOPERASI, STATUS, LANJUTAN-AI, CHANGELOG.
