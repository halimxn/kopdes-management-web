import * as THREE from 'three';
import { containerSpot, gate, truckBays, warehouse } from '../layout';
import { badge, box, cylinder, gable, palette, sign } from './primitives';
import {
  cardboardPallet,
  charger,
  container,
  dashedLineX,
  forklift,
  markingRect,
  palletRack,
  roofUnit,
} from './props';

const plinth = 0.25;

/** Satu bidang atap miring bergaris; `side` +1 = menghadap selatan (depan), −1 = utara. */
function roofSlope(parent: THREE.Object3D, side: 1 | -1) {
  const [w, h, d] = warehouse.size;
  const rise = warehouse.roofRise;
  const run = d / 2 + 0.6;
  const length = Math.hypot(run, rise);
  const slope = new THREE.Group();
  slope.position.set(0, plinth + h + rise / 2 + 0.1, (side * run) / 2);
  slope.rotation.x = side * Math.atan2(rise, run);
  parent.add(slope);
  box(slope, [w + 0.8, 0.22, length], [0, 0, 0], palette.blue, 0.02);
  // Gelombang atap: garis lebih gelap searah kemiringan.
  for (let x = -w / 2; x <= w / 2; x += 0.7)
    box(slope, [0.09, 0.05, length - 0.1], [x, 0.135, 0], palette.blueDeep, 0);
  // Papan tepi pelana di kedua ujung.
  for (const end of [-1, 1])
    box(slope, [0.26, 0.34, length + 0.05], [end * (w / 2 + 0.42), 0.02, 0], palette.navy, 0);
  return { slope, length };
}

/** Pintu dok: kusen biru, ambang terang, pintu gulung setengah terbuka, palet di ambang, nomor. */
function dockDoor(parent: THREE.Object3D, x: number, front: number, index: number) {
  const top = plinth + 3.55;
  for (const side of [-1, 1])
    box(parent, [0.32, 3.55, 0.32], [x + side * 1.56, plinth + 1.775, front + 0.16], palette.blue, 0.03);
  box(parent, [3.44, 0.36, 0.32], [x, top + 0.18, front + 0.16], palette.blue, 0.03);
  // Ambang pintu: bagian dalam gudang yang terang (bukan lubang gelap) seperti video.
  box(parent, [2.8, 3.5, 0.06], [x, plinth + 1.75, front + 0.04], '#cdd5e3', 0);
  // Pintu gulung terangkat: panel abu bergaris.
  box(parent, [2.8, 1.05, 0.06], [x, top - 0.52, front + 0.1], '#b4bfd1', 0);
  for (const dy of [-0.3, 0, 0.3])
    box(parent, [2.8, 0.03, 0.03], [x, top - 0.52 + dy, front + 0.145], '#9aa7bd', 0);
  // Perata dok dan bantalan karet; truk dari data berhenti tepat di depannya (truckPose).
  box(parent, [2.7, 0.22, 0.6], [x, 0.12, front + 0.55], '#a3aec2', 0.02);
  for (const side of [-1, 1])
    box(parent, [0.22, 0.42, 0.26], [x + side * 1.3, 0.62, front + 0.43], palette.tyre, 0.03);
  // Palet di ambang pintu: pemandangan, bukan stok tercatat.
  const goods = new THREE.Group();
  goods.position.set(x - 0.3 + (index % 2) * 0.6, 0.23, front + 0.45);
  goods.scale.setScalar(0.86);
  parent.add(goods);
  cardboardPallet(goods, 0, 0, 2, index === 2);
  badge(parent, String(index + 1), [x, top + 0.78, front + 0.06], 0.78);
}

/**
 * Gudang koperasi meniru gudang dok pada video acuan: dinding bergelombang putih-kebiruan,
 * atap pelana biru bergaris, kolom sudut biru, empat pintu dok bernomor dengan palet di ambang,
 * unit pendingin dan logo bulat di atap. Satu objek yang dapat diklik (`gudang`).
 */
export function createWarehouse(parent: THREE.Object3D) {
  const [cx, cz] = warehouse.center;
  const [w, h, d] = warehouse.size;
  const rise = warehouse.roofRise;
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.userData.selection = 'gudang';
  parent.add(g);
  const front = d / 2;
  box(g, [w + 1.4, plinth, d + 1.4], [0, plinth / 2, 0], '#e3e9f4', 0.05);
  box(g, [w, h, d], [0, plinth + h / 2, 0], palette.wall, 0.03);
  for (const end of [-1, 1])
    gable(g, d, rise + 0.1, 0.3, [end * (w / 2 - 0.15), plinth + h, 0], palette.wall);
  const doors = warehouse.docks.map((x) => x - cx);
  const nearDoor = (x: number) => doors.some((door) => Math.abs(x - door) < 1.75);
  // Gelombang dinding pada dua sisi yang dilihat kamera (selatan dan timur).
  for (let x = -w / 2 + 0.4; x < w / 2 - 0.2; x += 0.42)
    if (!nearDoor(x))
      box(g, [0.07, h - 0.25, 0.05], [x, plinth + h / 2, front + 0.025], palette.rib, 0);
  for (let z = -d / 2 + 0.4; z < d / 2 - 0.2; z += 0.42)
    box(g, [0.05, h - 0.25, 0.07], [w / 2 + 0.025, plinth + h / 2, z], palette.rib, 0);
  // Kolom sudut dan lis atas biru tua.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      box(g, [0.46, h, 0.46], [(sx * w) / 2, plinth + h / 2, (sz * d) / 2], palette.blue, 0.04);
  box(g, [w + 0.5, 0.34, 0.3], [0, plinth + h - 0.1, front + 0.12], palette.navy, 0.02);
  box(g, [0.3, 0.34, d + 0.5], [w / 2 + 0.12, plinth + h - 0.1, 0], palette.navy, 0.02);
  const southRoof = roofSlope(g, 1);
  const northRoof = roofSlope(g, -1);
  box(g, [w + 1, 0.26, 0.55], [0, plinth + h + rise + 0.18, 0], palette.navy, 0.04);
  // Logo bulat di atap depan dan unit pendingin di atap belakang (seperti video).
  cylinder(southRoof.slope, 1.05, 0.05, [-4.5, 0.15, 0], '#f4f7ff');
  cylinder(southRoof.slope, 0.62, 0.06, [-4.5, 0.17, 0], palette.blue);
  cylinder(southRoof.slope, 0.24, 0.07, [-4.5, 0.19, 0], '#f4f7ff');
  for (const x of [-9, -7, -1, 1, 6, 8.2]) roofUnit(northRoof.slope, x, 0.11, -0.4);
  doors.forEach((x, index) => dockDoor(g, x, front, index));
  // Papan nama di sisi kanan dinding depan, setelah pintu terakhir.
  badge(g, 'K', [w / 2 - 4.9, plinth + 4.1, front + 0.1], 0.62);
  sign(g, 'GUDANG KOPERASI', [w / 2 - 2.4, plinth + 4.1, front + 0.1], 3.9, palette.navy);
  return g;
}

/** Halaman dok, staging, rak luar, pengisian forklift, gerbang dan petak antre. Pemandangan statis. */
export function createLogisticsYard(parent: THREE.Object3D) {
  const [cx, cz] = warehouse.center;
  const [w, , d] = warehouse.size;
  const front = cz + d / 2;
  const apronZ = front + warehouse.apronDepth / 2 + 0.7;
  box(parent, [w + 4, 0.04, warehouse.apronDepth + 1.4], [cx, 0.012, apronZ - 0.7], '#e2e8f4', 0);
  for (const x of warehouse.docks) markingRect(parent, x, apronZ + 0.3, 3.1, warehouse.apronDepth - 1.4);
  dashedLineX(parent, cx - w / 2 - 1.5, cx + w / 2 + 1.5, front + 1.75);
  box(parent, [w + 4, 0.02, 0.1], [cx, 0.035, front + warehouse.apronDepth + 0.6], palette.marking, 0);
  // Staging: bantalan bergaris kuning berisi palet kardus dan kemasan biru.
  const [sx, sz] = warehouse.staging;
  markingRect(parent, sx, sz, 5, 7.5);
  for (const dz of [-2.4, 0, 2.4]) markingRect(parent, sx, sz + dz, 4.4, 2, '#f7d77a', 0.05);
  cardboardPallet(parent, sx - 1.2, sz - 2.4, 2);
  cardboardPallet(parent, sx + 1.2, sz - 2.4, 1);
  cardboardPallet(parent, sx - 1.2, sz, 2, true);
  cardboardPallet(parent, sx + 1.2, sz, 1);
  cardboardPallet(parent, sx + 1.2, sz + 2.4, 2, true);
  const [rx, rz] = warehouse.outdoorRack;
  palletRack(parent, rx, rz, 2);
  // Area pengisian daya forklift di barat gudang: bantalan hijau, lemari pengisi, forklift berjajar.
  const fx = cx - w / 2 - 2.9;
  box(parent, [4.2, 0.03, 4.8], [fx, 0.02, cz - 1.2], '#d4f0de', 0);
  markingRect(parent, fx, cz - 1.2, 4.2, 4.8, '#8fd6a8', 0.06);
  for (const [i, dz] of [-3.0, -1.6, -0.2].entries()) {
    charger(parent, fx - 1.6, cz + dz - 0.3);
    if (i < 2) forklift(parent, fx + 0.4, cz + dz - 0.3, -Math.PI / 2);
  }
  // Gerbang masuk berpalang merah-putih dan pos jaga berkaca.
  for (const side of [-1, 1])
    box(parent, [0.45, 1.6, 0.45], [gate.x + side * 2.2, 0.8, gate.z], palette.navy, 0.04);
  box(parent, [4, 0.12, 0.12], [gate.x - 0.1, 1.05, gate.z], '#f4f6fa', 0);
  for (let i = 0; i < 4; i++)
    box(parent, [0.45, 0.13, 0.14], [gate.x - 1.6 + i * 1, 1.05, gate.z], '#e2534f', 0);
  const [px, pz] = gate.guardPost;
  box(parent, [2.2, 2, 2], [px, 1, pz], palette.white, 0.05);
  box(parent, [2.6, 0.2, 2.4], [px, 2.1, pz], palette.blue, 0.04);
  box(parent, [1.4, 0.7, 0.06], [px, 1.3, pz + 1.02], palette.glass, 0);
  // Petak antre truk: hanya marka; truk muncul dari data Pengiriman.
  for (const [x, z] of truckBays) markingRect(parent, x, z, 2.6, 7.4, palette.white, 0.07);
  container(parent, containerSpot[0], containerSpot[1]);
}
