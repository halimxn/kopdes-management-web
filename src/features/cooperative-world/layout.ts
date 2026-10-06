// Semua koordinat dunia (X ke timur, Z ke selatan; satuan scene) dikumpulkan di sini
// agar tata letak bisa diubah tanpa menyentuh mesh. Kamera melihat dari tenggara.

/** Batas tanah kawasan. */
export const site = { minX: -31, maxX: 31, minZ: -25, maxZ: 25 };

/** Jalan: utama di utara (truk suplier masuk), jalan dalam, boulevard gerai, dan jalan gerbang. */
export const roads = {
  main: { z: -21.5, width: 5 },
  inner: { z: 0.5, width: 3.6 },
  boulevard: { z: 13.5, width: 3.6 },
  gate: { x: -20, width: 3.6 },
};

export const gate = { x: roads.gate.x, z: -18.4, guardPost: [-16.6, -16.4] as [number, number] };

/** Parkir antre truk di barat laut, tiga petak membujur utara-selatan. */
export const truckBays: readonly [number, number][] = [
  [-28, -11.5],
  [-25.2, -11.5],
  [-22.4, -11.5],
].map(([x, z]) => [x - 1.2, z] as [number, number]);

/** Gudang: dinding depan menghadap selatan; dok bongkar muat di depan dinding itu. */
export const warehouse = {
  center: [3, -13] as [number, number],
  size: [24, 6.2, 10] as [number, number, number],
  /** Pusat X empat pintu dok. */
  docks: [-6, -1, 4, 9],
  apronDepth: 6,
  staging: [17.5, -12.5] as [number, number],
};

export const officePosition: [number, number] = [-12, 7.2];
export const officeSize = { width: 8, height: 4, depth: 5.4 };

/** Taman dan titik kumpul di timur kantor. */
export const park = { center: [10, 7.2] as [number, number], size: [16, 7.4] as [number, number] };

/** Tujuh lahan gerai di selatan boulevard; urutan menentukan nomor lahan 1–7. */
export const landPositions: readonly [number, number][] = [-24, -16, -8, 0, 8, 16, 24].map(
  (x) => [x, 19.6] as [number, number],
);
export const plotSize: [number, number] = [6.4, 5.4];

export type WorldZone = 'semua' | 'kantor' | 'gudang' | 'gerai';
export const worldZones: Record<
  WorldZone,
  { title: string; subtitle: string; target: [number, number]; zoom: number }
> = {
  semua: { title: 'Semua kawasan', subtitle: 'Tampilan lengkap', target: [0, 0], zoom: 0.42 },
  kantor: {
    title: 'Kantor koperasi',
    subtitle: 'Kantor dan taman',
    target: [officePosition[0] + 4, officePosition[1] - 1],
    zoom: 1.1,
  },
  gudang: {
    title: 'Gudang koperasi',
    subtitle: 'Dok bongkar muat',
    target: [warehouse.center[0] - 2, warehouse.center[1] + 5],
    zoom: 0.95,
  },
  gerai: {
    title: 'Boulevard gerai',
    subtitle: 'Tujuh lahan',
    target: [0, landPositions[0][1] - 1],
    zoom: 0.8,
  },
};

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
    [officePosition[0] + 1.5, 0.1, officePosition[1] + 4.2],
    [park.center[0] - 2, 0.1, park.center[1] + 1],
    [warehouse.docks[1] + 1.5, 0.1, warehouse.center[1] + 7.5],
  ],
  dalam: [
    [-4, 0.1, -0.95],
    [2, 0.1, -0.15],
    [5.3, 0.3, 3.5],
  ],
} as const satisfies Record<string, readonly (readonly [number, number, number])[]>;

/** Setengah tinggi bidang pandang kamera ortografis pada zoom 1. */
export const cameraSpan = {
  luar: { portrait: 20, landscape: 13.2 },
  dalam: { portrait: 11.5, landscape: 8.5 },
};
