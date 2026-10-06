import type { WorldZone } from '../layout';

/**
 * Denah dunia pixel (satuan piksel dunia; 1 tile = 16 px). Topologi mengikuti
 * docs/dunia-pixel/denah.png: pusat layanan di utara Jalan Desa, alun-alun dan taman di
 * selatannya, permukiman di timur laut, sawah di utara, kawasan logistik di tenggara dekat
 * Jalan Provinsi. Id bangunan sama dengan district.ts agar kartu dan data tetap terhubung.
 */
export const TILE = 16;
export const WORLD = { w: 2560, h: 1600 } as const;

export type Box = { x: number; y: number; w: number; h: number };
export type BuildingStyle =
  'kantor' | 'toko' | 'klinik' | 'apotek' | 'loket' | 'gudang' | 'pendingin' | 'balai' | 'rumah';
export type MapBuilding = {
  id: string;
  /** Id yang dikirim ke pemilihan kartu; kantor membuka ruang dalam. */
  select: string;
  title: string;
  style: BuildingStyle;
  /** Tapak di tanah; muka depan berada di tepi selatan (y + h). */
  foot: Box;
  /** Tinggi fasad dalam piksel layar. */
  height: number;
  wall: string;
  roof: string;
  sign?: string;
};
export type AreaKind =
  'sawah' | 'kebun' | 'alun' | 'taman' | 'pasar' | 'pool' | 'dok' | 'permukiman' | 'rencana';
export type MapArea = { kind: AreaKind; box: Box; label?: string };

const JALAN_DESA_Y = 700;
export const roads: Box[] = [
  { x: 0, y: JALAN_DESA_Y, w: WORLD.w, h: 64 },
  { x: 0, y: 1424, w: WORLD.w, h: 72 },
  { x: 1200, y: 0, w: 52, h: 1424 },
  { x: 1780, y: 764, w: 44, h: 660 },
];
/** Sungai di barat: pusat x bergelombang sepanjang y. */
export const river = { x: 250, width: 72, amp: 26, period: 520 } as const;
export const riverCenter = (y: number) =>
  river.x + Math.sin((y / river.period) * Math.PI * 2) * river.amp;
export const bridges: Box[] = [{ x: 190, y: JALAN_DESA_Y - 6, w: 130, h: 76 }];

const front = (x: number, w: number, h: number, base = JALAN_DESA_Y - 12): Box => ({
  x,
  y: base - h,
  w,
  h,
});

export const mapBuildings: MapBuilding[] = [
  {
    id: 'klinik',
    select: 'klinik',
    title: 'Klinik desa',
    style: 'klinik',
    foot: front(380, 160, 70),
    height: 120,
    wall: '#9fae86',
    roof: '#4e7f7a',
    sign: 'KLINIK DESA',
  },
  {
    id: 'kantor',
    select: 'koperasi',
    title: 'Kantor koperasi',
    style: 'kantor',
    foot: front(560, 270, 80),
    height: 160,
    wall: '#d9c9a3',
    roof: '#8a8478',
    sign: 'KOPERASI DESA',
  },
  {
    id: 'sembako',
    select: 'sembako',
    title: 'Gerai sembako',
    style: 'toko',
    foot: front(850, 170, 70),
    height: 130,
    wall: '#c99a6a',
    roof: '#a8563c',
    sign: 'SEMBAKO',
  },
  {
    id: 'apotek',
    select: 'apotek',
    title: 'Apotek desa',
    style: 'apotek',
    foot: front(1040, 140, 64),
    height: 120,
    wall: '#8fa3a8',
    roof: '#6f7d80',
    sign: 'APOTEK',
  },
  {
    id: 'simpan-pinjam',
    select: 'simpan-pinjam',
    title: 'Simpan pinjam',
    style: 'loket',
    foot: front(1290, 150, 64),
    height: 120,
    wall: '#c9a85a',
    roof: '#7d7468',
    sign: 'SIMPAN PINJAM',
  },
  {
    id: 'balai',
    select: 'kawasan',
    title: 'Balai desa',
    style: 'balai',
    foot: front(1470, 200, 90),
    height: 96,
    wall: '#b08a62',
    roof: '#6b4a34',
    sign: 'BALAI DESA',
  },
  ...[0, 1, 2].map((i): MapBuilding => ({
    id: `gerai-${i + 1}`,
    select: `gerai-${i + 1}`,
    title: `Gerai ${i + 1}`,
    style: 'toko',
    foot: front(1840 + i * 150, 130, 60),
    height: 104,
    wall: ['#b5a685', '#a8b08a', '#c4a27a'][i],
    roof: ['#a8563c', '#4e7f7a', '#7d7468'][i],
    sign: `GERAI ${i + 1}`,
  })),
  {
    id: 'gudang',
    select: 'gudang',
    title: 'Gudang komoditas',
    style: 'gudang',
    foot: { x: 1860, y: 860, w: 330, h: 120 },
    height: 120,
    wall: '#5e968f',
    roof: '#98a2a2',
    sign: 'GUDANG KOMODITAS',
  },
  {
    id: 'cold-storage',
    select: 'cold-storage',
    title: 'Cold storage',
    style: 'pendingin',
    foot: { x: 2270, y: 870, w: 220, h: 110 },
    height: 110,
    wall: '#e6eae7',
    roof: '#58799f',
    sign: 'COLD STORAGE',
  },
];

export const areas: MapArea[] = [
  { kind: 'sawah', box: { x: 380, y: 80, w: 780, h: 440 }, label: 'SAWAH DAN KEBUN' },
  { kind: 'kebun', box: { x: 30, y: 820, w: 150, h: 540 }, label: 'KEBUN' },
  { kind: 'permukiman', box: { x: 1300, y: 60, w: 1220, h: 470 }, label: 'PERMUKIMAN WARGA' },
  { kind: 'pasar', box: { x: 380, y: 820, w: 270, h: 220 }, label: 'PASAR TANI' },
  { kind: 'alun', box: { x: 700, y: 820, w: 460, h: 470 }, label: 'ALUN-ALUN' },
  { kind: 'taman', box: { x: 1290, y: 820, w: 430, h: 470 }, label: 'TAMAN DAN LAPANGAN' },
  { kind: 'dok', box: { x: 1840, y: 980, w: 660, h: 150 } },
  { kind: 'pool', box: { x: 1850, y: 1170, w: 640, h: 220 }, label: 'POOL TRUK' },
  { kind: 'rencana', box: { x: 2160, y: 1510, w: 340, h: 70 }, label: 'RENCANA SUPLIER' },
];

/** Rumah warga (hiasan, tidak dapat dipilih) disusun rapi dengan celah jalan setapak. */
export const houses: MapBuilding[] = Array.from({ length: 4 }, (_, row) =>
  Array.from({ length: 9 }, (_, col) => ({ row, col })),
)
  .flat()
  .filter(({ row, col }) => (row + col) % 5 !== 3)
  .map(({ row, col }) => ({
    id: `rumah-${row}-${col}`,
    select: 'kawasan',
    title: 'Rumah warga',
    style: 'rumah' as const,
    foot: { x: 1330 + col * 130 + (row % 2) * 30, y: 110 + row * 110, w: 92, h: 40 },
    height: 52,
    wall: ['#d9c9a3', '#b5a685', '#a8b08a', '#c99a6a'][(row * 3 + col) % 4],
    roof: ['#a8563c', '#7d7468', '#4e7f7a'][(row + col) % 3],
  }));

export const trees: [number, number, number][] = [
  [340, 640, 26],
  [540, 650, 20],
  [1180, 640, 22],
  [690, 860, 30],
  [1130, 870, 26],
  [700, 1260, 28],
  [1140, 1250, 24],
  [1320, 860, 26],
  [1700, 870, 24],
  [1320, 1260, 28],
  [1690, 1250, 24],
  [2220, 900, 18],
  [2230, 960, 16],
  [120, 600, 30],
  [90, 420, 26],
  [150, 200, 30],
  [1260, 1390, 20],
  [1740, 1400, 18],
];

/** Pusat setiap zona (piksel dunia) dan zoom bawaan untuk pemilih zona. */
export const pixelZones: Record<WorldZone, { center: [number, number]; zoom: number }> = {
  semua: { center: [1280, 800], zoom: 0.3 },
  gudang: { center: [2160, 1010], zoom: 0.62 },
  kantor: { center: [800, 640], zoom: 0.62 },
  kesehatan: { center: [700, 630], zoom: 0.62 },
  gerai: { center: [1060, 640], zoom: 0.62 },
  lahan: { center: [770, 300], zoom: 0.45 },
};

/** Batas layar objek: muka depan setinggi fasad ditambah atap di atasnya. */
export function buildingBounds(b: MapBuilding): Box {
  return {
    x: b.foot.x - 4,
    y: b.foot.y - b.height - 4,
    w: b.foot.w + 8,
    h: b.foot.h + b.height + 4,
  };
}
export const boxCenter = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2];

/** Objek yang dapat dipilih menurut id pemilihan, lokasi, atau id bangunan. */
export function buildingFor(selected: string, location: string): MapBuilding | undefined {
  const byLocation =
    location === 'dalam'
      ? 'kantor'
      : location === 'gudang'
        ? 'gudang'
        : location === 'pendingin'
          ? 'cold-storage'
          : location.startsWith('gerai:')
            ? location.slice(6)
            : '';
  return mapBuildings.find(
    (b) =>
      b.id === byLocation || b.id === selected || (b.select === selected && b.select !== 'kawasan'),
  );
}

const COLS = Math.ceil(WORLD.w / TILE);
const ROWS = Math.ceil(WORLD.h / TILE);
export const grid = { cols: COLS, rows: ROWS } as const;

/** Peta jalan kaki: 1 = terhalang (tapak bangunan, sungai kecuali jembatan, kolam). */
export function blockedGrid(): Uint8Array {
  const cells = new Uint8Array(COLS * ROWS);
  const mark = (b: Box) => {
    for (let r = Math.floor(b.y / TILE); r < Math.ceil((b.y + b.h) / TILE); r++)
      for (let c = Math.floor(b.x / TILE); c < Math.ceil((b.x + b.w) / TILE); c++)
        if (r >= 0 && c >= 0 && r < ROWS && c < COLS) cells[r * COLS + c] = 1;
  };
  for (let r = 0; r < ROWS; r++) {
    const y = r * TILE + TILE / 2;
    const cx = riverCenter(y);
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE + TILE / 2;
      const onBridge = bridges.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
      if (Math.abs(x - cx) < river.width / 2 && !onBridge) cells[r * COLS + c] = 1;
    }
  }
  for (const b of [...mapBuildings, ...houses]) mark(b.foot);
  mark({ x: 880, y: 1010, w: 100, h: 60 });
  return cells;
}

/** Pemeriksaan denah: id unik, objek di dalam dunia, bangunan tidak saling tumpang. */
export function validateMap(): string[] {
  const problems: string[] = [];
  const all = [...mapBuildings, ...houses];
  const ids = new Set<string>();
  for (const b of all) {
    if (ids.has(b.id)) problems.push(`id ganda ${b.id}`);
    ids.add(b.id);
    const f = b.foot;
    if (f.x < 0 || f.y - b.height < 0 || f.x + f.w > WORLD.w || f.y + f.h > WORLD.h)
      problems.push(`${b.id} di luar dunia`);
  }
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i].foot;
      const b = all[j].foot;
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
        problems.push(`${all[i].id} menimpa ${all[j].id}`);
    }
  for (const b of all)
    for (const road of roads) {
      const f = b.foot;
      if (
        f.x < road.x + road.w &&
        road.x < f.x + f.w &&
        f.y < road.y + road.h &&
        road.y < f.y + f.h
      )
        problems.push(`${b.id} di atas jalan`);
    }
  return problems;
}
