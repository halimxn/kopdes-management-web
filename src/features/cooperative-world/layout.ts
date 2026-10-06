// Semua koordinat dunia (X/Z, satuan scene) dikumpulkan di sini agar tata letak bisa diubah tanpa menyentuh mesh.

/** Tujuh lahan gerai; urutan menentukan nomor lahan 1–7. */
export const landPositions: readonly [number, number][] = [
  [-9, -6],
  [-3, -6],
  [3, -6],
  [9, -6],
  [-9, 3],
  [3, 3],
  [9, 3],
];

export const officePosition: [number, number] = [-3, 2.7];

export const worldStations = [
  {
    id: 'rapat',
    title: 'Meja rapat',
    href: '/rapat',
    description: 'Agenda, notulen, dan keputusan.',
    position: [-4, 0, -2],
  },
  {
    id: 'tugas',
    title: 'Meja tugas',
    href: '/tugas',
    description: 'Pekerjaan dan tenggat yang perlu ditindaklanjuti.',
    position: [3, 0, -2],
  },
  {
    id: 'kegiatan',
    title: 'Area kegiatan',
    href: '/jurnal',
    description: 'Karakter berolahraga sebagai visualisasi kegiatan hari ini.',
    position: [4, 0, 3],
  },
  {
    id: 'dokumen',
    title: 'Arsip & buku',
    href: '/dokumen',
    description: 'Dokumen koperasi dan pintasan pencatatan.',
    position: [-4, 0, 3],
  },
] as const;

/** Posisi awal maskot: [manajer, karakter 2, karakter 3]. */
export const characterSpots = {
  luar: [
    [-1.3, 0.1, 5],
    [5.4, 0.1, -0.7],
    [-7, 0.1, -1],
  ],
  dalam: [
    [-4, 0.1, -0.95],
    [2, 0.1, -0.15],
    [5.3, 0.3, 3.5],
  ],
} as const satisfies Record<string, readonly (readonly [number, number, number])[]>;

/** Setengah tinggi bidang pandang kamera ortografis per lokasi dan orientasi layar. */
export const cameraSpan = {
  luar: { portrait: 20, landscape: 13.2 },
  dalam: { portrait: 11.5, landscape: 8.5 },
};
