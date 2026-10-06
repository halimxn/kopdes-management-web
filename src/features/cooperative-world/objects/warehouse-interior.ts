import * as THREE from 'three';
import { warehouseInterior } from '../layout';
import { isBelowMinimum, rackIds, type InventorySummary } from '../world-model';
import { box, mergeStatic, palette } from './primitives';
import { cardboardPallet, forklift, markingRect } from './props';

const levels = [0.18, 1.22, 2.26];
const slotsPerLevel = 4;

/**
 * Satu rak palet: tiang biru, balok oranye, tiga tingkat. Setiap barang tercatat di rak
 * menjadi satu kardus; barang di bawah minimum digambar setengah tinggi agar mudah dikenali.
 * Lebih dari 12 barang tidak menambah kardus (rak tampak penuh).
 */
function rack(
  parent: THREE.Object3D,
  id: string,
  x: number,
  z: number,
  items: InventorySummary['items'],
) {
  const g = new THREE.Group();
  g.userData.selection = `rak-${id}`;
  parent.add(g);
  const [w, h, d] = warehouseInterior.rackSize;
  for (const dx of [-w / 2, 0, w / 2])
    for (const dz of [-d / 2, d / 2])
      box(g, [0.12, h, 0.12], [x + dx, h / 2, z + dz], palette.blue, 0);
  for (const y of levels) {
    for (const dz of [-d / 2, d / 2]) box(g, [w, 0.12, 0.1], [x, y + 0.06, z + dz], '#f39a3d', 0);
    box(g, [w - 0.1, 0.04, d - 0.1], [x, y + 0.1, z], '#cfd7e6', 0);
  }
  const slotWidth = w / slotsPerLevel;
  items.slice(0, levels.length * slotsPerLevel).forEach((item, index) => {
    const level = Math.floor(index / slotsPerLevel);
    const slot = index % slotsPerLevel;
    const low = isBelowMinimum(item);
    const height = low ? 0.35 : 0.75;
    box(
      g,
      [slotWidth - 0.25, height, d - 0.3],
      [x - w / 2 + slotWidth * (slot + 0.5), levels[level] + 0.12 + height / 2, z],
      index % 2 ? palette.cardboardDark : palette.cardboard,
      0.03,
    );
  });
  mergeStatic(g);
}

export function createWarehouseInterior(parent: THREE.Group, inventory: InventorySummary) {
  const scenery = new THREE.Group();
  parent.add(scenery);
  const [w, d] = warehouseInterior.size;
  box(scenery, [w + 0.6, 0.3, d + 0.6], [0, -0.2, 0], '#d8e0eb', 0.1);
  box(scenery, [w, 0.05, d], [0, -0.02, 0], '#eceff4', 0);
  // Dinding belakang dan kiri bergaris seperti eksterior; sisi depan/kanan terbuka (cutaway).
  box(scenery, [w, 5, 0.25], [0, 2.5, -d / 2], '#eef2f9', 0);
  box(scenery, [0.25, 5, d], [-w / 2, 2.5, 0], '#e6ecf6', 0);
  for (let x = -w / 2 + 0.7; x < w / 2; x += 0.8)
    box(scenery, [0.08, 4.6, 0.06], [x, 2.4, -d / 2 + 0.16], '#dde3ef', 0);
  box(scenery, [w, 0.35, 0.3], [0, 5.1, -d / 2], palette.blue, 0);
  box(scenery, [0.3, 0.35, d], [-w / 2, 5.1, 0], palette.blue, 0);
  // Pintu dok dari dalam pada dinding kiri.
  for (const z of [-3.5, 1.5]) {
    box(scenery, [0.3, 3.8, 3.1], [-w / 2 + 0.05, 1.9, z], palette.navy, 0);
    box(scenery, [0.32, 3.4, 2.6], [-w / 2 + 0.1, 1.8, z], '#c8d2e4', 0);
  }
  // Lorong antar baris rak dan jalur forklift.
  box(scenery, [w - 1, 0.02, 0.12], [0, 0.02, -2.7], palette.marking, 0);
  box(scenery, [w - 1, 0.02, 0.12], [0, 0.02, 1.2], palette.marking, 0);
  const [sx, sz] = warehouseInterior.staging;
  markingRect(scenery, sx, sz, 5.5, 3.6);
  // Area staging: kardus sebanyak barang yang belum punya rak (maksimum 4 palet).
  for (let i = 0; i < Math.min(4, Math.ceil(inventory.staging.length / 2)); i++)
    cardboardPallet(scenery, sx - 1.8 + i * 1.25, sz, 1);
  forklift(scenery, 4.5, 4.2, -Math.PI / 2);
  box(scenery, [2.4, 0.9, 1.1], [7.5, 0.45, 5], palette.wood, 0.04);
  box(scenery, [2.4, 0.06, 1.1], [7.5, 0.93, 5], '#f4f6fa', 0);
  mergeStatic(scenery);
  for (const id of rackIds) {
    const [x, z] = warehouseInterior.racks[id];
    rack(parent, id, x, z, inventory.racks[id]);
  }
}
