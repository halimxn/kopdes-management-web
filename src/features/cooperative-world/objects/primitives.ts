import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type Vec3 = [number, number, number];

// Palet dunia mengikuti video acuan: biru-putih dengan aksen kardus, marka dan pohon.
export const palette = {
  blue: '#3866f6',
  navy: '#2443a6',
  white: '#fafcff',
  glass: '#a7c8e9',
  ground: '#e9eefb',
  green: '#5fbf8a',
  greenLight: '#9fdcb2',
  wood: '#dfc59c',
  ink: '#2d3b56',
  cardboard: '#f2b36b',
  cardboardDark: '#d9944a',
  marking: '#f5c542',
};

// Geometri dan material dipakai bersama antar objek agar jumlah alokasi GPU kecil.
const materials = new Map<string, THREE.MeshStandardMaterial>();
const geometries = new Map<string, THREE.BufferGeometry>();

export function material(color: string) {
  let found = materials.get(color);
  if (!found) {
    found = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
    materials.set(color, found);
  }
  return found;
}
function geometry(key: string, create: () => THREE.BufferGeometry) {
  let found = geometries.get(key);
  if (!found) {
    found = create();
    geometries.set(key, found);
  }
  return found;
}
/** Dipanggil saat scene dibongkar agar scene berikutnya tidak memakai sumber daya yang sudah dibuang. */
export function disposeSharedResources() {
  materials.forEach((item) => item.dispose());
  geometries.forEach((item) => item.dispose());
  materials.clear();
  geometries.clear();
}

export function box(
  parent: THREE.Object3D,
  size: Vec3,
  position: Vec3,
  color: string,
  radius = 0.035,
) {
  const key = `box:${size.join(',')}:${radius}`;
  const mesh = new THREE.Mesh(
    geometry(key, () =>
      radius ? new RoundedBoxGeometry(...size, 2, radius) : new THREE.BoxGeometry(...size),
    ),
    material(color),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function sphere(
  parent: THREE.Object3D,
  radius: number,
  position: Vec3,
  color: string,
  scale: Vec3 = [1, 1, 1],
) {
  const mesh = new THREE.Mesh(
    geometry(`sphere:${radius}`, () => new THREE.SphereGeometry(radius, 16, 12)),
    material(color),
  );
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
export function cylinder(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  position: Vec3,
  color: string,
) {
  const mesh = new THREE.Mesh(
    geometry(
      `cylinder:${radius}:${height}`,
      () => new THREE.CylinderGeometry(radius, radius, height, 12),
    ),
    material(color),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
export function sign(
  parent: THREE.Object3D,
  text: string,
  position: Vec3,
  width = 3,
  color = palette.navy,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = palette.white;
  ctx.fillRect(0, 0, 768, 128);
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text.slice(0, 28), 384, 68, 730);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 6),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  mesh.position.set(...position);
  parent.add(mesh);
}
