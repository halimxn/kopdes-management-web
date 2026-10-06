---
name: ui-ux-kopdes
description: Pedoman UI/UX Kopdes — kartu Dunia Koperasi ala video, lembar bawah ponsel, aksesibilitas, dan halaman operasional. Pakai saat mengubah tampilan atau interaksi.
---

# UI/UX Kopdes

Dua lingkup gaya, jangan dicampur:
- **Dunia Koperasi**: `src/features/cooperative-world/world.css` dan `ui/`; aturan lengkap di bagian "Komposisi kartu" `docs/DUNIA-KOPERASI.md`.
- **Halaman operasional**: `docs/DESAIN-ANTARMUKA.md`, token di `tokens.css/ui.css/globals.css`, komponen `src/components/ui`.

## Dunia (ringkas)
- Kartu putih radius 14, border `#e6ebf5`, bayangan lembut, Inter, angka tabular, teks ≥ 11 px.
- Desktop ≥ 1024: KPI kiri atas, kartu detail kanan atas (eyebrow biru kapital, judul, pill status bertulisan, meter, kunci–nilai), kartu Daftar bertab kanan bawah, pelacak kiri bawah, dock.
- < 1024: lembar bawah ringkas/setengah/penuh dengan tab Detail/Daftar/Hari ini; memilih zona menciutkan lembar.
- Pill: hijau aktif, biru info/proses, kuning perlu perhatian, abu kosong, merah galat — selalu dengan teks.

## Wajib di semua UI
- Area sentuh ≥ 44 px (boleh visual kecil dengan area transparan), fokus keyboard terlihat, label form, status tidak hanya warna.
- Keadaan memuat, kosong, galat, dan "belum aktif" dibedakan; tanpa angka palsu.
- Bahasa langsung tanpa slogan; judul menjelaskan isi atau tindakan.
- Periksa 360/768/1024/1440; hormati reduced-motion dan safe area.
- Gunakan `Button` bersama (bukan `<button>` mentah) agar tidak terkena gaya tombol global.
