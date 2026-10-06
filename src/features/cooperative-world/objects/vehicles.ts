import * as THREE from 'three';
import { roads, yardForkliftPath } from '../layout';
import { truckPose } from '../truck-routes';
import type { TruckSpot } from '../world-model';
import { box, cylinder, mergeStatic, palette } from './primitives';
import { forklift } from './props';

/**
 * Skema warna truk ala video: kabin biru polos, atau kabin putih dengan garis navy/teal/oranye.
 * Dipilih dari ID pengiriman agar truk berbeda tanpa mengarang merek pemasok.
 */
export const truckSchemes = [
  { cab: palette.blue, stripe: palette.blue },
  { cab: '#f4f6fb', stripe: palette.navy },
  { cab: '#f4f6fb', stripe: palette.teal },
  { cab: '#f4f6fb', stripe: palette.orange },
] as const;
export const truckSchemeFor = (id: string) =>
  truckSchemes[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % truckSchemes.length];

function wheels(parent: THREE.Object3D, xs: number[], zs: number[], radius: number, width = 0.3) {
  for (const x of xs)
    for (const z of zs) {
      const wheel = cylinder(parent, radius, width, [x, radius, z], palette.tyre);
      wheel.rotation.z = Math.PI / 2;
      const hub = cylinder(parent, radius * 0.45, width + 0.02, [x, radius, z], '#b5bfce');
      hub.rotation.z = Math.PI / 2;
    }
}

/**
 * Truk boks cab-over ala video (kabin di +Z): kaca depan gelap, gril, lampu, bumper,
 * boks putih dengan garis warna, pelat logo di sisi, pintu belakang, roda tandem.
 */
export function truck(
  parent: THREE.Object3D,
  id: string,
  selection: string,
  scheme: (typeof truckSchemes)[number] = truckSchemeFor(id),
) {
  const g = new THREE.Group();
  g.userData.selection = selection;
  parent.add(g);
  const { cab, stripe } = scheme;
  box(g, [1.7, 0.35, 6.2], [0, 0.72, -0.05], '#2b3245', 0.04);
  // Boks muatan.
  box(g, [2.35, 2.55, 4.6], [0, 2.2, -1.0], '#f7f9fd', 0.1);
  box(g, [2.37, 0.18, 4.62], [0, 0.98, -1.0], '#dfe5ef', 0);
  box(g, [2.38, 0.42, 4.1], [0, 1.32, -1.2], stripe, 0);
  box(g, [2.38, 0.12, 2.4], [0, 1.68, -2.0], stripe, 0);
  for (const side of [-1, 1]) {
    box(g, [0.03, 0.9, 0.9], [side * 1.19, 2.55, 0.15], stripe, 0);
    box(g, [0.03, 0.34, 0.34], [side * 1.205, 2.55, 0.15], '#ffffff', 0);
    box(g, [0.05, 0.3, 2.0], [side * 1.08, 0.9, 0.2], '#dfe5ef', 0);
  }
  box(g, [2.2, 2.3, 0.04], [0, 2.2, -3.32], '#e7ecf4', 0);
  box(g, [0.04, 2.3, 0.05], [0, 2.2, -3.35], '#c5cedd', 0);
  // Kabin.
  box(g, [2.3, 2.25, 1.65], [0, 1.95, 2.25], cab, 0.2);
  box(g, [2.15, 0.42, 1.0], [0, 3.25, 2.0], cab, 0.12);
  box(g, [2.0, 0.92, 0.06], [0, 2.45, 3.08], palette.glassDark, 0);
  for (const side of [-1, 1]) {
    box(g, [0.06, 0.75, 0.75], [side * 1.15, 2.45, 2.55], palette.glassDark, 0);
    box(g, [0.08, 0.4, 0.14], [side * 1.32, 2.5, 2.95], palette.tyre, 0.02);
    box(g, [0.38, 0.2, 0.05], [side * 0.78, 1.45, 3.09], '#fff6d8', 0);
  }
  box(g, [1.3, 0.5, 0.05], [0, 1.45, 3.085], '#3a4458', 0);
  for (const dy of [-0.12, 0.04, 0.2])
    box(g, [1.2, 0.04, 0.05], [0, 1.45 + dy, 3.11], '#8793a8', 0);
  box(g, [2.36, 0.32, 0.22], [0, 0.98, 3.13], '#c7cfdc', 0.04);
  wheels(g, [-0.98, 0.98], [-2.55, -1.6, 2.25], 0.46, 0.34);
  return g;
}

export function createTrucks(parent: THREE.Object3D, spots: TruckSpot[]) {
  for (const spot of spots) {
    const g = truck(parent, spot.delivery.id, `kirim-${spot.delivery.id}`);
    const [x, z] = truckPose(spot);
    g.position.set(x, 0, z);
    mergeStatic(g);
  }
}

export type AmbientCar = { group: THREE.Group; speed: number; z: number };

/** Kendaraan suasana di jalan utama. Simulasi lingkungan, bukan kendaraan atau pengiriman tercatat. */
export function createAmbientCars(parent: THREE.Object3D): AmbientCar[] {
  const lanes = [
    { z: roads.main.z + roads.main.width / 4, speed: 3.6, start: -40, kind: 'truk' as const },
    { z: roads.main.z - roads.main.width / 4, speed: -4.4, start: 20, kind: 'mobil' as const },
  ];
  return lanes.map((lane, index) => {
    const g = new THREE.Group();
    // ID per kendaraan agar penunjuk mengikuti kendaraan yang diklik, bukan yang pertama.
    g.userData.selection = `kendaraan-suasana-${index}`;
    parent.add(g);
    const body = new THREE.Group();
    body.rotation.y = lane.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(body);
    if (lane.kind === 'truk') {
      const vehicle = truck(body, 'suasana', 'kendaraan-suasana', truckSchemes[2]);
      vehicle.scale.setScalar(0.82);
    } else {
      box(body, [1.7, 0.7, 3.4], [0, 0.65, 0], '#f4f6fb', 0.15);
      box(body, [1.5, 0.6, 1.8], [0, 1.25, -0.2], '#f4f6fb', 0.15);
      box(body, [1.52, 0.42, 1.6], [0, 1.27, -0.2], palette.glassDark, 0.05);
      box(body, [1.72, 0.14, 3.42], [0, 0.55, 0], palette.blue, 0);
      wheels(body, [-0.8, 0.8], [-1.1, 1.1], 0.32, 0.26);
    }
    mergeStatic(body);
    g.position.set(lane.start, 0, lane.z);
    return { group: g, speed: lane.speed, z: lane.z };
  });
}

/** Forklift suasana yang membawa palet dari staging ke rak luar. Simulasi lingkungan. */
export function createYardForklift(parent: THREE.Object3D) {
  const g = new THREE.Group();
  g.userData.selection = 'forklift-suasana';
  parent.add(g);
  forklift(g, 0, 0, 0, 'kardus');
  mergeStatic(g);
  const [x, z] = yardForkliftPath[0];
  g.position.set(x, 0, z);
  return g;
}
