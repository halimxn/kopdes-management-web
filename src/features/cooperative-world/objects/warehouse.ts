import * as THREE from 'three';
import { gate, truckBays, warehouse } from '../layout';
import { box, cylinder, palette, sign } from './primitives';
import { cardboardPallet, forklift, markingRect } from './props';

/** Gedung gudang bergaya video acuan: dinding bergaris, atap biru, empat pintu dok di sisi selatan. */
export function createWarehouse(parent: THREE.Object3D) {
  const [cx, cz] = warehouse.center;
  const [w, h, d] = warehouse.size;
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.userData.selection = 'gudang';
  parent.add(g);
  const front = d / 2;
  box(g, [w + 1.2, 0.2, d + 1.2], [0, 0.1, 0], '#f2f5fb', 0.05);
  box(g, [w, h, d], [0, h / 2 + 0.2, 0], '#eef2f9', 0.04);
  // Garis dinding bergelombang pada sisi yang terlihat kamera.
  for (let x = -w / 2 + 0.6; x < w / 2; x += 0.7)
    box(g, [0.08, h - 0.4, 0.06], [x, h / 2 + 0.1, front + 0.03], '#dde3ef', 0);
  for (let z = -d / 2 + 0.6; z < d / 2; z += 0.7)
    box(g, [0.06, h - 0.4, 0.08], [w / 2 + 0.03, h / 2 + 0.1, z], '#dde3ef', 0);
  for (const side of [-1, 1]) {
    box(g, [0.3, h + 0.2, 0.3], [side * (w / 2), h / 2 + 0.2, front], palette.blue, 0.03);
    const roof = box(g, [w + 0.6, 0.28, d / 2 + 0.5], [0, h + 0.55, (side * d) / 4], palette.blue);
    roof.rotation.x = side * 0.1;
  }
  box(g, [w + 0.2, 0.42, 0.14], [0, h + 0.05, front + 0.05], palette.navy, 0.02);
  box(g, [0.3, h + 0.2, 0.3], [w / 2, h / 2 + 0.2, -d / 2], palette.blue, 0.03);
  for (const [x, z] of [
    [-7, -2],
    [-4.5, -2],
    [-2, -2],
    [6, -1.5],
    [8.5, -1.5],
  ])
    cylinder(g, 0.35, 0.35, [x, h + 1.05, z], '#f4f6fa');
  for (const [index, x] of warehouse.docks.map((value, i) => [i, value - cx])) {
    // Lapisan pintu diberi kedalaman berbeda; permukaan sebidang menimbulkan garis berkedip (z-fighting).
    // Bingkai: dua tiang dan ambang atas, menonjol paling depan (wajah depan front + 0,24).
    for (const side of [-1, 1])
      box(g, [0.22, 3.75, 0.24], [x + side * 1.44, 1.98, front + 0.12], palette.navy, 0);
    box(g, [3.1, 0.3, 0.24], [x, 3.7, front + 0.12], palette.navy, 0);
    // Bukaan gelap menutup garis dinding (wajah depan front + 0,16), sedikit lebih sempit dari bingkai.
    box(g, [2.6, 3.5, 0.14], [x, 1.85, front + 0.09], '#6d7b96', 0);
    // Pintu gulung yang terangkat sebagian (front + 0,17 sampai 0,21).
    box(g, [2.6, 1.05, 0.04], [x, 3.0, front + 0.19], '#c8d2e4', 0);
    box(g, [2.8, 0.18, 1.1], [x, 0.35, front + 0.6], '#9aa6bb', 0.02);
    for (const side of [-1, 1])
      box(g, [0.2, 0.5, 0.3], [x + side * 1.2, 0.6, front + 0.2], '#2b3245');
    sign(g, `D${index + 1}`, [x, 4.25, front + 0.1], 0.9, palette.blue);
  }
  sign(g, 'GUDANG KOPERASI', [-1.5, h - 0.6, front + 0.12], 5.5, palette.navy);
  return g;
}

/** Halaman dok, area staging, forklift, gerbang dan parkir antre truk. Semua pemandangan statis. */
export function createLogisticsYard(parent: THREE.Object3D) {
  const [cx, cz] = warehouse.center;
  const front = cz + warehouse.size[2] / 2;
  const apronZ = front + warehouse.apronDepth / 2;
  box(
    parent,
    [warehouse.size[0] + 2, 0.04, warehouse.apronDepth],
    [cx, 0.01, apronZ],
    '#e1e7f3',
    0,
  );
  for (const x of warehouse.docks)
    markingRect(parent, x, apronZ + 0.2, 3, warehouse.apronDepth - 1.2);
  box(parent, [warehouse.size[0], 0.02, 0.12], [cx, 0.03, front + 1.4], palette.marking, 0);
  const [sx, sz] = warehouse.staging;
  markingRect(parent, sx, sz, 5, 7.5);
  cardboardPallet(parent, sx - 1.2, sz - 2.3, 2);
  cardboardPallet(parent, sx + 1.2, sz - 2.3, 1);
  cardboardPallet(parent, sx - 1.2, sz, 2, true);
  cardboardPallet(parent, sx + 1.2, sz + 2.3, 1, true);
  // Area pengisian daya forklift di barat gudang.
  const fx = cx - warehouse.size[0] / 2 - 2.8;
  box(parent, [4, 0.03, 4.6], [fx, 0.02, cz - 1], '#d7eedd', 0);
  for (const dz of [-2.4, -0.6]) {
    forklift(parent, fx + 0.3, cz + dz);
    box(parent, [0.5, 0.9, 0.4], [fx - 1.5, 0.45, cz + dz], '#f4f6fa', 0.05);
  }
  // Gerbang masuk dan pos jaga.
  for (const side of [-1, 1])
    box(parent, [0.45, 1.6, 0.45], [gate.x + side * 2.2, 0.8, gate.z], palette.navy, 0.04);
  box(parent, [4, 0.12, 0.12], [gate.x - 0.1, 1.05, gate.z], '#f4f6fa', 0);
  for (let i = 0; i < 4; i++)
    box(parent, [0.45, 0.13, 0.14], [gate.x - 1.6 + i * 1, 1.05, gate.z], '#e2534f', 0);
  const [px, pz] = gate.guardPost;
  box(parent, [2.2, 2, 2], [px, 1, pz], palette.white, 0.05);
  box(parent, [2.6, 0.2, 2.4], [px, 2.1, pz], palette.blue, 0.04);
  box(parent, [1.4, 0.7, 0.06], [px, 1.3, pz + 1.02], palette.glass, 0);
  // Petak antre truk: hanya marka; truk muncul dari data pengiriman pada paket berikutnya.
  for (const [x, z] of truckBays) markingRect(parent, x, z, 2.5, 7, palette.white, 0.07);
}
