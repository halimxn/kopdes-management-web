/** Tinggi kanvas dasar seni pixel; skala tampilan selalu bilangan bulat agar piksel tajam. */
export const BASE_HEIGHT = 360;
/** Zoom 0,62 (bawaan zona) = skala dasar layar; nilai lain sebanding. */
const BASE_ZOOM = 0.62;
export const MAX_SCALE = 8;

/** Lebar dasar untuk ponsel tegak: layar sempit tidak boleh terlalu dekat. */
const BASE_WIDTH = 300;
type Size = { width: number; height: number };
const baseOf = (size: Size) => Math.min(size.height / BASE_HEIGHT, size.width / BASE_WIDTH);

export function pixelScale(size: Size, zoom: number): number {
  const raw = baseOf(size) * (zoom / BASE_ZOOM);
  return Math.min(MAX_SCALE, Math.max(1, Math.round(raw)));
}

/** Zoom yang menghasilkan skala bulat berikutnya (naik/turun satu tingkat). */
export function zoomForStep(size: Size, zoom: number, step: 1 | -1): number {
  const next = Math.min(MAX_SCALE, Math.max(1, pixelScale(size, zoom) + step));
  return (next * BASE_ZOOM) / baseOf(size);
}

export type View = { width: number; height: number; right: number; top: number; bottom: number };

/** Titik tengah area yang tidak tertutup kartu/lembar (piksel layar). */
export function viewCenter(view: View): [number, number] {
  return [(view.width - view.right) / 2, (view.top + view.height - view.bottom) / 2];
}

/** Batasi kamera agar area terlihat tetap di dalam dunia; dunia lebih kecil dari layar = di tengah. */
export function clampCamera(
  camera: readonly [number, number],
  view: View,
  scale: number,
  world: { w: number; h: number },
): [number, number] {
  const visW = (view.width - view.right) / scale;
  const visH = (view.height - view.top - view.bottom) / scale;
  const axis = (value: number, visible: number, size: number) =>
    visible >= size ? size / 2 : Math.min(size - visible / 2, Math.max(visible / 2, value));
  return [axis(camera[0], visW, world.w), axis(camera[1], visH, world.h)];
}

/** Mendekat halus ke target (tidak bergantung frame rate); reduced-motion langsung lompat. */
export function followStep(
  current: number,
  target: number,
  seconds: number,
  reduced: boolean,
): number {
  if (reduced) return target;
  return current + (target - current) * (1 - Math.exp(-seconds * 6));
}
