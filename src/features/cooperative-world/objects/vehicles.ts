import * as THREE from 'three';
import { roads, truckBays, warehouse } from '../layout';
import type { TruckSpot } from '../world-model';
import { box, cylinder, mergeStatic, palette } from './primitives';

// Warna kabin dipilih dari ID pengiriman agar truk berbeda tanpa mengarang merek pemasok.
const cabColors = [palette.blue, '#2f9e6e', '#e07b39', '#7a5af0'];
const colorFor = (id: string) =>
  cabColors[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % cabColors.length];

function wheels(parent: THREE.Object3D, xs: number[], zs: number[], radius: number) {
  for (const x of xs)
    for (const z of zs) {
      const wheel = cylinder(parent, radius, 0.3, [x, radius, z], '#2b3245');
      wheel.rotation.z = Math.PI / 2;
    }
}

/** Truk boks menghadap selatan (kabin di +Z); bagian belakang boks menempel dok. */
export function truck(parent: THREE.Object3D, id: string, selection: string) {
  const g = new THREE.Group();
  g.userData.selection = selection;
  parent.add(g);
  const cab = colorFor(id);
  box(g, [2, 0.35, 6], [0, 0.65, 0], palette.ink, 0.04);
  box(g, [2.3, 2.5, 4.2], [0, 2.05, -0.8], palette.white, 0.06);
  box(g, [2.32, 0.35, 4.22], [0, 1.15, -0.8], cab, 0);
  box(g, [2.1, 1.9, 1.6], [0, 1.75, 2.15], cab, 0.12);
  box(g, [1.9, 0.75, 0.06], [0, 2.2, 2.96], palette.glass, 0);
  for (const side of [-1, 1]) box(g, [0.06, 0.6, 0.9], [side * 1.06, 2.15, 2.2], palette.glass, 0);
  wheels(g, [-1, 1], [-2.2, -1.3, 1.9], 0.42);
  return g;
}

/** Posisi truk: di depan pintu dok atau di petak antre dekat gerbang. */
export function truckPose(spot: TruckSpot): [number, number] {
  if (spot.place === 'dok') {
    const front = warehouse.center[1] + warehouse.size[2] / 2;
    return [warehouse.docks[spot.index], front + 3.7];
  }
  return truckBays[spot.index];
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

/** Mobil suasana di jalan utama. Simulasi lingkungan, bukan kendaraan atau pengiriman tercatat. */
export function createAmbientCars(parent: THREE.Object3D): AmbientCar[] {
  const lanes = [
    { z: roads.main.z + 1.2, speed: 4, color: '#e2534f', start: -20 },
    { z: roads.main.z - 1.2, speed: -3.2, color: '#f4f6fa', start: 12 },
  ];
  return lanes.map((lane) => {
    const g = new THREE.Group();
    g.userData.selection = 'kendaraan-suasana';
    parent.add(g);
    const body = new THREE.Group();
    body.rotation.y = lane.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(body);
    box(body, [1.7, 0.7, 3.4], [0, 0.65, 0], lane.color, 0.15);
    box(body, [1.5, 0.6, 1.8], [0, 1.25, -0.2], lane.color, 0.15);
    box(body, [1.52, 0.42, 1.6], [0, 1.27, -0.2], palette.glass, 0.05);
    wheels(body, [-0.8, 0.8], [-1.1, 1.1], 0.32);
    mergeStatic(body);
    g.position.set(lane.start, 0, lane.z);
    return { group: g, speed: lane.speed, z: lane.z };
  });
}
