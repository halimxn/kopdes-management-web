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
/** Tumpukan kardus (atau kemasan biru) di atas palet; dekorasi, bukan stok tercatat. */
export function cardboardPallet(
  parent: THREE.Object3D,
  x: number,
  z: number,
  layers = 2,
  wrapped = false,
) {
  const [light, dark] = wrapped
    ? ['#4f78f2', '#3863e6']
    : [palette.cardboard, palette.cardboardDark];
  box(parent, [1.1, 0.14, 1.1], [x, 0.07, z], palette.wood, 0.02);
  for (let layer = 0; layer < layers; layer++)
    for (const dx of [-0.26, 0.26])
      for (const dz of [-0.26, 0.26])
        box(
          parent,
          [0.48, 0.4, 0.48],
          [x + dx, 0.36 + layer * 0.42, z + dz],
          (layer + (dx > 0 ? 1 : 0)) % 2 ? dark : light,
          0.03,
        );
}
/** Forklift parkir menghadap selatan (garpu di depan). */
export function forklift(parent: THREE.Object3D, x: number, z: number, rotation = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  parent.add(g);
  box(g, [0.9, 0.55, 1.3], [0, 0.48, -0.1], palette.marking, 0.08);
  box(g, [0.86, 0.35, 0.45], [0, 0.6, -0.65], '#e0a92a', 0.06);
  box(g, [0.5, 0.12, 0.45], [0, 0.82, -0.05], palette.ink, 0.04);
  box(g, [0.5, 0.45, 0.08], [0, 1.05, -0.3], palette.ink, 0.03);
  for (const side of [-1, 1]) {
    box(g, [0.06, 1.45, 0.06], [side * 0.4, 1.25, -0.55], palette.ink, 0);
    box(g, [0.07, 1.9, 0.08], [side * 0.3, 1, 0.62], '#4a5670', 0);
    box(g, [0.1, 0.05, 0.9], [side * 0.22, 0.08, 1.05], '#59647b', 0);
  }
  box(g, [0.95, 0.06, 1.15], [0, 1.98, -0.1], palette.ink, 0);
  for (const sx of [-0.47, 0.47])
    for (const sz of [-0.55, 0.35]) {
      const wheel = cylinder(g, 0.2, 0.18, [sx, 0.2, sz], '#2b3245');
      wheel.rotation.z = Math.PI / 2;
    }
}
/** Pagar rendah: tiang dan dua rel di antara dua titik (searah sumbu X atau Z). */
export function fence(
  parent: THREE.Object3D,
  from: [number, number],
  to: [number, number],
  color = '#c5cfe0',
) {
  const alongX = from[1] === to[1];
  const length = Math.abs(alongX ? to[0] - from[0] : to[1] - from[1]);
  const cx = (from[0] + to[0]) / 2,
    cz = (from[1] + to[1]) / 2;
  for (const y of [0.45, 0.85])
    box(parent, alongX ? [length, 0.05, 0.05] : [0.05, 0.05, length], [cx, y, cz], color, 0);
  const posts = Math.max(1, Math.round(length / 2));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    box(
      parent,
      [0.08, 1, 0.08],
      [from[0] + (to[0] - from[0]) * t, 0.5, from[1] + (to[1] - from[1]) * t],
      color,
      0,
    );
  }
}
/** Persegi garis marka di lantai (misalnya petak parkir atau area staging). */
export function markingRect(
  parent: THREE.Object3D,
  x: number,
  z: number,
  width: number,
  depth: number,
  color = palette.marking,
  thickness = 0.08,
) {
  for (const side of [-1, 1]) {
    box(parent, [width, 0.02, thickness], [x, 0.03, z + (side * depth) / 2], color, 0);
    box(parent, [thickness, 0.02, depth], [x + (side * width) / 2, 0.03, z], color, 0);
  }
}
