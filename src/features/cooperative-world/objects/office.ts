import * as THREE from 'three';
import { box, cylinder, palette, sign, sphere } from './primitives';
import { bench, chair, tree } from './props';
import { officeInterior, officeSize } from '../layout';

/** Gedung kawasan: kantor koperasi (main) atau gerai dari catatan unit. */
export function building(
  parent: THREE.Object3D,
  x: number,
  z: number,
  title: string,
  main = false,
  selection = title,
) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.userData.selection = main ? 'koperasi' : selection;
  parent.add(g);
  const w = main ? officeSize.width : 3.8,
    h = main ? officeSize.height : 2.2,
    d = main ? officeSize.depth : 2.6;
  box(g, [w + 0.65, 0.16, d + 0.65], [0, 0.08, 0], '#f7f9ff');
  box(g, [w, h, d], [0, h / 2 + 0.16, 0], main ? palette.blue : palette.white);
  box(g, [w + 0.16, 0.2, d + 0.2], [0, h + 0.2, 0], palette.navy);
  for (let i = -2; i <= 2; i++) box(g, [0.035, 0.035, d], [(i * w) / 5, h + 0.32, 0], '#648cfb', 0);
  box(g, [w + 0.4, 0.13, 0.95], [0, h * 0.69, d / 2 + 0.3], main ? '#8cacf9' : palette.blue);
  box(g, [1.15, 1.7, 0.08], [0, 1.02, d / 2 + 0.015], '#293e6a');
  box(g, [0.93, 1.55, 0.09], [0, 1.02, d / 2 + 0.06], palette.glass);
  box(g, [0.04, 1.55, 0.12], [0, 1.02, d / 2 + 0.1], palette.white);
  // Kantor punya dua jendela tiap sisi pintu; gerai satu.
  const windows = main ? [w / 2 - 0.9, w / 2 - 2.2] : [w / 2 - 0.75];
  for (const side of [-1, 1])
    for (const offset of windows) {
      box(g, [0.95, 1, 0.09], [side * offset, 1.35, d / 2 + 0.04], '#bedcfa');
      box(g, [0.04, 1, 0.12], [side * offset, 1.35, d / 2 + 0.09], palette.white);
    }
  sign(g, main ? 'KOPERASI' : title, [0, h * 0.84, d / 2 + 0.08], w * 0.73);
  if (main) {
    box(g, [1.1, 0.3, 0.7], [-1, h + 0.42, -0.5], '#cbd4e9');
    for (const side of [-1, 1]) {
      cylinder(g, 0.32, 0.5, [side * (w / 2 - 0.2), 0.41, d / 2 + 0.75], '#e3e9f4');
      sphere(g, 0.42, [side * (w / 2 - 0.2), 0.84, d / 2 + 0.75], palette.green);
    }
  }
  return g;
}

/** Meja seksi: dua workstation berlayar, kursi menghadap layar, papan nama seksi. */
function sectionDesk(parent: THREE.Object3D, title: string, x: number, z: number) {
  box(parent, [5, 0.03, 3.4], [x, 0.02, z + 0.3], '#eef2fb', 0);
  box(parent, [4.4, 0.12, 1.1], [x, 1, z], '#ffffff');
  for (const side of [-1, 1]) {
    box(parent, [0.1, 1, 0.9], [x + side * 2.1, 0.5, z], '#d1dbe9');
    const dx = x + side * 1.1;
    box(parent, [0.8, 0.53, 0.08], [dx, 1.5, z - 0.3], '#344761');
    box(parent, [0.71, 0.42, 0.02], [dx, 1.51, z - 0.25], '#8ebcfa');
    box(parent, [0.07, 0.26, 0.09], [dx, 1.15, z - 0.3], '#6f8198');
    box(parent, [0.55, 0.04, 0.21], [dx, 1.085, z + 0.1], '#bdc9d9');
    chair(parent, dx, z + 1, Math.PI);
  }
  box(parent, [4.4, 1.1, 0.08], [x, 1.6, z - 0.6], '#dfe7f5', 0);
  sign(parent, title.toUpperCase(), [x, 2.45, z - 0.55], 3.6, palette.navy);
}

/**
 * Interior kantor cutaway 22 × 15: rapat, ruang manajer, lima meja seksi, pantry, arsip dan gym.
 * Papan nama seksi membantu manajer membaca tempat kerja tim di Dunia Koperasi.
 */
export function createInterior(parent: THREE.Group) {
  const [w, d] = officeInterior.size;
  box(parent, [w + 0.6, 0.3, d + 0.6], [0, -0.2, 0], '#d8e0eb', 0.1);
  box(parent, [w, 0.05, d], [0, -0.02, 0], '#f4f3ef', 0);
  for (let x = -w / 2 + 1; x < w / 2; x++)
    box(parent, [0.012, 0.01, d - 0.2], [x, 0.015, 0], '#e4e5e7', 0);
  box(parent, [w, 3.5, 0.2], [0, 1.6, -d / 2], '#f8fbff', 0);
  box(parent, [0.2, 3.5, d], [-w / 2, 1.6, 0], '#e9eff8', 0);
  for (let x = -w / 2 + 2; x < w / 2 - 1; x += 2.4) {
    box(parent, [1.8, 1.55, 0.06], [x, 2.05, -d / 2 + 0.14], '#b8d4ec', 0);
    box(parent, [1.95, 0.15, 0.16], [x, 2.85, -d / 2 + 0.25], '#f9fcff', 0);
  }
  // Ruang rapat berdinding kaca.
  const [mx, mz] = officeInterior.meeting;
  box(parent, [5.4, 0.03, 5], [mx, 0.02, mz], '#e9e4f6', 0);
  box(parent, [0.08, 2.3, 5], [mx + 2.9, 1.15, mz], '#c9e0ec', 0);
  box(parent, [4.2, 0.18, 1.7], [mx, 1, mz], palette.wood, 0.15);
  for (const dx of [-1.5, 1.5])
    for (const dz of [-0.5, 0.5])
      box(parent, [0.1, 0.9, 0.1], [mx + dx, 0.45, mz + dz], '#edf2f9', 0);
  for (const dx of [-1.2, 0, 1.2]) {
    chair(parent, mx + dx, mz - 1.4);
    chair(parent, mx + dx, mz + 1.4, Math.PI);
  }
  sign(parent, 'RUANG RAPAT', [mx, 2.6, mz - 2.4], 3, palette.navy);
  // Ruang manajer.
  const [rx, rz] = officeInterior.manager;
  box(parent, [5.4, 0.03, 5], [rx, 0.02, rz], '#e7f1ea', 0);
  box(parent, [0.08, 2.3, 5], [rx + 2.9, 1.15, rz], '#c9e0ec', 0);
  box(parent, [2.6, 0.12, 1.2], [rx, 1, rz], palette.wood);
  box(parent, [0.8, 0.53, 0.08], [rx, 1.5, rz - 0.35], '#344761');
  box(parent, [0.71, 0.42, 0.02], [rx, 1.51, rz - 0.3], '#8ebcfa');
  chair(parent, rx, rz + 1, Math.PI);
  tree(parent, rx - 2, rz - 1.6, 0.6);
  sign(parent, 'RUANG MANAJER', [rx, 2.6, rz - 2.4], 3, palette.navy);
  for (const [title, [x, z]] of Object.entries(officeInterior.sections))
    sectionDesk(parent, title, x, z);
  // Pantry.
  const [px, pz] = officeInterior.pantry;
  box(parent, [4, 0.03, 2.6], [px, 0.02, pz], '#f6ecdf', 0);
  box(parent, [3, 1, 0.8], [px, 0.5, pz - 0.6], palette.wood);
  box(parent, [3.02, 0.08, 0.82], [px, 1.04, pz - 0.6], '#ffffff', 0);
  cylinder(parent, 0.5, 0.1, [px, 0.75, pz + 0.7], '#ffffff');
  cylinder(parent, 0.06, 0.7, [px, 0.35, pz + 0.7], palette.ink);
  sign(parent, 'PANTRY', [px, 2.3, pz - 1.05], 2, palette.navy);
  // Arsip.
  const [ax, az] = officeInterior.archive;
  for (const dx of [-1.4, 0, 1.4]) {
    box(parent, [1.3, 1.5, 0.7], [ax + dx, 0.75, az], palette.wood);
    for (let i = 0; i < 5; i++)
      box(
        parent,
        [0.13, 0.4, 0.29],
        [ax + dx - 0.4 + i * 0.19, 1.79, az],
        ['#6d91dd', '#b7b6e0', '#88b9a4'][i % 3],
      );
  }
  // Area kegiatan (gym).
  const [gx, gz] = officeInterior.gym;
  box(parent, [4.4, 0.03, 2.8], [gx, 0.02, gz], '#d5d8f2', 0.12);
  for (const dx of [-1.2, 1.2]) {
    box(parent, [1, 0.22, 1.9], [gx + dx, 0.18, gz], '#63748c');
    box(parent, [0.76, 0.05, 1.55], [gx + dx, 0.32, gz], '#334257');
    for (const side of [-1, 1])
      box(parent, [0.07, 1.3, 0.07], [gx + dx + side * 0.46, 0.85, gz - 0.7], '#aebed1');
    box(parent, [1.05, 0.12, 0.32], [gx + dx, 1.5, gz - 0.7], '#385172');
  }
  tree(parent, w / 2 - 1, -d / 2 + 1, 0.8);
  bench(parent, 8.6, 5);
}
