// Preview P1 v2 Dunia Koperasi: desa Indonesia bergaya Eastward (lapis ketinggian, fasad padat,
// garis tepi gelap, grading per suasana). Potongan kamera 480×270 diperbesar 3×, plus lembar
// kendaraan dan orang; tanpa dependensi.
// Jalankan: node scripts/dunia-pixel/preview.mjs [nama-suasana]  → artifacts/dunia-pixel/*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

let W = 480;
let H = 270;
const OUT = 'artifacts/dunia-pixel';

// ---------- kanvas ----------
let buf, emis, emisOn, shadowM, lights, rain, alpha;
let seed = 7;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];
const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function noise(x, y, s) {
  const gx = Math.floor(x / s);
  const gy = Math.floor(y / s);
  const sx = x / s - gx;
  const sy = y / s - gy;
  const fx = sx * sx * (3 - 2 * sx);
  const fy = sy * sy * (3 - 2 * sy);
  const a = hash(gx, gy) + (hash(gx + 1, gy) - hash(gx, gy)) * fx;
  const b = hash(gx, gy + 1) + (hash(gx + 1, gy + 1) - hash(gx, gy + 1)) * fx;
  return a + (b - a) * fy;
}
const cache = new Map();
const rgb = (c) => {
  if (typeof c !== 'string') return c;
  let v = cache.get(c);
  if (!v) {
    v = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    cache.set(c, v);
  }
  return v;
};
const shade = (c, f) => rgb(c).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

function px(x, y, c, a = 1) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (!inside(x, y)) return;
  const i = (y * W + x) * 3;
  const [r, g, b] = rgb(c);
  buf[i] += (r - buf[i]) * a;
  buf[i + 1] += (g - buf[i + 1]) * a;
  buf[i + 2] += (b - buf[i + 2]) * a;
  // Cakupan untuk sprite transparan (warna ter-premultiply terhadap latar hitam).
  if (alpha) alpha[y * W + x] += (1 - alpha[y * W + x]) * a;
  if (a >= 1) emisOn[y * W + x] = 0;
}
function mul(x, y, f) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (!inside(x, y)) return;
  const i = (y * W + x) * 3;
  const m = typeof f === 'number' ? [f, f, f] : f;
  buf[i] *= m[0];
  buf[i + 1] *= m[1];
  buf[i + 2] *= m[2];
}
function rect(x, y, w, h, c, a = 1) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c, a);
}
const hline = (x, y, w, c, a) => rect(x, y, w, 1, c, a);
const vline = (x, y, h, c, a) => rect(x, y, 1, h, c, a);
function box(x, y, w, h, fill, ol = K.ol) {
  rect(x, y, w, h, ol);
  if (w > 2 && h > 2) rect(x + 1, y + 1, w - 2, h - 2, fill);
}
function line(x0, y0, x1, y1, c, a = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= n; s++) px(x0 + ((x1 - x0) * s) / n, y0 + ((y1 - y0) * s) / n, c, a);
}
function ellipse(cx, cy, rx, ry, c, a = 1) {
  for (let y = -Math.ceil(ry); y <= ry; y++)
    for (let x = -Math.ceil(rx); x <= rx; x++)
      if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) px(cx + x, cy + y, c, a);
}
function noiseFill(x0, y0, w, h, shades, s = 18) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const n = noise(x, y, s) * 0.65 + noise(x + 99, y + 7, s / 3) * 0.35 + (rnd() - 0.5) * 0.14;
      px(x, y, shades[Math.max(0, Math.min(shades.length - 1, Math.floor(n * shades.length)))]);
    }
}
// Kotor/lapuk ala Eastward: makin bawah makin kusam, berbintik, ada leleran.
function grime(x, y, w, h, a = 0.35) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const t = j / h;
      if (rnd() < a * t * t * noise(x + i, y + j, 5) * 2) mul(x + i, y + j, 0.86);
    }
  for (let k = 0; k < w / 10; k++) {
    const sx = x + Math.floor(rnd() * w);
    const len = 3 + Math.floor(rnd() * h * 0.4);
    const sy = y + Math.floor(rnd() * Math.max(1, h - len));
    for (let j = 0; j < len; j++) mul(sx, sy + j, 0.92);
  }
}
function glowRect(x, y, w, h, c) {
  const v = rgb(c);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (!inside(x + i, y + j)) continue;
      const k = (y + j) * W + x + i;
      emisOn[k] = 1;
      emis.set(v, k * 3);
    }
}
// Jadikan pixel yang sudah tergambar menyala (papan lampu, etalase).
function glowFrom(x, y, w, h, f = 1.1) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (!inside(x + i, y + j)) continue;
      const k = (y + j) * W + x + i;
      emisOn[k] = 1;
      for (let c = 0; c < 3; c++) emis[k * 3 + c] = Math.min(255, buf[k * 3 + c] * f);
    }
}
const light = (x, y, r, c, s = 1) => lights.push({ x, y, r, c: rgb(c), s });
function shadowRect(x, y, w, h, a = 1) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (!inside(x + i, y + j)) continue;
      const k = (y + j) * W + x + i;
      shadowM[k] = Math.max(shadowM[k], a);
    }
}
function shadowEllipse(cx, cy, rx, ry, a = 1) {
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1 && inside(cx + x, cy + y)) {
        const k = (cy + y) * W + cx + x;
        shadowM[k] = Math.max(shadowM[k], a);
      }
}

// ---------- palet pastel yang menenangkan ----------
const K = {
  ol: '#3a2f36', olS: '#5a4a50',
  cream: '#fbf1dc', creamL: '#fffaf0', creamD: '#efdcbc', creamDD: '#d4bd98',
  tileA: '#b5a685', tileB: '#9e8f70',
  stone: ['#8c8576', '#958e7e', '#837c6e', '#9c9585'], stoneL: '#e6dde3', mortar: '#9f93a8',
  moss: '#8fc49a', mossL: '#b3dcb4',
  ground: ['#b9d8a6', '#c2dfae', '#accf9b', '#cbe5b7'],
  dry: '#ead39a', dryD: '#d3b778', green: '#8fcb8e', greenD: '#6fae7a',
  leafD: '#3d5a32', leaf: '#557540', leafM: '#6e8f4c', leafL: '#8fae5e', leafH: '#b5c878',
  trunk: '#9c7a6a', trunkL: '#bb9a86',
  red: '#c2463a', redD: '#8f2f2a', redL: '#f39a8e',
  white: '#fffaf2',
  blue: '#86b4e0', blueD: '#6a96c8', blueDD: '#557aa8', blueL: '#b4d4f0',
  teal: '#8dcfc6', tealD: '#6fb3aa', tealDD: '#5a948d', tealL: '#b6e6dc',
  orange: '#f5b98a', yellow: '#f6d37a', yellowD: '#d9b25a',
  wood: '#c8987a', woodD: '#a77a62', woodL: '#e0b896',
  glassD: '#5f7896', glass: '#7f9cbc', glassL: '#d6ecf8',
  seng: '#c3ccd6', sengD: '#a3aebb', sengL: '#e1e7ee',
  warm: '#ffd98f', skin: ['#f7d2b4', '#e6b08a', '#c48a66'], hair: '#4a3a3e',
};

// ---------- huruf 3×5 ----------
const FONT_ROWS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], '-': ['...', '...', '###', '...', '...'],
  ' ': ['...', '...', '...', '...', '...'],
};
function text(s, x, y, c, sc = 1) {
  for (const ch of s) {
    const g = FONT_ROWS[ch] || FONT_ROWS[' '];
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 3; i++) if (g[j][i] === '#') rect(x + i * sc, y + j * sc, sc, sc, c);
    x += 4 * sc;
  }
}
const textW = (s, sc = 1) => (s.length * 4 - 1) * sc;
function signBoard(cx, y, s, bg, fg, sc = 1, lit = true) {
  const w = textW(s, sc) + 6 * sc;
  const h = 9 * sc;
  const x = Math.round(cx - w / 2);
  box(x, y, w, h, bg);
  hline(x + 1, y + 1, w - 2, shade(bg, 1.15));
  hline(x + 1, y + h - 2, w - 2, shade(bg, 0.82));
  text(s, x + 3 * sc, y + 2 * sc, fg, sc);
  if (lit) {
    glowFrom(x + 1, y + 1, w - 2, h - 2, 1.12);
    light(cx, y + h, w * 0.7, rgb(bg).map((v) => Math.min(255, v + 60)), 0.55);
  }
}

// ---------- bagian bangunan ----------
function win(x, y, w, h, o = {}) {
  const frame = o.frame || K.creamL;
  box(x - 2, y - 2, w + 4, h + 4, frame);
  rect(x, y, w, h, K.glassD);
  for (let j = 0; j < h; j++) hline(x, y + j, w, K.glass, 0.55 * (1 - j / h));
  const m = Math.min(h, w);
  line(x + 1, y + m - 2, x + m - 2, y + 1, K.glassL, 0.6);
  line(x + 3, y + m - 2, x + m - 1, y + 2, K.glassL, 0.3);
  const cw = Math.floor(w * 0.42);
  if (o.curtain) {
    rect(x, y, cw, h, o.curtain);
    for (let i = 1; i < cw; i += 2) vline(x + i, y, h, shade(o.curtain, 0.82));
    rect(x + w - cw + 2, y, cw - 2, h, o.curtain);
  }
  if (o.blinds) for (let j = 1; j < h; j += 2) hline(x, y + j, w, K.creamD, 0.55);
  const mid = w > 12 && !o.single;
  if (mid) vline(x + Math.floor(w / 2), y, h, frame);
  box(x - 3, y + h + 1, w + 6, 3, K.creamD);
  for (let i = 0; i < w + 6; i++) mul(x - 3 + i, y + h + 4, 0.75);
  if (o.lit === false) return;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (!inside(x + i, y + j)) continue;
      const k = (y + j) * W + x + i;
      const isMid = mid && i === Math.floor(w / 2);
      const isCurtain = o.curtain && (i < cw || i >= w - cw + 2);
      const c = isMid ? shade(frame, 0.55) : isCurtain ? shade('#f0a860', 1 - (i % 2) * 0.12) : shade('#ffd68a', 1.04 - (j / h) * 0.25);
      emisOn[k] = 1;
      emis.set(c, k * 3);
    }
  light(x + w / 2, y + h + 8, 18 + w, K.warm, 0.75);
}
function acUnit(x, y) {
  box(x, y, 14, 10, '#d9d6cc');
  hline(x + 1, y + 1, 12, '#efece2');
  ellipse(x + 9, y + 5, 3, 3, '#8d8a82');
  for (let j = -2; j <= 2; j += 2) hline(x + 7, y + 5 + j, 5, '#5c5953');
  for (let j = y + 3; j < y + 8; j += 2) hline(x + 2, j, 3, '#a9a59a');
  vline(x + 2, y + 10, 8, '#8d8a82');
  for (let j = 0; j < 14; j++) mul(x + j, y + 10, 0.75);
}
function pipe(x, y, h, c = K.sengD) {
  vline(x, y, h, K.ol);
  vline(x + 1, y, h, shade(c, 1.2));
  vline(x + 2, y, h, c);
  vline(x + 3, y, h, K.ol);
  for (let j = y + 6; j < y + h; j += 14) box(x - 1, j, 6, 3, shade(c, 0.85));
}
function poster(x, y, w, h, c) {
  box(x, y, w, h, c);
  for (let j = y + 3; j < y + h - 2; j += 3) hline(x + 2, j, Math.floor((w - 4) * (0.5 + rnd() * 0.5)), shade(c, 0.6));
  rect(x + 2, y + 2, Math.min(5, w - 4), 2, K.white);
}
function plant(x, by, kind = 0) {
  box(x, by - 6, 8, 6, kind % 2 ? '#b8613f' : '#6f86a0');
  hline(x + 1, by - 5, 6, kind % 2 ? '#d4805c' : '#91a8c0');
  for (let k = 0; k < 7; k++) {
    const lx = x + 4 + Math.round((rnd() - 0.5) * 9);
    const ly = by - 8 - Math.round(rnd() * 7);
    line(x + 4, by - 6, lx, ly, K.leafD);
    ellipse(lx, ly, 2, 1, pick([K.leafM, K.leafL, K.leaf]));
  }
  if (kind === 2) for (let k = 0; k < 3; k++) px(x + 1 + rnd() * 6, by - 10 - rnd() * 4, K.redL);
}
function railBollards(x0, x1, y) {
  rect(x0, y - 6, x1 - x0, 3, K.ol);
  hline(x0, y - 5, x1 - x0, K.tealL);
  for (let x = x0 + 2; x < x1 - 4; x += 18) {
    box(x, y - 10, 7, 11, K.creamL);
    hline(x + 1, y - 9, 5, '#fffaea');
    vline(x + 5, y - 9, 9, K.creamD);
    shadowRect(x + 7, y - 2, 4, 2, 0.8);
  }
}
function stoneWall(x, y, w, h) {
  rect(x, y, w, h, K.mortar);
  for (let ry = y, r = 0; ry < y + h; ry += 7, r++)
    for (let bx = x - (r % 2) * 8; bx < x + w; bx += 16) {
      const c = pick(K.stone);
      for (let j = 1; j < 7 && ry + j < y + h; j++)
        for (let i = 1; i < 15; i++) if (bx + i >= x && bx + i < x + w) px(bx + i, ry + j, j === 1 ? K.stoneL : rnd() < 0.15 ? shade(c, 0.88) : c);
    }
  for (let k = 0; k < w / 5; k++) {
    const mx = x + Math.floor(rnd() * w);
    const len = 2 + Math.floor(rnd() * 9);
    for (let j = 0; j < len; j++) px(mx, y + j, j < 2 ? K.mossL : K.moss);
  }
  for (let j = 0; j < 4; j++) for (let i = 0; i < w; i++) mul(x + i, y + j, 0.72 + j * 0.07);
  grime(x, y, w, h, 0.4);
}
function stairs(x, y, w, h) {
  box(x - 5, y, 5, h, K.stone[0]);
  box(x + w, y, 5, h, K.stone[2]);
  for (let sy = y; sy < y + h; sy += 6) {
    rect(x, sy, w, 2, K.creamL);
    rect(x, sy + 2, w, 4, K.creamDD);
    hline(x, sy + 5, w, K.olS);
  }
  vline(x - 3, y - 12, h + 10, K.tealD);
  vline(x + w + 2, y - 12, h + 10, K.tealD);
}
function checker(x, y, w, h, s = 8) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      px(x + i, y + j, (Math.floor((x + i) / s) + Math.floor((y + j) / s)) % 2 ? K.tileA : K.tileB);
      if ((x + i) % s === 0 || (y + j) % s === 0) mul(x + i, y + j, 0.93);
      if (rnd() < noise(x + i, y + j, 9) * 0.18) mul(x + i, y + j, 0.92);
    }
}
function awning(x, y, w, h, c1, c2) {
  for (let i = 0; i < w; i++) {
    const c = Math.floor(i / 5) % 2 ? c2 : c1;
    for (let j = 0; j < h; j++) px(x + i, y + j, shade(c, 0.88 + (j / h) * 0.18));
    const sc = Math.round(Math.sin(((i % 5) / 5) * Math.PI) * 2);
    vline(x + i, y + h, sc + 1, c);
    px(x + i, y + h + sc + 1, K.ol);
  }
  hline(x, y, w, K.ol);
  hline(x, y + 1, w, shade(c1, 0.7));
  vline(x, y, h + 2, K.ol);
  vline(x + w - 1, y, h + 2, K.ol);
  for (let i = 0; i < w; i++) for (let j = 0; j < 5; j++) mul(x + i, y + h + 3 + j, 0.68 + j * 0.06);
}
function tree(cx, by, r, sd = 1) {
  const s0 = seed;
  seed = sd * 977;
  shadowEllipse(cx + Math.round(r * 0.5), by, Math.round(r * 1.1), Math.max(3, Math.round(r * 0.35)), 1);
  box(cx - 3, by - r, 7, r + 1, K.trunk);
  vline(cx - 1, by - r, r, K.trunkL);
  const cy = by - r - Math.round(r * 0.45);
  const blobs = [];
  for (let k = 0; k < 9; k++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * r * 0.75;
    blobs.push({ x: cx + Math.round(Math.cos(a) * d), y: cy + Math.round(Math.sin(a) * d * 0.7), r: Math.round(r * (0.42 + rnd() * 0.22)) });
  }
  blobs.push({ x: cx, y: cy, r: Math.round(r * 0.62) });
  blobs.sort((a, b) => a.y - b.y);
  for (const b of blobs) ellipse(b.x, b.y, b.r + 1, b.r * 0.85 + 1, K.ol);
  for (const b of blobs) ellipse(b.x, b.y, b.r, b.r * 0.85, K.leafD);
  for (const b of blobs) ellipse(b.x - 1, b.y - 1, b.r - 1, b.r * 0.85 - 1, K.leaf);
  for (const b of blobs) ellipse(b.x - 2, b.y - 2, Math.max(1, b.r - 3), Math.max(1, b.r * 0.85 - 3), K.leafM);
  for (const b of blobs) ellipse(b.x - 3, b.y - 3, Math.max(1, b.r * 0.35), Math.max(1, b.r * 0.28), K.leafL);
  for (let k = 0; k < r * 2.5; k++) {
    const b = pick(blobs);
    px(b.x - b.r * 0.5 + rnd() * b.r * 0.6, b.y - b.r * 0.5 + rnd() * b.r * 0.4, rnd() < 0.5 ? K.leafH : K.leafL);
  }
  seed = s0;
}
function tuft(x, by, dry = true, n = 6) {
  for (let k = 0; k < n; k++) {
    const sx = x + k * 1.5;
    const tx = sx + (rnd() - 0.5) * 6;
    const ty = by - 5 - rnd() * 8;
    line(sx, by, tx, ty, dry ? (rnd() < 0.5 ? K.dry : K.dryD) : rnd() < 0.5 ? K.green : K.greenD);
    px(tx, ty, dry ? '#e8cf86' : K.leafH);
  }
}
function bunting(x0, y0, x1, y1, sag) {
  const n = Math.abs(x1 - x0);
  for (let s = 0; s <= n; s++) {
    const t = s / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    px(x, y, K.ol);
    if (s % 9 === 0 && s > 0 && s < n - 4) {
      const c = (s / 9) % 2 ? K.red : K.white;
      for (let j = 0; j < 6; j++) hline(x + Math.floor(j / 2), y + 1 + j, 6 - j, c);
    }
  }
}
function pole(x, by, h) {
  shadowRect(x + 3, by - 2, 16, 2, 0.8);
  box(x - 2, by - h, 6, h, K.woodD);
  vline(x, by - h + 1, h - 2, K.wood);
  box(x - 14, by - h + 6, 29, 4, K.woodD);
  box(x - 10, by - h + 16, 21, 3, K.woodD);
  for (const dx of [-12, -4, 6, 12]) box(x + dx, by - h + 3, 3, 4, K.creamL);
  box(x + 4, by - h + 22, 10, 14, K.seng);
  hline(x + 5, by - h + 23, 8, K.sengL);
  for (let j = 0; j < 3; j++) hline(x + 5, by - h + 27 + j * 3, 8, K.sengD);
  return [x - 11, by - h + 6, x + 13, by - h + 6];
}
function wire(x0, y0, x1, y1, sag) {
  const n = Math.abs(x1 - x0);
  for (let s = 0; s <= n; s++) {
    const t = s / n;
    px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag, K.ol, 0.85);
  }
}
function sackStack(x, y, cols = 2, rows = 2) {
  box(x - 1, y + rows * 7, cols * 13 + 2, 4, K.wood);
  for (let i = 0; i < cols * 13 + 2; i += 5) vline(x + i, y + rows * 7 + 1, 2, K.woodD);
  for (let r = rows - 1; r >= 0; r--)
    for (let c = 0; c < cols; c++) {
      const sx = x + c * 13 + (r % 2) * 2;
      const sy = y + r * 7;
      box(sx, sy, 13, 8, '#e9e0c6');
      hline(sx + 1, sy + 1, 11, '#f8f2df');
      hline(sx + 2, sy + 4, 9, r % 2 ? K.blue : K.red);
      vline(sx + 11, sy + 1, 6, '#cbbf9f');
    }
  shadowRect(x + cols * 13, y + 3, 5, rows * 7 + 2, 0.9);
}
function crate(x, y, fill) {
  box(x, y, 14, 9, K.woodL);
  for (let i = 0; i < 5; i++) ellipse(x + 2 + i * 2.5, y + 2, 1.5, 1, i % 2 ? fill : shade(fill, 1.2));
  hline(x + 1, y + 4, 12, K.woodD);
  hline(x + 1, y + 7, 12, K.woodD);
}
function lpg(x, by) {
  box(x, by - 9, 7, 9, '#7cb04f');
  vline(x + 1, by - 8, 7, '#a3d276');
  box(x + 2, by - 12, 3, 3, '#bdbdb5');
}
function lamp(x, by, h = 34) {
  shadowRect(x + 2, by - 1, 10, 2, 0.8);
  box(x - 1, by - h, 4, h, K.blueDD);
  box(x - 4, by - h - 4, 10, 5, K.blueDD);
  rect(x - 3, by - h, 8, 2, '#fff1c4');
  glowRect(x - 3, by - h, 8, 2, '#fff4cf');
  light(x + 1, by - h * 0.3, 44, '#ffc672', 1.1);
}
function motorSide(x, by, c) {
  shadowEllipse(x + 12, by, 13, 2, 1);
  ellipse(x + 4, by - 4, 4, 4, K.ol); ellipse(x + 4, by - 4, 2, 2, '#77746f');
  ellipse(x + 20, by - 4, 4, 4, K.ol); ellipse(x + 20, by - 4, 2, 2, '#77746f');
  box(x + 1, by - 13, 13, 8, c);
  hline(x + 2, by - 12, 11, shade(c, 1.3));
  box(x + 2, by - 16, 11, 4, '#2f2b30');
  hline(x + 3, by - 15, 8, '#4a4550');
  box(x + 11, by - 7, 8, 3, '#77746f');
  box(x + 17, by - 17, 5, 13, c);
  vline(x + 18, by - 16, 11, shade(c, 1.3));
  line(x + 19, by - 17, x + 21, by - 21, K.ol);
  hline(x + 18, by - 21, 6, K.ol);
  px(x + 22, by - 15, '#fff1c2');
}
function puddle(x, y, w) {
  if (!rain) return;
  ellipse(x, y, w, Math.max(2, Math.round(w / 3.5)), '#8ea2bf', 0.6);
  hline(x - w / 2, y - 1, w * 0.6, '#d0dcec', 0.7);
  light(x, y, w * 1.4, '#ffd9a0', 0.25);
}

// ---------- karakter v4 (±30×56, pose dan arah) ----------
const mix = (a, b, t) => rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t));
// Rentang baris kepala tampak depan dan samping (kolom kiri, kanan) untuk baris 4..26.
const HEAD_FRONT = { 4: [10, 19], 5: [8, 21], 6: [7, 22], 7: [6, 23], 22: [6, 23], 23: [6, 23], 24: [7, 22], 25: [8, 21], 26: [10, 19] };
const HEAD_SIDE = { 4: [9, 18], 5: [7, 20], 6: [6, 21], 7: [5, 22], 21: [6, 23], 22: [6, 23], 23: [6, 23], 24: [7, 22], 25: [9, 21], 26: [11, 19] };
const headSpan = (y, side) => (side ? HEAD_SIDE : HEAD_FRONT)[y] || (y >= 8 && y <= (side ? 20 : 21) ? (side ? [5, 23] : [5, 24]) : null);
/**
 * Orang bergaya Eastward. cx = tengah badan, by = baris telapak kaki.
 * o.pose: diam | jalan | lambai | angkat | duduk; o.side: tampak samping menghadap kanan; o.flip: cermin.
 */
function person(cx, by, o) {
  const SW = 80;
  const SH = 96;
  const OX = 25;
  const OY = 26;
  const cells = new Array(SW * SH).fill(null);
  const side = !!o.side;
  const pose = o.pose || 'diam';
  const set = (x, y, c) => {
    const lx = o.flip ? 29 - Math.floor(x) : Math.floor(x);
    const X = lx + OX;
    const Y = Math.floor(y) + OY;
    if (X >= 0 && Y >= 0 && X < SW && Y < SH) cells[Y * SW + X] = c ? rgb(c) : null;
  };
  const fill = (x0, y0, w, h, c) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x0 + i, y0 + j, c);
  };
  const thick = (x0, y0, x1, y1, w, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= n; s++) fill(Math.round(x0 + ((x1 - x0) * s) / n), Math.round(y0 + ((y1 - y0) * s) / n), w, 1, typeof c === 'function' ? c(s / n) : c);
  };
  const kid = !!o.kid;
  const sit = pose === 'duduk';
  const tt = 28;
  const tb = kid ? 38 : 44;
  const lb = kid ? 44 : 53;
  const ft = lb + 3;
  const sk = o.skin;
  const skS = shade(sk, 0.87);
  const skD = shade(sk, 0.75);
  const skL = shade(sk, 1.05);
  const tone = (c) => ({ b: rgb(c), s: shade(c, 0.84), d: shade(c, 0.72), l: mix(c, '#ffffff', 0.22) });
  const tp = tone(o.top);
  const pa = tone(o.pants);
  const hair = o.hair || K.hair;
  const hS = shade(hair, 0.72);
  const hL = mix(hair, '#c9b8d8', 0.45);
  const topAt = (x, y, lvl) => {
    if (o.batik) {
      if (x % 5 === 2 && y % 5 === 2) return o.batik;
      if ((x + y) % 5 === 0 && (x - y + 50) % 5 === 0) return shade(o.batik, 0.6);
    }
    return tp[lvl];
  };
  const shoe = o.shoes || '#5b4a52';

  // rambut panjang di belakang
  if (o.hairStyle === 'panjang' && !o.hijab) fill(side ? 5 : 3, 8, side ? 12 : 24, kid ? 24 : 30, hS);

  // ----- kaki -----
  const shoeAt = (x0, x1, y0) => {
    for (let y = y0; y <= y0 + 2; y++)
      for (let x = x0; x <= x1; x++) set(x, y, y === y0 ? mix(shoe, '#ffffff', 0.25) : x === x1 ? shade(shoe, 0.8) : shoe);
    set(x0 + 1, y0, mix(shoe, '#ffffff', 0.55));
  };
  const legCol = (x, l, r) => (x === l ? pa.l : x === r ? pa.d : x === r - 1 ? pa.s : pa.b);
  if (sit) {
    fill(9, tb + 1, 12, 4, pa.b);
    for (let x = 9; x <= 20; x++) set(x, tb + 4, pa.s);
    for (const [l, r] of [[9, 13], [16, 20]]) for (let y = tb + 5; y <= tb + 9; y++) for (let x = l; x <= r; x++) set(x, y, legCol(x, l, r));
    shoeAt(8, 13, tb + 10);
    shoeAt(16, 21, tb + 10);
  } else if (o.skirt) {
    const swing = pose === 'jalan' ? 1 : 0;
    for (let y = tb - 2; y <= lb; y++) {
      const g = Math.floor((y - tb + 2) / 4);
      for (let x = 8 - g; x <= 21 + g + (y > lb - 3 ? swing : 0); x++)
        set(x, y, x >= 19 + g ? pa.s : x <= 9 - g ? pa.l : (x === 12 || x === 17) && y > tb ? pa.s : pa.b);
    }
    if (side) {
      shoeAt(15, 21, lb + 1);
      if (pose === 'jalan') shoeAt(8, 13, lb);
    } else {
      shoeAt(9, 13, lb + 1 - swing);
      shoeAt(16, 20, lb + 1);
    }
  } else if (side) {
    if (pose === 'jalan') {
      thick(13, tb + 1, 9, lb, 5, (t) => (t > 0.5 ? pa.s : pa.d));
      thick(15, tb + 1, 19, lb, 5, (t) => (t < 0.2 ? pa.b : pa.b));
      for (let y = tb + 1; y <= lb; y++) set(15 + Math.round(((y - tb) / (lb - tb)) * 4) + 4, y, pa.d);
      shoeAt(6, 11, lb);
      shoeAt(18, 24, lb + 1);
    } else {
      for (let y = tb + 1; y <= lb; y++) for (let x = 12; x <= 17; x++) set(x, y, legCol(x, 12, 17));
      shoeAt(12, 20, lb + 1);
    }
  } else {
    const lift = pose === 'jalan' ? 2 : 0;
    fill(9, tb + 1, 12, 3, pa.b);
    for (let y = tb + 1; y <= lb - lift; y++) for (let x = 9; x <= 13; x++) set(x, y, legCol(x, 9, 13));
    for (let y = tb + 1; y <= lb; y++) for (let x = 16; x <= 20; x++) set(x, y, legCol(x, 16, 20));
    fill(14, tb + 1, 2, 3, pa.s);
    set(11, tb + 6, pa.s);
    set(18, tb + 6, pa.s);
    shoeAt(8, 13, lb + 1 - lift);
    shoeAt(16, 21, lb + 1);
  }

  // ----- badan -----
  const coatEnd = o.coat ? tb + 6 : tb - 1;
  const [bx0, bx1] = side ? [10, 20] : [8, 21];
  for (let y = tt; y <= coatEnd; y++) {
    const inset = y === tt ? 2 : y === tt + 1 ? 1 : 0;
    for (let x = bx0 + inset; x <= bx1 - inset; x++) {
      const lvl = x >= bx1 - 1 ? 'd' : x >= bx1 - 3 ? 's' : x <= bx0 + 1 && y < tt + 8 ? 'l' : 'b';
      set(x, y, o.coat ? (lvl === 'd' ? shade(K.white, 0.86) : lvl === 's' ? shade(K.white, 0.94) : K.white) : topAt(x, y, lvl));
    }
  }
  if (!o.coat && !o.skirt && !sit) {
    fill(bx0, tb - 1, bx1 - bx0 + 1, 1, o.belt || '#6b5058');
    if (!side) fill(14, tb - 1, 2, 1, '#e8c66a');
  }
  if (!side) {
    for (const [x, y] of [[11, tb - 4], [12, tb - 3], [18, tb - 4], [17, tb - 3]]) if (!o.coat) set(x, y, tp.s);
    if (o.coat) {
      fill(14, tt, 2, 8, o.top);
      line(13, tt, 14, tt + 8, K.creamDD);
      line(16, tt, 15, tt + 8, K.creamDD);
      fill(10, tt + 11, 3, 1, K.creamDD);
      fill(17, tt + 11, 3, 1, K.creamDD);
    } else if (o.shirt === 'kaos') {
      fill(13, tt, 4, 1, skS);
      fill(12, tt + 1, 6, 1, tp.s);
    } else {
      const acc = o.accent || tp.s;
      for (const [x, y] of [[11, tt], [12, tt], [12, tt + 1], [13, tt + 1], [17, tt], [18, tt], [17, tt + 1], [16, tt + 1], [14, tt + 2], [15, tt + 2]]) set(x, y, acc);
      for (const [x, y] of [[13, tt], [14, tt], [15, tt], [16, tt], [14, tt + 1], [15, tt + 1]]) set(x, y, skS);
      for (let y = tt + 5; y < tb - 2; y += 3) set(15, y, tp.d);
      fill(10, tt + 6, 3, 1, tp.s);
    }
    if (o.uniform) {
      fill(10, tt + 4, 3, 1, K.red);
      fill(10, tt + 5, 3, 1, '#fff6ea');
    }
  }
  if (o.apron) {
    for (let y = tt + 3; y <= tb + 4; y++) for (let x = (side ? 15 : 10); x <= (side ? 21 : 19); x++) set(x, y, x >= (side ? 20 : 18) ? shade(o.apron, 0.86) : o.apron);
    fill(side ? 16 : 12, tt + 10, side ? 4 : 6, 3, shade(o.apron, 0.8));
  }

  // ----- lengan -----
  const sleeveEnd = o.longSleeve || o.coat || o.batik ? tb - 4 : tt + 7;
  const sleeveC = (x, y, lvl) => (o.coat ? (lvl === 'd' || lvl === 's' ? shade(K.white, 0.88) : K.white) : topAt(x, y, lvl));
  const armDown = (ax, y0, y1, lvlL, lvlR) => {
    for (let y = y0; y <= y1; y++)
      for (let i = 0; i < 4; i++) {
        const lvl = i === 0 ? lvlL : i === 3 ? lvlR : i === 2 ? 's' : 'b';
        set(ax + i, y, y <= sleeveEnd ? sleeveC(ax + i, y, lvl) : i === 3 ? skS : i === 0 ? skL : sk);
      }
    for (let i = 0; i < 4; i++) set(ax + i, y1 + 1, skS);
    set(ax + 1, y1 + 2, skS);
    set(ax + 2, y1 + 2, skS);
  };
  if (side) {
    if (pose === 'jalan') {
      thick(13, tt + 2, 18, tb - 1, 4, (t) => (t < (sleeveEnd - tt) / (tb - tt) ? sleeveC(15, tt, 's') : sk));
      fill(18, tb - 1, 3, 3, skS);
    } else if (pose === 'angkat') {
      thick(14, tt + 2, 20, tt + 9, 4, sleeveC(15, tt, 's'));
    } else armDown(13, tt + 2, tb - 2, 'l', 'd');
  } else if (pose === 'angkat') {
    armDown(4, tt + 1, tt + 9, 'l', 's');
    armDown(22, tt + 1, tt + 9, 's', 'd');
  } else {
    const swing = pose === 'jalan';
    armDown(4 + (swing ? 1 : 0), tt + 1, tb - 2 - (swing ? 2 : 0), 'l', 's');
    if (pose === 'lambai') {
      thick(23, tt + 2, 26, tt - 9, 4, (t) => (t < 0.4 && sleeveEnd > tt + 5 ? sleeveC(24, tt, 's') : t < 0.25 ? sleeveC(24, tt, 's') : sk));
      fill(25, tt - 13, 4, 4, sk);
      for (const x of [25, 27]) set(x, tt - 14, sk);
      fill(25, tt - 10, 4, 1, skS);
    } else armDown(22 - (swing ? 1 : 0), tt + 1, tb - 2 + (swing ? 1 : 0), 's', 'd');
    for (let y = tt + 3; y <= tb - 3; y++) {
      set(8, y, K.ol);
      if (pose !== 'lambai') set(21, y, K.ol);
    }
  }

  // ----- kepala -----
  for (let y = 4; y <= 26; y++) {
    const sp = headSpan(y, side);
    if (!sp) continue;
    for (let x = sp[0]; x <= sp[1]; x++) set(x, y, (!side && x >= 22) || y >= 24 ? skS : x <= 6 && y >= 10 && y <= 18 ? skL : sk);
  }
  fill(13, 26, 4, 2, skD);
  const blush = mix(sk, '#f08a8a', 0.4);
  const eye = (x) => {
    fill(x, 16, 2, 3, K.ol);
    set(x, 16, '#ffffff');
  };
  if (side) {
    for (let y = 16; y <= 19; y++) set(12, y, skS);
    set(12, 17, skD);
    set(24, 18, sk);
    set(24, 19, skS);
    eye(20);
    for (const x of [19, 20, 21, 22]) set(x, 14, hS);
    fill(19, 20, 2, 1, blush);
    fill(21, 22, 2, 1, skD);
  } else {
    for (let y = 16; y <= 19; y++) {
      set(4, y, skS);
      set(25, y, skD);
    }
    eye(10);
    eye(18);
    for (const x of [9, 10, 11, 12, 17, 18, 19, 20]) set(x, 14, hS);
    fill(7, 20, 3, 1, blush);
    fill(20, 20, 3, 1, blush);
    set(15, 19, skS);
    const mouth = mix(sk, '#b85a68', 0.55);
    if (o.talk) fill(14, 22, 2, 2, mouth);
    else {
      set(13, 22, skD);
      fill(14, 23, 2, 1, mouth);
      set(16, 22, skD);
    }
    if (o.glasses) {
      for (const gx of [8, 16]) {
        fill(gx, 15, 6, 1, '#5b4a52');
        fill(gx, 19, 6, 1, '#5b4a52');
        set(gx, 16, '#5b4a52');
        set(gx, 17, '#5b4a52');
        set(gx, 18, '#5b4a52');
        set(gx + 5, 16, '#5b4a52');
        set(gx + 5, 17, '#5b4a52');
        set(gx + 5, 18, '#5b4a52');
      }
      fill(14, 16, 2, 1, '#5b4a52');
    }
  }

  // ----- rambut dan penutup kepala -----
  const hairPx = (x, y) => set(x, y, (!side && x >= 21) || (side && x <= 8) ? hS : hair);
  if (!o.hijab) {
    const capRows = { 2: [10, 19], 3: [8, 21], 4: [6, 23], 5: [5, 24] };
    for (let y = 2; y <= 11; y++) {
      const [a, b] = capRows[y] || [4, 25];
      for (let x = side ? Math.max(a, 4) : a; x <= (side ? Math.min(b, 23) : b); x++) hairPx(x, y);
    }
    const style = o.hairStyle || 'pendek';
    if (side) {
      for (let y = 12; y <= (style === 'panjang' ? 34 : 21); y++) for (let x = 5; x <= (y < 16 ? 12 : 10); x++) hairPx(x, y);
      for (const x of [17, 18, 19, 20, 21, 22]) hairPx(x, 12);
      for (const x of [19, 20, 21]) hairPx(x, 13);
    } else {
      const fringe = style === 'rapi' ? [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 22, 23, 24, 25] : style === 'panjang' ? [4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 21, 22, 23, 24, 25] : [4, 5, 6, 7, 8, 11, 12, 13, 17, 18, 19, 22, 23, 24, 25];
      for (const x of fringe) hairPx(x, 12);
      for (const x of style === 'rapi' ? [4, 5, 6, 7, 8, 9, 10, 24, 25] : [4, 5, 6, 23, 24, 25]) hairPx(x, 13);
      for (let y = 12; y <= 17; y++) {
        hairPx(4, y);
        hairPx(25, y);
      }
      if (style === 'panjang')
        for (let y = 12; y <= (kid ? 32 : 38); y++) {
          for (const x of [3, 4, 5]) hairPx(x, y);
          for (const x of [24, 25, 26]) set(x, y, hS);
        }
      if (style === 'kuncir') {
        for (const [x0, x1] of [[0, 3], [26, 29]]) fill(x0, 8, x1 - x0 + 1, 7, hair);
        fill(3, 9, 1, 2, K.red);
        fill(26, 9, 1, 2, K.red);
      }
      if (style === 'rapi') for (let y = 3; y <= 8; y++) set(10, y, hS);
    }
    for (const [x, y] of [[9, 3], [10, 3], [11, 3], [12, 3], [7, 4], [8, 4], [9, 4], [10, 4], [6, 5], [7, 5], [8, 5], [6, 6]]) set(x, y, hL);
    for (const [x, y] of [[13, 7], [17, 8], [20, 6], [10, 9], [15, 5]]) set(x, y, hS);
  }
  if (o.peci)
    for (let y = 1; y <= 9; y++)
      for (let x = y === 1 ? 7 : 6; x <= (y === 1 ? 22 : 23); x++)
        set(x, y, y === 1 ? '#6a6478' : y === 9 ? '#3a3542' : x <= 8 ? '#544e60' : x >= 21 ? '#2c2832' : '#3d3846');
  if (o.helm) {
    for (let y = 1; y <= 10; y++) {
      const [a, b] = y === 1 ? [10, 19] : y === 2 ? [8, 21] : [6, 23];
      for (let x = a; x <= b; x++) set(x, y, x <= 11 && y <= 4 ? '#fff0b8' : x >= 21 ? K.yellowD : K.yellow);
    }
    fill(3, 11, 24, 1, K.yellowD);
    fill(14, 2, 2, 8, K.yellowD);
  }
  if (o.cap) {
    for (let y = 3; y <= 10; y++) {
      const [a, b] = y === 3 ? [9, 20] : [6, 23];
      for (let x = a; x <= b; x++) set(x, y, x >= 21 ? shade(o.cap, 0.8) : x <= 9 && y <= 6 ? mix(o.cap, '#ffffff', 0.25) : o.cap);
    }
    if (side) fill(20, 10, 7, 2, shade(o.cap, 0.7));
    else fill(6, 11, 18, 1, shade(o.cap, 0.65));
    fill(14, 5, 2, 2, '#ffffff');
  }
  if (o.caping)
    for (let r = 0; r <= 10; r++) {
      const hw = 2 + r * 1.55;
      for (let x = Math.round(15 - hw); x <= Math.round(14 + hw); x++) {
        const band = Math.floor((x - 15) / (1 + r * 0.45));
        set(x, r - 2, r === 10 ? '#c9a55e' : r === 0 ? '#fff0c0' : band % 2 ? '#e8cc8a' : '#f4dc9e');
      }
    }
  if (o.hijab) {
    const hj = tone(o.hijab);
    const capRows = { 2: [10, 19], 3: [8, 21], 4: [6, 23], 5: [5, 24] };
    const [fx0, fy0, frx, fry] = side ? [20, 18.5, 4.6, 7.6] : [14.5, 18.5, 7.4, 8.4];
    for (let y = 2; y <= tt + 1; y++) {
      const [a, b] = capRows[y] || [3, 26];
      for (let x = side ? Math.max(a, 4) : a; x <= (side ? Math.min(b, 24) : b); x++) {
        const dx = (x - fx0) / frx;
        const dy = (y - fy0) / fry;
        const d = dx * dx + dy * dy;
        if (d < 1 && y >= 11) continue;
        set(x, y, d < 1.35 && y >= 10 ? hj.s : (!side && x >= 22) || (side && x <= 8) ? hj.s : x <= 6 && y < 18 ? hj.l : hj.b);
      }
    }
    const drop = kid ? 6 : 11;
    for (let y = tt; y <= tt + drop; y++) {
      const cut = Math.max(0, y - (tt + drop - 5)) * 1.6;
      const [l, r] = side ? [8, 22] : [5, 24];
      for (let x = Math.ceil(l + cut); x <= Math.floor(r - cut); x++) set(x, y, x >= r - 2 ? hj.s : x === l + 4 ? hj.s : hj.b);
    }
    for (const [x, y] of [[8, 4], [9, 4], [7, 5], [6, 6], [6, 7]]) set(x, y, hj.l);
  }

  // ----- perlengkapan -----
  if (o.idcard && !side) {
    const lc = o.uniform ? K.red : K.blueD;
    const cy = o.hijab ? tt + 12 : tt + 7;
    if (!o.hijab) for (const [x, y] of [[13, tt + 2], [13, tt + 3], [17, tt + 2], [17, tt + 3], [14, tt + 4], [16, tt + 4], [15, tt + 5]]) set(x, y, lc);
    fill(14, cy, 3, 4, K.white);
    fill(14, cy, 3, 1, lc);
  }
  if (o.clipboard && !side) {
    fill(22, tb - 10, 7, 11, K.woodD);
    fill(23, tb - 9, 5, 8, K.creamL);
    fill(24, tb - 11, 3, 1, '#a3aebb');
    for (const y of [tb - 7, tb - 5, tb - 3]) fill(23, y, 4, 1, K.creamDD);
    fill(22, tb - 2, 4, 3, sk);
  }
  if (o.basket) {
    const bx = side ? 14 : 0;
    for (let y = tb - 2; y <= tb + 4; y++) for (let x = bx - 2; x <= bx + 6; x++) set(x, y, (x + y) % 2 ? K.woodL : K.wood);
    for (let x = bx - 1; x <= bx + 5; x++) set(x, tb - 3, x % 2 ? K.leafM : K.red);
    thick(bx - 2, tb - 2, bx + 2, tb - 7, 1, K.woodD);
    thick(bx + 2, tb - 7, bx + 6, tb - 2, 1, K.woodD);
  }
  if (o.bag && !side) {
    thick(9, tt + 1, 20, tb - 6, 1, '#8a6a5a');
    fill(19, tb - 7, 6, 6, o.bag);
    fill(19, tb - 7, 6, 1, shade(o.bag, 1.15));
  }
  if (pose === 'angkat') {
    const [x0, w] = side ? [17, 10] : [6, 18];
    fill(x0, tt + 8, w, 11, '#e0b884');
    fill(x0, tt + 8, w, 2, '#f2d2a2');
    fill(x0 + Math.floor(w / 2) - 1, tt + 8, 2, 11, '#c99a68');
    fill(x0, tt + 18, w, 1, '#b8885a');
    if (!side) {
      fill(4, tt + 10, 3, 3, sk);
      fill(23, tt + 10, 3, 3, skS);
    }
  }
  if (o.umbrella && rain) {
    const uc = rgb(o.umbrella);
    for (let y = -16; y <= 0; y++)
      for (let x = -8; x <= 37; x++) {
        const dx = (x - 14.5) / 21;
        const dy = (y + 1) / 14;
        if (dx * dx + dy * dy > 1) continue;
        const panel = Math.floor((x + 8) / 8) % 2;
        set(x, y, y === 0 ? shade(uc, 0.7) : panel ? mix(uc, '#ffffff', 0.25) : uc);
      }
    for (let y = 1; y <= tt + 8; y++) set(15, y, '#6a5c78');
  }

  const bob = pose === 'jalan' ? -1 : 0;
  const ox = Math.round(cx - 15 - OX);
  const oy = by - (sit ? tb + 12 : ft) - OY + bob;
  shadowEllipse(Math.round(cx + 1), by, kid ? 9 : 11, 3, 1);
  const at = (x, y) => (x >= 0 && y >= 0 && x < SW && y < SH ? cells[y * SW + x] : null);
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++)
      if (!at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) px(ox + x, oy + y, K.ol);
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const c = at(x, y);
      if (c) px(ox + x, oy + y, c);
    }
}

// ---------- kendaraan (serong ala Eastward: atap + sisi/muka terlihat) ----------
// Skala 20 px/m; muka tegak penuh, bidang atas dipendekkan ±0,5.
function wheelSide(cx, cy, r) {
  for (let y = -r - 3; y <= 0; y++) for (let x = -r - 3; x <= r + 3; x++) if (x * x + y * y <= (r + 3) * (r + 3)) px(cx + x, cy + y, '#1f1d22');
  ellipse(cx, cy, r + 1, r + 1, K.ol);
  ellipse(cx, cy, r, r, '#2e2b31');
  ellipse(cx, cy, r * 0.55, r * 0.55, '#8d8a86');
  ellipse(cx - 1, cy - 1, Math.max(1, r * 0.25), Math.max(1, r * 0.25), '#cfccc4');
  for (let a = 0; a < 6; a++) px(cx + Math.cos(a) * r * 0.4, cy + Math.sin(a) * r * 0.4, '#5a5753');
}
function glass(x, y, w, h) {
  box(x, y, w, h, '#26303d');
  for (let j = 1; j < h - 1; j++) hline(x + 1, y + j, w - 2, '#3d4d60', 0.5 * (1 - j / h));
  line(x + 3, y + h - 2, x + 3 + h - 3, y + 1, K.glassL, 0.55);
  line(x + 6, y + h - 2, x + 6 + h - 3, y + 1, K.glassL, 0.3);
}
function headlight(x, y, w, h, tx, ty, r = 34) {
  box(x, y, w, h, '#fff1c2');
  hline(x + 1, y + 1, w - 2, '#ffffff');
  glowRect(x + 1, y + 1, w - 2, h - 2, '#fff8dd');
  light(tx, ty, r, '#fff0c4', 1);
}
function cabSide(x, gy, len, cab, h = 37) {
  // Kabin menghadap kanan (timur).
  box(x, gy - h - 13, len, 14, shade(cab, 1.15));
  hline(x + 1, gy - h - 12, len - 2, shade(cab, 1.3));
  box(x, gy - h, len, h - 15, cab);
  hline(x + 1, gy - h + 1, len - 2, shade(cab, 1.25));
  rect(x + len - 3, gy - h + 1, 2, h - 17, shade(cab, 0.8));
  glass(x + 11, gy - h + 3, len - 16, 14);
  ellipse(x + len - 14, gy - h + 10, 3, 3, '#3a2f2a', 0.75);
  vline(x + 9, gy - h + 2, h - 17, shade(cab, 0.7));
  hline(x + 13, gy - h + 21, 4, '#e9e6dc');
  box(x + len - 2, gy - h + 4, 5, 9, '#2b282e');
  headlight(x + len - 6, gy - 28, 6, 6, x + len + 16, gy - 18, 30);
  box(x + len - 8, gy - 19, 11, 5, '#a4a29d');
}
function truckBoxSide(x, gy, cab, reefer = false) {
  shadowRect(x + 6, gy - 3, 126, 6, 1);
  box(x + 2, gy - 18, 124, 6, '#3a373d');
  box(x, gy - 80, 88, 18, '#f4f2ea');
  for (let i = x + 6; i < x + 86; i += 10) vline(i, gy - 79, 16, '#dedbd0');
  hline(x + 1, gy - 79, 86, '#ffffff');
  box(x, gy - 63, 88, 47, '#e9e6dc');
  for (let i = x + 4; i < x + 86; i += 6) vline(i, gy - 62, 45, '#d9d5c9');
  hline(x + 1, gy - 62, 86, '#f8f6ef');
  rect(x + 1, gy - 36, 86, 4, K.red);
  rect(x + 1, gy - 32, 86, 4, '#ffffff');
  hline(x + 1, gy - 28, 86, '#c9c5b8');
  text('KDMP', x + 29, gy - 56, K.redD, 2);
  text('MERAH PUTIH', x + 23, gy - 44, K.olS);
  vline(x + 3, gy - 60, 40, '#bdb9ad');
  if (reefer) {
    box(x + 70, gy - 92, 17, 13, '#cfd3d5');
    for (let j = gy - 90; j < gy - 81; j += 2) hline(x + 72, j, 13, '#9ea4a8');
  }
  cabSide(x + 88, gy, 38, cab);
  wheelSide(x + 22, gy - 9, 9);
  wheelSide(x + 108, gy - 9, 9);
}
function cabFront(cx, gy, cab, w = 40, h = 48) {
  const c = cx - w / 2;
  box(c, gy - h - 16, w, 17, shade(cab, 1.15));
  hline(c + 1, gy - h - 15, w - 2, shade(cab, 1.3));
  box(c, gy - h, w, h - 8, cab);
  hline(c + 1, gy - h + 1, w - 2, shade(cab, 1.25));
  vline(c + w - 2, gy - h + 1, h - 10, shade(cab, 0.8));
  glass(c + 4, gy - h + 2, w - 8, 15);
  ellipse(c + 12, gy - h + 11, 3, 3, '#3a2f2a', 0.75);
  hline(c + 6, gy - h + 16, 10, '#1d1b20');
  hline(c + w - 16, gy - h + 16, 10, '#1d1b20');
  box(cx - 9, gy - 28, 18, 10, '#2c2a30');
  for (let j = gy - 26; j < gy - 19; j += 2) hline(cx - 8, j, 16, '#5a575e');
  headlight(c + 2, gy - 27, 8, 6, cx, gy + 14, 46);
  headlight(c + w - 10, gy - 27, 8, 6, cx, gy + 14, 0);
  box(c - 1, gy - 17, w + 2, 6, '#a4a29d');
  hline(c, gy - 16, w, '#cfcdc8');
  box(cx - 6, gy - 16, 12, 5, '#1f1d22');
  hline(cx - 5, gy - 15, 10, '#4a4750');
  box(c + 1, gy - 11, 9, 11, '#262328');
  box(c + w - 10, gy - 11, 9, 11, '#262328');
  vline(c + 3, gy - 10, 9, '#4a464d');
  vline(c + w - 8, gy - 10, 9, '#4a464d');
  box(c - 6, gy - h + 2, 5, 10, '#2b282e');
  box(c + w + 1, gy - h + 2, 5, 10, '#2b282e');
  hline(c - 2, gy - h + 4, 3, K.ol);
  hline(c + w - 1, gy - h + 4, 3, K.ol);
  shadowRect(c + 6, gy - 4, w + 6, 6, 1);
}
function truckBoxFront(cx, gy, cab, reefer = false) {
  const x = cx - 22;
  box(x, gy - 118, 44, 43, '#f4f2ea');
  for (let j = gy - 114; j < gy - 76; j += 6) hline(x + 1, j, 42, '#dedbd0');
  vline(x + 1, gy - 117, 41, '#ffffff');
  vline(x + 42, gy - 117, 41, '#d2cec2');
  box(x, gy - 76, 44, 13, '#e2dfd4');
  hline(x + 1, gy - 75, 42, '#efece4');
  if (reefer) {
    box(cx - 12, gy - 80, 24, 15, '#cfd3d5');
    hline(cx - 11, gy - 79, 22, '#eceeef');
    ellipse(cx - 5, gy - 72, 4, 4, '#7d8388');
    ellipse(cx + 5, gy - 72, 4, 4, '#7d8388');
    hline(cx - 9, gy - 72, 8, '#3f4448');
    hline(cx + 1, gy - 72, 8, '#3f4448');
  } else {
    rect(x + 1, gy - 70, 42, 2, K.red);
  }
  cabFront(cx, gy, cab);
}
function truckWoodSide(x, gy, cab) {
  // Truk bak kayu bercat, muatan karung bertutup terpal diikat tali.
  shadowRect(x + 6, gy - 3, 126, 6, 1);
  box(x + 2, gy - 18, 124, 6, '#3a373d');
  const planks = ['#3f8a5a', '#e2b13c', '#c2463a', '#3f8a5a'];
  for (let p = 0; p < 4; p++) {
    rect(x, gy - 46 + p * 7, 86, 7, planks[p]);
    hline(x, gy - 46 + p * 7, 86, shade(planks[p], 1.2));
    hline(x, gy - 40 + p * 7, 86, shade(planks[p], 0.7));
  }
  for (let i = x + 8; i < x + 84; i += 12) {
    px(i, gy - 36, K.white);
    px(i - 1, gy - 35, K.white);
    px(i + 1, gy - 35, K.white);
    px(i, gy - 34, K.white);
    px(i, gy - 35, K.yellow);
  }
  for (const pxs of [x, x + 28, x + 57, x + 84]) box(pxs, gy - 48, 4, 31, K.woodD);
  rect(x, gy - 49, 88, 2, K.ol);
  box(x + 84, gy - 74, 6, 27, K.wood);
  for (let i = 0; i < 82; i++) {
    const hgt = 18 + Math.round(Math.sin(i / 6) * 2 + Math.sin(i / 2.3));
    for (let j = 0; j < hgt; j++) px(x + 2 + i, gy - 49 - j, j > hgt - 4 ? '#5b8fbf' : j > hgt - 9 ? '#4a7fae' : '#3f6f9a');
    px(x + 2 + i, gy - 49 - hgt, K.ol);
  }
  for (let k = 0; k < 4; k++) line(x + 6 + k * 22, gy - 49, x + 22 + k * 22, gy - 66, '#d8c79a');
  cabSide(x + 88, gy, 38, cab, 36);
  wheelSide(x + 22, gy - 9, 9);
  wheelSide(x + 108, gy - 9, 9);
}
function truckWoodFront(cx, gy, cab) {
  const x = cx - 22;
  for (let i = 0; i < 44; i++) {
    const hgt = 26 + Math.round(Math.sin(i / 5) * 2 + Math.sin(i / 2.1));
    for (let j = 0; j < hgt; j++) px(x + i, gy - 76 - j, j > hgt - 4 ? '#5b8fbf' : j > hgt - 10 ? '#4a7fae' : '#3f6f9a');
    px(x + i, gy - 76 - hgt, K.ol);
  }
  for (let k = 0; k < 3; k++) line(x + 4 + k * 14, gy - 76, x + 14 + k * 14, gy - 100, '#d8c79a');
  const planks = ['#3f8a5a', '#e2b13c', '#c2463a'];
  for (let p = 0; p < 3; p++) {
    rect(x, gy - 76 + p * 4, 44, 4, planks[p]);
    hline(x, gy - 76 + p * 4, 44, shade(planks[p], 1.2));
  }
  rect(x, gy - 77, 44, 1, K.ol);
  vline(x, gy - 77, 13, K.ol);
  vline(x + 43, gy - 77, 13, K.ol);
  cabFront(cx, gy, cab);
}
function pickupSide(x, gy, c) {
  shadowRect(x + 6, gy - 3, 92, 6, 1);
  box(x + 2, gy - 17, 88, 5, '#3a373d');
  for (let i = 0; i < 4; i++) {
    const cx2 = x + 4 + i * 13;
    box(cx2, gy - 42, 13, 12, K.woodL);
    for (let k = 0; k < 4; k++) ellipse(cx2 + 3 + k * 2.5, gy - 42, 2, 2, i % 2 ? '#6fae5f' : '#e88b3a');
    hline(cx2 + 1, gy - 37, 11, K.woodD);
  }
  box(x, gy - 31, 56, 15, c);
  hline(x + 1, gy - 30, 54, shade(c, 1.25));
  rect(x + 1, gy - 22, 54, 1, shade(c, 0.75));
  cabSide(x + 56, gy, 36, c, 34);
  wheelSide(x + 16, gy - 8, 8);
  wheelSide(x + 78, gy - 8, 8);
}
function pickupFront(cx, gy, c) {
  for (let i = 0; i < 3; i++) box(cx - 17 + i * 12, gy - 58, 11, 8, K.woodL);
  cabFront(cx, gy, c, 36, 42);
}
function rider(x, by, helmC) {
  box(x - 4, by - 14, 9, 12, K.blueD);
  vline(x + 3, by - 13, 10, K.blueDD);
  ellipse(x, by - 18, 5, 5, K.ol);
  ellipse(x, by - 18, 4, 4, helmC);
  ellipse(x - 1, by - 20, 2, 1, shade(helmC, 1.3));
  rect(x + 1, by - 18, 4, 2, '#26303d');
}
function viarSide(x, gy) {
  // Motor roda tiga: motor di depan (kanan), bak barang di belakang.
  shadowRect(x + 4, gy - 3, 68, 5, 1);
  box(x, gy - 34, 36, 22, '#3f8a5a');
  hline(x + 1, gy - 33, 34, '#5fae7a');
  for (let i = 0; i < 2; i++) {
    const sx2 = x + 3 + i * 15;
    box(sx2, gy - 42, 14, 9, '#e9e0c6');
    hline(sx2 + 2, gy - 38, 10, i ? K.blue : K.red);
  }
  box(x + 34, gy - 18, 22, 5, '#3a373d');
  box(x + 50, gy - 30, 8, 16, K.red);
  vline(x + 51, gy - 29, 14, K.redL);
  line(x + 56, gy - 30, x + 60, gy - 38, K.ol);
  hline(x + 57, gy - 38, 6, K.ol);
  headlight(x + 59, gy - 30, 4, 4, x + 74, gy - 20, 22);
  rider(x + 46, gy - 14, K.white);
  wheelSide(x + 12, gy - 7, 7);
  wheelSide(x + 58, gy - 7, 7);
}
function viarFront(cx, gy) {
  box(cx - 18, gy - 40, 36, 14, '#3f8a5a');
  hline(cx - 17, gy - 39, 34, '#5fae7a');
  for (let i = 0; i < 2; i++) box(cx - 15 + i * 15, gy - 48, 14, 9, '#e9e0c6');
  rider(cx, gy - 18, K.white);
  box(cx - 4, gy - 22, 8, 12, K.red);
  hline(cx - 10, gy - 30, 20, K.ol);
  headlight(cx - 3, gy - 20, 6, 4, cx, gy + 10, 26);
  box(cx - 2, gy - 10, 5, 10, '#262328');
  box(cx - 19, gy - 12, 6, 12, '#262328');
  box(cx + 13, gy - 12, 6, 12, '#262328');
  shadowRect(cx - 14, gy - 3, 38, 5, 1);
}
function angkotSide(x, gy) {
  const c = '#4fa06a';
  shadowRect(x + 6, gy - 3, 88, 6, 1);
  box(x, gy - 54, 84, 12, shade(c, 1.15));
  hline(x + 1, gy - 53, 82, shade(c, 1.3));
  for (let i = x + 8; i < x + 70; i += 16) box(i, gy - 58, 10, 4, '#3a373d');
  box(x, gy - 43, 86, 29, c);
  hline(x + 1, gy - 42, 84, shade(c, 1.25));
  for (let i = 0; i < 4; i++) glass(x + 4 + i * 14, gy - 40, 12, 10);
  box(x + 60, gy - 40, 14, 25, '#2a2a30');
  for (let j = gy - 36; j < gy - 18; j += 6) hline(x + 61, j, 12, '#6b5a4a');
  glass(x + 76, gy - 40, 9, 10);
  rect(x + 1, gy - 26, 58, 2, K.yellow);
  headlight(x + 82, gy - 26, 5, 5, x + 98, gy - 18, 26);
  box(x + 80, gy - 18, 8, 4, '#a4a29d');
  wheelSide(x + 16, gy - 8, 8);
  wheelSide(x + 70, gy - 8, 8);
}
function angkotFront(cx, gy) {
  const c = '#4fa06a';
  cabFront(cx, gy, c, 38, 40);
  box(cx - 12, gy - 60, 24, 6, K.creamL);
  text('DESA', cx - 7, gy - 59, K.ol);
}
function forkliftSide(x, gy, load = true) {
  // Forklift menghadap kanan; tiang di depan, garpu membawa palet karung.
  shadowRect(x + 4, gy - 3, 60, 5, 1);
  box(x, gy - 26, 12, 16, '#c99a2a');
  box(x + 10, gy - 24, 26, 16, K.yellow);
  hline(x + 11, gy - 23, 24, '#f8db84');
  for (const px2 of [x + 8, x + 30]) box(px2, gy - 50, 3, 26, '#26232a');
  box(x + 6, gy - 52, 28, 4, '#26232a');
  box(x + 14, gy - 32, 10, 8, '#3a373d');
  ellipse(x + 20, gy - 38, 4, 4, K.ol);
  ellipse(x + 20, gy - 38, 3, 3, '#f4f0e4');
  box(x + 17, gy - 34, 7, 9, K.white);
  box(x + 36, gy - 54, 5, 50, '#6c6a72');
  vline(x + 37, gy - 53, 48, '#9a98a0');
  box(x + 40, gy - 9, 20, 3, '#4a4750');
  if (load) sackStack(x + 41, gy - 26, 1, 2);
  wheelSide(x + 30, gy - 6, 6);
  wheelSide(x + 10, gy - 5, 5);
}
function forkliftFront(cx, gy, load = true) {
  shadowRect(cx - 10, gy - 3, 34, 5, 1);
  box(cx - 14, gy - 44, 28, 22, K.yellow);
  hline(cx - 13, gy - 43, 26, '#f8db84');
  box(cx - 15, gy - 54, 30, 4, '#26232a');
  for (const px2 of [cx - 15, cx + 12]) box(px2, gy - 54, 3, 30, '#26232a');
  ellipse(cx, gy - 44, 4, 4, K.ol);
  ellipse(cx, gy - 44, 3, 3, '#f4f0e4');
  for (const px2 of [cx - 10, cx + 7]) box(px2, gy - 50, 4, 48, '#6c6a72');
  if (load) sackStack(cx - 13, gy - 24, 2, 2);
  box(cx - 16, gy - 9, 6, 9, '#262328');
  box(cx + 10, gy - 9, 6, 9, '#262328');
}

// ---------- adegan kota: pusat desa pastel, lega, 640×360 ----------
function pastelWall(x, y, w, h, c, lines = 10) {
  noiseFill(x, y, w, h, [shade(c, 0.97), c, c, mix(c, '#ffffff', 0.12)], 9);
  if (lines) for (let j = y + lines; j < y + h; j += lines) hline(x, j, w, shade(c, 0.94));
  vline(x, y, h, K.ol);
  vline(x + w - 1, y, h, K.ol);
  vline(x + 1, y, h, mix(c, '#ffffff', 0.3));
  vline(x + w - 2, y, h, shade(c, 0.88));
  grime(x, y + h * 0.6, w, h * 0.4, 0.12);
}
function roofTiles(x, y, w, h, c) {
  const ridge = Math.round(h * 0.28);
  rect(x, y, w, ridge, shade(c, 0.86));
  for (let r = y + 1; r < y + ridge; r += 3) hline(x, r, w, shade(c, 0.8));
  for (let r = y + ridge, row = 0; r < y + h; r += 5, row++) {
    rect(x, r, w, 5, c);
    hline(x, r, w, mix(c, '#ffffff', 0.25));
    hline(x, r + 4, w, shade(c, 0.8));
    for (let i = (row % 2) * 4; i < w; i += 8) {
      vline(x + i, r + 1, 3, shade(c, 0.82));
      px(x + i + 1, r + 1, mix(c, '#ffffff', 0.35));
    }
  }
  rect(x, y + ridge - 1, w, 2, shade(c, 0.7));
  rect(x, y + h - 2, w, 2, shade(c, 0.66));
  hline(x, y + h, w, K.ol);
  vline(x, y, h, K.ol);
  vline(x + w - 1, y, h, K.ol);
  for (let i = 0; i < w; i++) for (let j = 1; j < 5; j++) mul(x + i, y + h + j, 0.82 + j * 0.04);
}
function flowerBox(x, y, w) {
  box(x, y, w, 5, K.woodL);
  hline(x + 1, y + 1, w - 2, '#f0caa8');
  for (let i = x + 1; i < x + w - 1; i++) {
    const hgt = 2 + Math.round(rnd() * 3);
    vline(i, y - hgt, hgt, rnd() < 0.5 ? K.leafM : K.leaf);
  }
  for (let k = 0; k < w / 3; k++) {
    const fx = x + 1 + Math.floor(rnd() * (w - 2));
    const fc = pick(['#f6a5b8', '#fbe28a', '#ffffff', '#c9a8f0', '#f7b58a']);
    px(fx, y - 3 - Math.round(rnd() * 2), fc);
    px(fx + 1, y - 3, mix(fc, '#ffffff', 0.4));
  }
}
function pastelTree(cx, by, r, blossom, sd) {
  tree(cx, by, r, sd);
  if (!blossom) return;
  const s0 = seed;
  seed = sd * 131;
  for (let k = 0; k < r * 5; k++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r * 0.9;
    const x = cx + Math.cos(a) * d;
    const y = by - r - r * 0.45 + Math.sin(a) * d * 0.7;
    px(x, y, blossom);
    if (rnd() < 0.4) px(x + 1, y, mix(blossom, '#ffffff', 0.4));
  }
  seed = s0;
}
function planter(x, by, w, blossom) {
  box(x, by - 9, w, 9, '#e6d6c6');
  hline(x + 1, by - 8, w - 2, '#f6ece2');
  hline(x + 1, by - 2, w - 2, '#cdbcaa');
  bush(x + 1, by - 8, w - 2, blossom);
  shadowRect(x + w, by - 7, 4, 7, 1);
}
function bush(x, by, w, flower) {
  const h = Math.max(5, Math.round(w * 0.45));
  ellipse(x + w / 2, by - h / 2, w / 2 + 1, h / 2 + 1, K.ol);
  ellipse(x + w / 2, by - h / 2, w / 2, h / 2, K.leaf);
  ellipse(x + w / 2 - 1, by - h / 2 - 1, w / 2 - 1, h / 2 - 1, K.leafM);
  ellipse(x + w / 2 - 2, by - h / 2 - 2, Math.max(1, w / 4), Math.max(1, h / 4), K.leafL);
  if (flower) for (let k = 0; k < w / 2; k++) px(x + 1 + rnd() * (w - 2), by - h + rnd() * h * 0.8, flower);
}
function stringLights(x0, y0, x1, y1, sag) {
  const n = Math.abs(x1 - x0);
  for (let s = 0; s <= n; s++) {
    const t = s / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    px(x, y, K.olS);
    if (s % 10 === 5) {
      const c = pick(['#ffe8a8', '#ffd0b8', '#fff4d0']);
      rect(x, y + 1, 2, 3, c);
      glowRect(Math.floor(x), Math.floor(y) + 1, 2, 3, '#fff1c0');
      light(x + 1, y + 4, 14, '#ffd88a', 0.55);
    }
  }
}
function fountain(cx, cy) {
  ellipse(cx, cy + 8, 46, 14, K.ol);
  ellipse(cx, cy + 7, 45, 13, '#e9dfe8');
  ellipse(cx, cy + 5, 42, 11, '#d6cad6');
  ellipse(cx, cy + 5, 39, 9, '#9fd0e6');
  for (let k = 0; k < 40; k++) px(cx - 34 + rnd() * 68, cy + rnd() * 10, '#d4f0fa');
  ellipse(cx, cy - 2, 12, 5, K.ol);
  ellipse(cx, cy - 3, 11, 4, '#e9dfe8');
  ellipse(cx, cy - 3, 9, 3, '#b4e0f0');
  box(cx - 2, cy - 22, 5, 20, '#e9dfe8');
  for (let a = 0; a < 14; a++) {
    const ang = Math.PI * (0.15 + (a / 13) * 0.7);
    for (let t = 0; t < 14; t++) px(cx + Math.cos(ang) * t * 1.2 * (a % 2 ? 1 : -1), cy - 22 - Math.sin(ang) * t + t * t * 0.08, '#cfeefa', 0.8);
  }
  glowRect(cx - 1, cy - 24, 3, 2, '#e8fbff');
  light(cx, cy, 60, '#bfe8ff', 0.8);
}
function bicycle(x, by, c) {
  for (const wx of [x + 4, x + 20]) {
    ellipse(wx, by - 5, 5, 5, K.ol);
    ellipse(wx, by - 5, 4, 4, '#efe6ee');
    ellipse(wx, by - 5, 3, 3, K.ol);
    px(wx, by - 5, '#a39aa8');
  }
  line(x + 4, by - 5, x + 11, by - 12, c);
  line(x + 11, by - 12, x + 20, by - 5, c);
  line(x + 11, by - 12, x + 17, by - 12, c);
  line(x + 17, by - 12, x + 20, by - 5, c);
  line(x + 11, by - 12, x + 12, by - 5, c);
  rect(x + 9, by - 14, 4, 2, K.olS);
  line(x + 18, by - 12, x + 19, by - 16, K.ol);
  hline(x + 17, by - 16, 4, K.ol);
  box(x + 18, by - 14, 6, 4, K.woodL);
  shadowRect(x + 2, by - 1, 24, 2, 1);
}
function parkBench(x, by) {
  shadowRect(x + 3, by - 2, 34, 4, 1);
  box(x, by - 18, 34, 6, K.woodL);
  hline(x + 1, by - 17, 32, '#f0caa8');
  box(x, by - 11, 34, 5, K.wood);
  hline(x + 1, by - 10, 32, K.woodL);
  for (const lx of [x + 2, x + 29]) box(lx, by - 7, 3, 7, '#8f8aa0');
}
function streetLamp(x, by) {
  shadowRect(x + 3, by - 2, 12, 3, 1);
  box(x - 3, by - 4, 8, 4, '#8f8aa0');
  box(x - 1, by - 44, 4, 41, '#9d98ae');
  vline(x, by - 43, 39, '#c5c0d4');
  box(x - 6, by - 52, 14, 9, '#8f8aa0');
  rect(x - 4, by - 47, 10, 3, '#fff1c4');
  glowRect(x - 4, by - 47, 10, 3, '#fff6d8');
  hline(x - 7, by - 53, 16, '#a9a3bb');
  light(x + 1, by - 20, 58, '#ffd690', 1.1);
}
function cafeUmbrellaTable(x, by, c) {
  shadowEllipse(x + 4, by, 22, 4, 1);
  for (const [sx2, sc] of [[x - 14, -1], [x + 14, 1]]) {
    box(sx2 - 3, by - 8, 7, 3, K.woodL);
    box(sx2 - 2, by - 5, 2, 5, K.woodD);
    box(sx2 + 1, by - 5, 2, 5, K.woodD);
  }
  box(x - 8, by - 12, 17, 3, K.creamL);
  box(x - 1, by - 9, 3, 9, '#9d98ae');
  vline(x, by - 40, 28, '#9d98ae');
  for (let y = 0; y < 10; y++) {
    const hw = 3 + y * 2.2;
    for (let i = Math.round(-hw); i <= Math.round(hw); i++) px(x + i, by - 46 + y, Math.floor((i + 30) / 5) % 2 ? c : K.creamL);
  }
  hline(x - 24, by - 36, 49, K.ol);
  for (let i = -24; i <= 24; i += 4) px(x + i, by - 35, shade(c, 0.8));
  box(x - 6, by - 15, 4, 3, '#ffffff');
  box(x + 3, by - 15, 4, 3, '#f6c9d4');
}
function hedge(x, y, w) {
  for (let i = 0; i < w; i += 9) bush(x + i, y + 8, 11, null);
}
function flowerBed(x, y, w, h, colors) {
  box(x, y, w, h, '#a9886e');
  noiseFill(x + 1, y + 1, w - 2, h - 2, ['#8a6a58', '#94745f'], 4);
  for (let k = 0; k < (w * h) / 6; k++) {
    const fx = x + 2 + Math.floor(rnd() * (w - 4));
    const fy = y + 2 + Math.floor(rnd() * (h - 3));
    px(fx, fy + 1, K.leafM);
    px(fx, fy, pick(colors));
  }
}
function pigeons(x, y) {
  for (const [dx, dy] of [[0, 0], [9, 3], [17, -1]]) {
    ellipse(x + dx, y + dy, 3, 2, K.ol);
    ellipse(x + dx, y + dy, 2, 1, '#c9c3d6');
    px(x + dx + 3, y + dy - 2, '#a9a3bb');
    px(x + dx + 4, y + dy - 2, K.yellowD);
  }
}

function sceneKota() {
  // Tata letak tegak: fasad sampai FB, trotoar 44, jalan 64, taman di bawah.
  const FB = 198;
  const RD = FB + 49;
  const RB = RD + 64;
  for (let y = FB; y < FB + 44; y++)
    for (let x = 0; x < W; x++) {
      px(x, y, (Math.floor(x / 12) + Math.floor(y / 12)) % 2 ? K.tileA : K.tileB);
      if (x % 12 === 0 || y % 12 === 0) mul(x, y, 0.95);
    }
  noiseFill(0, FB + 44, W, 5, K.stone, 4);
  hline(0, FB + 44, W, K.ol);
  hline(0, RD - 1, W, K.mortar);
  noiseFill(0, RD, W, 64, ['#6a6560', '#6f6a64', '#65605b', '#74706a'], 10);
  for (let x = 8; x < W; x += 30) rect(x, RD + 31, 16, 2, '#f5f1fa');
  for (let i = 0; i < 7; i++) rect(298 + i * 7, RD + 2, 4, 60, '#f5f1fa');
  ellipse(150, RD + 52, 8, 3, '#8f8aa0');
  ellipse(150, RD + 52, 6, 2, '#a39eb2');
  hline(0, RB, W, K.mortar);
  noiseFill(0, RB + 1, W, 5, K.stone, 4);
  hline(0, RB + 6, W, K.ol);
  noiseFill(0, RB + 7, W, H - RB - 7, ['#7f9550', '#879c58', '#76894a', '#8fa35e'], 14);
  for (let n = 0; n < 80; n++) {
    const x = rnd() * W;
    const y = RB + 9 + rnd() * (H - RB - 9);
    vline(x, y, 2, '#d3edc0');
  }
  for (let y = RB + 7; y < H; y++)
    for (let x = 292; x < 350; x++) px(x, y, (Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? K.tileA : '#9e8f70');

  // --- klinik desa ---
  roofTiles(-4, 0, 120, 30, '#4e7f7a');
  pastelWall(0, 30, 112, FB - 30, '#9fae86');
  box(8, 38, 18, 18, '#ffffff');
  fill_cross(17, 47);
  signBoard(68, 42, 'KLINIK DESA', '#ffffff', '#3f8f80', 1);
  win(10, 64, 30, 24, { frame: '#ffffff' });
  win(72, 64, 30, 24, { frame: '#ffffff', curtain: '#f6c9d4' });
  flowerBox(7, 92, 36);
  flowerBox(69, 92, 36);
  box(36, FB - 78, 42, 6, '#4e7f7a');
  hline(37, FB - 77, 40, '#b6e6dc');
  box(40, FB - 70, 34, 70, '#7fb0c0');
  rect(42, FB - 68, 14, 68, '#b7e0ec');
  rect(58, FB - 68, 14, 68, '#b7e0ec');
  line(44, FB - 40, 52, FB - 62, '#ffffff', 0.7);
  glowRect(42, FB - 68, 30, 68, '#e6fbff');
  light(57, FB + 4, 44, '#d8f6ff', 0.8);
  win(6, FB - 60, 26, 34, { frame: '#ffffff', blinds: true, single: true });
  win(82, FB - 60, 24, 34, { frame: '#ffffff', blinds: true, single: true });
  acUnit(94, 108);

  noiseFill(112, 0, 12, FB, ['#6f8a4a', '#64803f', '#7a9552'], 5);
  for (let y = 4; y < FB - 6; y += 7) bush(112, y + 6, 12, y % 21 ? null : '#f6a5b8');

  // --- kantor KDMP ---
  const kx = 124;
  const kw = 212;
  box(kx - 2, 0, kw + 4, 12, '#9a948a');
  for (let i = 0; i < 4; i++) {
    const sx2 = kx + 14 + i * 50;
    box(sx2, 2, 36, 8, '#8fb4e0');
    for (let k = 4; k < 36; k += 5) vline(sx2 + k, 3, 6, '#b4d4f0');
  }
  pastelWall(kx, 12, kw, FB - 12, '#d9c9a3', 12);
  for (let i = 0; i < 4; i++) {
    win(kx + 12 + i * 50, 20, 34, 26, { frame: '#ffffff', blinds: i % 2 === 0, curtain: i % 2 ? '#8fa3a8' : null });
    flowerBox(kx + 9 + i * 50, 50, 40);
  }
  box(kx + 6, 60, kw - 12, 32, K.red);
  hline(kx + 7, 61, kw - 14, K.redL);
  hline(kx + 7, 90, kw - 14, K.redD);
  text('KOPERASI DESA', kx + kw / 2 - textW('KOPERASI DESA', 2) / 2, 65, '#fffaf2', 2);
  text('MERAH PUTIH', kx + kw / 2 - textW('MERAH PUTIH') / 2, 80, '#ffe6dc');
  glowFrom(kx + 7, 61, kw - 14, 30, 1.1);
  light(kx + kw / 2, 96, 130, '#ffb4a0', 0.55);
  win(kx + 10, FB - 66, 60, 50, { frame: '#ffffff', blinds: true });
  win(kx + kw - 70, FB - 66, 60, 50, { frame: '#ffffff', blinds: true });
  box(kx + 78, FB - 84, 56, 9, K.blueD);
  hline(kx + 79, FB - 83, 54, K.blueL);
  text('KANTOR', kx + 106 - textW('KANTOR') / 2, FB - 82, '#ffffff');
  for (let i = kx + 78; i < kx + 134; i++) for (let j = 0; j < 4; j++) mul(i, FB - 75 + j, 0.8);
  box(kx + 82, FB - 72, 48, 72, '#7f9cbc');
  rect(kx + 84, FB - 70, 21, 70, '#b7d2ea');
  rect(kx + 107, FB - 70, 21, 70, '#b7d2ea');
  line(kx + 86, FB - 40, kx + 100, FB - 64, '#ffffff', 0.6);
  line(kx + 109, FB - 40, kx + 123, FB - 64, '#ffffff', 0.6);
  glowRect(kx + 84, FB - 70, 21, 70, '#ffe6b0');
  glowRect(kx + 107, FB - 70, 21, 70, '#ffe6b0');
  light(kx + 106, FB + 6, 60, K.warm, 1);
  noiseFill(kx + kw, 0, 10, FB, ['#6f8a4a', '#64803f'], 5);

  // --- gerai sembako ---
  const gx = 346;
  const gw = 124;
  roofTiles(gx - 4, 0, gw + 8, 30, '#a8563c');
  pastelWall(gx, 30, gw, FB - 30, '#c99a6a');
  win(gx + 10, 38, 30, 22, { frame: '#ffffff', curtain: '#9fae86' });
  win(gx + 84, 38, 30, 22, { frame: '#ffffff', curtain: '#ddd3f2' });
  wire(gx + 46, 42, gx + 78, 42, 3);
  for (const [cx2, c] of [[gx + 49, '#8fa3a8'], [gx + 58, '#fbe28a'], [gx + 67, '#f6c9d4']]) box(cx2, 43, 7, 10, c);
  box(gx + 4, 66, gw - 8, 3, K.ol);
  for (let i = gx + 6; i < gx + gw - 6; i += 5) vline(i, 69, 10, '#d9b8a8');
  box(gx + 4, 78, gw - 8, 3, '#d9a890');
  flowerBox(gx + 8, 66, 24);
  flowerBox(gx + gw - 32, 66, 24);
  signBoard(gx + gw / 2, 92, 'SEMBAKO', '#fffaf2', K.redD, 2);
  awning(gx + 2, FB - 80, gw - 4, 10, K.red, '#fffaf2');
  box(gx + 6, FB - 66, gw - 12, 66, '#6a5c6e');
  for (let s = 0; s < 6; s++) {
    hline(gx + 7, FB - 58 + s * 10, gw - 14, K.woodL);
    for (let i = gx + 8; i < gx + gw - 8; i += 3) box(i, FB - 65 + s * 10, 3, 7, pick(['#f39a8e', '#fbe28a', '#9fd09a', '#9cc4f0', '#fffaf2', '#f5b98a', '#d8b4f0']));
  }
  box(gx + 40, FB - 20, 44, 20, K.woodL);
  hline(gx + 41, FB - 19, 42, '#f0caa8');
  glowFrom(gx + 7, FB - 65, gw - 14, 46, 1.25);
  light(gx + gw / 2, FB + 6, 80, K.warm, 1.1);
  noiseFill(gx + gw, 0, 10, FB, ['#6f8a4a', '#64803f'], 5);

  // --- apotek ---
  const ax = 480;
  const aw = 86;
  box(ax - 2, 0, aw + 4, 14, '#9a948a');
  acUnit(ax + 8, 2);
  acUnit(ax + 60, 2);
  pastelWall(ax, 14, aw, FB - 14, '#8fa3a8');
  win(ax + 10, 24, 26, 24, { frame: '#ffffff', blinds: true });
  win(ax + 50, 24, 26, 24, { frame: '#ffffff', curtain: '#9fae86' });
  flowerBox(ax + 7, 52, 32);
  flowerBox(ax + 47, 52, 32);
  box(ax + 6, 70, 16, 16, '#7fd09a');
  fill_cross(ax + 14, 78);
  signBoard(ax + 54, 70, 'APOTEK', '#ffffff', '#3f8f6a', 2);
  box(ax + 6, FB - 74, 38, 74, '#7f9cbc');
  rect(ax + 8, FB - 72, 34, 72, '#cfe9e0');
  for (let s = 0; s < 5; s++) {
    hline(ax + 9, FB - 64 + s * 12, 32, '#ffffff');
    for (let i = ax + 10; i < ax + 40; i += 3) box(i, FB - 70 + s * 12, 2, 6, pick(['#ffffff', '#9cc4f0', '#f6c9d4', '#c9e8a8']));
  }
  glowFrom(ax + 8, FB - 72, 34, 72, 1.2);
  light(ax + 25, FB + 6, 50, '#e0fff2', 0.8);
  win(ax + 52, FB - 64, 26, 40, { frame: '#ffffff', blinds: true, single: true });
  noiseFill(ax + aw, 0, 8, FB, ['#6f8a4a', '#64803f'], 5);

  // --- simpan pinjam ---
  const sx = 574;
  roofTiles(sx - 2, 0, 70, 28, '#7d7468');
  pastelWall(sx, 28, 66, FB - 28, '#c9a85a');
  win(sx + 10, 38, 24, 24, { frame: '#ffffff', curtain: '#f6c9d4' });
  box(sx + 42, 34, 14, 84, K.blueD);
  let vy = 38;
  for (const ch of 'SIMPAN') {
    text(ch, sx + 47, vy, '#ffffff');
    vy += 6;
  }
  vy += 3;
  for (const ch of 'PINJAM') {
    text(ch, sx + 47, vy, '#ffffff');
    vy += 6;
  }
  glowFrom(sx + 43, 35, 12, 82, 1.15);
  box(sx + 4, FB - 72, 36, 72, '#9d98ae');
  for (let j = FB - 70; j < FB - 44; j += 2) hline(sx + 5, j, 34, '#c5c0d4');
  rect(sx + 5, FB - 44, 34, 44, '#fff1d6');
  glowRect(sx + 5, FB - 44, 34, 44, '#ffe2a6');
  light(sx + 22, FB + 6, 44, K.warm, 0.9);

  for (let i = 0; i < W; i++) for (let j = 0; j < 5; j++) mul(i, FB + 1 + j, 0.86 + j * 0.03);

  // --- trotoar ---
  stringLights(0, FB - 8, 116, FB - 8, 5);
  streetLamp(116, FB + 42);
  streetLamp(340, FB + 42);
  streetLamp(572, FB + 42);
  stringLights(116, FB - 10, 340, FB - 10, 12);
  stringLights(340, FB - 10, 572, FB - 10, 12);
  pastelTree(30, FB + 42, 17, '#f6a5b8', 3);
  pastelTree(604, FB + 42, 17, '#fbe28a', 8);
  planter(140, FB + 18, 22, '#f6a5b8');
  planter(312, FB + 18, 22, '#fbe28a');
  flagpoleSmall(236, FB + 16);
  bicycle(250, FB + 40, K.blue);
  bicycle(276, FB + 42, '#f39a8e');
  crate(gx + 8, FB + 4, '#f39a8e');
  crate(gx + 24, FB + 6, '#9fd09a');
  crate(gx + 92, FB + 4, '#fbe28a');
  for (const [lx, c] of [[gx + 108, '#7fd09a'], [gx + 116, '#9cc4f0']]) {
    box(lx, FB + 2, 8, 12, c);
    hline(lx + 1, FB + 3, 6, '#ffffff');
  }
  cat(214, FB + 14);
  parkBench(500, FB + 40);
  person(78, FB + 38, { skin: K.skin[1], top: '#fffaf2', accent: K.red, pants: '#6a7090', uniform: true, pose: 'angkat', side: true, flip: true, helm: false });
  person(196, FB + 40, { skin: K.skin[0], hairStyle: 'rapi', top: '#7f9ccc', accent: '#ffffff', pants: '#5b5f7a', idcard: true, clipboard: true, longSleeve: true, umbrella: '#ffffff' });
  person(220, FB + 42, { skin: K.skin[1], hair: '#5a4448', top: '#a8785a', batik: '#f2c87a', pants: '#5b4a52', peci: true, talk: true });
  person(392, FB + 34, { skin: K.skin[1], top: '#fffaf2', accent: K.red, pants: '#6a7090', hijab: K.red, uniform: true, idcard: true, apron: '#f39a8e', pose: 'lambai' });
  person(446, FB + 42, { skin: K.skin[2], top: '#c98a9a', pants: '#7a6a7a', hijab: '#f2dcc0', basket: true, skirt: true, side: true, pose: 'jalan', umbrella: '#9cc4f0' });
  person(536, FB + 36, { skin: K.skin[0], top: '#7fd09a', pants: '#6a7a8a', hijab: '#5fae8a', coat: true, idcard: true, glasses: true });

  // --- jalan ---
  viarSide(110, RD + 54);
  angkotSide(440, RD + 52);

  // --- taman ---
  hedge(0, RB + 6, 284);
  hedge(358, RB + 6, 282);
  flowerBed(20, RB + 20, 90, 20, ['#f6a5b8', '#fbe28a', '#ffffff', '#c9a8f0']);
  flowerBed(530, RB + 20, 90, 20, ['#f7b58a', '#fbe28a', '#f6a5b8', '#9cc4f0']);
  fountain(320, H - 6);
  parkBench(220, H - 6);
  person(236, H - 6, { skin: K.skin[0], hair: '#e8e2ea', top: '#7d7468', pants: '#5b5f7a', pose: 'duduk', glasses: true });
  pastelTree(164, H + 8, 18, '#f6a5b8', 5);
  pastelTree(470, H + 10, 18, null, 6);
  pigeons(372, RB + 26);
  puddle(200, RD + 40, 18);
  puddle(500, RD + 20, 12);
  puddle(330, FB + 30, 10);
}
function fill_cross(cx, cy) {
  rect(cx - 2, cy - 6, 5, 13, '#5fbf8a');
  rect(cx - 6, cy - 2, 13, 5, '#5fbf8a');
  glowFrom(cx - 6, cy - 6, 13, 13, 1.15);
  light(cx, cy, 30, '#9dffc4', 0.7);
}
function flagpoleSmall(x, by) {
  box(x - 3, by - 4, 8, 4, '#c5c0d4');
  box(x, by - 46, 3, 42, '#e9e5f2');
  vline(x + 2, by - 45, 40, '#b8b2c8');
  for (let i = 0; i < 18; i++) {
    const wv = Math.round(Math.sin(i / 3) * 1);
    vline(x + 3 + i, by - 45 + wv, 5, i === 17 ? K.redD : K.red);
    vline(x + 3 + i, by - 40 + wv, 5, i === 17 ? '#e8e0ea' : '#fffaf2');
  }
  shadowRect(x + 4, by - 2, 16, 3, 1);
}
function cat(x, y) {
  ellipse(x + 5, y, 6, 3, K.ol);
  ellipse(x + 5, y, 5, 2, '#f5b98a');
  ellipse(x + 10, y - 2, 3, 3, K.ol);
  ellipse(x + 10, y - 2, 2, 2, '#f5b98a');
  px(x + 9, y - 5, K.ol);
  px(x + 12, y - 5, K.ol);
  line(x, y, x - 3, y - 3, '#e0a070');
  shadowRect(x, y + 2, 12, 2, 1);
}

// ---------- adegan 2: dok gudang komoditas dan cold storage terpisah ----------
function sengWall(x0, x1, y0, y1) {
  for (let i = x0; i < x1; i++) {
    const t = i % 4;
    vline(i, y0, y1 - y0, t === 0 ? K.tealL : t === 2 ? K.tealD : K.teal);
  }
  for (const gy of [y0 + 26, y0 + 56]) {
    hline(x0, gy, x1 - x0, K.tealDD);
    hline(x0, gy + 1, x1 - x0, K.tealL, 0.5);
  }
  for (let k = 0; k < (x1 - x0) / 14; k++) {
    const rx = x0 + Math.floor(rnd() * (x1 - x0));
    const ry = y0 + 2 + Math.floor(rnd() * 50);
    const len = 4 + rnd() * 14;
    for (let j = 0; j < len; j++) px(rx, ry + j, '#a0704a', 0.55);
  }
  grime(x0, y0, x1 - x0, y1 - y0, 0.45);
}
function rollDoor(dx, top, dw, bottom, label) {
  box(dx - 3, top - 4, dw + 6, bottom - top + 4, K.yellow);
  vline(dx - 2, top - 3, bottom - top + 2, '#f6d777');
  box(dx + dw / 2 - 9, top - 2, 18, 8, K.blueD);
  text(label, dx + dw / 2 - 3, top, K.white);
  rect(dx, top + 7, dw, bottom - top - 7, '#5a4636');
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) {
      const sx2 = dx + 6 + c * 10 + (r % 2) * 5;
      const sy2 = bottom - 6 - r * 6;
      if (sx2 > dx + dw - 5) continue;
      ellipse(sx2, sy2, 5, 3, K.ol);
      ellipse(sx2, sy2, 4, 2, r % 2 ? '#cdbf9c' : '#ddd0ad');
      hline(sx2 - 2, sy2 - 1, 4, '#f0e6c8');
    }
  glowFrom(dx, top + 18, dw, bottom - top - 18, 1.35);
  box(dx, top + 6, dw, 14, '#9aa0a0');
  for (let j = top + 8; j < top + 19; j += 2) hline(dx + 1, j, dw - 2, '#7c8282');
  for (let i = 0; i < dw; i++) for (let j = 0; j < 4; j++) mul(dx + i, top + 20 + j, 0.6 + j * 0.1);
  light(dx + dw / 2, bottom + 14, 54, K.warm, 1);
  box(dx + dw + 5, top - 8, 8, 5, K.blueDD);
  glowRect(dx + dw + 6, top - 4, 6, 1, '#fff4cf');
}
// Lantai dok: atas (top..edge), muka tegak 14 px; di sumur truk muka 38 px lalu lantai menurun.
function dockDeck(x0, x1, top, edge, lanes, laneW) {
  noiseFill(x0, top, x1 - x0, edge - top, ['#d1ccb9', '#cbc6b2', '#d6d1be'], 10);
  hline(x0, top, x1 - x0, K.ol);
  for (let x = x0 + 30; x < x1; x += 30) vline(x, top + 1, edge - top - 1, '#b9b4a1');
  for (let x = x0 + 4; x < x1 - 4; x += 8) rect(x, top + Math.round((edge - top) * 0.55), 4, 1, K.yellow);
  for (const lx of lanes) {
    box(lx + 4, edge - 14, laneW - 8, 13, '#8e9294');
    for (let j = edge - 12; j < edge - 2; j += 3) for (let i = lx + 6 + ((j / 3) % 2) * 2; i < lx + laneW - 6; i += 4) px(i, j, '#b5b9ba');
  }
  for (let i = x0; i < x1; i++) for (let j = 0; j < 3; j++) px(i, edge + j, Math.floor((i + j) / 4) % 2 ? K.yellow : '#2b2a2e');
  const face = edge + 3;
  noiseFill(x0, face, x1 - x0, 14, ['#9b978a', '#959184', '#a19d90'], 6);
  hline(x0, face + 14, x1 - x0, K.ol);
  for (const lx of lanes) {
    noiseFill(lx, face, laneW, 38, ['#8d897d', '#858175', '#938f83'], 6);
    hline(lx, face + 38, laneW, K.ol);
    for (let j = 0; j < 38; j++) for (let i = 0; i < 6; i++) mul(lx + i, face + j, 0.72);
    box(lx + 3, face + 10, 7, 16, '#262328');
    box(lx + laneW - 10, face + 10, 7, 16, '#262328');
    for (let j = 0; j < 44; j++) {
      const f = 0.58 + (j / 44) * 0.42;
      for (let i = 0; i < laneW; i++) mul(lx + i, face + 39 + j, f);
      for (let i = 0; i < Math.round((1 - j / 44) * 12); i++) mul(lx + i, face + 39 + j, 0.82);
    }
    for (let j = face + 14; j < face + 83; j++) {
      const c = Math.floor(j / 4) % 2 ? K.yellow : '#2b2a2e';
      px(lx - 1, j, c);
      px(lx - 2, j, c);
      px(lx + laneW, j, c);
      px(lx + laneW + 1, j, c);
    }
    for (let j = face + 83; j < H; j++) {
      px(lx - 1, j, K.yellow);
      px(lx + laneW, j, K.yellow);
    }
  }
  return face;
}
const GW = 290;
const G_LANES = [26, 150];
const LANE = 64;
function sceneDok() {
  noiseFill(0, 150, W, 120, ['#a3a08f', '#a9a694', '#9c9988', '#b0ad9b'], 12);
  for (let x = 0; x < W; x += 40) vline(x, 150, 120, '#86836f');
  for (let y = 180; y < H; y += 30) hline(0, y, W, '#86836f');
  for (let k = 0; k < 9; k++) ellipse(20 + rnd() * 440, 200 + rnd() * 60, 4 + rnd() * 6, 2 + rnd() * 2, '#6f6c62', 0.45);

  // gudang komoditas
  sengWall(0, GW, 10, 96);
  box(0, 0, GW + 2, 11, K.sengD);
  for (let i = 1; i < GW + 1; i += 3) vline(i, 1, 9, K.seng);
  for (let i = 0; i < GW; i++) for (let j = 0; j < 4; j++) mul(i, 11 + j, 0.7 + j * 0.07);
  pipe(120, 0, 96, K.sengD);
  signBoard(148, 14, 'GUDANG KOMODITAS', K.creamL, K.ol, 2);
  G_LANES.forEach((lx, k) => rollDoor(lx + 4, 44, LANE - 8, 96, `D${k + 1}`));
  box(108, 62, 8, 14, K.red);
  hline(109, 63, 6, K.redL);
  box(232, 58, 12, 12, '#e8e0c8');
  text('K3', 234, 62, K.redD);
  box(250, 64, 30, 18, K.woodD);
  rect(251, 65, 28, 16, '#b98a5a');
  for (const [nx, ny, c] of [[253, 67, K.white], [261, 67, '#f4e3a1'], [269, 68, '#cfe3e0']]) box(nx, ny, 7, 9, c);
  const gFace = dockDeck(0, GW, 96, 154, G_LANES, LANE);
  vline(GW, 96, gFace - 82, K.ol);

  // celah taman: memisahkan gudang dan cold storage
  noiseFill(GW + 1, 0, 40, 172, ['#6f8a4a', '#7a9550', '#66803f', '#83a058'], 9);
  for (let y = 4; y < 172; y += 10) for (let x = GW + 3; x < GW + 40; x += 8) tuft(x + rnd() * 4, y + rnd() * 6, false, 3);
  for (let y = 10; y < 160; y++) if (Math.abs(GW + 20 - 2 * Math.sin(y / 14) - (GW + 20)) < 6) px(GW + 14 + Math.round(Math.sin(y / 14) * 2) + (y % 2), y, '#b5a37a');
  shadowRect(GW + 1, 96, 6, 76, 1);
  tree(GW + 22, 70, 13, 4);
  for (let y = 100; y < 168; y += 12) box(GW + 34, y, 3, 10, K.creamL);

  // cold storage
  const cx = GW + 41;
  const cw = W - cx;
  noiseFill(cx, 10, cw, 80, ['#eef1ee', '#e6eae7', '#f3f5f1'], 8);
  for (let i = cx + 6; i < W; i += 12) vline(i, 10, 80, '#cdd5d3');
  box(cx, 0, cw, 11, K.blueD);
  hline(cx + 1, 1, cw - 2, K.blueL);
  signBoard(cx + cw / 2, 16, 'COLD STORAGE', K.blue, K.white, 2);
  const cdx = cx + 40;
  box(cdx - 3, 40, 64, 50, '#7d8a90');
  rect(cdx, 43, 58, 47, '#aac9db');
  for (let i = cdx + 1; i < cdx + 58; i += 4) {
    vline(i, 43, 47, '#d4e8f2');
    vline(i + 1, 43, 47, '#b9d6e6');
  }
  glowFrom(cdx, 43, 58, 47, 1.15);
  light(cdx + 29, 104, 50, '#bfe4ff', 0.9);
  box(cx + 8, 48, 14, 10, '#2b3540');
  text('-', cx + 13, 50, '#6fe0ff');
  glowRect(cx + 9, 49, 12, 8, '#3b8fb0');
  grime(cx, 50, cw, 40, 0.3);
  vline(cx, 0, 90, K.ol);
  const cFace = dockDeck(cx, W, 90, 136, [cdx - 4], 66);
  vline(cx, 90, cFace - 76, K.ol);
  for (const ux of [cx + 112, cx + 128]) {
    box(ux, 104, 14, 16, '#cfd3d5');
    ellipse(ux + 7, 111, 4, 4, '#6f767b');
    hline(ux + 3, 111, 9, '#3f4448');
    shadowRect(ux + 14, 106, 3, 14, 1);
  }

  // ramp miring forklift di ujung timur lantai gudang
  const rx = 254;
  for (let j = 0; j < 56; j++) {
    const f = 1.05 - (j / 56) * 0.18;
    for (let i = 0; i < 24; i++) px(rx + i, 154 + j, shade('#c6c1ad', f));
  }
  for (let j = 158; j < 208; j += 4) hline(rx + 3, j, 18, '#9b9784');
  for (let j = 152; j < 210; j++) {
    px(rx, j, K.yellow);
    px(rx - 1, j, K.ol);
    px(rx + 23, j, K.yellow);
    px(rx + 24, j, K.ol);
  }
  for (let i = rx - 1; i < rx + 25; i++) mul(i, 210, 0.7);

  // muatan dan orang di lantai dok
  sackStack(4, 112, 2, 2);
  sackStack(96, 114, 3, 2);
  sackStack(222, 108, 2, 3);
  sackStack(cx + 6, 98, 2, 2);
  forkliftSide(112, 150, true);
  person(64, 140, { skin: K.skin[1], hair: K.hair, top: K.white, accent: K.red, pants: '#3d4a63', uniform: true, idcard: true, clipboard: true, helm: true });
  person(210, 150, { skin: K.skin[0], hair: K.hair, top: K.blueD, accent: K.white, pants: '#2e3442', idcard: true, longSleeve: true, umbrella: K.white });
  person(cx + 92, 132, { skin: K.skin[1], hair: K.hair, top: '#3f6f9a', pants: '#3d4a63', hijab: K.blueDD, idcard: true, longSleeve: true });

  // kendaraan: truk komoditas di D1, D2 kosong (sumur menurun terlihat), truk berpendingin di cold storage
  truckWoodFront(G_LANES[0] + LANE / 2, 268, '#e2b13c');
  truckBoxFront(cdx + 29, 266, K.blue, true);
  forkliftFront(rx + 12, 252, true);
  person(124, 262, { skin: K.skin[2], hair: K.hair, top: '#8a6e4e', pants: '#3a3030', cap: K.red, umbrella: K.red });
  person(232, 262, { skin: K.skin[1], hair: K.hair, top: K.white, accent: K.red, pants: '#3d4a63', hijab: K.red, uniform: true, idcard: true, clipboard: true });
  for (let k = 0; k < 10; k++) tuft(300 + rnd() * 70, 262 + rnd() * 8, true, 6);
  puddle(110, 236, 16);
  puddle(330, 250, 12);
  puddle(200, 220, 8);
}

// ---------- lembar kendaraan ----------
function sceneKendaraan() {
  noiseFill(0, 0, W, H, ['#a3a08f', '#a9a694', '#9c9988'], 14);
  for (let y = 0; y < 30; y++) hline(0, y, W, '#8e8b7a', 0.25);
  noiseFill(0, 92, W, 82, ['#5a5660', '#55515a', '#5f5b64'], 10);
  hline(0, 92, W, K.ol);
  hline(0, 174, W, K.ol);
  for (let x = 6; x < W; x += 24) rect(x, 170, 12, 2, '#e6dec2');
  text('TAMPAK SAMPING - MELAJU DI JALAN', 8, 8, K.ol);
  truckBoxSide(8, 166, K.blue);
  truckWoodSide(150, 166, '#e2b13c');
  pickupSide(294, 166, '#d9d4c8');
  viarSide(400, 166);
  angkotSide(484, 166);
  const labels = [[8, 'TRUK BOKS KDMP'], [150, 'TRUK BAK KAYU'], [294, 'PIKAP'], [400, 'RODA TIGA'], [484, 'ANGKOT']];
  for (const [lx, s] of labels) text(s, lx, 180, K.ol);
  text('TAMPAK DEPAN - MUNDUR KE DOK / MENDEKAT', 8, 196, K.ol);
  const gy = 344;
  truckBoxFront(36, gy, K.blue);
  truckBoxFront(104, gy, K.blue, true);
  truckWoodFront(172, gy, '#e2b13c');
  pickupFront(236, gy, '#d9d4c8');
  viarFront(292, gy);
  angkotFront(350, gy);
  forkliftFront(410, gy);
  forkliftSide(450, gy);
  const front = [[14, 'BOKS'], [82, 'PENDINGIN'], [150, 'BAK KAYU'], [222, 'PIKAP'], [276, 'RODA 3'], [334, 'ANGKOT'], [440, 'FORKLIFT']];
  for (const [lx, s] of front) text(s, lx, gy + 8, K.ol);
}

// ---------- lembar orang ----------
function sceneOrang() {
  noiseFill(0, 0, W, 60, [K.cream, K.creamL, '#f7ecd6'], 7);
  hline(0, 59, W, K.ol);
  for (let y = 60; y < H; y++) for (let x = 0; x < W; x++) px(x, y, (Math.floor(x / 12) + Math.floor(y / 12)) % 2 ? K.tileA : K.tileB);
  const cast = [
    ['MANAJER', { skin: K.skin[0], hairStyle: 'rapi', top: '#7f9ccc', accent: '#ffffff', pants: '#5b5f7a', idcard: true, clipboard: true, longSleeve: true }],
    ['JALAN', { skin: K.skin[0], hairStyle: 'rapi', top: '#7f9ccc', pants: '#5b5f7a', longSleeve: true, side: true, pose: 'jalan' }],
    ['MANAJER', { skin: K.skin[1], top: '#7f9ccc', pants: '#5b5f7a', hijab: '#f2dcc0', idcard: true, longSleeve: true, skirt: true, bag: '#e2706a' }],
    ['STAF GERAI', { skin: K.skin[1], top: '#fffaf2', accent: K.red, pants: '#6a7090', hijab: K.red, uniform: true, idcard: true, apron: '#f39a8e', pose: 'lambai' }],
    ['STAF', { skin: K.skin[1], top: '#fffaf2', accent: K.red, pants: '#6a7090', uniform: true, pose: 'angkat' }],
    ['PENGURUS', { skin: K.skin[1], hair: '#5a4448', top: '#a8785a', batik: '#f2c87a', pants: '#5b4a52', peci: true, talk: true }],
    ['PENGAWAS', { skin: K.skin[0], top: '#8fa6c8', batik: '#fbe28a', pants: '#5b4a52', hijab: '#b4a4dc', skirt: true, glasses: true }],
    ['PETANI', { skin: K.skin[2], top: '#8fb4e0', pants: '#5b5f7a', caping: true, side: true, pose: 'jalan' }],
    ['SOPIR', { skin: K.skin[2], top: '#c8987a', pants: '#5b4a52', cap: K.red, shirt: 'kaos' }],
    ['GUDANG', { skin: K.skin[1], top: '#fffaf2', accent: K.red, pants: '#6a7090', uniform: true, helm: true, side: true, pose: 'angkat' }],
    ['APOTEKER', { skin: K.skin[0], top: '#7fd09a', pants: '#6a7a8a', hijab: '#5fae8a', coat: true, idcard: true, glasses: true }],
    ['WARGA', { skin: K.skin[2], top: '#c98a9a', pants: '#7a6a7a', hijab: '#f2dcc0', basket: true, skirt: true, side: true, pose: 'jalan' }],
    ['KAKEK', { skin: K.skin[0], hair: '#e8e2ea', top: '#b4a4dc', pants: '#5b5f7a', pose: 'duduk', glasses: true }],
    ['ANAK', { skin: K.skin[0], hair: '#5a4448', hairStyle: 'kuncir', top: '#fbe28a', pants: '#f39a8e', kid: true, pose: 'lambai' }],
    ['ANAK', { skin: K.skin[1], top: '#9cc4f0', pants: '#6a7090', kid: true, side: true, pose: 'jalan', shirt: 'kaos' }],
  ];
  cast.forEach(([label, o], i) => {
    const cx = 24 + i * 42;
    if (o.pose === 'duduk') {
      box(cx - 16, 112, 32, 5, K.woodL);
      box(cx - 14, 117, 3, 9, '#8f8aa0');
      box(cx + 11, 117, 3, 9, '#8f8aa0');
    }
    person(cx, o.pose === 'duduk' ? 124 : 128, o);
    text(label, Math.round(cx - textW(label) / 2), 136, K.ol);
  });
}

// ---------- denah dunia (tampak atas, ringkas) ----------
function pill(cx, y, s, bg, fg) {
  const w = textW(s) + 8;
  const x = Math.round(cx - w / 2);
  box(x, y, w, 9, bg);
  hline(x + 1, y + 1, w - 2, mix(bg, '#ffffff', 0.35));
  text(s, x + 4, y + 2, fg);
}
function zone(x, y, w, h, c, label, dashed = false) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
      const corner = (i < 2 || i > w - 3) && (j < 2 || j > h - 3);
      if (corner) continue;
      if (edge) {
        if (!dashed || (i + j) % 6 < 3) px(x + i, y + j, shade(c, 0.7));
      } else px(x + i, y + j, mix(c, '#ffffff', 0.35), 0.75);
    }
  pill(x + w / 2, y - 5, label, '#fffaf2', K.ol);
}
function mapHouse(x, y, roof) {
  box(x, y, 10, 8, '#fbf1dc');
  box(x - 1, y - 4, 12, 5, roof);
  shadowRect(x + 10, y - 2, 2, 9, 1);
}
function mapTree(x, y, c = K.leafM) {
  ellipse(x, y, 4, 3, K.ol);
  ellipse(x, y, 3, 2, c);
  px(x - 1, y - 1, K.leafH);
  shadowRect(x + 2, y + 2, 4, 2, 1);
}
function sceneDenah() {
  noiseFill(0, 0, W, H, ['#c7e7b6', '#bfe2ae', '#cdeabd', '#b7dca8'], 20);
  // sungai dan jembatan
  for (let y = 0; y < H; y++) {
    const cx = 64 + Math.sin(y / 40) * 14;
    for (let x = Math.round(cx - 10); x <= Math.round(cx + 10); x++) px(x, y, Math.abs(x - cx) > 8 ? '#9fd0b8' : (x + y) % 9 === 0 ? '#d4f0fa' : '#9fd0e6');
  }
  // jalan provinsi (bawah), jalan desa, jalan koperasi
  const road = (x, y, w, h) => {
    rect(x, y, w, h, '#bdb8c8');
    if (w > h) for (let i = x + 4; i < x + w; i += 14) rect(i, y + Math.floor(h / 2), 7, 1, '#fffaf2');
    else for (let j = y + 4; j < y + h; j += 14) rect(x + Math.floor(w / 2), j, 1, 7, '#fffaf2');
  };
  road(0, 318, W, 16);
  road(0, 172, W, 14);
  road(300, 20, 12, 298);
  road(440, 186, 10, 132);
  rect(48, 170, 34, 18, '#d9c8b4');
  for (let i = 50; i < 80; i += 4) vline(i, 170, 18, '#b89a80');
  text('JALAN PROVINSI', 8, 338, K.olS);
  text('JALAN DESA', 96, 162, K.olS);

  // zona
  zone(110, 26, 180, 80, '#d8ecb4', 'SAWAH DAN KEBUN');
  for (let y = 34; y < 100; y += 6) for (let x = 116; x < 284; x += 4) px(x, y, (x + y) % 8 ? '#9ccb6f' : '#c4e07a');
  zone(10, 200, 36, 100, '#d8ecb4', 'KEBUN');
  for (let y = 206; y < 296; y += 6) for (let x = 14; x < 44; x += 4) px(x, y, '#9ccb6f');
  zone(110, 120, 70, 44, '#f6d9c8', 'BALAI DESA');
  box(128, 132, 34, 22, '#c8987a');
  box(124, 128, 42, 6, '#a77a62');
  zone(196, 112, 96, 52, '#ffe9e2', 'PUSAT LAYANAN');
  const shops = [['#cdebd9', 'K'], ['#fbf3e6', 'KD'], ['#f7d3c0', 'S'], ['#cfe4f6', 'A'], ['#f8e8b4', 'SP']];
  shops.forEach(([c, l], i) => {
    box(200 + i * 18, 124, 16, 22, c);
    rect(200 + i * 18, 120, 16, 4, i === 1 ? K.red : '#d4bd98');
    text(l, 202 + i * 18, 132, K.ol);
  });
  text('KLINIK  KANTOR  SEMBAKO', 198, 150, K.olS);
  text('APOTEK  SIMPAN PINJAM', 198, 156, K.olS);
  zone(196, 196, 96, 70, '#d6f0c8', 'ALUN-ALUN');
  ellipse(244, 230, 14, 10, K.ol);
  ellipse(244, 230, 13, 9, '#9fd0e6');
  for (const [tx, ty] of [[208, 208], [280, 208], [208, 256], [280, 256], [226, 244]]) mapTree(tx, ty, '#f6a5b8');
  zone(110, 196, 74, 60, '#fde8c4', 'PASAR TANI');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) box(118 + i * 22, 208 + j * 20, 16, 10, pick(['#f39a8e', '#8dcfc6', '#fbe28a']));
  zone(320, 20, 300, 140, '#efe4f6', 'PERMUKIMAN WARGA');
  for (let j = 0; j < 5; j++) for (let i = 0; i < 12; i++) if ((i + j) % 4 !== 3) mapHouse(332 + i * 24 + (j % 2) * 8, 40 + j * 24, pick(['#eba08a', '#b4a4dc', '#7fc2c0', '#f5b98a']));
  zone(460, 196, 170, 112, '#e2e8f2', 'KAWASAN LOGISTIK');
  box(470, 210, 84, 34, K.teal);
  text('GUDANG', 482, 222, K.ol);
  for (let i = 0; i < 3; i++) box(476 + i * 26, 244, 18, 8, K.yellow);
  rect(558, 206, 8, 46, '#b2dea6');
  mapTree(562, 214);
  mapTree(562, 238);
  box(570, 210, 52, 30, '#cfe4f6');
  text('COLD', 584, 218, K.ol);
  box(586, 240, 18, 8, K.yellow);
  box(470, 266, 70, 32, '#d8d4e0');
  text('POOL TRUK', 476, 278, K.ol);
  for (let i = 0; i < 3; i++) box(548 + i * 24, 270, 18, 26, '#f4f2ea');
  zone(560, 336, 70, 20, '#fffaf2', 'RENCANA', true);
  text('SUPLIER', 572, 344, K.olS);
  zone(320, 200, 110, 100, '#d6f0c8', 'TAMAN DAN LAPANGAN');
  box(340, 222, 70, 44, '#bfe2ae');
  rect(340, 243, 70, 1, '#fffaf2');
  ellipse(375, 244, 8, 8, '#fffaf2', 0.6);
  for (let i = 0; i < 6; i++) mapTree(330 + i * 18, 286);
  // rute truk komoditas: jalan provinsi → jalan logistik → dok
  for (let x = W; x > 445; x -= 6) rect(x, 324, 3, 3, K.red);
  for (let y = 324; y > 250; y -= 6) rect(444, y, 3, 3, K.red);
  for (let x = 444; x < 500; x += 6) rect(x, 252, 3, 3, K.red);
  pill(560, 306, 'TRUK MASUK', K.red, '#fffaf2');
  for (const [tx, ty] of [[100, 12], [96, 110], [190, 300], [260, 300], [20, 150], [30, 312]]) mapTree(tx, ty);
  pill(320, 4, 'DENAH DUNIA KOPERASI', '#fffaf2', K.ol);
}

// ---------- grading per suasana (pastel, lembut) ----------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function grade(mode) {
  const out = new Float32Array(W * H * 3);
  const L = new Float32Array(W * H * 3);
  const strength = mode === 'siang' ? 0 : mode === 'senja' ? 0.55 : 1;
  if (strength)
    for (const l of lights)
      for (let y = Math.max(0, Math.floor(l.y - l.r)); y < Math.min(H, l.y + l.r); y++)
        for (let x = Math.max(0, Math.floor(l.x - l.r)); x < Math.min(W, l.x + l.r); x++) {
          const d = Math.hypot(x - l.x, (y - l.y) * 1.3) / l.r;
          if (d >= 1) continue;
          // pita cahaya ber-dither Bayer: tepi lembut tetapi tetap terasa pixel
          const raw = (1 - d) * (1 - d) * 6;
          const v = (Math.floor(raw + BAYER[(y % 4) * 4 + (x % 4)] / 16) / 6) * l.s * strength;
          const k = (y * W + x) * 3;
          for (let c = 0; c < 3; c++) L[k + c] += (l.c[c] / 255) * v;
        }
  for (let i = 0; i < W * H; i++) {
    const s = shadowM[i];
    const x = i % W;
    const y = Math.floor(i / W);
    const k = i * 3;
    // Tidak pastel: lebih redup, kontras, hangat-olive; bayangan biru-ungu tegas.
    let r = buf[k] * (1 - 0.34 * s);
    let g = buf[k + 1] * (1 - 0.3 * s);
    let b = buf[k + 2] * (1 - 0.18 * s);
    const lum = (r + g + b) / 3;
    r = lum + (r - lum) * 1.15;
    g = lum + (g - lum) * 1.15;
    b = lum + (b - lum) * 1.15;
    r = 10 + ((r - 128) * 1.12 + 128) * 0.84;
    g = 10 + ((g - 128) * 1.12 + 128) * 0.82;
    b = 16 + ((b - 128) * 1.12 + 128) * 0.74;
    // Varian uji warna (VARIAN=terang|hangat|segar|teduh).
    const VR = process.env.VARIAN || 'eastward';
    if (VR === 'terang') { r = r * 1.1 + 12; g = g * 1.1 + 12; b = b * 1.1 + 10; }
    if (VR === 'hangat') { r = r * 1.14 + 16; g = g * 1.08 + 10; b = b * 0.98 + 2; }
    if (VR === 'segar') { r = r * 1.06 + 8; g = g * 1.14 + 12; b = b * 1.08 + 10; }
    if (VR === 'stardew') {
      // cerah, jenuh, hangat; hijau segar
      const l2 = (r + g + b) / 3;
      r = l2 + (r - l2) * 1.35; g = l2 + (g - l2) * 1.4; b = l2 + (b - l2) * 1.2;
      r = r * 1.12 + 14; g = g * 1.12 + 12; b = b * 1.0 + 4;
    }
    if (VR === 'eastward') {
      // kusam sinematik: olive-teal, sorotan hangat, bayangan dalam
      const l2 = (r + g + b) / 3;
      r = l2 + (r - l2) * 0.8; g = l2 + (g - l2) * 0.85; b = l2 + (b - l2) * 0.8;
      r = (r - 128) * 1.15 + 128 + 6; g = (g - 128) * 1.12 + 128 + 8; b = (b - 128) * 1.05 + 128 - 6;
    }
    if (VR === 'teduh') { r = r * 1.04 + 10; g = g * 1.06 + 12; b = b * 1.14 + 18; }
    if (mode === 'senja') { r = r * 1.1 + 18; g = g * 0.76 + 4; b = b * 0.5; }
    if (mode === 'malam') { r = r * 0.36 + 4; g = g * 0.44 + 8; b = b * 0.66 + 20; }
    const col = [r, g, b];
    const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
    const vig = 1 - 0.3 * Math.max(0, d - 0.55) ** 1.5;
    const grain = (rnd() - 0.5) * 3;
    for (let c = 0; c < 3; c++) {
      col[c] += buf[k + c] * Math.min(L[k + c], 1.3) * 0.8 + 18 * Math.min(L[k + c], 1);
      if (strength && emisOn[i]) col[c] = col[c] * (1 - strength) + emis[k + c] * strength;
      out[k + c] = col[c] * vig + grain;
    }
  }
  if (mode === 'malam')
    for (let n = 0; n < (W * H) / 220; n++) {
      const x = rnd() * W;
      const y = rnd() * H;
      for (let s = 0; s < 5; s++) {
        const X = Math.floor(x - s * 0.5);
        const Y = Math.floor(y + s);
        if (!inside(X, Y)) continue;
        const k = (Y * W + X) * 3;
        out[k] += (190 - out[k]) * 0.28;
        out[k + 1] += (200 - out[k + 1]) * 0.28;
        out[k + 2] += (235 - out[k + 2]) * 0.28;
      }
    }
  return out;
}

// ---------- PNG ----------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const v of b) c = CRC[(c ^ v) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(img, s) {
  const w = W * s;
  const h = H * s;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = (Math.floor(y / s) * W + Math.floor(x / s)) * 3;
      const o = y * (w * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.max(0, Math.min(255, Math.round(img[k + c])));
    }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const RENDERS = [
    { name: 'kendaraan', w: 584, h: 360, s: 2, scene: sceneKendaraan, modes: ['siang'] },
    { name: 'orang', w: 640, h: 144, s: 3, scene: sceneOrang, modes: ['siang'] },
    { name: 'dok', w: 480, h: 270, s: 3, scene: sceneDok, modes: ['siang', 'senja', 'malam'] },
    { name: 'denah', w: 640, h: 360, s: 3, scene: sceneDenah, modes: ['siang'] },
    { name: 'kota', w: 640, h: 360, s: 3, scene: sceneKota, modes: ['siang', 'senja', 'malam'] },
  ];
  const only = process.argv[2];
  for (const r of RENDERS)
    for (const mode of r.modes) {
      const file = r.modes.length > 1 ? `${r.name}-${mode}` : r.name;
      if (only && !file.startsWith(only)) continue;
      W = r.w;
      H = r.h;
      seed = 7;
      rain = mode === 'malam';
      buf = new Float32Array(W * H * 3);
      emis = new Float32Array(W * H * 3);
      emisOn = new Uint8Array(W * H);
      shadowM = new Float32Array(W * H);
      lights = [];
      alpha = null;
      r.scene();
      writeFileSync(`${OUT}/${file}.png`, png(grade(mode), r.s));
      console.log(`${OUT}/${file}.png`);
    }
}

// ---------- ekspor sprite transparan (dipakai scripts/dunia-pixel/aset.mjs) ----------
/** Cerminkan kanvas kiri-kanan; dipakai untuk sprite kendaraan menghadap kiri. */
function flipCanvas() {
  const swap = (arr, stride) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W / 2; x++) {
        const a = (y * W + x) * stride;
        const b = (y * W + (W - 1 - x)) * stride;
        for (let k = 0; k < stride; k++) [arr[a + k], arr[b + k]] = [arr[b + k], arr[a + k]];
      }
  };
  swap(buf, 3);
  swap(emis, 3);
  swap(emisOn, 1);
  swap(shadowM, 1);
  if (alpha) swap(alpha, 1);
  for (const l of lights) l.x = W - 1 - l.x;
}
/** Siapkan kanvas transparan baru untuk satu sprite. */
function beginCanvas(w, h, s = 7) {
  W = w;
  H = h;
  seed = s;
  rain = false;
  buf = new Float32Array(W * H * 3);
  emis = new Float32Array(W * H * 3);
  emisOn = new Uint8Array(W * H);
  shadowM = new Float32Array(W * H);
  alpha = new Float32Array(W * H);
  lights = [];
}
/** RGBA siang: warna di-unpremultiply, diberi grading, bayangan jatuh menjadi gelap transparan. */
function spriteRGBA(gradeRgb) {
  const out = Buffer.alloc(W * H * 4);
  const shadowC = gradeRgb([27, 34, 56]);
  for (let i = 0; i < W * H; i++) {
    const a = Math.min(1, alpha[i]);
    const s = shadowM[i];
    let c = [0, 0, 0];
    if (a > 0.004) {
      c = [buf[i * 3] / a, buf[i * 3 + 1] / a, buf[i * 3 + 2] / a];
      c = gradeRgb([c[0] * (1 - 0.34 * s), c[1] * (1 - 0.3 * s), c[2] * (1 - 0.18 * s)]);
    }
    let outA = a;
    if (s > 0 && a < 1) {
      const sa = 0.34 * s;
      outA = a + sa * (1 - a);
      c = c.map((v, k) => (v * a + shadowC[k] * sa * (1 - a)) / outA);
    }
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.max(0, Math.min(255, Math.round(c[k])));
    out[i * 4 + 3] = Math.round(outA * 255);
  }
  return out;
}
/** RGBA lapisan malam (dicampur aditif): jendela/papan menyala dan kolam cahaya berpita. */
function glowRGBA() {
  const L = new Float32Array(W * H * 3);
  for (const l of lights)
    for (let y = Math.max(0, Math.floor(l.y - l.r)); y < Math.min(H, l.y + l.r); y++)
      for (let x = Math.max(0, Math.floor(l.x - l.r)); x < Math.min(W, l.x + l.r); x++) {
        const d = Math.hypot(x - l.x, (y - l.y) * 1.3) / l.r;
        if (d >= 1) continue;
        const raw = (1 - d) * (1 - d) * 6;
        const v = (Math.floor(raw + BAYER[(y % 4) * 4 + (x % 4)] / 16) / 6) * l.s * 0.5;
        for (let c = 0; c < 3; c++) L[(y * W + x) * 3 + c] += (l.c[c] / 255) * v;
      }
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    if (emisOn[i]) {
      for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.min(255, Math.round(emis[i * 3 + k]));
      out[i * 4 + 3] = 255;
      continue;
    }
    const m = Math.max(L[i * 3], L[i * 3 + 1], L[i * 3 + 2]);
    if (m <= 0) continue;
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.min(255, Math.round((L[i * 3 + k] / m) * 255));
    out[i * 4 + 3] = Math.min(255, Math.round(m * 255));
  }
  return out;
}
function pngRGBA(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export {
  K, rgb, shade, mix, rnd, pick, noise, px, mul, rect, hline, vline, box, line, ellipse, noiseFill, grime,
  glowRect, glowFrom, light, shadowRect, shadowEllipse, text, textW, signBoard, win, acUnit, pipe, poster, plant,
  awning, tree, pastelTree, bush, tuft, flowerBox, pastelWall, roofTiles, crate, lpg, sackStack, sengWall, rollDoor,
  fill_cross, wire, lamp, beginCanvas, spriteRGBA, glowRGBA, pngRGBA, flipCanvas,
};

// Dijalankan langsung (bukan diimpor oleh aset.mjs).
if (process.argv[1]?.endsWith('preview.mjs')) main();
