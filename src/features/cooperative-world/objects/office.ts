import * as THREE from 'three';
import { box, cylinder, palette, sign, sphere } from './primitives';
import { bench, chair, tree } from './props';

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
  const w = main ? 5.1 : 3.8,
    h = main ? 3.2 : 2.2,
    d = main ? 3.5 : 2.6;
  box(g, [w + 0.65, 0.16, d + 0.65], [0, 0.08, 0], '#f7f9ff');
  box(g, [w, h, d], [0, h / 2 + 0.16, 0], main ? palette.blue : palette.white);
  box(g, [w + 0.16, 0.2, d + 0.2], [0, h + 0.2, 0], palette.navy);
  for (let i = -2; i <= 2; i++) box(g, [0.035, 0.035, d], [(i * w) / 5, h + 0.32, 0], '#648cfb', 0);
  box(g, [w + 0.4, 0.13, 0.95], [0, h * 0.69, d / 2 + 0.3], main ? '#8cacf9' : palette.blue);
  box(g, [1.15, 1.7, 0.08], [0, 1.02, d / 2 + 0.015], '#293e6a');
  box(g, [0.93, 1.55, 0.09], [0, 1.02, d / 2 + 0.06], palette.glass);
  box(g, [0.04, 1.55, 0.12], [0, 1.02, d / 2 + 0.1], palette.white);
  for (const side of [-1, 1]) {
    box(g, [0.95, 1, 0.09], [side * (w / 2 - 0.75), 1.35, d / 2 + 0.04], '#bedcfa');
    box(g, [0.04, 1, 0.12], [side * (w / 2 - 0.75), 1.35, d / 2 + 0.09], palette.white);
  }
  sign(g, main ? 'KOPERASI' : title, [0, h * 0.84, d / 2 + 0.08], w * 0.73);
  if (main) {
    box(g, [1.1, 0.3, 0.7], [-1, h + 0.42, -0.5], '#cbd4e9');
    for (const side of [-1, 1]) {
      cylinder(g, 0.32, 0.5, [side * 2.3, 0.41, 2.15], '#e3e9f4');
      sphere(g, 0.42, [side * 2.3, 0.84, 2.15], palette.green);
    }
  }
}

/** Interior kantor cutaway: rapat, meja tugas, arsip dan area kegiatan. */
export function createInterior(parent: THREE.Group) {
  box(parent, [15, 0.3, 12], [0, -0.2, 0], '#d8e0eb', 0.1);
  box(parent, [14.6, 0.05, 11.6], [0, -0.02, 0], '#f4f3ef');
  for (let x = -7; x <= 7; x++) box(parent, [0.012, 0.01, 11.5], [x, 0.015, 0], '#e4e5e7', 0);
  for (let z = -5; z <= 5; z++) box(parent, [14.5, 0.01, 0.012], [0, 0.015, z], '#e4e5e7', 0);
  box(parent, [15, 3.5, 0.2], [0, 1.6, -6], '#f8fbff');
  box(parent, [0.2, 3.5, 12], [-7.4, 1.6, 0], '#e9eff8');
  for (let x = -6; x <= 6; x += 2) {
    box(parent, [1.65, 1.55, 0.06], [x, 2.05, -5.86], '#b8d4ec');
    box(parent, [0.05, 1.65, 0.1], [x, 2.05, -5.8], '#839bb9');
    box(parent, [1.85, 0.15, 0.16], [x, 2.85, -5.75], '#f9fcff');
  }
  box(parent, [0.08, 2.3, 4.2], [-0.5, 1.15, -3.7], '#c9e0ec');
  for (const z of [-5.8, -1.6]) box(parent, [0.1, 2.4, 0.1], [-0.5, 1.2, z], '#f9fcff');
  box(parent, [4.2, 0.18, 1.7], [-4, 1, -2.6], palette.wood, 0.15);
  for (const x of [-5.5, -2.5])
    for (const z of [-3.1, -2.1]) box(parent, [0.1, 0.9, 0.1], [x, 0.45, z], '#edf2f9');
  for (const x of [-5.2, -4, -2.8]) {
    chair(parent, x, -4);
    chair(parent, x, -1.2, Math.PI);
  }
  box(parent, [0.55, 0.025, 0.4], [-4.3, 1.11, -2.5], '#f9fcff');
  cylinder(parent, 0.12, 0.15, [-3, 1.15, -2.5], palette.blue);
  for (const z of [-3.7, -1.2]) {
    box(parent, [4.7, 0.13, 1.15], [3.2, 1, z], '#ffffff');
    for (const x of [1.15, 5.25]) box(parent, [0.12, 1, 0.85], [x, 0.5, z], '#d1dbe9');
    for (const x of [2, 4.5]) {
      box(parent, [0.8, 0.53, 0.08], [x, 1.5, z - 0.16], '#344761');
      box(parent, [0.71, 0.42, 0.02], [x, 1.51, z - 0.108], '#8ebcfa');
      box(parent, [0.07, 0.26, 0.09], [x, 1.15, z - 0.16], '#6f8198');
      box(parent, [0.55, 0.04, 0.21], [x, 1.085, z + 0.2], '#bdc9d9');
      chair(parent, x, z + 1, Math.PI);
    }
  }
  for (const x of [-5.7, -4.3, -2.9]) {
    box(parent, [1.3, 1.5, 0.7], [x, 0.75, 4.5], palette.wood);
    box(parent, [1.32, 0.12, 0.75], [x, 1.55, 4.5], '#ffffff');
    for (let i = 0; i < 5; i++)
      box(
        parent,
        [0.13, 0.4, 0.29],
        [x - 0.4 + i * 0.19, 1.79, 4.5],
        ['#6d91dd', '#b7b6e0', '#88b9a4'][i % 3],
      );
  }
  box(parent, [4.2, 0.03, 2.8], [3.8, 0.02, 3.5], '#d5d8f2', 0.12);
  for (const x of [2.3, 5.3]) {
    box(parent, [1, 0.22, 1.9], [x, 0.18, 3.5], '#63748c');
    box(parent, [0.76, 0.05, 1.55], [x, 0.32, 3.5], '#334257');
    for (const side of [-1, 1])
      box(parent, [0.07, 1.3, 0.07], [x + side * 0.46, 0.85, 2.8], '#aebed1');
    box(parent, [1.05, 0.12, 0.32], [x, 1.5, 2.8], '#385172');
  }
  tree(parent, -6.5, -5.1, 0.8);
  tree(parent, 6.4, -5.1, 0.8);
  tree(parent, -0.6, 4.7, 0.8);
  bench(parent, -0.5, 2.4);
}
