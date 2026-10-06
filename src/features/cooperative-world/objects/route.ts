import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TruckRoute } from '../truck-routes';
import { dropPin } from './props';
import { mergeStatic, palette } from './primitives';

const lift = 0.075;

/** Kumpulkan geometri berposisi lalu gabungkan menjadi satu mesh agar rute hanya beberapa draw call. */
class GeometryBatch {
  private parts: THREE.BufferGeometry[] = [];
  add(geometry: THREE.BufferGeometry, x: number, y: number, z: number, angle = 0) {
    const part = (geometry.index ? geometry.toNonIndexed() : geometry.clone()) as THREE.BufferGeometry;
    for (const name of Object.keys(part.attributes))
      if (!['position', 'normal'].includes(name)) part.deleteAttribute(name);
    part.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    this.parts.push(part);
    geometry.dispose();
  }
  build(material: THREE.Material) {
    if (!this.parts.length) return null;
    const mesh = new THREE.Mesh(mergeGeometries(this.parts), material);
    this.parts.forEach((part) => part.dispose());
    return mesh;
  }
}

/**
 * Rute truk terpilih seperti video: jalur yang sudah dilalui berupa pita biru dengan panah
 * putih, sisa jalur berupa titik-titik biru, dan cakram serta pin biru di pintu dok tujuan.
 */
export function createRoute(parent: THREE.Object3D, route: TruckRoute) {
  const g = new THREE.Group();
  parent.add(g);
  const ribbon = new GeometryBatch();
  const arrows = new GeometryBatch();
  const dots = new GeometryBatch();
  route.done.slice(1).forEach(([bx, bz], i) => {
    const [ax, az] = route.done[i];
    const length = Math.hypot(bx - ax, bz - az);
    if (!length) return;
    const angle = Math.atan2(bx - ax, bz - az);
    ribbon.add(new THREE.BoxGeometry(0.78, 0.03, length), (ax + bx) / 2, lift, (az + bz) / 2, angle);
    ribbon.add(new THREE.CylinderGeometry(0.39, 0.39, 0.03, 18), bx, lift, bz);
    // Panah "›" putih setiap 2,4 unit menunjukkan arah perjalanan.
    for (let d = 1.4; d < length - 0.6; d += 2.4) {
      const x = ax + ((bx - ax) * d) / length,
        z = az + ((bz - az) * d) / length;
      for (const side of [-1, 1]) {
        const arm = new THREE.BoxGeometry(0.07, 0.02, 0.36);
        arm.rotateY(side * 0.75);
        arm.translate(side * 0.11, 0, -0.1);
        arrows.add(arm, x, lift + 0.02, z, angle);
      }
    }
  });
  if (route.done.length) {
    const [sx, sz] = route.done[0];
    ribbon.add(new THREE.CylinderGeometry(0.39, 0.39, 0.03, 18), sx, lift, sz);
  }
  route.ahead.slice(1).forEach(([bx, bz], i) => {
    const [ax, az] = route.ahead[i];
    const length = Math.hypot(bx - ax, bz - az);
    for (let d = i ? 0 : 1.2; d <= length; d += 0.95)
      dots.add(
        new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12),
        ax + ((bx - ax) * d) / Math.max(length, 0.001),
        lift,
        az + ((bz - az) * d) / Math.max(length, 0.001),
      );
  });
  const blue = new THREE.MeshBasicMaterial({ color: palette.blue });
  for (const mesh of [
    ribbon.build(blue),
    arrows.build(new THREE.MeshBasicMaterial({ color: '#ffffff' })),
    dots.build(blue),
  ])
    if (mesh) g.add(mesh);
  if (route.target) {
    const [tx, tz] = route.target;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.02, 28),
      new THREE.MeshBasicMaterial({ color: palette.blue, transparent: true, opacity: 0.85 }),
    );
    disc.position.set(tx, lift + 0.01, tz + 0.4);
    g.add(disc);
    const pin = new THREE.Group();
    g.add(pin);
    dropPin(pin, tx, 2.2, tz + 0.4);
    mergeStatic(pin);
    g.userData.pin = pin;
  }
  return g;
}
