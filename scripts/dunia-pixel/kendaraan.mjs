// Gambar kendaraan Dunia Koperasi (P3b) pada skala dunia pixel: panjang dan tinggi 24 px/m,
// kedalaman (sumbu utara-selatan) 12 px/m seperti tapak bangunan. Setiap sprite punya jangkar
// di tengah garis tanah sisi terdekat; mesin memakai jangkar itu sebagai posisi kendaraan.
import {
  K,
  box,
  ellipse,
  glowRect,
  hline,
  light,
  line,
  mix,
  rect,
  sackStack,
  shade,
  shadowRect,
  text,
  vline,
  flipCanvas,
  textW,
} from './preview.mjs';

// Tulisan di sisi kendaraan ditampung dulu; sprite menghadap kiri = gambar dicerminkan lalu
// tulisan digambar ulang di posisi cermin agar tetap terbaca.
let labels = [];
const label = (s, x, y, c, sc = 1) => labels.push([s, x, y, c, sc]);
function withLabels(draw, mirror, canvasW) {
  return (ox, oy) => {
    labels = [];
    draw(ox, oy);
    if (mirror) flipCanvas();
    for (const [s, x, y, c, sc] of labels) text(s, mirror ? canvasW - x - textW(s, sc) : x, y, c, sc);
  };
}

export const MARGIN = 40;
const TIRE = '#26232a';
const GLASS = '#26303d';
const BOX = '#ece9df';
const BOX_TOP = '#f6f4ec';
const PLANKS = ['#3f8a5a', '#e2b13c', '#c2463a', '#3f8a5a'];

function wheel(cx, cy, r) {
  ellipse(cx, cy, r + 1, r + 1, K.ol);
  ellipse(cx, cy, r, r, TIRE);
  ellipse(cx, cy, r * 0.55, r * 0.55, '#8d8a86');
  ellipse(cx - 1, cy - 1, Math.max(1, r * 0.22), Math.max(1, r * 0.22), '#d6d3cc');
}
function wheelWell(cx, cy, r) {
  for (let y = -r - 3; y <= 0; y++) for (let x = -r - 3; x <= r + 3; x++) if (x * x + y * y <= (r + 3) * (r + 3)) rect(cx + x, cy + y, 1, 1, '#1d1b20');
}
function glassPanel(x, y, w, h) {
  box(x, y, w, h, GLASS);
  for (let j = 1; j < h - 1; j++) hline(x + 1, y + j, w - 2, '#4a5d72', 0.55 * (1 - j / h));
  line(x + 3, y + h - 2, x + Math.min(w, h) + 1, y + 1, '#c9e2f0', 0.55);
  line(x + 6, y + h - 2, x + Math.min(w, h) + 4, y + 1, '#c9e2f0', 0.3);
}
function headlight(x, y, w, h, tx, ty, r) {
  box(x, y, w, h, '#fff1c2');
  glowRect(x + 1, y + 1, w - 2, h - 2, '#fff8dd');
  light(tx, ty, r, '#fff0c4', 1);
}
function taillight(x, y, w, h) {
  box(x, y, w, h, '#c2463a');
  glowRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2), '#ff7a6a');
  light(x + w / 2, y + h / 2, 14, '#ff6a5a', 0.6);
}
function rider(x, gy, shirt, helmet) {
  box(x - 5, gy - 34, 11, 15, shirt);
  vline(x + 4, gy - 33, 13, shade(shirt, 0.8));
  ellipse(x, gy - 40, 6, 6, K.ol);
  ellipse(x, gy - 40, 5, 5, helmet);
  ellipse(x - 2, gy - 42, 2, 1, mix(helmet, '#ffffff', 0.4));
  rect(x + 2, gy - 40, 4, 2, GLASS);
  line(x + 3, gy - 30, x + 12, gy - 28, shade(shirt, 0.85));
  box(x - 2, gy - 20, 10, 5, '#3d4a63');
}

// ---------- truk ----------
const TRUCK = { L: 154, D: 26, H: 72, cabH: 58, boxL: 108, W: 53, Ly: 77, boxLy: 54 };
const CAB = { boks: '#405d84', pendingin: '#4e7f7a', bakkayu: '#e2b13c' };

function truckSide(kind, ox, gy) {
  const { L, D, H, cabH, boxL } = TRUCK;
  const cab = CAB[kind];
  shadowRect(ox + 4, gy - 3, L + 4, 7, 1);
  box(ox + 4, gy - 18, L - 8, 6, '#3a373d');
  if (kind === 'bakkayu') {
    // bak kayu bercat dengan muatan karung bertutup terpal diikat tali
    for (let i = 0; i < boxL - 4; i++) {
      const hump = 22 + Math.round(Math.sin(i / 7) * 3 + Math.sin(i / 2.7) * 1.5);
      for (let j = 0; j < hump + D; j++) {
        const y = gy - 52 - hump - D + j;
        rect(ox + 2 + i, y, 1, 1, j < 4 ? '#7fb0d6' : j < D ? '#5b8fbf' : j < D + 8 ? '#4a7fae' : '#3f6f9a');
      }
      rect(ox + 2 + i, gy - 52 - hump - D, 1, 1, K.ol);
    }
    for (let k = 0; k < 5; k++) line(ox + 6 + k * 22, gy - 52, ox + 20 + k * 22, gy - 52 - 24, '#e0d2a6');
    PLANKS.forEach((c, p) => {
      rect(ox, gy - 52 + p * 9, boxL, 9, c);
      hline(ox, gy - 52 + p * 9, boxL, mix(c, '#ffffff', 0.25));
      hline(ox, gy - 44 + p * 9, boxL, shade(c, 0.7));
    });
    for (let i = ox + 8; i < ox + boxL - 4; i += 14) {
      rect(i, gy - 34, 3, 3, '#fffaf2');
      rect(i + 1, gy - 33, 1, 1, K.yellow);
    }
    for (const px of [ox, ox + 36, ox + 72, ox + boxL - 4]) box(px, gy - 54, 5, 40, K.woodD);
    box(ox + boxL - 6, gy - 80, 7, 66, K.wood);
    rect(ox, gy - 54, boxL, 2, K.ol);
  } else {
    box(ox, gy - H - D, boxL, D + 1, BOX_TOP);
    for (let i = ox + 9; i < ox + boxL - 2; i += 9) vline(i, gy - H - D + 1, D - 1, '#e2dfd4');
    hline(ox + 1, gy - H - D + 1, boxL - 2, '#ffffff');
    box(ox, gy - H, boxL, H - 15, BOX);
    for (let i = ox + 5; i < ox + boxL - 2; i += 6) vline(i, gy - H + 1, H - 17, '#dcd8cc');
    hline(ox + 1, gy - H + 1, boxL - 2, '#faf8f2');
    const band = kind === 'pendingin' ? '#3f6f9a' : K.red;
    rect(ox + 1, gy - 38, boxL - 2, 5, band);
    rect(ox + 1, gy - 33, boxL - 2, 4, '#ffffff');
    label('KDMP', ox + boxL / 2 - 15, gy - H + 8, kind === 'pendingin' ? '#2f5577' : K.redD, 2);
    label(kind === 'pendingin' ? 'PENDINGIN' : 'MERAH PUTIH', ox + boxL / 2 - (kind === 'pendingin' ? 18 : 22), gy - H + 22, K.olS);
    vline(ox + 3, gy - H + 3, H - 20, '#c5c1b5');
    if (kind === 'pendingin') {
      box(ox + boxL - 24, gy - H - D - 12, 22, 16, '#cfd3d5');
      for (let j = gy - H - D - 9; j < gy - H - D + 2; j += 2) hline(ox + boxL - 21, j, 16, '#9ea4a8');
    }
  }
  taillight(ox, gy - 26, 3, 6);
  // kabin
  const cx = ox + boxL + 2;
  const cL = L - boxL - 2;
  box(cx, gy - cabH - D, cL, D + 1, mix(cab, '#ffffff', 0.18));
  hline(cx + 1, gy - cabH - D + 1, cL - 2, mix(cab, '#ffffff', 0.35));
  box(cx, gy - cabH, cL, cabH - 12, cab);
  hline(cx + 1, gy - cabH + 1, cL - 2, mix(cab, '#ffffff', 0.25));
  vline(cx + cL - 2, gy - cabH + 2, cabH - 15, shade(cab, 0.78));
  glassPanel(cx + 12, gy - cabH + 4, cL - 18, 18);
  ellipse(cx + cL - 18, gy - cabH + 13, 4, 4, '#3a2f2a', 0.75);
  vline(cx + 9, gy - cabH + 3, cabH - 16, shade(cab, 0.7));
  hline(cx + 13, gy - cabH + 28, 5, '#e9e6dc');
  rect(cx + 1, gy - 26, cL - 2, 3, '#f1ebd6');
  box(cx + cL - 2, gy - cabH + 6, 5, 11, '#2b282e');
  headlight(cx + cL - 5, gy - 30, 6, 6, cx + cL + 26, gy - 14, 40);
  box(cx + cL - 8, gy - 20, 12, 6, '#a4a29d');
  for (const wx of [ox + 22, ox + 42, cx + cL - 16]) {
    wheelWell(wx, gy - 9, 9);
    wheel(wx, gy - 9, 9);
  }
}

function truckFront(kind, ox, yr) {
  const { W, Ly, H, cabH, boxLy } = TRUCK;
  const cab = CAB[kind];
  const cx = ox + W / 2;
  const yf = yr + Ly;
  shadowRect(ox + 6, yf - 4, W + 4, 7, 1);
  if (kind === 'bakkayu') {
    for (let i = 0; i < W; i++) {
      const hump = 22 + Math.round(Math.sin(i / 5) * 3 + Math.sin(i / 2.2));
      for (let y = yr - 52 - hump; y < yr + 2; y++) rect(ox + i, y, 1, 1, y < yr - 48 - hump ? '#7fb0d6' : y < yr - 38 - hump ? '#5b8fbf' : '#3f6f9a');
      rect(ox + i, yr - 52 - hump, 1, 1, K.ol);
    }
    for (let k = 0; k < 3; k++) line(ox + 4 + k * 17, yr + 2, ox + 14 + k * 17, yr - 60, '#e0d2a6');
    PLANKS.slice(0, 3).forEach((c, p) => {
      rect(ox, yr - 24 + p * 7, W, 7, c);
      hline(ox, yr - 24 + p * 7, W, mix(c, '#ffffff', 0.25));
    });
    rect(ox, yr - 25, W, 1, K.ol);
  } else {
    box(ox, yr - H, W, boxLy + 1, BOX_TOP);
    for (let j = yr - H + 6; j < yr - H + boxLy; j += 6) hline(ox + 1, j, W - 2, '#e2dfd4');
    vline(ox + 1, yr - H + 1, boxLy - 1, '#ffffff');
    box(ox, yr + boxLy - H, W, H - cabH + 1, '#e2dfd4');
    if (kind === 'pendingin') {
      box(cx - 13, yr + boxLy - H - 3, 26, 17, '#cfd3d5');
      ellipse(cx - 6, yr + boxLy - H + 5, 4, 4, '#6f767b');
      ellipse(cx + 6, yr + boxLy - H + 5, 4, 4, '#6f767b');
    } else rect(ox + 1, yr + boxLy - H + 8, W - 2, 3, K.red);
  }
  // kabin: atap lalu muka
  const top = yr + boxLy - cabH;
  box(ox + 2, top, W - 4, Ly - boxLy + 1, mix(cab, '#ffffff', 0.18));
  hline(ox + 3, top + 1, W - 6, mix(cab, '#ffffff', 0.35));
  const face = yf - cabH;
  box(ox + 2, face, W - 4, cabH - 8, cab);
  hline(ox + 3, face + 1, W - 6, mix(cab, '#ffffff', 0.25));
  vline(ox + W - 4, face + 2, cabH - 11, shade(cab, 0.8));
  glassPanel(ox + 6, face + 3, W - 12, 18);
  ellipse(ox + 16, face + 12, 4, 4, '#3a2f2a', 0.75);
  hline(ox + 8, face + 20, 12, '#1d1b20');
  hline(ox + W - 20, face + 20, 12, '#1d1b20');
  rect(ox + 3, face + 24, W - 6, 2, '#f1ebd6');
  box(cx - 10, face + 30, 20, 11, '#2c2a30');
  for (let j = face + 32; j < face + 40; j += 2) hline(cx - 9, j, 18, '#5a575e');
  headlight(ox + 4, face + 31, 9, 6, cx, yf + 18, 50);
  headlight(ox + W - 13, face + 31, 9, 6, cx, yf + 18, 0);
  box(ox, face + 43, W, 7, '#a4a29d');
  hline(ox + 1, face + 44, W - 2, '#cfcdc8');
  box(cx - 8, face + 44, 16, 5, '#1f1d22');
  box(ox + 2, yf - 9, 10, 9, TIRE);
  box(ox + W - 12, yf - 9, 10, 9, TIRE);
  box(ox - 6, face + 4, 6, 13, '#2b282e');
  box(ox + W, face + 4, 6, 13, '#2b282e');
}

function truckBack(kind, ox, y0) {
  const { W, Ly, H, boxLy } = TRUCK;
  const cab = CAB[kind];
  const cx = ox + W / 2;
  const yb = y0 + Ly;
  shadowRect(ox + 6, yb - 4, W + 4, 7, 1);
  // Atap kabin di utara (lebih rendah) hanya tampak sebagai pita di atas atap boks.
  box(ox + 3, yb - H - boxLy - 9, W - 6, 11, mix(cab, '#ffffff', 0.18));
  if (kind === 'bakkayu') {
    for (let i = 0; i < W; i++) {
      const top = yb - H - boxLy - 4 + Math.round(Math.sin(i / 5 + 1) * 2 + 2);
      for (let y = top; y < yb - 52; y++) rect(ox + i, y, 1, 1, y < top + 4 ? '#7fb0d6' : y < yb - 70 ? '#5b8fbf' : '#3f6f9a');
      rect(ox + i, top, 1, 1, K.ol);
    }
    for (let k = 0; k < 3; k++) line(ox + 4 + k * 17, yb - 52, ox + 14 + k * 17, yb - 110, '#e0d2a6');
    PLANKS.forEach((c, p) => {
      rect(ox, yb - 52 + p * 9, W, 9, c);
      hline(ox, yb - 52 + p * 9, W, mix(c, '#ffffff', 0.25));
      hline(ox, yb - 44 + p * 9, W, shade(c, 0.7));
    });
    vline(ox, yb - 54, 40, K.ol);
    vline(ox + W - 1, yb - 54, 40, K.ol);
  } else {
    box(ox, yb - H - boxLy, W, boxLy + 1, BOX_TOP);
    for (let j = yb - H - boxLy + 6; j < yb - H; j += 6) hline(ox + 1, j, W - 2, '#e2dfd4');
    box(ox, yb - H, W, H - 16, BOX);
    vline(cx, yb - H + 2, H - 20, '#b9b5a9');
    for (const hx of [cx - 6, cx + 5]) box(hx, yb - H + 14, 2, 30, '#8d8a86');
    for (let i = 0; i < W; i += 6) rect(ox + i, yb - 22, 3, 3, i % 12 ? '#ffffff' : K.red);
    text('KDMP', cx - 7, yb - H + 4, kind === 'pendingin' ? '#2f5577' : K.redD);
  }
  taillight(ox + 1, yb - 20, 6, 5);
  taillight(ox + W - 7, yb - 20, 6, 5);
  box(ox, yb - 15, W, 6, '#4a4750');
  box(cx - 8, yb - 14, 16, 5, '#1f1d22');
  box(ox + 2, yb - 9, 12, 9, TIRE);
  box(ox + W - 14, yb - 9, 12, 9, TIRE);
}

// ---------- kendaraan kecil (tampak samping, menghadap kanan) ----------
function angkot(ox, gy) {
  const L = 100;
  const D = 20;
  const H = 47;
  const c = '#5e9a6a';
  shadowRect(ox + 4, gy - 3, L + 2, 6, 1);
  box(ox, gy - H - D, L - 6, D + 1, mix(c, '#ffffff', 0.25));
  for (let i = ox + 10; i < ox + L - 16; i += 20) box(i, gy - H - D - 3, 12, 4, '#3a373d');
  box(ox, gy - H, L, H - 10, c);
  hline(ox + 1, gy - H + 1, L - 2, mix(c, '#ffffff', 0.3));
  for (let i = 0; i < 4; i++) glassPanel(ox + 5 + i * 15, gy - H + 4, 13, 12);
  box(ox + 66, gy - H + 4, 15, 31, '#2a2a30');
  for (let j = gy - H + 10; j < gy - 14; j += 7) hline(ox + 67, j, 13, '#6b5a4a');
  glassPanel(ox + 83, gy - H + 4, 13, 12);
  rect(ox + 1, gy - 24, 64, 2, K.yellow);
  box(ox + L - 24, gy - H - D - 5, 18, 6, '#f1ebd6');
  headlight(ox + L - 4, gy - 22, 5, 5, ox + L + 22, gy - 10, 30);
  taillight(ox, gy - 22, 3, 5);
  box(ox + L - 6, gy - 15, 9, 5, '#a4a29d');
  for (const wx of [ox + 18, ox + L - 18]) {
    wheelWell(wx, gy - 8, 8);
    wheel(wx, gy - 8, 8);
  }
}
function pikap(ox, gy) {
  const L = 106;
  const D = 20;
  const c = '#d9d4c8';
  shadowRect(ox + 4, gy - 3, L + 2, 6, 1);
  box(ox + 2, gy - 17, L - 4, 5, '#3a373d');
  for (let i = 0; i < 4; i++) {
    const cx = ox + 4 + i * 15;
    box(cx, gy - 42, 14, 12, K.woodL);
    for (let k = 0; k < 4; k++) ellipse(cx + 3 + k * 2.6, gy - 42, 2, 2, ['#6fae5f', '#e88b3a', '#c2463a', '#f2c84b'][(i + k) % 4]);
    hline(cx + 1, gy - 36, 12, K.woodD);
  }
  box(ox, gy - 32, 66, 18, c);
  hline(ox + 1, gy - 31, 64, '#f1ebd6');
  rect(ox + 1, gy - 22, 64, 1, shade(c, 0.75));
  const cx = ox + 66;
  box(cx, gy - 46 - D, 40, D + 1, mix(c, '#ffffff', 0.3));
  box(cx, gy - 46, 40, 34, c);
  glassPanel(cx + 10, gy - 43, 24, 14);
  ellipse(cx + 26, gy - 36, 4, 4, '#3a2f2a', 0.75);
  vline(cx + 8, gy - 44, 30, shade(c, 0.75));
  headlight(cx + 36, gy - 24, 5, 5, cx + 60, gy - 10, 30);
  taillight(ox, gy - 28, 3, 5);
  box(cx + 34, gy - 15, 9, 5, '#a4a29d');
  for (const wx of [ox + 18, ox + L - 20]) {
    wheelWell(wx, gy - 8, 8);
    wheel(wx, gy - 8, 8);
  }
}
function motor(ox, gy) {
  const c = '#c2463a';
  shadowRect(ox + 2, gy - 2, 48, 5, 1);
  box(ox + 4, gy - 22, 22, 10, c);
  hline(ox + 5, gy - 21, 20, mix(c, '#ffffff', 0.3));
  box(ox + 6, gy - 26, 16, 5, '#2f2b30');
  box(ox + 30, gy - 28, 8, 18, c);
  vline(ox + 31, gy - 27, 16, mix(c, '#ffffff', 0.3));
  box(ox + 22, gy - 12, 10, 4, '#77746f');
  line(ox + 36, gy - 28, ox + 39, gy - 34, K.ol);
  hline(ox + 36, gy - 34, 7, K.ol);
  headlight(ox + 39, gy - 26, 4, 4, ox + 60, gy - 12, 22);
  taillight(ox + 2, gy - 20, 3, 3);
  rider(ox + 18, gy, '#5f84b3', '#f1ebd6');
  wheel(ox + 9, gy - 7, 7);
  wheel(ox + 38, gy - 7, 7);
}
function viar(ox, gy) {
  shadowRect(ox + 4, gy - 3, 72, 6, 1);
  box(ox, gy - 34, 40, 22, '#3f8a5a');
  hline(ox + 1, gy - 33, 38, '#5fae7a');
  box(ox, gy - 34 - 14, 40, 15, '#4f9a68');
  sackStack(ox + 6, gy - 52, 2, 1);
  box(ox + 38, gy - 18, 22, 5, '#3a373d');
  box(ox + 54, gy - 30, 8, 17, K.red);
  vline(ox + 55, gy - 29, 15, K.redL);
  line(ox + 60, gy - 30, ox + 64, gy - 37, K.ol);
  hline(ox + 61, gy - 37, 6, K.ol);
  headlight(ox + 63, gy - 28, 4, 4, ox + 82, gy - 14, 22);
  taillight(ox, gy - 26, 3, 4);
  rider(ox + 48, gy - 2, '#8a6e4e', '#e3bd57');
  wheel(ox + 12, gy - 7, 7);
  wheel(ox + 26, gy - 7, 7);
  wheel(ox + 64, gy - 7, 7);
}

/**
 * Daftar sprite kendaraan: nama berkas, ukuran isi (tanpa margin) dan jarak garis tanah dari
 * tepi atas isi. Jangkar sprite = (margin + panjang/2, margin + garis tanah).
 */
export const VEHICLES = [
  ...['boks', 'pendingin', 'bakkayu'].flatMap((kind) => [
    { name: `${kind}-samping`, w: TRUCK.L + 8, h: TRUCK.D + 82, ground: TRUCK.D + 80, draw: (ox, oy) => truckSide(kind, ox, oy + TRUCK.D + 80), mirror: true },
    { name: `${kind}-depan`, w: TRUCK.W, h: TRUCK.H + TRUCK.Ly + 4, ground: TRUCK.H + TRUCK.Ly, draw: (ox, oy) => truckFront(kind, ox, oy + TRUCK.H) },
    { name: `${kind}-belakang`, w: TRUCK.W, h: TRUCK.cabH + TRUCK.Ly + 4, ground: TRUCK.cabH + TRUCK.Ly, draw: (ox, oy) => truckBack(kind, ox, oy + TRUCK.cabH) },
  ]),
  { name: 'angkot-samping', w: 104, h: 74, ground: 70, draw: (ox, oy) => angkot(ox, oy + 70), mirror: true },
  { name: 'pikap-samping', w: 110, h: 72, ground: 68, draw: (ox, oy) => pikap(ox, oy + 68), mirror: true },
  { name: 'motor-samping', w: 50, h: 52, ground: 48, draw: (ox, oy) => motor(ox, oy + 48), mirror: true },
  { name: 'viar-samping', w: 76, h: 60, ground: 56, draw: (ox, oy) => viar(ox, oy + 56), mirror: true },
].flatMap((v) => {
  const right = { ...v, draw: withLabels(v.draw, false, 0) };
  if (!v.mirror) return [right];
  // Kanvas sprite = isi + margin di kedua sisi; jangkar tetap di tengah panjang.
  const canvasW = v.w + MARGIN * 2;
  return [right, { ...v, name: `${v.name}-kiri`, draw: withLabels(v.draw, true, canvasW) }];
});
