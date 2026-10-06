import * as THREE from 'three';
import type { WorldModel } from '../world-model';
import {
  cityBlocks,
  farmPlots,
  lots,
  sidewalk,
  streets,
  type DistrictBuilding,
  type Lot,
  type Rect,
} from '../district';
import { officePosition, officeSize, park } from '../layout';
import { box, mergeStatic, mergeTransparent, palette, sign } from './primitives';
import { bench, fence, streetLamp, tree } from './props';
import {
  clinicBuilding,
  coldStorageBuilding,
  counterBuilding,
  officeBuilding,
  pharmacyBuilding,
  plannedLot,
  shopBuilding,
} from './district-buildings';
import { createLogisticsYard, createWarehouse } from './warehouse';

/** Warna tanah kota, juga dipakai lantai tak berujung di WorldScene. */
export const cityGround = '#dfe6f7';

const flat = (parent: THREE.Object3D, r: Rect, y: number, h: number, color: string, round = 0) =>
  box(parent, [r.w, h, r.d], [r.x + r.w / 2, y + h / 2, r.z + r.d / 2], color, round);

/** Jalan berlajur: aspal, marka tengah putus-putus, garis lajur, trotoar bersudut membulat. */
function createStreets(parent: THREE.Object3D) {
  for (const s of streets) {
    const r = s.rect;
    const walk =
      s.axis === 'x'
        ? { x: r.x, z: r.z - sidewalk, w: r.w, d: r.d + sidewalk * 2 }
        : { x: r.x - sidewalk, z: r.z, w: r.w + sidewalk * 2, d: r.d };
    flat(parent, walk, -0.02, 0.14, palette.sidewalk, 0.06);
  }
  for (const s of streets) {
    const r = s.rect;
    flat(parent, r, 0, 0.14, palette.asphalt, 0);
    const along = s.axis === 'x' ? r.w : r.d;
    const offsets = s.lanes === 4 ? [0, -r.d / 4, r.d / 4] : [0];
    for (const [i, offset] of offsets.entries())
      for (let t = 2; t < along - 2; t += 4.5) {
        const color = i === 0 ? '#ffffff' : '#e9eefb';
        if (s.axis === 'x')
          box(parent, [2.2, 0.02, 0.14], [r.x + t + 1.1, 0.15, r.z + r.d / 2 + offset], color, 0);
        else box(parent, [0.14, 0.02, 2.2], [r.x + r.w / 2, 0.15, r.z + t + 1.1], color, 0);
      }
  }
  // Zebra cross di setiap persimpangan, di keempat sisi.
  const across = streets.filter((s) => s.axis === 'x');
  const down = streets.filter((s) => s.axis === 'z');
  for (const a of across)
    for (const b of down) {
      const ax = a.rect,
        bz = b.rect;
      if (bz.x + bz.w < ax.x || bz.x > ax.x + ax.w || ax.z + ax.d < bz.z || ax.z > bz.z + bz.d)
        continue;
      for (const side of [-1, 1]) {
        const z = side < 0 ? ax.z - 1.4 : ax.z + ax.d + 1.4;
        if (z > bz.z && z < bz.z + bz.d)
          for (let x = bz.x + 0.5; x < bz.x + bz.w - 0.3; x += 1)
            box(parent, [0.55, 0.03, 2.2], [x + 0.25, 0.155, z], '#ffffff', 0);
        const x = side < 0 ? bz.x - 1.4 : bz.x + bz.w + 1.4;
        if (x > ax.x && x < ax.x + ax.w)
          for (let zz = ax.z + 0.5; zz < ax.z + ax.d - 0.3; zz += 1)
            box(parent, [2.2, 0.03, 0.55], [x, 0.155, zz + 0.25], '#ffffff', 0);
      }
    }
}

/** Celah gerbang pada sisi pagar: kembali potongan pagar di luar gerbang. */
function fenceSegments(lot: Lot, side: Lot['gates'][number]['side']) {
  const f = lot.fence;
  const horiz = side === 'utara' || side === 'selatan';
  const start = horiz ? f.x : f.z;
  const end = horiz ? f.x + f.w : f.z + f.d;
  const openings = lot.gates
    .filter((g) => g.side === side)
    .map((g) => [g.from, g.to])
    .sort((a, b) => a[0] - b[0]);
  const parts: [number, number][] = [];
  let at = start;
  for (const [from, to] of openings) {
    if (from > at) parts.push([at, from]);
    at = to;
  }
  if (end > at) parts.push([at, end]);
  return parts;
}

/** Kavling: tanah, pagar kaca bergerbang, jalur rumput berpohon di luar pagar, halaman, taman, parkir. */
function createLot(parent: THREE.Object3D, panels: THREE.Object3D, lot: Lot) {
  const f = lot.fence;
  flat(
    parent,
    { x: f.x - 1.4, z: f.z - 1.4, w: f.w + 2.8, d: f.d + 2.8 },
    0,
    0.1,
    palette.grass,
    0.4,
  );
  flat(parent, f, 0.02, 0.1, lot.id === 'lahan' ? '#e4f3e6' : palette.lot, 0.2);
  for (const side of ['utara', 'selatan', 'barat', 'timur'] as const)
    for (const [a, b] of fenceSegments(lot, side)) {
      const z = side === 'utara' ? f.z : f.z + f.d;
      const x = side === 'barat' ? f.x : f.x + f.w;
      if (side === 'utara' || side === 'selatan') fence(parent, [a, z], [b, z], panels);
      else fence(parent, [x, a], [x, b], panels);
    }
  for (const gate of lot.gates) {
    const horiz = gate.side === 'utara' || gate.side === 'selatan';
    const at =
      gate.side === 'utara'
        ? f.z
        : gate.side === 'selatan'
          ? f.z + f.d
          : gate.side === 'barat'
            ? f.x
            : f.x + f.w;
    for (const p of [gate.from, gate.to])
      box(parent, [0.5, 1.7, 0.5], horiz ? [p, 0.85, at] : [at, 0.85, p], palette.blue, 0.12);
  }
  // Pohon berbaris di jalur rumput sepanjang sisi selatan dan timur (sisi yang dilihat kamera).
  for (let x = f.x + 2.5; x < f.x + f.w - 1.5; x += 5.5)
    if (!lot.gates.some((g) => g.side === 'selatan' && x > g.from - 1.5 && x < g.to + 1.5))
      tree(parent, x, f.z + f.d + 0.75, 0.85 + ((x * 7) % 3) * 0.08);
  for (let z = f.z + 2.5; z < f.z + f.d - 1.5; z += 5.5)
    if (!lot.gates.some((g) => g.side === 'timur' && z > g.from - 1.5 && z < g.to + 1.5))
      tree(parent, f.x + f.w + 0.75, z, 0.85);
  for (const y of lot.yards) flat(parent, y, 0.12, 0.04, palette.yard, 0.1);
  for (const g of lot.gardens) {
    flat(parent, g, 0.12, 0.06, palette.grass, 0.4);
    box(parent, [g.w - 2, 0.07, 1.1], [g.x + g.w / 2, 0.16, g.z + g.d / 2], '#f2efe6', 0.2);
    for (const [dx, dz] of [
      [0.2, 0.2],
      [0.8, 0.2],
      [0.2, 0.8],
      [0.8, 0.8],
    ])
      tree(parent, g.x + g.w * dx, g.z + g.d * dz, 1.05);
    bench(parent, g.x + g.w * 0.5, g.z + g.d * 0.3);
  }
  for (const p of lot.parking) {
    flat(parent, p.rect, 0.12, 0.04, palette.yard, 0.1);
    const color = p.kind === 'truk' ? palette.marking : '#ffffff';
    if (p.kind === 'truk') {
      const bw = p.rect.w / p.bays;
      for (let i = 0; i <= p.bays; i++)
        box(
          parent,
          [0.12, 0.02, p.rect.d],
          [p.rect.x + i * bw, 0.17, p.rect.z + p.rect.d / 2],
          color,
          0,
        );
      continue;
    }
    // Parkir mobil dua baris saling berhadapan dengan lorong di tengah.
    const perRow = Math.ceil(p.bays / 2);
    const bw = p.rect.w / perRow;
    const rowDepth = p.rect.d * 0.36;
    for (const row of [0, 1]) {
      const z0 = row ? p.rect.z + p.rect.d - rowDepth : p.rect.z;
      for (let i = 0; i <= perRow; i++)
        box(parent, [0.1, 0.02, rowDepth], [p.rect.x + i * bw, 0.17, z0 + rowDepth / 2], color, 0);
      box(
        parent,
        [p.rect.w, 0.02, 0.1],
        [p.rect.x + p.rect.w / 2, 0.17, row ? z0 : z0 + rowDepth],
        color,
        0,
      );
    }
  }
}

/**
 * Mobil parkir sebagai suasana (bukan data): warna pastel senada, terisi sebagian petak
 * agar parkir tampak hidup seperti video tanpa memadati.
 */
function parkedCars(parent: THREE.Object3D) {
  const colors = ['#f4f6fb', '#9fb8f5', '#c9b8f6', '#8fdcbc', '#f7c39b', '#f4f6fb'];
  let n = 0;
  for (const lot of lots)
    for (const p of lot.parking.filter((q) => q.kind === 'mobil')) {
      const perRow = Math.ceil(p.bays / 2);
      const bw = p.rect.w / perRow;
      const rowDepth = p.rect.d * 0.36;
      for (const row of [0, 1])
        for (let i = 0; i < perRow; i++) {
          if ((i * 3 + row * 5 + n) % 4 === 0 || (i + row) % 3 === 2) continue;
          const x = p.rect.x + (i + 0.5) * bw;
          const z = row ? p.rect.z + p.rect.d - rowDepth / 2 : p.rect.z + rowDepth / 2;
          const color = colors[(i + row * 2 + n) % colors.length];
          box(parent, [1.6, 0.62, 3.2], [x, 0.55, z], color, 0.22);
          box(parent, [1.42, 0.5, 1.7], [x, 1.08, z + (row ? 0.25 : -0.25)], color, 0.2);
          box(
            parent,
            [1.44, 0.34, 1.5],
            [x, 1.1, z + (row ? 0.25 : -0.25)],
            palette.glassDark,
            0.08,
          );
        }
      n++;
    }
}

/** Lahan pertanian kosong: petak rumput pastel berbatas, alur tanam samar, jalan setapak. */
function createFarm(parent: THREE.Object3D) {
  for (const p of farmPlots) {
    flat(parent, p, 0.12, 0.08, '#d4efda', 0.3);
    for (let i = 1; i < 8; i++)
      box(parent, [p.w - 1.6, 0.03, 0.3], [p.x + p.w / 2, 0.22, p.z + (i * p.d) / 8], '#c2e6cb', 0);
    for (const [dx, dz] of [
      [0.04, 0.06],
      [0.96, 0.06],
    ])
      box(parent, [0.12, 0.9, 0.12], [p.x + p.w * dx, 0.55, p.z + p.d * dz], '#a3b9aa', 0);
  }
}

/**
 * Kota di sekitar distrik: setiap blok berisi dua sampai empat bangunan dengan ukuran,
 * tinggi dan jarak berbeda (tidak kaku), atap lavender pucat, pita jendela biru, pohon di sela.
 */
function createCity(parent: THREE.Object3D) {
  for (const [bi, b] of cityBlocks.entries()) {
    flat(parent, b, 0, 0.12, palette.sidewalk, 0.3);
    const count = 2 + (bi % 3);
    const along = b.w >= b.d;
    const span = (along ? b.w : b.d) - 1.5;
    let at = 0.75;
    for (let i = 0; i < count; i++) {
      const share = (span / count) * (0.75 + ((bi * 7 + i * 3) % 5) * 0.1);
      const size = Math.min(share, span - at + 0.75) - 1.2;
      if (size < 2.5) break;
      const depth = (along ? b.d : b.w) * (0.55 + ((bi + i) % 3) * 0.12);
      const h = Math.max(1.8, b.h * (0.55 + ((bi * 5 + i * 7) % 6) * 0.12));
      const cx = along ? b.x + at + size / 2 : b.x + (b.w - depth) / 2 + depth / 2;
      const cz = along ? b.z + (b.d - depth) / 2 + depth / 2 : b.z + at + size / 2;
      const w = along ? size : depth;
      const d = along ? depth : size;
      box(parent, [w, h, d], [cx, h / 2 + 0.12, cz], '#f3f5fd', 0.25);
      box(
        parent,
        [w + 0.2, 0.22, d + 0.2],
        [cx, h + 0.2, cz],
        (bi + i) % 2 ? '#dfe3fa' : '#e6e1fb',
        0.12,
      );
      for (let y = 1.1; y < h - 0.5; y += 1.2) {
        box(parent, [w - 0.7, 0.5, 0.05], [cx, y, cz + d / 2 + 0.03], '#b7cdf6', 0);
        box(parent, [0.05, 0.5, d - 0.7], [cx + w / 2 + 0.03, y, cz], '#a9c1f0', 0);
      }
      at += size + 1.2 + ((bi + i) % 2) * 0.8;
      if (i < count - 1 && (bi + i) % 2 === 0)
        tree(
          parent,
          along ? b.x + at - 0.9 : b.x + b.w * 0.8,
          along ? b.z + b.d * 0.85 : b.z + at - 0.9,
          0.8,
        );
    }
  }
}

/** Bangunan unit dari data Gerai: jadi bila status siap uji ke atas, bertahap bila rencana/persiapan. */
function unitBuilding(
  parent: THREE.Object3D,
  b: DistrictBuilding,
  title: string | null,
  status: string,
  id: string,
) {
  if (!title) return plannedLot(parent, b, id, 'kosong');
  if (status === 'rencana') return plannedLot(parent, b, id, 'pondasi');
  if (status === 'persiapan') return plannedLot(parent, b, id, 'rangka');
  if (b.style === 'loket') return counterBuilding(parent, b, title, id);
  if (b.style === 'apotek') return pharmacyBuilding(parent, b, title, id);
  if (b.style === 'klinik') return clinicBuilding(parent, b, title, id);
  if (b.style === 'pendingin') return coldStorageBuilding(parent, b, id);
  return shopBuilding(
    parent,
    b,
    title,
    id,
    b.id === 'sembako' ? palette.pastelPeach : palette.pastelLilac,
  );
}

export function createExterior(parent: THREE.Group, model: WorldModel) {
  const scenery = new THREE.Group();
  parent.add(scenery);
  const panels = new THREE.Group();
  createStreets(scenery);
  for (const lot of lots) createLot(scenery, panels, lot);
  createFarm(scenery);
  createCity(scenery);
  parkedCars(scenery);
  createLogisticsYard(scenery, model);
  for (const [x, , z] of lampHeads()) streetLamp(scenery, x - 0.22, z);
  mergeStatic(scenery);
  mergeTransparent(panels, '#dfe8f8', 0.36);
  scenery.add(panels);
  noticeBoard(parent);
  // Objek yang dapat diklik digabung per objek agar raycast tetap mengenali pilihannya.
  const office = lots.flatMap((l) => l.buildings).find((b) => b.id === 'kantor')!;
  mergeStatic(officeBuilding(parent, office));
  mergeStatic(createWarehouse(parent));
  for (const plot of model.plots)
    mergeStatic(
      unitBuilding(
        parent,
        plot.building,
        plot.unit ? String(plot.unit.data.title) : null,
        String(plot.unit?.data.status || ''),
        plot.id,
      ),
    );
}

/** Posisi kepala lampu jalan [x, y, z] di trotoar Jalan Raya; dipakai tiang dan cahaya malam. */
export function lampHeads(): [number, number, number][] {
  const raya = streets.find((s) => s.id === 'raya')!.rect;
  return [-50, -30, -12, 14, 32, 52].flatMap((x) => [
    [x + 0.22, 3.12, raya.z - sidewalk / 2] as [number, number, number],
    [x + 0.22, 3.12, raya.z + raya.d + sidewalk / 2] as [number, number, number],
  ]);
}

/** Papan pengumuman di taman administrasi: isi dari keputusan rapat dan dokumen. */
function noticeBoard(parent: THREE.Object3D) {
  const [px, pz] = park.center;
  const g = new THREE.Group();
  g.userData.selection = 'papan';
  parent.add(g);
  const z = pz + park.size[1] / 2 - 1.2;
  for (const dx of [-1.2, 1.2]) box(g, [0.12, 2.2, 0.12], [px + dx, 1.1, z], palette.ink, 0);
  box(g, [2.8, 1.5, 0.12], [px, 1.8, z], palette.navy, 0.08);
  box(g, [2.5, 1.2, 0.04], [px, 1.8, z + 0.07], palette.white, 0);
  sign(g, 'PENGUMUMAN', [px, 2.25, z + 0.1], 2.2, palette.navy);
  for (const dy of [0, -0.3]) box(g, [1.8, 0.08, 0.02], [px, 1.75 + dy, z + 0.1], '#c9d3e6', 0);
  mergeStatic(g);
}

/** Cahaya malam: kepala lampu jalan dan pita jendela kantor. Disembunyikan siang hari. */
export function createNightLights(parent: THREE.Object3D) {
  const g = new THREE.Group();
  g.visible = false;
  parent.add(g);
  const glow = new THREE.MeshBasicMaterial({ color: '#ffe3a1' });
  const bulb = new THREE.SphereGeometry(0.22, 10, 8);
  for (const [x, y, z] of lampHeads()) {
    const mesh = new THREE.Mesh(bulb, glow);
    mesh.position.set(x, y - 0.12, z);
    g.add(mesh);
  }
  const [ox, oz] = officePosition;
  // Pita jendela kantor (lihat officeBuilding): lantai 1 kiri/kanan pintu, lantai 2 penuh.
  const half = officeSize.width / 2;
  const panes: [number, number, number][] = [
    [0, 4.3, officeSize.width - 1.6],
    [-(half + 0.8) / 2, 1.6, half - 2.4],
    [(half + 0.8) / 2, 1.6, half - 2.4],
  ];
  for (const [x, y, width] of panes) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, 1.2), glow);
    mesh.position.set(ox + x, y, oz + officeSize.depth / 2 + 0.14);
    g.add(mesh);
  }
  return g;
}
