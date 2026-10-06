import * as THREE from 'three';
import { coldInterior } from '../layout';
import { coldRackIds, isBelowMinimum, type InventorySummary } from '../world-model';
import { box, mergeStatic, mergeTransparent, palette, sign } from './primitives';
import { forklift, markingRect } from './props';

const levels = [0.2, 1.15, 2.1];
const slotsPerLevel = 4;

/**
 * Rak pendingin: rangka putih bertiang biru, tingkat berlapis kawat, wadah biru muda.
 * Setiap barang dengan kolom Rak = C1/C2/C3 menjadi satu wadah; di bawah minimum lebih pendek.
 */
function coldRack(
  parent: THREE.Object3D,
  id: string,
  x: number,
  z: number,
  items: InventorySummary['items'],
) {
  const g = new THREE.Group();
  g.userData.selection = `rak-${id}`;
  parent.add(g);
  const [w, h, d] = coldInterior.rackSize;
  for (const dx of [-w / 2, w / 2])
    for (const dz of [-d / 2, d / 2])
      box(g, [0.14, h, 0.14], [x + dx, h / 2, z + dz], palette.blue, 0.04);
  for (const y of levels) box(g, [w, 0.08, d], [x, y, z], '#e7edf9', 0.02);
  box(g, [w + 0.2, 0.14, d + 0.2], [x, h, z], palette.navy, 0.04);
  const slot = w / slotsPerLevel;
  items.slice(0, levels.length * slotsPerLevel).forEach((item, index) => {
    const level = Math.floor(index / slotsPerLevel);
    const low = isBelowMinimum(item);
    const height = low ? 0.32 : 0.62;
    box(
      g,
      [slot - 0.22, height, d - 0.3],
      [x - w / 2 + slot * ((index % slotsPerLevel) + 0.5), levels[level] + 0.04 + height / 2, z],
      index % 2 ? '#5f8ff0' : '#8fb0f6',
      0.08,
    );
  });
  mergeStatic(g);
}

/**
 * Interior cold storage (cutaway): lantai epoksi biru pucat, dinding panel putih dengan lis
 * biru, tirai PVC transparan di pintu dok, rak pendingin C1–C3 dari data Barang, area
 * penerimaan dan forklift. Panel suhu sengaja tanpa angka: suhu belum dicatat aplikasi.
 */
export function createColdStorageInterior(parent: THREE.Group, inventory: InventorySummary) {
  const scenery = new THREE.Group();
  parent.add(scenery);
  const [w, d] = coldInterior.size;
  box(scenery, [w + 0.6, 0.3, d + 0.6], [0, -0.2, 0], '#d3ddf0', 0.12);
  box(scenery, [w, 0.05, d], [0, -0.02, 0], '#e3ecfb', 0);
  box(scenery, [w, 4.4, 0.3], [0, 2.2, -d / 2], '#f5f8ff', 0.04);
  box(scenery, [0.3, 4.4, d], [-w / 2, 2.2, 0], '#eef3fd', 0.04);
  for (let x = -w / 2 + 1.5; x < w / 2; x += 1.5)
    box(scenery, [0.05, 4.2, 0.06], [x, 2.2, -d / 2 + 0.18], '#dbe5f7', 0);
  box(scenery, [w, 0.4, 0.34], [0, 4.4, -d / 2], palette.navy, 0.04);
  box(scenery, [0.34, 0.4, d], [-w / 2, 4.4, 0], palette.navy, 0.04);
  // Unit pendingin (evaporator) di dinding belakang.
  for (const x of [-5.5, 0, 5.5]) {
    box(scenery, [2.2, 0.7, 0.6], [x, 3.6, -d / 2 + 0.5], '#ffffff', 0.12);
    for (const dx of [-0.5, 0.5])
      box(scenery, [0.6, 0.6, 0.04], [x + dx, 3.6, -d / 2 + 0.82], '#b9c7e2', 0.2);
  }
  // Panel suhu: tampilan kosong (tanpa angka karangan).
  box(scenery, [1.6, 1, 0.08], [-w / 2 + 0.2, 2.3, -2.4], palette.glassDark, 0.06);
  sign(scenery, 'SUHU BELUM DICATAT', [-w / 2 + 0.26, 2.3, -2.4], 1.4, palette.navy);
  // Pintu dok dari dalam pada dinding kiri dengan tirai PVC transparan.
  const curtains = new THREE.Group();
  for (const z of [-0.5, 3.2]) {
    box(scenery, [0.32, 3.4, 3], [-w / 2 + 0.05, 1.7, z], palette.blue, 0.04);
    box(scenery, [0.34, 3, 2.5], [-w / 2 + 0.1, 1.5, z], '#c9d4e8', 0);
    for (let i = 0; i < 6; i++)
      box(curtains, [0.04, 2.9, 0.38], [-w / 2 + 0.4, 1.55, z - 1.05 + i * 0.42], '#ffffff', 0);
  }
  box(scenery, [w - 1, 0.02, 0.12], [0, 0.02, -1.2], palette.marking, 0);
  const [rx, rz] = coldInterior.receiving;
  markingRect(scenery, rx, rz, 5.6, 3.4);
  forklift(scenery, -3, 3.4, Math.PI / 2);
  mergeStatic(scenery);
  mergeTransparent(curtains, '#dbe8ff', 0.45);
  scenery.add(curtains);
  for (const id of coldRackIds) {
    const [x, z] = coldInterior.racks[id];
    coldRack(parent, id, x, z, inventory.coldRacks[id]);
  }
}
