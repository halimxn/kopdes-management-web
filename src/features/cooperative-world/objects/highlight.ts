import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isSharedResource, palette } from './primitives';

/** Cahaya lantai melingkar lembut (tekstur gradien) di bawah objek terpilih. */
function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(56,102,246,0.45)');
    gradient.addColorStop(0.6, 'rgba(56,102,246,0.18)');
    gradient.addColorStop(1, 'rgba(56,102,246,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Kotak seleksi ala video: sisi biru transparan, garis tepi tipis, siku tebal di delapan
 * sudut, dan cahaya biru di lantai. Empat draw call apa pun ukurannya.
 */
export function createSelectionBox(bounds: THREE.Box3) {
  const size = bounds.getSize(new THREE.Vector3()).add(new THREE.Vector3(0.5, 0.3, 0.5));
  const center = bounds.getCenter(new THREE.Vector3());
  const g = new THREE.Group();
  g.position.copy(center);
  const blue = palette.blue;
  const faces = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshBasicMaterial({
      color: blue,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    }),
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)),
    new THREE.LineBasicMaterial({ color: blue, transparent: true, opacity: 0.5 }),
  );
  // Siku tebal ±25 % panjang tiap sisi (maks. 1,6) seperti kotak seleksi video.
  const armX = Math.min(1.6, size.x * 0.25),
    armY = Math.min(1.6, size.y * 0.25),
    armZ = Math.min(1.6, size.z * 0.25);
  const t = 0.1;
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const cx = (sx * size.x) / 2,
          cy = (sy * size.y) / 2,
          cz = (sz * size.z) / 2;
        parts.push(
          new THREE.BoxGeometry(armX, t, t).translate(cx - (sx * armX) / 2, cy, cz),
          new THREE.BoxGeometry(t, armY, t).translate(cx, cy - (sy * armY) / 2, cz),
          new THREE.BoxGeometry(t, t, armZ).translate(cx, cy, cz - (sz * armZ) / 2),
        );
      }
  const brackets = new THREE.Mesh(
    mergeGeometries(parts),
    new THREE.MeshBasicMaterial({ color: blue }),
  );
  parts.forEach((part) => part.dispose());
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(size.x + 2.4, size.z + 2.4),
    new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -center.y + 0.06;
  g.add(faces, edges, brackets, glow);
  return g;
}

/** Buang geometri, material dan tekstur milik kotak seleksi atau rute. */
export function disposeGroup(group: THREE.Object3D) {
  group.removeFromParent();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    if (!isSharedResource(object.geometry)) object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((mat: THREE.Material) => {
      if (isSharedResource(mat)) return;
      if ('map' in mat && mat.map instanceof THREE.Texture) mat.map.dispose();
      mat.dispose();
    });
  });
}
