import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Vec3 = [number, number, number];

// Palet dunia mengikuti video acuan: biru-putih dengan aksen kardus, marka dan pohon.
// Tabel nilai dan perannya ada di docs/DUNIA-KOPERASI.md bagian "Blueprint visual v3".
// v4: warna dasar disampel dari frame video (tanah, jalan, dinding, biru dalam); aksen unit pastel.
export const palette = {
  blue: '#2f6be8',
  blueDeep: '#1f58d8',
  navy: '#1454cc',
  white: '#fafcff',
  wall: '#ececfc',
  wallShade: '#d6dcf3',
  rib: '#d0d8ee',
  glass: '#a9c6f5',
  glassDark: '#24324f',
  ground: '#e4ecfc',
  /** Tanah kavling, paving halaman, aspal, trotoar. */
  lot: '#dfe7fb',
  yard: '#cfd9f4',
  asphalt: '#bccaee',
  sidewalk: '#eef2fd',
  green: '#4cc47f',
  greenLight: '#8fe0ac',
  grass: '#c4ead3',
  /** Atap pastel per unit, senada biru-lavender. */
  pastelLavender: '#b4a8f4',
  pastelPeach: '#f7c39b',
  pastelMint: '#8fdcbc',
  pastelSky: '#8fcdee',
  pastelLilac: '#c9b8f6',
  trunk: '#8a7a66',
  wood: '#dfc59c',
  ink: '#2d3b56',
  tyre: '#262c3b',
  cardboard: '#f2b36b',
  cardboardDark: '#d9944a',
  tape: '#e9cf9f',
  wrap: '#4f78f2',
  wrapDark: '#3863e6',
  marking: '#f5c542',
  forklift: '#f5b82e',
  teal: '#1fa39a',
  orange: '#ef7d32',
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
/** Sumber daya bersama tidak boleh dibuang oleh objek sementara (kotak seleksi, rute). */
export function isSharedResource(resource: THREE.Material | THREE.BufferGeometry) {
  return resource instanceof THREE.Material
    ? [...materials.values()].includes(resource as THREE.MeshStandardMaterial)
    : [...geometries.values()].includes(resource);
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
      object.material.vertexColors ||
      object.material.transparent
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

/**
 * Gabungkan semua mesh di grup menjadi satu mesh transparan (mis. panel pagar kaca).
 * Ratusan panel tetap satu draw call; warna seragam karena material tunggal.
 */
export function mergeTransparent(group: THREE.Object3D, color: string, opacity: number) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const parts: THREE.BufferGeometry[] = [];
  const meshes: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const local = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    local.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    for (const name of Object.keys(local.attributes))
      if (!['position', 'normal'].includes(name)) local.deleteAttribute(name);
    parts.push(local);
    meshes.push(object);
  });
  meshes.forEach((mesh) => mesh.removeFromParent());
  if (!parts.length) return;
  const key = `__transparent:${color}:${opacity}`;
  let found = materials.get(key);
  if (!found) {
    found = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    materials.set(key, found);
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), found);
  parts.forEach((item) => item.dispose());
  group.add(mesh);
}

/**
 * Prisma segitiga untuk dinding pelana (gable) gudang: alas `width` di sumbu Z,
 * puncak setinggi `rise`, tebal `depth` di sumbu X. Titik asal di tengah alas.
 */
export function gable(
  parent: THREE.Object3D,
  width: number,
  rise: number,
  depth: number,
  position: Vec3,
  color: string,
) {
  const key = `gable:${width}:${rise}:${depth}`;
  const mesh = new THREE.Mesh(
    geometry(key, () => {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, 0);
      shape.lineTo(width / 2, 0);
      shape.lineTo(0, rise);
      shape.closePath();
      const extruded = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      // Bentuk dibuat di bidang XY lalu diputar agar alas sejajar sumbu Z dan tebal di sumbu X.
      extruded.translate(0, 0, -depth / 2);
      extruded.rotateY(Math.PI / 2);
      return extruded;
    }),
    material(color),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Kerucut (ujung pin peta, lampu sorot). */
export function cone(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  position: Vec3,
  color: string,
) {
  const mesh = new THREE.Mesh(
    geometry(`cone:${radius}:${height}`, () => new THREE.ConeGeometry(radius, height, 16)),
    material(color),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
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

/** Pelat persegi membulat bertulisan (nomor dok, logo bulat). Satu tekstur per pelat. */
export function badge(
  parent: THREE.Object3D,
  text: string,
  position: Vec3,
  size = 0.7,
  background = palette.blue,
  color = '#ffffff',
) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(4, 4, 120, 120, 26);
  ctx.fill();
  ctx.font = `bold ${text.length > 2 ? 44 : 60}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text.slice(0, 4), 64, 68, 112);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}
