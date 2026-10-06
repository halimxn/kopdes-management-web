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
  /** Lebar, tinggi dinding, kedalaman. Atap pelana menambah `roofRise` di bubungan. */
  size: [24, 5.4, 10] as [number, number, number],
  roofRise: 1.8,
  /** Pusat X empat pintu dok. */
  docks: [-6, -1, 4, 9],
  apronDepth: 6,
  staging: [17.5, -12.5] as [number, number],
  /** Rak palet luar di timur staging (pemandangan). */
  outdoorRack: [23.5, -13.4] as [number, number],
};

/** Kontainer peti kemas di utara petak antre truk (pemandangan, aksen warna video). */
export const containerSpot: [number, number] = [-27, -16.75];

/**
 * Jalur forklift suasana: staging → rak luar, bolak-balik. Tidak melintasi dok
 * sehingga tidak bertabrakan dengan truk dari data Pengiriman.
 */
export const yardForkliftPath: [number, number][] = [
  [17.5, -7.6],
  [23.5, -7.6],
  [23.5, -11.4],
];

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

/** Interior kantor 22 × 15 (koordinat lokal): ruang per seksi, rapat, manajer, pantry, arsip, gym. */
export const officeInterior = {
  size: [22, 15] as [number, number],
  sections: {
    'layanan anggota': [-2, -4.6],
    'administrasi & keuangan': [3.4, -4.6],
    umum: [8.6, -4.6],
    'usaha & gerai': [-2, -0.2],
    'gudang & logistik': [3.4, -0.2],
  } as Record<string, [number, number]>,
  meeting: [-7.6, -3.4] as [number, number],
  manager: [-7.6, 3.8] as [number, number],
  pantry: [8.6, 1.4] as [number, number],
  archive: [-2, 4.9] as [number, number],
  gym: [4.6, 4.9] as [number, number],
  /** Lorong keliling searah jarum jam, bebas meja. */
  walkLoop: [
    [-5, -2.4],
    [6.4, -2.4],
    [6.4, 2.4],
    [-5, 2.4],
  ] as [number, number][],
};

/** Kursi rapat [x, z, arah hadap]; karakter menghadap meja. */
export const meetingSeats: [number, number, number][] = [-1.2, 0, 1.2].flatMap((dx) => [
  [officeInterior.meeting[0] + dx, officeInterior.meeting[1] - 1.35, 0],
  [officeInterior.meeting[0] + dx, officeInterior.meeting[1] + 1.35, Math.PI],
]) as [number, number, number][];

/** Dua kursi per meja seksi; staf berikutnya berdiri di samping meja. */
export function sectionSeat(section: string, index: number): [number, number, number] {
  const [x, z] = officeInterior.sections[section] || officeInterior.sections['umum'];
  if (index < 2) return [x + (index ? 1.1 : -1.1), z + 0.95, Math.PI];
  return [x + 2.4, z + 0.4 + (index - 2) * 0.8, -Math.PI / 2];
}

export const worldStations = [
  {
    id: 'rapat',
    title: 'Meja rapat',
    href: '/rapat',
    description: 'Agenda, notulen, dan keputusan.',
    position: [officeInterior.meeting[0], 0, officeInterior.meeting[1]],
  },
  {
    id: 'tugas',
    title: 'Meja tugas',
    href: '/tugas',
    description: 'Pekerjaan dan tenggat yang perlu ditindaklanjuti.',
    position: [0.7, 0, -2.4],
  },
  {
    id: 'kegiatan',
    title: 'Area kegiatan',
    href: '/jurnal',
    description: 'Karakter berolahraga sebagai visualisasi kegiatan hari ini.',
    position: [officeInterior.gym[0], 0, officeInterior.gym[1]],
  },
  {
    id: 'dokumen',
    title: 'Arsip & buku',
    href: '/dokumen',
    description: 'Dokumen koperasi dan pintasan pencatatan.',
    position: [officeInterior.archive[0], 0, officeInterior.archive[1]],
  },
] as const;

/** Interior gudang (koordinat lokal): dinding belakang Z −7, kiri X −10; sisi depan terbuka. */
export const warehouseInterior = {
  size: [20, 14] as [number, number],
  rackSize: [5.2, 3.2, 1.2] as [number, number, number],
  /** Rak A–C baris belakang, D–F baris depan; X/Z pusat rak. */
  racks: {
    A: [-6, -4.6],
    B: [0, -4.6],
    C: [6, -4.6],
    D: [-6, -0.8],
    E: [0, -0.8],
    F: [6, -0.8],
  } as Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', [number, number]>,
  staging: [-5, 4.4] as [number, number],
};

/** Posisi awal maskot: [manajer, karakter 2, karakter 3]. */
export const characterSpots = {
  luar: [
    [officePosition[0] + 1.5, 0.1, officePosition[1] + 4.2],
    [park.center[0] - 2, 0.1, park.center[1] + 1],
    [warehouse.docks[1] + 1.5, 0.1, warehouse.center[1] + 7.5],
  ],
  dalam: [
    [officeInterior.manager[0], 0.1, officeInterior.manager[1] + 1.4],
    [0, 0.1, 0],
    [0, 0.1, 0],
  ],
  gudang: [
    [-2.6, 0.1, 2.2],
    [3, 0.1, 1.2],
    [0.5, 0.1, 4.8],
  ],
} as const satisfies Record<string, readonly (readonly [number, number, number])[]>;

/** Setengah tinggi bidang pandang kamera ortografis pada zoom 1. */
export const cameraSpan = {
  luar: { portrait: 20, landscape: 13.2 },
  dalam: { portrait: 13, landscape: 9.5 },
  gudang: { portrait: 13, landscape: 9.5 },
};
