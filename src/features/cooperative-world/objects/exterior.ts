import * as THREE from 'three';
import type { WorldModel } from '../world-model';
import { officePosition, officeSize, park, plotSize, roads, site } from '../layout';
import { box, mergeStatic, palette } from './primitives';
import { bench, fence, markingRect, streetLamp, tree } from './props';
import { building } from './office';
import { createLogisticsYard, createWarehouse } from './warehouse';

const asphalt = '#c6d2e8';
const sidewalk = '#f4f7fd';

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
  // Pagar batas utara dengan bukaan gerbang.
  const fenceZ = roads.main.z + roads.main.width / 2 + 0.9;
  fence(scenery, [site.minX + 1, fenceZ], [roads.gate.x - 2.6, fenceZ]);
  fence(scenery, [roads.gate.x + 2.6, fenceZ], [site.maxX - 1, fenceZ]);

  createLogisticsYard(scenery);

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

  // Pohon dan lampu sepanjang jalan; dilewati di dekat persimpangan dan gerbang.
  const busy = (x: number) => Math.abs(x - roads.gate.x) < 3.5 || Math.abs(x + 3) < 3;
  for (let x = site.minX + 2; x <= site.maxX - 2; x += 4) {
    if (!busy(x)) tree(scenery, x, roads.boulevard.z - roads.boulevard.width / 2 - 1.1, 0.85);
    if (Math.abs(x - roads.gate.x) > 3) tree(scenery, x + 2, site.minZ + 0.8, 0.9);
  }
  for (const z of [-6, 4, 9]) {
    tree(scenery, site.minX + 1, z);
    tree(scenery, site.maxX - 1, z);
  }
  for (const x of [-26, -12, 4, 18, 28]) streetLamp(scenery, x, roads.boulevard.z + 2.3);
  for (const x of [-26, -8, 8, 24]) streetLamp(scenery, x, roads.inner.z + 2.3);
  mergeStatic(scenery);

  // Objek yang dapat diklik digabung per objek agar raycast tetap mengenali pilihannya.
  mergeStatic(building(parent, ox, oz, 'Koperasi', true));
  mergeStatic(createWarehouse(parent));
  for (const plot of model.plots) {
    const [x, z] = plot.position;
    mergeStatic(
      plot.unit
        ? building(parent, x, z, String(plot.unit.data.title), false, plot.id)
        : emptyPlot(parent, plot.id, x, z),
    );
  }
}
