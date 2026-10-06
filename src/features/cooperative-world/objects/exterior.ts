import * as THREE from 'three';
import type { WorldModel } from '../world-model';
import { officePosition, officeSize, park, plotSize, roads, site } from '../layout';
import { box, mergeStatic, mergeTransparent, palette, sign } from './primitives';
import { bench, dropPin, fence, markingRect, streetLamp, tree } from './props';
import { building } from './office';
import { createLogisticsYard, createWarehouse } from './warehouse';
import { warehouse } from '../layout';

const asphalt = palette.asphalt;
const sidewalk = '#f7f9fe';

/**
 * Blok kota di luar pagar (utara dan barat, di belakang kawasan dari sudut kamera) memberi
 * kedalaman seperti video. Rendah di timur/selatan agar tidak menutupi kawasan.
 */
function cityBlocks(parent: THREE.Object3D) {
  const blocks: [number, number, number, number, number][] = [];
  for (let x = -44, i = 0; x <= 44; x += 9.5, i++) blocks.push([x, -31.5, 7, 5.5, 3 + ((i * 5) % 5)]);
  for (let z = -20, i = 0; z <= 26; z += 9.2, i++) blocks.push([-38.5, z, 5.5, 7, 2.5 + ((i * 3) % 4)]);
  for (let z = -18, i = 0; z <= 26; z += 11, i++) blocks.push([38, z, 5, 7.5, 1.2 + (i % 2) * 0.6]);
  for (let x = -26, i = 0; x <= 30; x += 14, i++) blocks.push([x, 31, 9, 4.5, 1 + (i % 2) * 0.5]);
  // Tanah kota sedikit di bawah tanah kawasan agar tepi kawasan tetap terbaca.
  box(parent, [130, 0.1, 120], [0, -0.13, 0], '#e2e8f5', 0);
  for (const [x, z, w, d, h] of blocks) {
    box(parent, [w, h, d], [x, h / 2, z], '#edf1fa', 0.05);
    box(parent, [w + 0.12, 0.2, d + 0.12], [x, h + 0.1, z], '#dbe3f3', 0.03);
    for (let y = 1; y < h - 0.4; y += 1.3) {
      box(parent, [w - 0.8, 0.55, 0.05], [x, y, z + d / 2 + 0.03], '#a9c4f2', 0);
      box(parent, [0.05, 0.55, d - 0.8], [x + w / 2 + 0.03, y, z], '#a9c4f2', 0);
    }
  }
  // Jalan kota di luar pagar barat dan utara.
  box(parent, [5, 0.03, 70], [-33.5, -0.06, 0], asphalt, 0);
  box(parent, [100, 0.03, 4], [0, -0.06, -27.5], asphalt, 0);
}

function emptyPlot(parent: THREE.Object3D, id: string, x: number, z: number) {
  const g = new THREE.Group();
  g.userData.selection = id;
  parent.add(g);
  const [w, d] = plotSize;
  box(g, [w, 0.055, d], [x, 0.015, z], '#d5e4dd');
  for (let i = 0; i < 9; i++)
    for (const side of [-1, 1])
      box(
        g,
        [0.38, 0.025, 0.05],
        [x - w / 2 + 0.35 + i * 0.71, 0.06, z + (side * d) / 2],
        '#ffffff',
        0,
      );
  for (const side of [-1, 1]) {
    box(g, [0.05, 0.025, d], [x + (side * w) / 2, 0.06, z], '#ffffff', 0);
    box(g, [0.08, 0.45, 0.08], [x + side * (w / 2 - 0.15), 0.22, z + d / 2 - 0.2], '#a3b9aa');
  }
  box(g, [0.7, 0.05, 0.11], [x, 0.07, z], '#94b09f');
  box(g, [0.11, 0.05, 0.7], [x, 0.07, z], '#94b09f');
  return g;
}

/** Jalan lurus searah sumbu X dengan marka putus-putus dan trotoar di kedua sisi. */
function roadX(
  parent: THREE.Object3D,
  z: number,
  width: number,
  fromX = site.minX,
  toX = site.maxX,
) {
  const length = toX - fromX,
    cx = (fromX + toX) / 2;
  box(parent, [length, 0.03, width], [cx, 0.005, z], asphalt, 0);
  for (let x = fromX + 1; x < toX - 1; x += 3)
    box(parent, [1.5, 0.015, 0.1], [x + 0.75, 0.025, z], '#f9fbff', 0);
  for (const side of [-1, 1])
    box(parent, [length, 0.1, 0.6], [cx, 0.05, z + side * (width / 2 + 0.3)], sidewalk, 0.02);
}
function roadZ(parent: THREE.Object3D, x: number, width: number, fromZ: number, toZ: number) {
  const length = toZ - fromZ,
    cz = (fromZ + toZ) / 2;
  box(parent, [width, 0.03, length], [x, 0.006, cz], asphalt, 0);
  for (let z = fromZ + 1; z < toZ - 1; z += 3)
    box(parent, [0.1, 0.015, 1.5], [x, 0.026, z + 0.75], '#f9fbff', 0);
}

export function createExterior(parent: THREE.Group, model: WorldModel) {
  const scenery = new THREE.Group();
  parent.add(scenery);
  const width = site.maxX - site.minX,
    depth = site.maxZ - site.minZ;
  box(scenery, [width + 2, 0.3, depth + 2], [0, -0.22, 0], '#d6deef', 0.15);
  box(scenery, [width, 0.08, depth], [0, -0.03, 0], palette.ground, 0);

  // Jalan: utama di utara, jalan dalam, boulevard gerai, jalan gerbang dan penghubung.
  roadX(scenery, roads.main.z, roads.main.width);
  roadX(scenery, roads.inner.z, roads.inner.width, site.minX + 2, site.maxX - 2);
  roadX(scenery, roads.boulevard.z, roads.boulevard.width);
  const innerEdge = roads.inner.z - roads.inner.width / 2;
  roadZ(scenery, roads.gate.x, roads.gate.width, roads.main.z + roads.main.width / 2, innerEdge);
  roadZ(
    scenery,
    -3,
    roads.gate.width,
    roads.inner.z + roads.inner.width / 2,
    roads.boulevard.z - roads.boulevard.width / 2,
  );
  // Pagar kaca keliling dengan bukaan gerbang, dan jalur rumput di kaki pagar (seperti video).
  const panels = new THREE.Group();
  const fenceZ = roads.main.z + roads.main.width / 2 + 0.9;
  const south = site.maxZ - 0.6;
  fence(scenery, [site.minX + 1, fenceZ], [roads.gate.x - 2.6, fenceZ], panels);
  fence(scenery, [roads.gate.x + 2.6, fenceZ], [site.maxX - 1, fenceZ], panels);
  for (const x of [site.minX + 0.6, site.maxX - 0.6]) {
    fence(scenery, [x, fenceZ], [x, roads.boulevard.z - 2.6], panels);
    fence(scenery, [x, roads.boulevard.z + 2.6], [x, south], panels);
  }
  fence(scenery, [site.minX + 0.6, south], [site.maxX - 0.6, south], panels);
  box(scenery, [width - 2, 0.04, 1.1], [0, 0.012, fenceZ + 0.75], palette.grass, 0);
  box(scenery, [width - 2, 0.04, 1.1], [0, 0.012, south - 0.75], palette.grass, 0);
  for (const x of [site.minX + 1.35, site.maxX - 1.35])
    box(scenery, [1.1, 0.04, south - fenceZ - 3], [x, 0.012, (south + fenceZ) / 2], palette.grass, 0);
  cityBlocks(scenery);

  createLogisticsYard(scenery);
  // Pin biru dari data nyata: barang di bawah minimum menandai area staging gudang.
  if (model.inventory.low.length) {
    const [sx, sz] = warehouse.staging;
    dropPin(scenery, sx - 1.2, 2.2, sz - 2.4);
  }

  // Plaza depan kantor dan taman titik kumpul.
  const [ox, oz] = officePosition;
  box(
    scenery,
    [officeSize.width + 3, 0.05, 2.2],
    [ox, 0.02, oz + officeSize.depth / 2 + 1.6],
    '#eef1f8',
    0,
  );
  const [px, pz] = park.center;
  const [pw, pd] = park.size;
  box(scenery, [pw, 0.06, pd], [px, 0.02, pz], '#cfe9d6', 0.04);
  box(scenery, [pw, 0.07, 1.1], [px, 0.03, pz], '#f2efe6', 0);
  box(scenery, [1.1, 0.07, pd], [px, 0.03, pz], '#f2efe6', 0);
  box(scenery, [3, 0.12, 3], [px, 0.06, pz], '#eef1f8', 0.3);
  for (const [dx, dz] of [
    [-5.5, -2.2],
    [5.5, -2.2],
    [-5.5, 2.2],
    [5.5, 2.2],
  ])
    tree(scenery, px + dx, pz + dz, 1.1);
  bench(scenery, px - 2.6, pz - 1.4);
  bench(scenery, px + 2.6, pz + 1.9);
  // Parkir mobil kecil di timur taman: hanya marka.
  for (let i = 0; i < 4; i++) markingRect(scenery, 22 + i * 2.2, 7.2, 2, 4.4, palette.white, 0.07);

  // Pohon ditanam berbaris teratur: tepi boulevard, kaki pagar barat/timur dan utara.
  const busy = (x: number) => Math.abs(x - roads.gate.x) < 3.5 || Math.abs(x + 3) < 3;
  for (let x = site.minX + 2; x <= site.maxX - 2; x += 4)
    if (!busy(x)) tree(scenery, x, roads.boulevard.z - roads.boulevard.width / 2 - 1.1, 0.85);
  for (let x = site.minX + 3; x <= site.maxX - 3; x += 5)
    if (Math.abs(x - roads.gate.x) > 4) tree(scenery, x, site.minZ + 0.9, 0.9);
  for (const z of [-6, -1, 4, 9]) {
    tree(scenery, site.minX + 1.4, z, 0.95);
    tree(scenery, site.maxX - 1.4, z, 0.95);
  }
  for (const [x, , z] of lampHeads()) streetLamp(scenery, x - 0.22, z);
  mergeStatic(scenery);
  mergeTransparent(panels, '#dfe8f8', 0.38);
  scenery.add(panels);
  noticeBoard(parent);

  // Objek yang dapat diklik digabung per objek agar raycast tetap mengenali pilihannya.
  mergeStatic(building(parent, ox, oz, 'Koperasi', true));
  mergeStatic(createWarehouse(parent));
  for (const plot of model.plots) {
    const [x, z] = plot.position;
    const status = String(plot.unit?.data.status || '');
    mergeStatic(
      !plot.unit
        ? emptyPlot(parent, plot.id, x, z)
        : status === 'rencana' || status === 'persiapan'
          ? construction(
              parent,
              plot.id,
              x,
              z,
              status === 'rencana' ? 'pondasi' : 'rangka',
              String(plot.unit.data.title),
            )
          : building(parent, x, z, String(plot.unit.data.title), false, plot.id),
    );
  }
}

/** Posisi kepala lampu jalan [x, y, z]; dipakai untuk tiang dan cahaya malam. */
export function lampHeads(): [number, number, number][] {
  return [
    ...[-26, -12, 4, 18, 28].map(
      (x) => [x + 0.22, 3.12, roads.boulevard.z + 2.3] as [number, number, number],
    ),
    ...[-26, -8, 8, 24].map(
      (x) => [x + 0.22, 3.12, roads.inner.z + 2.3] as [number, number, number],
    ),
  ];
}

/**
 * Gerai belum jadi tampil bertahap sesuai status catatan Gerai: rencana = pondasi,
 * persiapan = rangka. Status siap uji ke atas memakai bangunan lengkap.
 */
function construction(
  parent: THREE.Object3D,
  id: string,
  x: number,
  z: number,
  stage: 'pondasi' | 'rangka',
  title: string,
) {
  const g = new THREE.Group();
  g.userData.selection = id;
  parent.add(g);
  box(g, [4.4, 0.25, 3.2], [x, 0.13, z], '#c9cfd9', 0.03);
  const corners = [-1.9, 0, 1.9].flatMap((dx) => [-1.3, 1.3].map((dz) => [x + dx, z + dz]));
  for (const [cx, cz] of corners)
    box(
      g,
      stage === 'pondasi' ? [0.1, 0.8, 0.1] : [0.18, 2.3, 0.18],
      [cx, stage === 'pondasi' ? 0.65 : 1.4, cz],
      stage === 'pondasi' ? '#8a6f55' : '#9aa6bb',
      0,
    );
  if (stage === 'rangka') {
    for (const dz of [-1.3, 1.3]) box(g, [4, 0.16, 0.16], [x, 2.5, z + dz], '#9aa6bb', 0);
    for (const dx of [-1.9, 1.9]) box(g, [0.16, 0.16, 2.8], [x + dx, 2.5, z], '#9aa6bb', 0);
    box(g, [4, 2.2, 0.1], [x, 1.35, z - 1.3], palette.white, 0);
  } else box(g, [1, 0.5, 0.8], [x + 1.2, 0.5, z + 0.6], palette.cardboard, 0.05);
  box(g, [0.08, 1, 0.08], [x - 1.6, 0.6, z + 1.9], palette.ink, 0);
  sign(g, title, [x - 0.4, 1.15, z + 1.92], 2.6, palette.navy);
  return g;
}

/** Papan pengumuman di taman: isi dari keputusan rapat dan dokumen (lihat kartu detail). */
function noticeBoard(parent: THREE.Object3D) {
  const [px, pz] = park.center;
  const g = new THREE.Group();
  g.userData.selection = 'papan';
  parent.add(g);
  const z = pz - park.size[1] / 2 + 0.6;
  for (const dx of [-1.2, 1.2]) box(g, [0.12, 2.2, 0.12], [px + 5 + dx, 1.1, z], palette.ink, 0);
  box(g, [2.8, 1.5, 0.12], [px + 5, 1.8, z], palette.navy, 0.04);
  box(g, [2.5, 1.2, 0.04], [px + 5, 1.8, z + 0.07], palette.white, 0);
  sign(g, 'PENGUMUMAN', [px + 5, 2.25, z + 0.1], 2.2, palette.navy);
  for (const dy of [0, -0.3]) box(g, [1.8, 0.08, 0.02], [px + 5, 1.75 + dy, z + 0.1], '#c9d3e6', 0);
  mergeStatic(g);
}

/** Cahaya malam: kepala lampu jalan dan jendela kantor. Disembunyikan siang hari. */
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
  // Pita jendela kantor dua lantai (lihat building di office.ts).
  const half = officeSize.width / 2;
  const panes: [number, number, number][] = [
    [0, 2.75, officeSize.width - 0.9],
    [-(half + 0.5) / 2, 1.25, half - 1.4],
    [(half + 0.5) / 2, 1.25, half - 1.4],
  ];
  for (const [x, y, width] of panes) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.85), glow);
    mesh.position.set(ox + x, y, oz + officeSize.depth / 2 + 0.12);
    g.add(mesh);
  }
  return g;
}
