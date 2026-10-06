# Serah terima AI — 6 Oktober 2026

## Arahan aktif

Kerjakan **Rencana Dunia Koperasi v2** pada bagian terakhir [DUNIA-KOPERASI](DUNIA-KOPERASI.md). Rencana ini disetujui pemilik 6 Oktober 2026: tetap 3D low-poly yang ringan, kawasan ± 4× lebih luas dengan gudang besar, NPC karyawan per seksi dan manajer, UI kartu mengikuti delapan frame video dan rapi di ponsel, serta fitur web Pengiriman dan Mutasi stok.

## Keadaan Git

- Pekerjaan dunia v1 (16 commit, 5 Oktober) dinilai pemilik kacau. Diarsipkan pada tag `arsip/dunia-v1-20261005`, lalu merge PR #3 dibatalkan di main dengan commit 9551476. Isi main sama dengan ecddd85.
- Jangan menggabungkan ulang tag arsip secara massal. Ambil gagasan atau berkas tertentu setelah diperiksa; karena merge sudah di-revert, gunakan cherry-pick/salin manual, bukan merge.
- Cabang kerja: `codex/dunia-koperasi`, melacak origin. Jangan force-push.
- Cabang `codex/manager-workspace-polish`, `codex/reset-database-kosong`, `codex/workspace-redesign` sudah masuk main dan belum dihapus; tunggu izin pemilik.

## Urutan melanjutkan

1. Periksa Git, AGENTS, STATUS dan rencana v2.
2. Mulai paket berikutnya yang belum selesai. Saat penulisan: paket 0–2 selesai; berikutnya **paket 3 — UI kartu ala video dan bottom sheet ponsel**. Masalah terbuka untuk paket 3: di ponsel panel bawah menutupi zona gerai.
3. Sebelum tiap paket buat tag checkpoint; commit kecil per paket; PR ke main hanya setelah pemilik menilai screenshot/rekaman.
4. Akhir paket: perbarui bagian "Paket terakhir" di bawah, STATUS dan CHANGELOG.

## Paket terakhir

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
