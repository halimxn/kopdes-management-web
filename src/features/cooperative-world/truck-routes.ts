// Rute truk dan jalur forklift: fungsi murni tanpa Three.js agar teruji dan aman dimuat
// di komponen React mana pun (WorldScene dimuat dinamis karena WebGL).
import { docks, lots } from './district';
import { gate, roads, site, truckBays, warehouse } from './layout';
import type { TruckSpot } from './world-model';

type Point = [number, number];

/** Jarak dari titik pusat truk ke ujung belakang boks; dipakai agar truk berhenti di perata dok. */
const truckRear = 3.32;

/** Posisi truk: belakang boks menempel perata dok, atau di petak antre dekat gerbang. */
export function truckPose(spot: TruckSpot): Point {
  if (spot.place === 'dok') return [warehouse.docks[spot.index], dockStop()];
  return truckBays[spot.index];
}
/** Truk berhenti dengan belakang boks di tepi lantai dok yang ditinggikan. */
function dockStop() {
  return docks.wallZ + docks.platformDepth + truckRear;
}

export type TruckRoute = {
  /** Jalur yang sudah dilalui (garis biru tebal). */
  done: Point[];
  /** Jalur tersisa ke pintu dok (titik-titik biru); kosong bila truk sudah di dok. */
  ahead: Point[];
  /** Pintu dok tujuan, ditandai cakram dan pin biru. Null bila semua dok terisi. */
  target: Point | null;
  dock: number | null;
};

/**
 * Rute skematis truk di distrik: masuk dari ujung timur Jalan Raya (tidak melewati area
 * warga) → gerbang barang → jalur manuver → petak antre/dok. Gambaran alur bongkar muat,
 * bukan pelacakan GPS. Truk antre menuju dok pilihan (kolom Pintu dok) atau dok kosong pertama.
 */
export function truckRoute(spot: TruckSpot, spots: TruckSpot[]): TruckRoute {
  const lane = roads.main.z - roads.main.width / 4;
  const yard = roads.yardLane;
  const entry: Point[] = [
    [site.maxX + 8, lane],
    [gate.x, lane],
    [gate.x, yard],
  ];
  const dockZ = dockStop();
  const doorZ = docks.wallZ + docks.platformDepth / 2;
  if (spot.place === 'dok') {
    const x = warehouse.docks[spot.index];
    return {
      done: [...entry, [x, yard], [x, dockZ]],
      ahead: [],
      target: [x, doorZ],
      dock: spot.index,
    };
  }
  const [bx, bz] = truckBays[spot.index];
  const done: Point[] = [...entry, [bx, yard], [bx, bz]];
  const used = new Set(spots.filter((row) => row.place === 'dok').map((row) => row.index));
  const wanted = Number(String(spot.delivery.data.dock || '').replace('D', '')) - 1;
  const free = warehouse.docks.map((_, index) => index).filter((index) => !used.has(index));
  const dock = free.includes(wanted) ? wanted : (free[0] ?? null);
  if (dock === null) return { done, ahead: [], target: null, dock: null };
  const x = warehouse.docks[dock];
  return {
    done,
    ahead: [
      [bx, bz],
      [bx, yard],
      [x, yard],
      [x, dockZ],
    ],
    target: [x, doorZ],
    dock,
  };
}

/** Titik fokus kamera untuk truk terpilih: di antara truk dan dok tujuannya, lebih dekat ke truk. */
export function truckFocus(spot: TruckSpot, spots: TruckSpot[]): Point {
  const [x, z] = truckPose(spot);
  const { target } = truckRoute(spot, spots);
  return target && spot.place === 'antre'
    ? [x * 0.6 + target[0] * 0.4, z * 0.6 + target[1] * 0.4]
    : [x, z];
}

/**
 * Posisi pada jalur bolak-balik: maju (garpu di depan) lalu mundur, berhenti `pause` detik
 * di kedua ujung. Fungsi murni agar gerak forklift teruji dan tidak bergantung frame.
 */
export function pathPose(path: Point[], time: number, speed: number, pause: number) {
  const lengths = path
    .slice(1)
    .map((point, i) => Math.hypot(point[0] - path[i][0], point[1] - path[i][1]));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  const travel = total / speed;
  const cycle = 2 * (travel + pause);
  let t = ((time % cycle) + cycle) % cycle;
  let distance: number;
  if (t < travel) distance = t * speed;
  else if ((t -= travel) < pause) distance = total;
  else if ((t -= pause) < travel) distance = total - t * speed;
  else distance = 0;
  for (let i = 0; i < lengths.length; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] ? Math.min(1, distance / lengths[i]) : 0;
      return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, angle: Math.atan2(bx - ax, bz - az) };
    }
    distance -= lengths[i];
  }
  return { x: path[0][0], z: path[0][1], angle: 0 };
}

/**
 * Lintasan kedatangan truk untuk animasi (pola video): maju dari jalan lewat gerbang ke jalur
 * manuver, melewati dok tujuan, lalu mundur berbelok hingga belakang boks menempel lantai dok.
 * Truk antre cukup maju masuk petak. Titik akhir sama dengan truckPose.
 */
export function truckArrival(spot: TruckSpot, spots: TruckSpot[]) {
  const { done } = truckRoute(spot, spots);
  if (spot.place !== 'dok') return { drive: done, reverse: [] as Point[] };
  const [x, z] = truckPose(spot);
  const yard = roads.yardLane;
  // Titik balik ±7 unit melewati dok, tetapi ekor truk tidak boleh menembus pagar kavling.
  const fence = lots.find((lot) => lot.id === 'logistik')!.fence;
  const past =
    x < gate.x ? Math.max(x - 7, fence.x + 4.2) : Math.min(x + 7, fence.x + fence.w - 4.2);
  const drive: Point[] = [...done.slice(0, -2), [past, yard]];
  const reverse: Point[] = [
    [past, yard],
    [x, yard],
    [x, z],
  ];
  return { drive, reverse };
}
