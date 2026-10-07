import { WORLD } from './map';

/**
 * Kendaraan dunia pixel: lalu lintas suasana (simulasi berlabel) dan truk dari data Pengiriman.
 * Posisi = jangkar sprite di garis tanah sisi terdekat. Indonesia berlajur kiri: kendaraan ke
 * timur memakai lajur utara, ke barat lajur selatan; naik ke utara memakai sisi barat.
 */
export type TruckKind = 'boks' | 'pendingin' | 'bakkayu';
export type VehicleKind = TruckKind | 'angkot' | 'pikap' | 'motor' | 'viar';
export type VehicleView = 'kanan' | 'kiri' | 'depan' | 'belakang';
export type Pose = { x: number; y: number; view: VehicleView };

/** Nama sprite di public/dunia/kendaraan; tampak kiri punya sprite sendiri agar tulisan terbaca. */
export const spriteFor = (kind: VehicleKind, view: VehicleView) =>
  `${kind}-${view === 'kanan' ? 'samping' : view === 'kiri' ? 'samping-kiri' : view}`;

const LANE = {
  desa: { 1: 728, [-1]: 760 },
  provinsi: { 1: 1456, [-1]: 1492 },
} as const;

export type Ambient = {
  id: string;
  kind: Exclude<VehicleKind, 'pendingin'>;
  road: keyof typeof LANE;
  dir: 1 | -1;
  speed: number;
  offset: number;
};
/** Satu lajur satu kecepatan agar kendaraan tidak saling menembus. */
export const ambientTraffic: Ambient[] = [
  { id: 'kendaraan-suasana-1', kind: 'angkot', road: 'desa', dir: 1, speed: 62, offset: 0 },
  { id: 'kendaraan-suasana-2', kind: 'pikap', road: 'desa', dir: 1, speed: 62, offset: 1400 },
  { id: 'kendaraan-suasana-3', kind: 'motor', road: 'desa', dir: -1, speed: 54, offset: 500 },
  { id: 'kendaraan-suasana-4', kind: 'viar', road: 'desa', dir: -1, speed: 54, offset: 1900 },
  { id: 'kendaraan-suasana-5', kind: 'boks', road: 'provinsi', dir: -1, speed: 66, offset: 700 },
  { id: 'kendaraan-suasana-6', kind: 'angkot', road: 'provinsi', dir: -1, speed: 66, offset: 2200 },
  { id: 'kendaraan-suasana-7', kind: 'bakkayu', road: 'provinsi', dir: 1, speed: 58, offset: 1100 },
  { id: 'kendaraan-suasana-8', kind: 'motor', road: 'provinsi', dir: 1, speed: 58, offset: 2600 },
];
const LOOP = WORLD.w + 480;

export function ambientPose(v: Ambient, seconds: number): Pose {
  const d = (((v.offset + v.speed * seconds) % LOOP) + LOOP) % LOOP;
  return {
    x: v.dir > 0 ? -240 + d : WORLD.w + 240 - d,
    y: LANE[v.road][v.dir],
    view: v.dir > 0 ? 'kanan' : 'kiri',
  };
}

/** Pintu dok (tengah): D1–D3 gudang komoditas, D4 cold storage. Muka dok di y 980. */
export const DOCK_X = [1918, 2022, 2126, 2380] as const;
const DOCK_FACE = 980;
/** Kedalaman tapak truk (6,4 m × 12 px/m) agar ekor menempel muka dok. */
const TRUCK_DEPTH = 77;

export const dockPose = (index: number): Pose => ({
  x: DOCK_X[Math.min(index, DOCK_X.length - 1)],
  y: DOCK_FACE + TRUCK_DEPTH,
  view: 'depan',
});
/** Truk antre parkir di pool truk menghadap selatan. */
export const queuePose = (index: number): Pose => ({
  x: 1900 + index * 84,
  y: 1384,
  view: 'depan',
});

export type PathLeg = { to: [number, number]; view: VehicleView; speed: number };
export type Route = { from: [number, number]; legs: PathLeg[] };

/**
 * Rute kedatangan: dari timur di Jalan Provinsi (lajur selatan), naik ke utara di jalan
 * logistik (sisi barat), ke timur di depan pool, lalu mundur ke dok.
 */
export function arrivalRoute(index: number): Route {
  const x = DOCK_X[Math.min(index, DOCK_X.length - 1)];
  const lane = 1190;
  return {
    from: [WORLD.w + 200, LANE.provinsi[-1]],
    legs: [
      { to: [1792, LANE.provinsi[-1]], view: 'kiri', speed: 120 },
      { to: [1792, lane], view: 'belakang', speed: 90 },
      { to: [x, lane], view: 'kanan', speed: 80 },
      { to: [x, DOCK_FACE + TRUCK_DEPTH], view: 'depan', speed: 40 },
    ],
  };
}

/** Posisi setelah menempuh waktu tertentu; `done` saat ekor menempel dok. */
export function poseAlong(route: Route, seconds: number): Pose & { done: boolean } {
  let [x, y] = route.from;
  let t = seconds;
  for (const leg of route.legs) {
    const len = Math.hypot(leg.to[0] - x, leg.to[1] - y);
    const need = len / leg.speed;
    if (t < need) {
      const k = t / need;
      return {
        x: x + (leg.to[0] - x) * k,
        y: y + (leg.to[1] - y) * k,
        view: leg.view,
        done: false,
      };
    }
    t -= need;
    [x, y] = leg.to;
  }
  return { x, y, view: route.legs[route.legs.length - 1].view, done: true };
}

/** Jenis truk dari teks kendaraan; tanpa keterangan, D4 (cold storage) = pendingin. */
export function truckKind(vehicle: string, place: 'dok' | 'antre', index: number): TruckKind {
  const text = vehicle.toLowerCase();
  if (/dingin|reefer|cold/.test(text)) return 'pendingin';
  if (/bak|colt|engkel|kayu/.test(text)) return 'bakkayu';
  return place === 'dok' && index === 3 ? 'pendingin' : 'boks';
}

/** Truk yang baru berubah status (≤ 15 menit) dianimasikan datang ke dok. */
export const recentArrival = (updatedAt: string, now: Date) =>
  now.getTime() - Date.parse(updatedAt) <= 15 * 60_000;
