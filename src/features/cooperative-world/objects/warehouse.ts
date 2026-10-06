import * as THREE from 'three';
import { allBuildings, docks, logisticsYard } from '../district';
import { gate, warehouse } from '../layout';
import type { WorldModel } from '../world-model';
import { badge, box, gable, palette, sign } from './primitives';
import {
  cardboardPallet,
  charger,
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

/**
 * Pintu dok di atas lantai dok yang ditinggikan (video WH-04/WH-03): kusen biru, ambang terang,
 * pintu gulung setengah terbuka, palet di ambang, nomor dok, bantalan karet di muka lantai dok.
 */
function dockDoor(parent: THREE.Object3D, x: number, front: number, index: number) {
  const sill = docks.platformHeight;
  const top = sill + 3.3;
  for (const side of [-1, 1])
    box(
      parent,
      [0.34, 3.3, 0.34],
      [x + side * 1.56, sill + 1.65, front + 0.16],
      palette.blue,
      0.06,
    );
  box(parent, [3.46, 0.38, 0.34], [x, top + 0.19, front + 0.16], palette.blue, 0.06);
  // Ambang pintu: bagian dalam gudang yang terang (bukan lubang gelap) seperti video.
  box(parent, [2.8, 3.25, 0.06], [x, sill + 1.62, front + 0.04], '#cdd5e3', 0);
  // Pintu gulung terangkat: panel abu bergaris.
  box(parent, [2.8, 1.0, 0.06], [x, top - 0.5, front + 0.1], '#b4bfd1', 0);
  for (const dy of [-0.3, 0, 0.3])
    box(parent, [2.8, 0.03, 0.03], [x, top - 0.5 + dy, front + 0.145], '#9aa7bd', 0);
  // Bantalan karet di muka lantai dok; truk dari data berhenti tepat di depannya (truckPose).
  for (const side of [-1, 1])
    box(
      parent,
      [0.26, 0.5, 0.24],
      [x + side * 1.25, sill - 0.35, front + docks.platformDepth + 0.1],
      palette.tyre,
      0.05,
    );
  box(
    parent,
    [2.4, 0.06, 0.5],
    [x, sill + 0.03, front + docks.platformDepth - 0.25],
    '#9aa6bb',
    0.02,
  );
  // Palet di ambang pintu: pemandangan, bukan stok tercatat.
  const goods = new THREE.Group();
  goods.position.set(x - 0.3 + (index % 2) * 0.6, sill, front + 0.75);
  goods.scale.setScalar(0.82);
  parent.add(goods);
  cardboardPallet(goods, 0, 0, index % 2 ? 1 : 2, index === 2);
  badge(parent, String(index + 1), [x, top + 0.75, front + 0.06], 0.72);
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
  // Deretan skylight (panel atap terang) di atap depan dan unit pendingin di atap belakang.
  for (const x of [-8.4, -4.2, 0, 4.2, 8.4]) {
    box(southRoof.slope, [1.5, 0.05, southRoof.length * 0.62], [x, 0.17, 0.1], '#2f58e6', 0);
    box(southRoof.slope, [1.3, 0.05, southRoof.length * 0.58], [x, 0.19, 0.1], '#d9e6ff', 0);
  }
  for (const x of [-9, -7, -1, 1, 6, 8.2]) roofUnit(northRoof.slope, x, 0.11, -0.4);
  doors.forEach((x, index) => dockDoor(g, x, front, index));
  // Papan nama di sisi kanan dinding depan, setelah pintu terakhir.
  badge(g, 'K', [w / 2 - 4.9, plinth + 4.1, front + 0.1], 0.62);
  sign(g, 'GUDANG KOPERASI', [w / 2 - 2.4, plinth + 4.1, front + 0.1], 3.9, palette.navy);
  return g;
}

/**
 * Halaman logistik bersama gudang dan cold storage: lantai dok ditinggikan bertepi kuning,
 * petak dok, garis kuning putus-putus, staging berisi kardus sebanyak barang yang belum
 * punya rak (data Barang), rak palet luar, area cas forklift, gerbang berpalang dan pos jaga.
 */
export function createLogisticsYard(parent: THREE.Object3D, model: WorldModel) {
  const wallZ = docks.wallZ;
  const edge = wallZ + docks.platformDepth;
  // Lantai dok cold storage hanya bila bangunannya sudah berdiri (gerai berjenis cold storage).
  const cold = model.plots.find((plot) => plot.id === 'cold-storage');
  const coldBuilt =
    Boolean(cold?.unit) && !['rencana', 'persiapan'].includes(String(cold?.unit?.data.status));
  for (const b of allBuildings().filter(
    (item) => item.id === 'gudang' || (coldBuilt && item.id === 'cold-storage'),
  )) {
    const x = b.rect.x + b.rect.w / 2;
    box(
      parent,
      [b.rect.w, docks.platformHeight, docks.platformDepth],
      [x, docks.platformHeight / 2, wallZ + docks.platformDepth / 2],
      '#c9d2ec',
      0.08,
    );
    box(
      parent,
      [b.rect.w, 0.04, 0.22],
      [x, docks.platformHeight + 0.02, edge - 0.12],
      palette.marking,
      0,
    );
    box(
      parent,
      [b.rect.w, 0.16, 0.04],
      [x, docks.platformHeight - 0.1, edge + 0.01],
      palette.marking,
      0,
    );
    // Tangga kecil di ujung barat lantai dok.
    for (let i = 0; i < 3; i++)
      box(
        parent,
        [0.9, docks.platformHeight * ((i + 1) / 4), 0.5],
        [b.rect.x - 0.5, (docks.platformHeight * ((i + 1) / 4)) / 2, edge - 0.35 - i * 0.5],
        '#d3dbef',
        0.03,
      );
  }
  for (const x of [...docks.gudang, ...(coldBuilt ? docks.pendingin : [])])
    markingRect(parent, x, edge + 3.4, 3.4, 6.6);
  const lane = logisticsYard.lane;
  dashedLineX(parent, lane.x + 0.5, lane.x + lane.w - 0.5, lane.z + lane.d);
  // Staging: kardus muncul hanya bila ada barang tanpa rak dan tanpa gerai (maks. 8 palet).
  const st = logisticsYard.staging;
  markingRect(parent, st.x + st.w / 2, st.z + st.d / 2, st.w, st.d);
  const waiting = Math.min(8, model.inventory.staging.length);
  for (let i = 0; i < waiting; i++)
    cardboardPallet(
      parent,
      st.x + 2 + (i % 4) * 4,
      st.z + 2 + Math.floor(i / 4) * 3.4,
      1 + (i % 2),
      i % 3 === 2,
    );
  const rack = new THREE.Group();
  rack.position.set(
    logisticsYard.rack.x + logisticsYard.rack.w / 2,
    0,
    logisticsYard.rack.z + logisticsYard.rack.d / 2,
  );
  rack.rotation.y = Math.PI / 2;
  parent.add(rack);
  palletRack(rack, -1.6, 0, 2);
  palletRack(rack, 1.6, 0, 2);
  // Area cas forklift: bantalan hijau pastel, lemari pengisi, dua forklift parkir.
  const ch = logisticsYard.charging;
  box(parent, [ch.w, 0.05, ch.d], [ch.x + ch.w / 2, 0.15, ch.z + ch.d / 2], '#d4f0de', 0.1);
  markingRect(parent, ch.x + ch.w / 2, ch.z + ch.d / 2, ch.w, ch.d, '#8fd6a8', 0.06);
  for (const [i, dz] of [1.6, 3.8, 6].entries()) {
    charger(parent, ch.x + 0.6, ch.z + dz);
    if (i < 2) forklift(parent, ch.x + 2.6, ch.z + dz, -Math.PI / 2);
  }
  // Gerbang barang berpalang merah-putih dan pos jaga berkaca.
  box(parent, [7, 0.12, 0.12], [gate.x, 1.05, gate.z], '#f4f6fa', 0);
  for (let i = 0; i < 7; i++)
    box(
      parent,
      [0.5, 0.13, 0.14],
      [gate.x - 3 + i, 1.05, gate.z],
      i % 2 ? '#f4f6fa' : '#e2534f',
      0,
    );
  const [px, pz] = gate.guardPost;
  box(parent, [2.4, 2.2, 2.2], [px, 1.1, pz], palette.white, 0.2);
  box(parent, [2.9, 0.24, 2.7], [px, 2.32, pz], palette.blue, 0.1);
  box(parent, [1.6, 0.8, 0.06], [px, 1.4, pz + 1.12], palette.glass, 0);
}
