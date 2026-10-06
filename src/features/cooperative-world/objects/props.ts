import * as THREE from 'three';
import { box, cone, cylinder, palette, sphere } from './primitives';

/** Pohon bulat ala video: batang cokelat tipis, tajuk hijau jenuh dengan sorot terang. */
export function tree(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);
  cylinder(group, 0.07, 1.1, [0, 0.55, 0], palette.trunk);
  sphere(group, 0.62, [0, 1.75, 0], palette.green, [0.92, 1.18, 0.92]);
  sphere(group, 0.34, [-0.22, 1.98, 0.2], palette.greenLight);
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

/** Palet kayu bersilang: dek atas bergaris dan tiga balok kaki. */
export function pallet(parent: THREE.Object3D, x: number, y: number, z: number) {
  for (const dx of [-0.42, 0, 0.42]) box(parent, [0.16, 0.1, 1.15], [x + dx, y + 0.05, z], '#c9a676', 0);
  for (const dz of [-0.45, -0.15, 0.15, 0.45])
    box(parent, [1.15, 0.05, 0.22], [x, y + 0.125, z + dz], palette.wood, 0);
}

/**
 * Tumpukan kardus berlakban (atau kemasan biru berbalut plastik) di atas palet.
 * Dekorasi atau visualisasi satu barang; bukan jumlah stok.
 */
export function cardboardPallet(
  parent: THREE.Object3D,
  x: number,
  z: number,
  layers = 2,
  wrapped = false,
) {
  pallet(parent, x, 0, z);
  const [light, dark] = wrapped ? [palette.wrap, palette.wrapDark] : [palette.cardboard, palette.cardboardDark];
  for (let layer = 0; layer < layers; layer++)
    for (const dx of [-0.27, 0.27])
      for (const dz of [-0.27, 0.27]) {
        const y = 0.39 + layer * 0.44;
        box(
          parent,
          [0.5, 0.42, 0.5],
          [x + dx, y, z + dz],
          (layer + (dx > 0 ? 1 : 0) + (dz > 0 ? 1 : 0)) % 2 ? dark : light,
          wrapped ? 0.08 : 0.03,
        );
        // Lakban kardus / tali plastik kemasan: garis terang di tengah tutup.
        box(
          parent,
          [0.1, 0.012, 0.51],
          [x + dx, y + 0.216, z + dz],
          wrapped ? '#9db6fb' : palette.tape,
          0,
        );
      }
}

/** Forklift kuning ala video: bobot belakang, atap pelindung hitam, tiang dan garpu di depan (+Z). */
export function forklift(
  parent: THREE.Object3D,
  x: number,
  z: number,
  rotation = 0,
  load: 'kosong' | 'kardus' | 'kemasan' = 'kosong',
) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  parent.add(g);
  // Badan dan bobot penyeimbang.
  box(g, [1.05, 0.62, 1.5], [0, 0.6, -0.05], palette.forklift, 0.1);
  box(g, [1.08, 0.5, 0.42], [0, 0.72, -0.72], '#e3a419', 0.1);
  box(g, [0.9, 0.06, 0.9], [0, 0.93, 0.1], '#ffd166', 0);
  // Kursi, setir.
  box(g, [0.52, 0.12, 0.46], [0, 1.0, -0.2], palette.ink, 0.04);
  box(g, [0.52, 0.5, 0.1], [0, 1.25, -0.42], palette.ink, 0.04);
  cylinder(g, 0.04, 0.42, [0, 1.15, 0.32], palette.ink).rotation.x = -0.6;
  // Atap pelindung: empat tiang dan atap hitam.
  for (const sx of [-0.44, 0.44])
    for (const sz of [-0.55, 0.42]) box(g, [0.07, 1.25, 0.07], [sx, 1.55, sz], palette.ink, 0);
  box(g, [1.0, 0.07, 1.12], [0, 2.18, -0.06], palette.ink, 0);
  for (const sz of [-0.3, 0, 0.3]) box(g, [0.96, 0.03, 0.05], [0, 2.23, sz], '#4a5670', 0);
  // Tiang angkat dan garpu.
  for (const side of [-1, 1]) {
    box(g, [0.09, 2.1, 0.1], [side * 0.34, 1.1, 0.78], '#3a4560', 0);
    box(g, [0.11, 0.05, 1.0], [side * 0.24, 0.12, 1.3], '#59647b', 0);
  }
  box(g, [0.78, 0.08, 0.08], [0, 1.9, 0.78], '#3a4560', 0);
  box(g, [0.7, 0.42, 0.06], [0, 0.4, 0.83], '#3a4560', 0);
  // Roda hitam dengan dop abu.
  for (const sx of [-0.54, 0.54])
    for (const [sz, r] of [
      [-0.55, 0.24],
      [0.45, 0.27],
    ]) {
      const wheel = cylinder(g, r, 0.22, [sx, r, sz], palette.tyre);
      wheel.rotation.z = Math.PI / 2;
      const hub = cylinder(g, r * 0.45, 0.24, [sx, r, sz], '#aeb7c7');
      hub.rotation.z = Math.PI / 2;
    }
  if (load !== 'kosong') {
    const carry = new THREE.Group();
    carry.position.set(0, 0.17, 1.35);
    carry.scale.setScalar(0.8);
    g.add(carry);
    cardboardPallet(carry, 0, 0, 1, load === 'kemasan');
  }
  return g;
}

/** Pagar: tiang dan rel; panel kaca dimasukkan ke grup `panels` agar digabung transparan. */
export function fence(
  parent: THREE.Object3D,
  from: [number, number],
  to: [number, number],
  panels?: THREE.Object3D,
  color = '#b9c4d8',
) {
  const alongX = from[1] === to[1];
  const length = Math.abs(alongX ? to[0] - from[0] : to[1] - from[1]);
  const cx = (from[0] + to[0]) / 2,
    cz = (from[1] + to[1]) / 2;
  box(parent, alongX ? [length, 0.06, 0.06] : [0.06, 0.06, length], [cx, 1.3, cz], color, 0);
  box(parent, alongX ? [length, 0.12, 0.1] : [0.1, 0.12, length], [cx, 0.06, cz], '#cfd8e8', 0);
  if (panels)
    box(panels, alongX ? [length, 1.2, 0.03] : [0.03, 1.2, length], [cx, 0.7, cz], '#ffffff', 0);
  const posts = Math.max(1, Math.round(length / 2.2));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    box(
      parent,
      [0.09, 1.38, 0.09],
      [from[0] + (to[0] - from[0]) * t, 0.69, from[1] + (to[1] - from[1]) * t],
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
/** Garis putus-putus searah sumbu X (marka kuning halaman dok). */
export function dashedLineX(
  parent: THREE.Object3D,
  fromX: number,
  toX: number,
  z: number,
  color = palette.marking,
  dash = 0.9,
  gap = 0.6,
) {
  for (let x = fromX; x + dash <= toX; x += dash + gap)
    box(parent, [dash, 0.02, 0.1], [x + dash / 2, 0.035, z], color, 0);
}

/** Rak palet luar: tiang biru, balok oranye, tiga tingkat berisi palet kardus. */
export function palletRack(parent: THREE.Object3D, x: number, z: number, bays = 2) {
  const width = bays * 1.4;
  for (let i = 0; i <= bays; i++)
    for (const dz of [-0.55, 0.55])
      box(parent, [0.1, 3.3, 0.1], [x - width / 2 + i * 1.4, 1.65, z + dz], palette.blue, 0);
  for (const y of [0.25, 1.35, 2.45])
    for (const dz of [-0.55, 0.55]) box(parent, [width, 0.12, 0.08], [x, y, z + dz], palette.orange, 0);
  for (let i = 0; i < bays; i++)
    for (const [level, y] of [0.31, 1.41, 2.51].entries()) {
      if ((i + level) % 3 === 2) continue;
      const g = new THREE.Group();
      g.position.set(x - width / 2 + 0.7 + i * 1.4, y, z);
      g.scale.setScalar(0.92);
      parent.add(g);
      cardboardPallet(g, 0, 0, 1 + ((i + level) % 2));
    }
}

/** Kontainer peti kemas bergaris (aksen warna seperti video). */
export function container(
  parent: THREE.Object3D,
  x: number,
  z: number,
  length = 5.6,
  color = palette.teal,
) {
  box(parent, [length, 2.4, 2], [x, 1.2, z], color, 0.04);
  for (let dx = -length / 2 + 0.3; dx < length / 2; dx += 0.32) {
    box(parent, [0.07, 2.2, 0.04], [x + dx, 1.2, z + 1.01], '#178a82', 0);
    box(parent, [0.07, 2.2, 0.04], [x + dx, 1.2, z - 1.01], '#178a82', 0);
  }
  box(parent, [0.05, 2.3, 1.9], [x + length / 2 + 0.01, 1.2, z], '#1b968e', 0);
  box(parent, [length + 0.05, 0.1, 2.05], [x, 2.43, z], '#22b0a6', 0);
}

/** Unit pendingin di atap: kotak putih dengan kipas gelap. */
export function roofUnit(parent: THREE.Object3D, x: number, y: number, z: number) {
  box(parent, [0.9, 0.42, 0.7], [x, y + 0.21, z], '#f4f6fb', 0.05);
  cylinder(parent, 0.22, 0.03, [x - 0.18, y + 0.43, z], '#7c879c');
  cylinder(parent, 0.22, 0.03, [x + 0.22, y + 0.43, z], '#7c879c');
}

/** Pengisi daya forklift: lemari putih dengan layar biru. */
export function charger(parent: THREE.Object3D, x: number, z: number) {
  box(parent, [0.55, 1.0, 0.42], [x, 0.5, z], '#f4f6fb', 0.05);
  box(parent, [0.32, 0.22, 0.02], [x, 0.78, z + 0.22], palette.blue, 0);
  box(parent, [0.08, 0.08, 0.02], [x, 0.45, z + 0.22], '#36b37e', 0);
}

/** Pin peta biru (tetes terbalik) dengan titik putih; tanda data nyata di scene. */
export function dropPin(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale = 1.6,
  color = palette.blue,
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  sphere(g, 0.36, [0, 0.5, 0], color);
  cone(g, 0.3, 0.55, [0, 0.12, 0], color).rotation.x = Math.PI;
  sphere(g, 0.13, [0, 0.55, 0.3], '#ffffff');
  return g;
}
