/**
 * Grading warna Eastward (siang) yang disetujui pemilik 7 Oktober 2026. Dipakai generator aset
 * (scripts/dunia-pixel) dan tanah di mesin PixiJS agar sprite dan tanah selaras.
 */
export type Rgb = [number, number, number];
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export function gradeRgb([r0, g0, b0]: readonly [number, number, number]): Rgb {
  // nada tanah: sedikit lebih jenuh, kontras, hangat-olive
  const lum = (r0 + g0 + b0) / 3;
  let r = lum + (r0 - lum) * 1.15;
  let g = lum + (g0 - lum) * 1.15;
  let b = lum + (b0 - lum) * 1.15;
  r = 10 + ((r - 128) * 1.12 + 128) * 0.84;
  g = 10 + ((g - 128) * 1.12 + 128) * 0.82;
  b = 16 + ((b - 128) * 1.12 + 128) * 0.74;
  // kusam sinematik: olive-teal dengan sorotan hangat
  const l2 = (r + g + b) / 3;
  r = l2 + (r - l2) * 0.8;
  g = l2 + (g - l2) * 0.85;
  b = l2 + (b - l2) * 0.8;
  return [
    clamp((r - 128) * 1.15 + 134),
    clamp((g - 128) * 1.12 + 136),
    clamp((b - 128) * 1.05 + 122),
  ];
}

const parse = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

export function gradeHex(hex: string): number {
  const [r, g, b] = gradeRgb(parse(hex));
  return (r << 16) | (g << 8) | b;
}

export function gradeCss(hex: string): string {
  return `#${gradeHex(hex).toString(16).padStart(6, '0')}`;
}
