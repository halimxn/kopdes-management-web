import { houses, villageLanes, type Box } from './map';

/**
 * Perabot jalan dan detail area (hiasan) pada titik tapaknya. Hanya papan pengumuman yang dapat
 * dipilih karena isinya data (keputusan dan dokumen); sisanya latar. `block` = tapak penghalang
 * jalan kaki avatar.
 */
export type MapProp = {
  id: string;
  sprite: string;
  x: number;
  y: number;
  block?: Box;
  select?: string;
};

const around = (x: number, y: number, w: number, d: number): Box => ({
  x: x - w / 2,
  y: y - d,
  w,
  h: d,
});
const list: MapProp[] = [];
const add = (sprite: string, x: number, y: number, block?: Box, select?: string) =>
  list.push({ id: `${sprite}-${list.length}`, sprite, x, y, block, select });

// Jalan Desa: tiang listrik di sisi utara (sela bangunan), lampu dan bangku di sisi selatan.
export const POLES: [number, boolean][] = [
  [96, false],
  [548, true],
  [1034, false],
  [1458, false],
  [1700, true],
  [1980, false],
  [2290, false],
  [2530, false],
];
for (const [x, trafo] of POLES) add(trafo ? 'tiang-trafo' : 'tiang', x, 696, around(x, 696, 8, 6));
for (const x of [150, 460, 760, 1060, 1360, 1660, 2000, 2340])
  add('lampu', x, 792, around(x, 792, 10, 6));
for (const x of [300, 600, 1500]) {
  add('bangku', x, 804, around(x, 804, 46, 10));
  add('sampah', x + 40, 802, around(x + 40, 802, 26, 8));
}
[386, 536, 856, 1014, 1046, 1176, 1296, 1436].forEach((x, i) =>
  add(i % 2 ? 'pot-kuning' : 'pot', x, 697),
);
add('papan', 612, 697, around(612, 697, 40, 6), 'papan');

// Alun-alun: air mancur, tiang bendera, umbul-umbul di tepi utara, bangku mengelilingi.
add('air-mancur', 930, 1074, around(930, 1074, 104, 50));
add('tiang-bendera', 868, 904, around(868, 904, 26, 8));
for (const x of [740, 800, 860, 1000, 1060, 1120]) add('umbul', x, 838);
for (const [x, y] of [
  [800, 1000],
  [1060, 1000],
  [800, 1160],
  [1060, 1160],
])
  add('bangku', x, y, around(x, y, 46, 10));

// Pasar tani: enam tenda dua baris.
[0, 1].forEach((row) =>
  [430, 515, 600].forEach((x, i) =>
    add(`tenda-${((row * 3 + i) % 3) + 1}`, x, 930 + row * 92, around(x, 930 + row * 92, 70, 26)),
  ),
);

// Taman dan lapangan.
for (const x of [1360, 1650]) add('bangku', x, 1000, around(x, 1000, 46, 10));

// Kawasan logistik berpagar; gerbang di sisi barat tempat truk berbelok dari jalan logistik.
const FENCE = { west: 1834, east: 2512, north: 798, south: 1408, gateTop: 1162, gateBottom: 1226 };
for (let x = FENCE.west + 4; x + 48 <= FENCE.east; x += 48) {
  add('pagar-h', x, FENCE.north, { x, y: FENCE.north - 6, w: 48, h: 6 });
  add('pagar-h', x, FENCE.south, { x, y: FENCE.south - 6, w: 48, h: 6 });
}
for (const xLine of [FENCE.west, FENCE.east])
  for (let y = FENCE.north + 24; y <= FENCE.south; y += 24) {
    if (xLine === FENCE.west && y > FENCE.gateTop - 2 && y < FENCE.gateBottom + 24) continue;
    add('pagar-v', xLine, y, { x: xLine - 3, y: y - 24, w: 6, h: 24 });
  }
add('gerbang-papan', FENCE.west, FENCE.gateTop, around(FENCE.west, FENCE.gateTop, 20, 10));
add(
  'gerbang',
  FENCE.west,
  FENCE.gateBottom + 22,
  around(FENCE.west, FENCE.gateBottom + 22, 20, 10),
);

// Sawah: saung tempat petani berteduh.
add('saung', 700, 372, around(700, 372, 64, 20));
add('saung', 1040, 262, around(1040, 262, 64, 20));

// Jemuran di samping beberapa rumah yang punya ruang kosong.
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
let lines = 0;
for (const h of houses) {
  if (lines >= 5) break;
  const x = h.foot.x + h.foot.w + 34;
  const y = h.foot.y + h.foot.h - 4;
  const look = { x: x - 26, y: y - 46, w: 52, h: 48 };
  const clear =
    houses.every(
      (o) => !overlaps(look, { ...o.foot, y: o.foot.y - o.height, h: o.foot.h + o.height }),
    ) &&
    villageLanes.every((l) => !overlaps(look, l)) &&
    x < 2500;
  if (!clear) continue;
  add('jemuran', x, y, around(x, y, 48, 6));
  lines++;
}

export const mapProps: MapProp[] = list;
export const propBlocks = (): Box[] => mapProps.flatMap((p) => (p.block ? [p.block] : []));
