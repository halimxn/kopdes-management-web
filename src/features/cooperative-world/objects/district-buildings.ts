import * as THREE from 'three';
import type { DistrictBuilding } from '../district';
import { docks } from '../district';
import { badge, box, cylinder, palette, sign, sphere } from './primitives';
import { roofUnit } from './props';

/**
 * Bangunan unit distrik v4: bentuk lembut bersudut membulat seperti video, dinding putih
 * kebiruan, atap/aksen pastel per jenis unit. Semua digambar dalam koordinat lokal dengan
 * muka bangunan di +Z (selatan) lalu grup diputar sesuai `facade`.
 */
const facadeTurn = { selatan: 0, timur: Math.PI / 2, utara: Math.PI, barat: -Math.PI / 2 };

function frame(parent: THREE.Object3D, b: DistrictBuilding, selection: string) {
  const g = new THREE.Group();
  g.position.set(b.rect.x + b.rect.w / 2, 0, b.rect.z + b.rect.d / 2);
  g.rotation.y = facadeTurn[b.facade];
  g.userData.selection = selection;
  parent.add(g);
  const turned = b.facade === 'timur' || b.facade === 'barat';
  return { g, w: turned ? b.rect.d : b.rect.w, d: turned ? b.rect.w : b.rect.d };
}

/** Badan bangunan membulat di atas alas, dengan atap pastel yang sedikit menjorok. */
function body(g: THREE.Object3D, w: number, d: number, h: number, roof: string) {
  box(g, [w + 0.8, 0.2, d + 0.8], [0, 0.1, 0], '#eef2fc', 0.08);
  box(g, [w, h, d], [0, h / 2 + 0.2, 0], palette.wall, 0.32);
  box(g, [w + 0.35, 0.42, d + 0.35], [0, h + 0.26, 0], roof, 0.18);
  box(g, [w - 0.6, 0.06, d - 0.6], [0, h + 0.49, 0], '#f5f7ff', 0.02);
}

/** Pita jendela kaca di muka selatan dengan tiang putih. */
function glassBand(
  g: THREE.Object3D,
  from: number,
  to: number,
  y: number,
  h: number,
  front: number,
) {
  box(g, [to - from, h, 0.08], [(from + to) / 2, y, front + 0.04], palette.glass, 0);
  for (let x = from; x <= to + 0.01; x += 1.1)
    box(g, [0.08, h, 0.12], [x, y, front + 0.06], palette.white, 0);
}

/** Tenda bergaris dua warna di atas etalase. */
function awning(g: THREE.Object3D, width: number, y: number, front: number, color: string) {
  const a = new THREE.Group();
  a.position.set(0, y, front + 0.55);
  a.rotation.x = 0.36;
  g.add(a);
  const stripes = Math.max(5, Math.round(width / 0.9));
  for (let i = 0; i < stripes; i++)
    box(
      a,
      [width / stripes, 0.08, 1.15],
      [-width / 2 + (i + 0.5) * (width / stripes), 0, 0],
      i % 2 ? palette.white : color,
      0,
    );
  box(a, [width, 0.2, 0.08], [0, -0.07, 0.58], color, 0.03);
}

/** Pintu kaca ganda. */
function door(g: THREE.Object3D, x: number, front: number, width = 1.6, height = 2.2) {
  box(
    g,
    [width + 0.2, height + 0.15, 0.1],
    [x, height / 2 + 0.25, front + 0.03],
    palette.glassDark,
    0.04,
  );
  box(g, [width, height, 0.08], [x, height / 2 + 0.25, front + 0.07], palette.glass, 0);
  box(g, [0.05, height, 0.12], [x, height / 2 + 0.25, front + 0.1], palette.white, 0);
}

function plant(g: THREE.Object3D, x: number, z: number) {
  cylinder(g, 0.34, 0.5, [x, 0.45, z], '#e7ecf8');
  sphere(g, 0.44, [x, 0.9, z], palette.green);
}

export function officeBuilding(parent: THREE.Object3D, b: DistrictBuilding) {
  const { g, w, d } = frame(parent, b, 'koperasi');
  const h = b.height;
  const front = d / 2;
  body(g, w, d, h, palette.blue);
  for (const side of [-1, 1])
    box(g, [0.36, h, 0.36], [side * (w / 2 - 0.05), h / 2 + 0.2, front], palette.blue, 0.12);
  glassBand(g, -w / 2 + 0.8, -1.6, 1.6, 1.3, front);
  glassBand(g, 1.6, w / 2 - 0.8, 1.6, 1.3, front);
  glassBand(g, -w / 2 + 0.8, w / 2 - 0.8, 4.3, 1.3, front);
  door(g, 0, front);
  box(g, [4.2, 0.18, 1.8], [0, 3.0, front + 0.9], palette.blue, 0.08);
  for (const side of [-1, 1])
    box(g, [0.12, 2.8, 0.12], [side * 1.9, 1.6, front + 1.7], palette.navy, 0);
  sign(g, 'KOPERASI', [0, h - 0.35, front + 0.08], 4.4);
  for (const [x, z] of [
    [-4, -2],
    [-1.5, -2.5],
    [3.5, -1.5],
  ])
    roofUnit(g, x, h + 0.5, z);
  for (const side of [-1, 1]) plant(g, side * 3, front + 1.2);
  return g;
}

/** Simpan pinjam: loket dengan atap lavender dan jendela teller. */
export function counterBuilding(
  parent: THREE.Object3D,
  b: DistrictBuilding,
  title: string,
  id: string,
) {
  const { g, w, d } = frame(parent, b, id);
  const front = d / 2;
  body(g, w, d, b.height, palette.pastelLavender);
  glassBand(g, -w / 2 + 0.7, -1.4, 1.7, 1.6, front);
  glassBand(g, 1.4, w / 2 - 0.7, 1.7, 1.6, front);
  door(g, 0, front, 1.8);
  box(g, [w * 0.62, 0.7, 0.12], [0, b.height - 0.5, front + 0.06], palette.pastelLavender, 0.06);
  sign(g, title, [0, b.height - 0.5, front + 0.14], w * 0.55, '#5b4bc4');
  plant(g, w / 2 - 0.6, front + 1);
  return g;
}

/** Toko (sembako dan gerai tambahan): etalase kaca dan tenda bergaris pastel. */
export function shopBuilding(
  parent: THREE.Object3D,
  b: DistrictBuilding,
  title: string,
  id: string,
  accent: string,
) {
  const { g, w, d } = frame(parent, b, id);
  const front = d / 2;
  body(g, w, d, b.height, accent);
  glassBand(g, -w / 2 + 0.6, w / 2 - 0.6, 1.25, 1.6, front);
  door(g, w > 10 ? -w / 4 : 0, front, 1.4, 2);
  awning(g, w - 0.3, 2.45, front, accent);
  box(g, [w * 0.7, 0.75, 0.12], [0, b.height - 0.45, front + 0.06], palette.white, 0.06);
  sign(g, title, [0, b.height - 0.45, front + 0.14], w * 0.66, palette.ink);
  // Peti buah/sayur di depan toko besar sebagai suasana (bukan stok tercatat).
  if (w > 10)
    for (const x of [w / 4 - 1, w / 4, w / 4 + 1])
      box(g, [0.8, 0.45, 0.6], [x, 0.43, front + 1.4], x === w / 4 ? '#f2b36b' : '#9fd8b0', 0.06);
  return g;
}

/** Apotek: atap mint, palang hijau pastel, etalase. */
export function pharmacyBuilding(
  parent: THREE.Object3D,
  b: DistrictBuilding,
  title: string,
  id: string,
) {
  const { g, w, d } = frame(parent, b, id);
  const front = d / 2;
  body(g, w, d, b.height, palette.pastelMint);
  glassBand(g, -w / 2 + 0.6, w / 2 - 0.6, 1.3, 1.5, front);
  door(g, 0, front, 1.5, 2);
  awning(g, w - 0.4, 2.4, front, palette.pastelMint);
  box(g, [1.1, 1.1, 0.14], [w / 2 - 1, b.height - 0.5, front + 0.08], '#3fbf8f', 0.12);
  box(g, [0.75, 0.22, 0.05], [w / 2 - 1, b.height - 0.5, front + 0.17], palette.white, 0);
  box(g, [0.22, 0.75, 0.05], [w / 2 - 1, b.height - 0.5, front + 0.17], palette.white, 0);
  sign(g, title, [-0.8, b.height - 0.5, front + 0.1], w * 0.6, '#1f8a62');
  return g;
}

/** Klinik: atap biru langit pastel, kanopi antar-jemput, palang di fasad. */
export function clinicBuilding(
  parent: THREE.Object3D,
  b: DistrictBuilding,
  title: string,
  id: string,
) {
  const { g, w, d } = frame(parent, b, id);
  const front = d / 2;
  body(g, w, d, b.height, palette.pastelSky);
  glassBand(g, -w / 2 + 0.7, -2.2, 1.7, 1.5, front);
  glassBand(g, 2.2, w / 2 - 0.7, 1.7, 1.5, front);
  door(g, 0, front, 2.2);
  box(g, [5.2, 0.2, 2.6], [0, 3.1, front + 1.3], palette.pastelSky, 0.1);
  for (const side of [-1, 1])
    box(g, [0.14, 2.9, 0.14], [side * 2.4, 1.65, front + 2.45], palette.white, 0.03);
  box(g, [1.2, 1.2, 0.14], [-w / 2 + 1.4, b.height - 0.55, front + 0.08], '#e8737a', 0.12);
  box(g, [0.8, 0.24, 0.05], [-w / 2 + 1.4, b.height - 0.55, front + 0.17], palette.white, 0);
  box(g, [0.24, 0.8, 0.05], [-w / 2 + 1.4, b.height - 0.55, front + 0.17], palette.white, 0);
  sign(g, title, [1.2, b.height - 0.55, front + 0.1], w * 0.5, '#2a6f9a');
  for (const side of [-1, 1]) plant(g, side * (w / 2 - 0.8), front + 1);
  return g;
}

/**
 * Cold storage gaya WH-03 video: kotak putih, pita navy di atas dinding, tepi biru tegak,
 * atap datar penuh unit pendingin, dua pintu dok berbingkai biru di atas lantai dok tinggi.
 */
export function coldStorageBuilding(parent: THREE.Object3D, b: DistrictBuilding, id: string) {
  const { g, w, d } = frame(parent, b, id);
  const h = b.height;
  const front = d / 2;
  box(g, [w, h, d], [0, h / 2, 0], '#f5f7fe', 0.12);
  box(g, [w + 0.12, 0.42, d + 0.12], [0, h - 0.35, 0], palette.navy, 0.04);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      box(g, [0.3, h, 0.3], [(sx * w) / 2, h / 2, (sz * d) / 2], palette.blue, 0.06);
  box(g, [w - 0.4, 0.05, d - 0.4], [0, h + 0.03, 0], '#eef1f9', 0);
  for (let x = -w / 2 + 1.6; x < w / 2 - 1; x += 2.1)
    for (const z of [-d / 4, d / 4 - 0.6]) roofUnit(g, x, h + 0.05, z);
  const cx = b.rect.x + b.rect.w / 2;
  for (const [i, dx] of docks.pendingin.map((x, index) => [index, x - cx])) {
    for (const side of [-1, 1])
      box(g, [0.28, 3.2, 0.28], [dx + side * 1.45, 1.6 + 1.1, front + 0.14], palette.blue, 0.04);
    box(g, [3.2, 0.3, 0.28], [dx, 4.35, front + 0.14], palette.blue, 0.04);
    box(g, [2.6, 3.0, 0.06], [dx, 2.6, front + 0.04], '#c9d3e6', 0);
    box(g, [2.6, 1.0, 0.06], [dx, 3.6, front + 0.09], '#aab6cc', 0);
    badge(g, String(i + 1), [dx, 4.85, front + 0.06], 0.6);
  }
  badge(g, '❄', [w / 2 - 1.6, h - 1.4, front + 0.06], 0.9, palette.pastelSky);
  sign(g, 'COLD STORAGE', [-w / 2 + 3.4, h - 1.4, front + 0.06], 4.6, palette.navy);
  return g;
}

/**
 * Kavling unit yang belum punya gerai, atau gerai berstatus rencana/persiapan:
 * kosong = alas bergaris putus-putus; pondasi = tiang; rangka = rangka baja.
 */
export function plannedLot(
  parent: THREE.Object3D,
  b: DistrictBuilding,
  id: string,
  stage: 'kosong' | 'pondasi' | 'rangka',
) {
  const { g, w, d } = frame(parent, b, id);
  box(g, [w, 0.12, d], [0, 0.06, 0], stage === 'kosong' ? '#dfe7f8' : '#cfd6e4', 0.06);
  const dash = 0.9;
  for (const side of [-1, 1]) {
    for (let x = -w / 2; x + dash <= w / 2; x += dash * 2)
      box(g, [dash, 0.03, 0.1], [x + dash / 2, 0.14, (side * d) / 2 - side * 0.15], '#9db3e6', 0);
    for (let z = -d / 2; z + dash <= d / 2; z += dash * 2)
      box(g, [0.1, 0.03, dash], [(side * w) / 2 - side * 0.15, 0.14, z + dash / 2], '#9db3e6', 0);
  }
  if (stage !== 'kosong') {
    const xs = [-w / 2 + 0.6, 0, w / 2 - 0.6];
    for (const x of xs)
      for (const z of [-d / 2 + 0.6, d / 2 - 0.6])
        box(
          g,
          stage === 'pondasi' ? [0.2, 0.9, 0.2] : [0.26, b.height, 0.26],
          [x, stage === 'pondasi' ? 0.55 : b.height / 2, z],
          stage === 'pondasi' ? '#a58f78' : '#9aa9c4',
          0,
        );
    if (stage === 'rangka') {
      for (const z of [-d / 2 + 0.6, d / 2 - 0.6])
        box(g, [w - 1, 0.2, 0.2], [0, b.height, z], '#9aa9c4', 0);
      for (const x of xs) box(g, [0.2, 0.2, d - 1], [x, b.height, 0], '#9aa9c4', 0);
    } else box(g, [1.2, 0.6, 0.9], [w / 4, 0.42, 0], palette.cardboard, 0.06);
  }
  // Papan rencana kecil di sudut depan.
  box(g, [0.1, 1.3, 0.1], [-w / 2 + 0.8, 0.75, d / 2 - 0.4], palette.ink, 0);
  sign(
    g,
    stage === 'kosong' ? `RENCANA · ${b.name.toUpperCase()}` : b.name.toUpperCase(),
    [-w / 2 + 2.6, 1.3, d / 2 - 0.36],
    3.6,
    palette.navy,
  );
  return g;
}
