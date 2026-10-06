import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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

export function material(color: string, vertexColors = false) {
  let found = materials.get(color);
  if (!found) {
    found = vertexColors
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
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

/** Material tunggal untuk mesh gabungan; warna asal disimpan per titik (vertex color). */
function vertexColorMaterial() {
  return material('__vertex', true);
}

/**
 * Gabungkan semua mesh statis di dalam grup menjadi satu mesh berwarna per titik.
 * Kawasan berisi ratusan kotak kecil berbagai warna; tanpa penggabungan setiap kotak
 * menjadi satu draw call. Papan nama bertekstur (bukan material bersama) dibiarkan.
 */
export function mergeStatic(group: THREE.Object3D) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const parts: THREE.BufferGeometry[] = [];
  const merged: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !(object.material instanceof THREE.MeshStandardMaterial) ||
      object.material.vertexColors
    )
      return;
    const local = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    local.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    for (const name of Object.keys(local.attributes))
      if (!['position', 'normal'].includes(name)) local.deleteAttribute(name);
    const { r, g, b } = object.material.color;
    const count = local.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([r, g, b], i * 3);
    local.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(local);
    merged.push(object);
  });
  merged.forEach((mesh) => mesh.removeFromParent());
  const combined = parts.length ? mergeGeometries(parts) : null;
  parts.forEach((item) => item.dispose());
  if (combined) {
    const mesh = new THREE.Mesh(combined, vertexColorMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  // Grup kosong sisa perabot tidak perlu ikut ditelusuri setiap frame.
  const empty: THREE.Object3D[] = [];
  group.traverse((object) => {
    if (object !== group && object.type === 'Group' && object.children.length === 0)
      empty.push(object);
  });
  empty.forEach((object) => object.removeFromParent());
}

export function box(
  parent: THREE.Object3D,
  size: Vec3,
  position: Vec3,
  color: string,
  radius = 0.035,
) {
  // Lengkung pada kotak tipis tidak terlihat tetapi memakan ratusan segitiga.
  const round = Math.min(...size) >= 0.2 ? radius : 0;
  const key = `box:${size.join(',')}:${round}`;
  const mesh = new THREE.Mesh(
    geometry(key, () =>
      round ? new RoundedBoxGeometry(...size, 2, round) : new THREE.BoxGeometry(...size),
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
