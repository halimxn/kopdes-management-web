---
name: ui-ux-kopdes
description: Pedoman UI/UX Kopdes — kartu Dunia Koperasi ala video, lembar bawah ponsel, aksesibilitas, dan halaman operasional. Pakai saat mengubah tampilan atau interaksi.
---

# UI/UX Kopdes

Dua lingkup gaya, jangan dicampur:
- **Dunia Koperasi**: `src/features/cooperative-world/world.css` dan `ui/`; aturan lengkap di bagian "Komposisi kartu" `docs/DUNIA-KOPERASI.md`.
- **Halaman operasional**: `docs/DESAIN-ANTARMUKA.md`, token di `tokens.css/ui.css/globals.css`, komponen `src/components/ui`.

## Dunia (ringkas)
- Contoh kartu yang harus ditiru: `docs/referensi-dunia/blueprint/kartu-contoh.html` (stok, truk, Dok, pelacak, KPI, label peta) dan bagian "Blueprint visual v3" di DUNIA-KOPERASI.
- Objek di kartu memakai ilustrasi isometrik `ui/WorldIcon.tsx` (kardus, kemasan, gudang, truk, forklift, kantor, gerai, lahan, rak, orang, …); ikon garis hanya untuk aksi. Ilustrasi baru = tambah bentuk di `shapes`, bukan gambar tempel.
- Kartu putih radius 14, border `#e9eef7`, bayangan `0 10px 30px rgba(40,60,120,.09)`, Inter, angka tabular, teks ≥ 11 px.
- Baris stok: ilustrasi · nama · jumlah tebal + satuan · pill Cukup/Minimum. Kartu truk: pill tahap, progres n/5, kunci–nilai; tanpa ETA/kecepatan karangan. Tab bersegmen dengan hitungan biru.
- Desktop ≥ 1024: KPI kiri atas, kartu detail kanan atas (eyebrow biru kapital, judul, pill status bertulisan, meter, kunci–nilai), kartu Daftar bertab kanan bawah, pelacak kiri bawah, dock.
- < 1024: lembar bawah ringkas/setengah/penuh dengan tab Detail/Daftar/Hari ini; memilih zona menciutkan lembar.
- Pill: hijau aktif, biru info/proses, kuning perlu perhatian, abu kosong, merah galat — selalu dengan teks.

## Wajib di semua UI
- Area sentuh ≥ 44 px (boleh visual kecil dengan area transparan), fokus keyboard terlihat, label form, status tidak hanya warna.
- Keadaan memuat, kosong, galat, dan "belum aktif" dibedakan; tanpa angka palsu.
- Bahasa langsung tanpa slogan; judul menjelaskan isi atau tindakan.
- Periksa 360/768/1024/1440; hormati reduced-motion dan safe area.
- Gunakan `Button` bersama (bukan `<button>` mentah) agar tidak terkena gaya tombol global.
