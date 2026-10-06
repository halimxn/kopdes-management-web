// Denah Distrik Koperasi v4 mengikuti tata letak video acuan: jalan kota berlajur dan
// kavling berpagar yang masing-masing punya halaman, parkir dan jalur rumput, seperti
// "situs" gudang pada video. Data murni (tanpa Three.js) agar bisa diuji dan digambar
// sebagai denah. Satuan scene; X ke timur, Z ke selatan; kamera melihat dari tenggara.

/** Persegi di lantai: sudut barat laut (x, z), lebar ke timur (w), kedalaman ke selatan (d). */
export type Rect = { x: number; z: number; w: number; d: number };
export type Side = 'utara' | 'selatan' | 'barat' | 'timur';

export type Street = { id: string; name: string; rect: Rect; lanes: 2 | 4; axis: 'x' | 'z' };

/** Bangunan unit KDMP: posisi tetap per jenis; tampil jadi bila ada catatan Gerai berjenis itu. */
export type BuildingStyle =
  'gudang' | 'pendingin' | 'kantor' | 'loket' | 'toko' | 'apotek' | 'klinik';
export type DistrictBuilding = {
  id: string;
  name: string;
  /** Kata kunci kolom Jenis pada Gerai yang mengisi bangunan ini; kosong = selalu ada (kantor). */
  kinds: string[];
  rect: Rect;
  height: number;
  /** Sisi muka/pintu; dipilih menghadap kamera atau halaman dalam kavling. */
  facade: Side;
  style: BuildingStyle;
};

export type Gate = {
  side: Side;
  from: number;
  to: number;
  use: 'kendaraan' | 'barang' | 'pejalan';
};
export type Lot = {
  id: 'logistik' | 'administrasi' | 'kesehatan' | 'niaga' | 'lahan';
  name: string;
  /** Garis pagar kavling. */
  fence: Rect;
  gates: Gate[];
  buildings: DistrictBuilding[];
  /** Petak parkir [persegi, arah panjang petak]. */
  parking: { rect: Rect; bays: number; axis: 'x' | 'z'; kind: 'mobil' | 'truk' }[];
  /** Halaman/plaza berpaving di dalam kavling. */
  yards: Rect[];
  /** Taman rumput dengan pohon di dalam kavling. */
  gardens: Rect[];
};

/** Lebar trotoar di kedua sisi setiap jalan. */
export const sidewalk = 2.2;

export const streets: Street[] = [
  { id: 'raya', name: 'Jalan Raya', axis: 'x', lanes: 4, rect: { x: -60, z: -5, w: 126, d: 10 } },
  {
    id: 'koperasi',
    name: 'Jalan Koperasi',
    axis: 'z',
    lanes: 2,
    rect: { x: -4, z: -48, w: 8, d: 90 },
  },
];

/** Dok gudang (pusat X) dan dok cold storage; truk mundur ke lantai dok yang ditinggikan. */
export const docks = {
  gudang: [16, 22, 28, 34],
  pendingin: [47, 55],
  /** Muka dinding dok (Z) dan kedalaman lantai dok yang ditinggikan. */
  wallZ: -31.5,
  platformDepth: 2.2,
  platformHeight: 1.1,
};

export const lots: Lot[] = [
  {
    id: 'logistik',
    name: 'Logistik & cold storage',
    fence: { x: 7.7, z: -44.8, w: 54.6, d: 36.1 },
    gates: [{ side: 'selatan', from: 38, to: 46, use: 'barang' }],
    buildings: [
      {
        id: 'gudang',
        name: 'Gudang logistik',
        kinds: ['logistik', 'gudang', 'distribusi'],
        rect: { x: 12, z: -42.5, w: 26, d: 11 },
        height: 5.4,
        facade: 'selatan',
        style: 'gudang',
      },
      {
        id: 'cold-storage',
        name: 'Cold storage',
        kinds: ['cold storage', 'pendingin', 'cold'],
        rect: { x: 43, z: -42.5, w: 16, d: 11 },
        height: 4.6,
        facade: 'selatan',
        style: 'pendingin',
      },
    ],
    parking: [{ rect: { x: 48, z: -19.5, w: 12.6, d: 9 }, bays: 3, axis: 'z', kind: 'truk' }],
    yards: [{ x: 9.2, z: -29.3, w: 51.6, d: 19.6 }],
    gardens: [],
  },
  {
    id: 'administrasi',
    name: 'Administrasi',
    fence: { x: -54.8, z: -44.8, w: 47.1, d: 36.1 },
    gates: [
      { side: 'selatan', from: -27, to: -21, use: 'kendaraan' },
      { side: 'timur', from: -20, to: -16, use: 'pejalan' },
    ],
    buildings: [
      {
        id: 'kantor',
        name: 'Kantor koperasi',
        kinds: [],
        rect: { x: -48, z: -41, w: 16, d: 10 },
        height: 6.6,
        facade: 'selatan',
        style: 'kantor',
      },
      {
        id: 'simpan-pinjam',
        name: 'Simpan pinjam',
        kinds: ['simpan pinjam', 'usp', 'keuangan'],
        rect: { x: -27, z: -39, w: 11, d: 8 },
        height: 4,
        facade: 'selatan',
        style: 'loket',
      },
    ],
    parking: [{ rect: { x: -52.5, z: -24.5, w: 22, d: 13 }, bays: 16, axis: 'z', kind: 'mobil' }],
    yards: [{ x: -48, z: -31, w: 32, d: 5 }],
    gardens: [{ x: -27, z: -26, w: 17, d: 15.5 }],
  },
  {
    id: 'kesehatan',
    name: 'Layanan kesehatan',
    fence: { x: -54.8, z: 8.7, w: 47.1, d: 30.6 },
    gates: [
      { side: 'timur', from: 28, to: 35, use: 'kendaraan' },
      { side: 'utara', from: -30, to: -26, use: 'pejalan' },
    ],
    buildings: [
      {
        id: 'klinik',
        name: 'Klinik desa',
        kinds: ['klinik', 'kesehatan'],
        rect: { x: -51, z: 11.5, w: 15, d: 10 },
        height: 4.6,
        facade: 'selatan',
        style: 'klinik',
      },
      {
        id: 'apotek',
        name: 'Apotek desa',
        kinds: ['apotek', 'obat'],
        rect: { x: -32, z: 12.5, w: 10, d: 8.5 },
        height: 3.8,
        facade: 'selatan',
        style: 'apotek',
      },
    ],
    parking: [{ rect: { x: -40, z: 27.5, w: 28, d: 10 }, bays: 18, axis: 'z', kind: 'mobil' }],
    yards: [{ x: -51, z: 21.5, w: 30, d: 5 }],
    gardens: [{ x: -52.5, z: 27.5, w: 11, d: 10 }],
  },
  {
    id: 'niaga',
    name: 'Gerai niaga',
    fence: { x: 7.7, z: 8.7, w: 54.6, d: 30.6 },
    gates: [
      { side: 'barat', from: 26, to: 33, use: 'kendaraan' },
      { side: 'utara', from: 30, to: 34, use: 'pejalan' },
    ],
    buildings: [
      {
        id: 'sembako',
        name: 'Gerai sembako',
        kinds: ['sembako', 'toko', 'kelontong'],
        rect: { x: 11, z: 11.5, w: 15, d: 9 },
        height: 4,
        facade: 'selatan',
        style: 'toko',
      },
      // Kavling gerai tambahan (unit di luar enam jenis tetap) diisi berurutan dari data Gerai.
      ...[29.5, 41, 52.5].map((x, i): DistrictBuilding => ({
        id: `gerai-${i + 1}`,
        name: `Gerai ${i + 1}`,
        kinds: [],
        rect: { x, z: 12, w: 8.5, d: 8.5 },
        height: 3.6,
        facade: 'selatan',
        style: 'toko',
      })),
    ],
    parking: [{ rect: { x: 13, z: 27.5, w: 46, d: 10 }, bays: 30, axis: 'z', kind: 'mobil' }],
    yards: [{ x: 11, z: 20.5, w: 50, d: 5 }],
    gardens: [],
  },
];

/** Lahan pertanian dihilangkan dari peta aktif agar komplek tetap kompak & ringan. */
export const farmPlots: Rect[] = [];

/** Area halaman logistik (pemandangan): cas forklift, staging, jalur manuver. */
export const logisticsYard = {
  charging: { x: 9.5, z: -18.5, w: 7, d: 7.5 } as Rect,
  staging: { x: 19, z: -18.5, w: 16, d: 7.5 } as Rect,
  /** Jalur manuver truk di depan dok (bebas objek). */
  lane: { x: 9.2, z: -22.7, w: 51.6, d: 4.2 } as Rect,
  rack: { x: 8.6, z: -41, w: 2.6, d: 8 } as Rect,
};

/** Blok kota luar dihilangkan agar diorama komplek fokus dan hemat render. */
export const cityBlocks: (Rect & { h: number })[] = [];

export const allBuildings = () => lots.flatMap((lot) => lot.buildings);

const inside = (a: Rect, b: Rect) =>
  a.x >= b.x && a.z >= b.z && a.x + a.w <= b.x + b.w && a.z + a.d <= b.z + b.d;
const gap = (a: Rect, b: Rect) =>
  Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)) +
  Math.max(0, Math.max(a.z, b.z) - Math.min(a.z + a.d, b.z + b.d));
const centerOf = (r: Rect) => [r.x + r.w / 2, r.z + r.d / 2] as const;
export const distance = (a: Rect, b: Rect) => {
  const [ax, az] = centerOf(a);
  const [bx, bz] = centerOf(b);
  return Math.hypot(ax - bx, az - bz);
};

/** Jalan yang bersentuhan dengan gerbang (trotoar ikut dihitung). */
function gateStreet(lot: Lot, gate: Gate) {
  const f = lot.fence;
  const reach = sidewalk + 2;
  const probe: Rect =
    gate.side === 'utara'
      ? { x: gate.from, z: f.z - reach, w: gate.to - gate.from, d: reach }
      : gate.side === 'selatan'
        ? { x: gate.from, z: f.z + f.d, w: gate.to - gate.from, d: reach }
        : gate.side === 'barat'
          ? { x: f.x - reach, z: gate.from, w: reach, d: gate.to - gate.from }
          : { x: f.x + f.w, z: gate.from, w: reach, d: gate.to - gate.from };
  return streets.find((street) => gap(probe, street.rect) === 0);
}

/**
 * Aturan denah: bangunan di dalam pagar kavling dan berjarak ≥ 3; setiap gerbang menyentuh
 * jalan; klinik–apotek berdampingan; klinik/apotek jauh (≥ 40) dari dok truk. Kembali daftar
 * pelanggaran (kosong = sah).
 */
export function validateDistrict(): string[] {
  const problems: string[] = [];
  for (const lot of lots) {
    for (const building of lot.buildings)
      if (!inside(building.rect, lot.fence)) problems.push(`${building.id} keluar pagar ${lot.id}`);
    for (const gate of lot.gates)
      if (!gateStreet(lot, gate))
        problems.push(`gerbang ${gate.side} ${lot.id} tidak menyentuh jalan`);
    for (const street of streets)
      if (gap(lot.fence, street.rect) < sidewalk)
        problems.push(`pagar ${lot.id} menempel jalan ${street.id} tanpa trotoar`);
  }
  const buildings = allBuildings();
  buildings.forEach((a, i) =>
    buildings.slice(i + 1).forEach((b) => {
      if (gap(a.rect, b.rect) < 3) problems.push(`${a.id} terlalu dekat ${b.id}`);
    }),
  );
  const find = (id: string) => buildings.find((b) => b.id === id)!.rect;
  if (gap(find('klinik'), find('apotek')) > 6)
    problems.push('klinik dan apotek tidak berdampingan');
  const dock: Rect = { x: docks.gudang[0], z: docks.wallZ, w: 1, d: 1 };
  for (const id of ['klinik', 'apotek'])
    if (distance(find(id), dock) < 40) problems.push(`${id} terlalu dekat dok truk`);
  return problems;
}
