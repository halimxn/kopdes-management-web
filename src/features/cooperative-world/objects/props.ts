import * as THREE from 'three';
import { box, cylinder, palette, sphere } from './primitives';

export function tree(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);
  cylinder(group, 0.08, 1.2, [0, 0.6, 0], '#9b978e');
  sphere(group, 0.58, [0, 1.6, 0], palette.green, [0.9, 1.35, 0.9]);
  sphere(group, 0.36, [-0.23, 1.67, 0.15], palette.greenLight);
  cylinder(group, 0.52, 0.15, [0, 0.08, 0], '#d1dcec');
}
export function bench(parent: THREE.Object3D, x: number, z: number) {
  for (const offset of [-0.6, 0.6])
    box(parent, [0.09, 0.45, 0.5], [x + offset, 0.22, z], palette.ink);
  for (let i = 0; i < 3; i++)
    box(parent, [1.7, 0.08, 0.13], [x, 0.49, z + (i - 1) * 0.16], palette.wood);
  box(parent, [1.7, 0.35, 0.08], [x, 0.8, z - 0.25], palette.wood);
}
export function streetLamp(parent: THREE.Object3D, x: number, z: number) {
  cylinder(parent, 0.045, 3.1, [x, 1.55, z], '#8391ad');
  box(parent, [0.6, 0.06, 0.25], [x + 0.22, 3.12, z], '#f6fbff');
}
export function chair(parent: THREE.Object3D, x: number, z: number, rotation = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  parent.add(g);
  box(g, [0.64, 0.14, 0.63], [0, 0.55, 0], '#7891b3');
  box(g, [0.64, 0.7, 0.13], [0, 0.92, -0.26], '#7891b3', 0.06);
  cylinder(g, 0.06, 0.48, [0, 0.25, 0], palette.ink);
  box(g, [0.65, 0.05, 0.08], [0, 0.05, 0], palette.ink);
  box(g, [0.08, 0.05, 0.65], [0, 0.05, 0], palette.ink);
}
/** Tumpukan kardus di atas palet: aksen oranye seperti video, hanya dekorasi area bongkar muat. */
export function cardboardPallet(parent: THREE.Object3D, x: number, z: number, layers = 2) {
  box(parent, [1.1, 0.14, 1.1], [x, 0.07, z], palette.wood, 0.02);
  for (let layer = 0; layer < layers; layer++)
    for (const dx of [-0.26, 0.26])
      for (const dz of [-0.26, 0.26])
        box(
          parent,
          [0.48, 0.4, 0.48],
          [x + dx, 0.36 + layer * 0.42, z + dz],
          (layer + (dx > 0 ? 1 : 0)) % 2 ? palette.cardboardDark : palette.cardboard,
          0.03,
        );
}
