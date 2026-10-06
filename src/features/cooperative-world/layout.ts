// Semua koordinat dunia (X ke timur, Z ke selatan; satuan scene) dikumpulkan di sini
// agar tata letak bisa diubah tanpa menyentuh mesh. Kamera melihat dari tenggara.
// Kawasan luar mengikuti district.ts (denah v4); nilai di bawah turunan dari sana.
import { allBuildings, docks, logisticsYard, lots, streets } from './district';

/** Batas distrik (kavling + jalan); kota di luarnya hanya pemandangan. Lihat district.ts. */
export const site = { minX: -66, maxX: 74, minZ: -56, maxZ: 74 };

const building = (id: string) => allBuildings().find((b) => b.id === id)!.rect;
const gudang = building('gudang');
const kantor = building('kantor');
const raya = streets.find((s) => s.id === 'raya')!.rect;
const logistik = lots.find((l) => l.id === 'logistik')!;
const truckParking = logistik.parking[0].rect;
const garden = lots.find((l) => l.id === 'administrasi')!.gardens[0];

/** Jalan Raya: lajur masuk truk dari timur di sisi utara jalan. */
export const roads = {
  main: { z: raya.z + raya.d / 2, width: raya.d },
  /** Jalur manuver truk di depan dok (dalam kavling logistik). */
  yardLane: logisticsYard.lane.z + logisticsYard.lane.d / 2,
};

/** Gerbang barang kavling logistik (ke Jalan Raya). */
const goodsGate = logistik.gates[0];
export const gate = {
  x: (goodsGate.from + goodsGate.to) / 2,
  z: logistik.fence.z + logistik.fence.d,
  guardPost: [goodsGate.from - 2.4, logistik.fence.z + logistik.fence.d - 2] as [number, number],
};

/** Parkir antre truk di halaman logistik, tiga petak membujur utara-selatan. */
export const truckBays: readonly [number, number][] = [0, 1, 2].map(
  (i) =>
    [truckParking.x + (truckParking.w / 3) * (i + 0.5), truckParking.z + truckParking.d / 2] as [
      number,
      number,
    ],
);

/** Gudang logistik gaya WH-04: dinding dok menghadap selatan. */
export const warehouse = {
  center: [gudang.x + gudang.w / 2, gudang.z + gudang.d / 2] as [number, number],
  /** Lebar, tinggi dinding, kedalaman. Atap pelana menambah `roofRise` di bubungan. */
  size: [gudang.w, 5.4, gudang.d] as [number, number, number],
  roofRise: 1.8,
  /** Pusat X empat pintu dok. */
  docks: docks.gudang,
  apronDepth: 6,
  staging: [
    logisticsYard.staging.x + logisticsYard.staging.w / 2,
    logisticsYard.staging.z + logisticsYard.staging.d / 2,
  ] as [number, number],
  outdoorRack: [
    logisticsYard.rack.x + logisticsYard.rack.w / 2,
    logisticsYard.rack.z + logisticsYard.rack.d / 2,
  ] as [number, number],
};

/**
 * Jalur forklift suasana di halaman logistik: staging → depan cold storage, bolak-balik
 * di sisi selatan jalur manuver sehingga tidak bertabrakan dengan truk di dok.
 */
export const yardForkliftPath: [number, number][] = [
  [warehouse.staging[0], logisticsYard.staging.z - 0.8],
  [44, logisticsYard.staging.z - 0.8],
  [44, -13],
];

export const officePosition: [number, number] = [kantor.x + kantor.w / 2, kantor.z + kantor.d / 2];
export const officeSize = { width: kantor.w, height: 6.6, depth: kantor.d };

/** Taman administrasi dan papan pengumuman. */
export const park = {
  center: [garden.x + garden.w / 2, garden.z + garden.d / 2] as [number, number],
  size: [garden.w, garden.d] as [number, number],
};

/** Zoom terjauh di kawasan: seluruh distrik dan sedikit kota (1280 px). */
export const minWorldZoom = 0.2;

export type WorldZone = 'semua' | 'gudang' | 'kantor' | 'kesehatan' | 'gerai' | 'lahan';
const lotCenter = (id: (typeof lots)[number]['id']) => {
  const f = lots.find((l) => l.id === id)!.fence;
  return [f.x + f.w / 2, f.z + f.d / 2] as [number, number];
};
export const worldZones: Record<
  WorldZone,
  { title: string; subtitle: string; target: [number, number]; zoom: number }
> = {
  semua: { title: 'Semua kawasan', subtitle: 'Seluruh distrik', target: [4, 6], zoom: 0.24 },
  gudang: {
    title: 'Logistik & cold storage',
    subtitle: 'Gudang, dok, halaman truk',
    target: [lotCenter('logistik')[0] - 2, lotCenter('logistik')[1] + 2],
    zoom: 0.62,
  },
  kantor: {
    title: 'Administrasi',
    subtitle: 'Kantor dan simpan pinjam',
    target: lotCenter('administrasi'),
    zoom: 0.62,
  },
  kesehatan: {
    title: 'Layanan kesehatan',
    subtitle: 'Klinik dan apotek',
    target: lotCenter('kesehatan'),
    zoom: 0.66,
  },
  gerai: {
    title: 'Gerai niaga',
    subtitle: 'Sembako dan gerai tambahan',
    target: lotCenter('niaga'),
    zoom: 0.62,
  },
  lahan: {
    title: 'Lahan pertanian',
    subtitle: 'Enam petak',
    target: lotCenter('lahan'),
    zoom: 0.42,
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
