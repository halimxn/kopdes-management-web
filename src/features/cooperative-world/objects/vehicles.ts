import * as THREE from 'three';
import { yardForkliftPath } from '../layout';
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

type Point = [number, number];

/**
 * Lintasan berbelok halus: garis lurus antar titik dengan sudut dibulatkan (kurva kuadrat),
 * sehingga kendaraan berbelok lembut seperti video, bukan berputar di tempat.
 */
export function roundedPath(points: Point[], radius = 3.2, closed = false) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const v = ([x, z]: Point) => new THREE.Vector3(x, 0, z);
  const list = closed ? [...points, points[0]] : points;
  let start = v(list[0]);
  for (let i = 1; i < list.length; i++) {
    const corner = v(list[i]);
    const next = closed && i === list.length - 1 ? v(list[1]) : list[i + 1] ? v(list[i + 1]) : null;
    if (!next) {
      if (start.distanceTo(corner) > 0.01) path.add(new THREE.LineCurve3(start, corner));
      break;
    }
    const inLen = corner.distanceTo(start);
    const outLen = corner.distanceTo(next);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = corner.clone().sub(start).normalize().multiplyScalar(-r).add(corner);
    const b = next.clone().sub(corner).normalize().multiplyScalar(r).add(corner);
    if (start.distanceTo(a) > 0.01) path.add(new THREE.LineCurve3(start, a));
    path.add(new THREE.QuadraticBezierCurve3(a, corner, b));
    start = b;
  }
  if (closed && path.curves.length) {
    const first = path.curves[0].getPoint(0);
    if (start.distanceTo(first) > 0.01) path.add(new THREE.LineCurve3(start, first));
  }
  return path;
}

export type TruckActor = { spot: TruckSpot; group: THREE.Group };

export function createTrucks(parent: THREE.Object3D, spots: TruckSpot[]): TruckActor[] {
  return spots.map((spot) => {
    const g = truck(parent, spot.delivery.id, `kirim-${spot.delivery.id}`);
    const [x, z] = truckPose(spot);
    g.position.set(x, 0, z);
    mergeStatic(g);
    return { spot, group: g };
  });
}

export type AmbientCar = {
  group: THREE.Group;
  curve: THREE.CurvePath<THREE.Vector3>;
  length: number;
  speed: number;
  distance: number;
};

/**
 * Kendaraan suasana berkeliling blok distrik di lajur kiri, berbelok halus di persimpangan.
 * Truk suasana hanya di blok niaga (tidak melewati area kesehatan). Simulasi lingkungan,
 * bukan kendaraan atau pengiriman tercatat.
 */
export function createAmbientCars(parent: THREE.Object3D): AmbientCar[] {
  const loops: {
    points: Point[];
    kind: 'truk' | 'mobil';
    color: string;
    speed: number;
    start: number;
  }[] = [
    {
      points: [
        [-52, -2.5],
        [60, -2.5],
        [60, 2.5],
        [-52, 2.5],
      ],
      kind: 'mobil',
      color: '#9fb8f5',
      speed: 4.8,
      start: 0.1,
    },
    {
      points: [
        [-52, 2.5],
        [-2, 2.5],
        [-2, 36],
        [2, 36],
        [2, -2.5],
        [-52, -2.5],
      ],
      kind: 'mobil',
      color: '#c9b8f6',
      speed: 4.2,
      start: 0.45,
    },
  ];
  return loops.map((loop, index) => {
    const g = new THREE.Group();
    // ID per kendaraan agar penunjuk mengikuti kendaraan yang diklik, bukan yang pertama.
    g.userData.selection = `kendaraan-suasana-${index}`;
    parent.add(g);
    const body = new THREE.Group();
    g.add(body);
    if (loop.kind === 'truk') {
      const vehicle = truck(body, 'suasana', 'kendaraan-suasana', truckSchemes[2]);
      vehicle.scale.setScalar(0.82);
    } else {
      box(body, [1.7, 0.66, 3.4], [0, 0.62, 0], loop.color, 0.22);
      box(body, [1.5, 0.56, 1.9], [0, 1.18, -0.2], loop.color, 0.2);
      box(body, [1.52, 0.38, 1.7], [0, 1.2, -0.2], palette.glassDark, 0.1);
      wheels(body, [-0.8, 0.8], [-1.1, 1.1], 0.32, 0.26);
    }
    mergeStatic(body);
    const curve = roundedPath(loop.points, 4.5, true);
    const length = curve.getLength();
    return { group: g, curve, length, speed: loop.speed, distance: length * loop.start };
  });
}

/** Letakkan kendaraan di jarak tertentu sepanjang lintasan dan hadapkan ke arah gerak. */
export function placeOnCurve(
  group: THREE.Object3D,
  curve: THREE.CurvePath<THREE.Vector3>,
  u: number,
  backwards = false,
) {
  const t = Math.min(1, Math.max(0, u));
  const point = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t);
  group.position.set(point.x, 0, point.z);
  group.rotation.y = Math.atan2(tangent.x, tangent.z) + (backwards ? Math.PI : 0);
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
