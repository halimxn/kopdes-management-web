// Generator aset Dunia Koperasi (P3a): sprite bangunan, rumah dan pohon bergaya Eastward
// nada tanah, berukuran persis tapak di src/features/cooperative-world/pixel/map.ts.
// Hasil: public/dunia/bangunan/<sprite>.png (+ -malam.png lapisan cahaya) dan public/dunia/pohon/.
// Jalankan: node --no-warnings scripts/dunia-pixel/aset.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  HOUSE_DEPTH,
  HOUSE_KINDS,
  HOUSE_WIDTHS,
  SPRITE_MARGIN as M,
  TREE_SIZES,
  mapBuildings,
} from '../../src/features/cooperative-world/pixel/map.ts';
import { gradeRgb } from '../../src/features/cooperative-world/pixel/grade.ts';
import {
  K,
  acUnit,
  awning,
  beginCanvas,
  box,
  bush,
  crate,
  ellipse,
  fill_cross,
  flowerBox,
  glowFrom,
  glowRGBA,
  glowRect,
  grime,
  hline,
  light,
  line,
  lpg,
  mix,
  noiseFill,
  pastelTree,
  pastelWall,
  pipe,
  plant,
  pngRGBA,
  poster,
  rect,
  rollDoor,
  roofTiles,
  sackStack,
  sengWall,
  shade,
  shadowRect,
  signBoard,
  spriteRGBA,
  text,
  textW,
  vline,
  win,
} from './preview.mjs';

const OUT = 'public/dunia';
const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);

// ---------- bagian bersama ----------
/** Bayangan jatuh ke timur-selatan dan bayangan kontak di kaki fasad. */
function castShadow(ox, oy, fw, fh, H) {
  shadowRect(ox + fw, oy + fh + 10, 12, H - 8, 1);
  shadowRect(ox + 6, oy + fh + H, fw + 6, 7, 1);
  shadowRect(ox + fw, oy + fh + H, 12, 7, 1);
}
function flatRoof(ox, oy, fw, fh) {
  box(ox - 2, oy, fw + 4, fh, '#c9c3b8');
  noiseFill(ox + 4, oy + 4, fw - 8, fh - 8, ['#9a9584', '#a39e8c', '#918c7c', '#aaa593'], 4);
  hline(ox - 1, oy + 1, fw + 2, '#e3ddd2');
  rect(ox - 1, oy + fh - 4, fw + 2, 3, '#a39d92');
  for (let i = 0; i < fw - 8; i++) shadowRect(ox + 4 + i, oy + 4, 1, 3, 0.7);
}
function waterTank(x, y) {
  ellipse(x + 9, y + 18, 11, 4, K.ol);
  rect(x - 1, y + 4, 21, 15, K.ol);
  rect(x, y + 4, 19, 14, '#3f6f9a');
  for (let i = 0; i < 19; i++) vline(x + i, y + 4, 14, i < 5 ? '#5b8fbf' : i > 14 ? '#2f5577' : '#3f6f9a');
  ellipse(x + 9, y + 4, 10, 3, '#6fa2cf');
  ellipse(x + 9, y + 4, 3, 1, '#2f5577');
  for (let j = y + 7; j < y + 18; j += 4) hline(x, j, 19, '#2f5577', 0.6);
}
function solarPanel(x, y, w) {
  box(x, y, w, 12, '#2f4f86');
  for (let k = 4; k < w; k += 5) vline(x + k, y + 1, 10, '#4c6fae');
  hline(x + 1, y + 6, w - 2, '#4c6fae');
  hline(x + 1, y + 1, w - 2, '#7d9ad1');
}
function condenser(x, y) {
  box(x, y, 22, 14, '#d0d4d6');
  hline(x + 1, y + 1, 20, '#eceeef');
  ellipse(x + 7, y + 7, 4, 4, '#6f767b');
  ellipse(x + 16, y + 7, 4, 4, '#6f767b');
  hline(x + 3, y + 7, 9, '#3f4448');
  hline(x + 12, y + 7, 9, '#3f4448');
  shadowRect(x + 22, y + 3, 3, 12, 1);
}
function glassDoor(x, y, w, h, frame = '#405d84') {
  box(x, y, w, h, frame);
  const half = Math.floor((w - 4) / 2);
  for (const dx of [2, 2 + half]) {
    rect(x + dx, y + 2, half - 1, h - 2, '#8fb0bf');
    for (let j = 0; j < h - 2; j++) hline(x + dx, y + 2 + j, half - 1, '#475b6e', 0.55 * (j / h));
    line(x + dx + 2, y + h - 10, x + dx + half - 4, y + 6, '#d6ecf8', 0.6);
  }
  glowRect(x + 2, y + 2, w - 4, h - 2, '#ffe0a0');
  light(x + w / 2, y + h + 6, w + 20, K.warm, 0.9);
}
function canopy(x, y, w, c) {
  box(x, y, w, 7, c);
  hline(x + 1, y + 1, w - 2, mix(c, '#ffffff', 0.3));
  for (let i = 0; i < w; i++) for (let j = 0; j < 5; j++) shadowRect(x + i, y + 7 + j, 1, 1, 0.9 - j * 0.15);
}
function noticeBoard(x, y) {
  box(x, y, 22, 26, K.woodD);
  rect(x + 1, y + 1, 20, 22, '#b98a5a');
  for (const [nx, ny, c] of [[x + 2, y + 2, K.white], [x + 11, y + 3, '#f4e3a1'], [x + 3, y + 12, '#cfe3e0'], [x + 12, y + 13, K.white]]) box(nx, ny, 8, 9, c);
  text('INFO', x + 4, y + 27, K.ol);
}
function vertSign(x, y, words, bg) {
  const h = words.reduce((n, w) => n + w.length * 6 + 4, 4);
  box(x, y, 14, h, bg);
  let vy = y + 4;
  for (const w of words) {
    for (const ch of w) {
      text(ch, x + 5, vy, '#fffaf2');
      vy += 6;
    }
    vy += 4;
  }
  glowFrom(x + 1, y + 1, 12, h - 2, 1.15);
  light(x + 7, y + h / 2, 34, '#a8c8ff', 0.5);
}
function shopShelves(x, y, w, h) {
  box(x, y, w, h, '#3d3436');
  for (let r = y + 8; r < y + h - 2; r += 10) {
    hline(x + 1, r, w - 2, K.woodL);
    for (let i = x + 2; i < x + w - 3; i += 3) box(i, r - 7, 3, 7, ['#e35d4a', '#f2c84b', '#6fae5f', '#5a8fe0', '#f3efe6', '#e88b3a', '#c56fb0'][(i * 7 + r) % 7]);
  }
  glowFrom(x + 1, y + 1, w - 2, h - 2, 1.25);
  light(x + w / 2, y + h + 6, w * 0.7, K.warm, 1);
}

// ---------- bangunan per gaya ----------
function kantor(b, ox, oy) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  flatRoof(ox, oy, fw, fh);
  for (let i = 0; i < 3; i++) solarPanel(ox + 14 + i * 54, oy + 12, 46);
  waterTank(ox + fw - 56, oy + 14);
  condenser(ox + fw - 30, oy + fh - 30);
  pastelWall(ox, top, fw, H, b.wall, 12);
  for (let i = 0; i < 5; i++) {
    win(ox + 14 + i * 52, top + 12, 36, 28, { frame: '#f6efd8', blinds: i % 2 === 0, curtain: i % 2 ? '#93b5a6' : null });
    flowerBox(ox + 11 + i * 52, top + 44, 42);
  }
  box(ox + 8, top + 58, fw - 16, 30, K.red);
  hline(ox + 9, top + 59, fw - 18, K.redL);
  hline(ox + 9, top + 86, fw - 18, K.redD);
  text('KOPERASI DESA', ox + fw / 2 - textW('KOPERASI DESA', 2) / 2, top + 62, '#fffaf2', 2);
  text('MERAH PUTIH', ox + fw / 2 - textW('MERAH PUTIH') / 2, top + 77, '#ffe6dc');
  glowFrom(ox + 9, top + 59, fw - 18, 27, 1.1);
  light(ox + fw / 2, top + 96, fw * 0.6, '#ff9d7a', 0.6);
  for (const cx of [ox + 6, ox + 96, ox + fw - 102, ox + fw - 12]) box(cx, top + 92, 6, H - 92, mix(b.wall, '#ffffff', 0.35));
  win(ox + 16, top + 102, 74, 44, { frame: '#f6efd8', blinds: true });
  win(ox + fw - 90, top + 102, 74, 44, { frame: '#f6efd8', blinds: true });
  canopy(ox + fw / 2 - 40, ground - 72, 80, '#405d84');
  text('KANTOR', ox + fw / 2 - textW('KANTOR') / 2, ground - 70, '#fffaf2');
  glassDoor(ox + fw / 2 - 26, ground - 62, 52, 62);
  noticeBoard(ox + fw / 2 + 34, ground - 52);
  plant(ox + fw / 2 - 40, ground, 2);
  plant(ox + fw / 2 + 64, ground, 1);
  pipe(ox + fw - 4, top, H, K.sengD);
  acUnit(ox + 100, top + 92);
  grime(ox, top + H * 0.55, fw, H * 0.45, 0.22);
}
const TOKO_AWNING = { sembako: [K.red, '#f1ebd6'], 'gerai-1': ['#5e968f', '#ece2c2'], 'gerai-2': ['#dd9f55', '#ece2c2'], 'gerai-3': ['#8a5a3c', '#ece2c2'] };
function toko(b, ox, oy) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  roofTiles(ox - 6, oy - 2, fw + 12, fh + 4, b.roof);
  pastelWall(ox, top, fw, H, b.wall, 0);
  const upper = H >= 120;
  if (upper) {
    win(ox + 12, top + 10, 32, 24, { frame: '#f6efd8', curtain: '#c9876a' });
    win(ox + fw - 44, top + 10, 32, 24, { frame: '#f6efd8', curtain: '#93b5a6' });
    line(ox + 50, top + 14, ox + fw - 50, top + 14, K.olS);
    ['#cfe4f6', '#fbe28a', '#f6c9d4', '#9fd09a'].forEach((c, i) => box(ox + 54 + i * 16, top + 15, 10, 13, c));
    box(ox + 4, top + 40, fw - 8, 3, K.ol);
    for (let i = ox + 6; i < ox + fw - 6; i += 5) vline(i, top + 43, 9, '#7c6a5c');
    box(ox + 4, top + 52, fw - 8, 3, '#8a6a52');
    flowerBox(ox + 8, top + 40, 26);
    flowerBox(ox + fw - 34, top + 40, 26);
  } else {
    win(ox + fw / 2 - 18, top + 10, 36, 20, { frame: '#f6efd8', curtain: '#c9876a' });
  }
  const signY = upper ? top + 60 : top + 36;
  signBoard(ox + fw / 2, signY, b.sign, '#f6efd8', K.redD, 2);
  const [c1, c2] = TOKO_AWNING[b.id] || [K.red, '#f1ebd6'];
  awning(ox + 2, ground - 58, fw - 4, 9, c1, c2);
  shopShelves(ox + 8, ground - 44, fw - 16, 44);
  if (b.id === 'sembako') {
    crate(ox + 6, ground - 6, '#e35d4a');
    crate(ox + 22, ground - 4, '#6fae5f');
    sackStack(ox + fw - 56, ground - 12, 2, 1);
    lpg(ox + fw - 14, ground + 2);
    lpg(ox + fw - 7, ground + 3);
  } else {
    plant(ox + 4, ground + 2, 0);
    plant(ox + fw - 12, ground + 2, 2);
  }
  grime(ox, top + H * 0.5, fw, H * 0.5, 0.2);
}
function klinik(b, ox, oy) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  roofTiles(ox - 6, oy - 2, fw + 12, fh + 4, b.roof);
  pastelWall(ox, top, fw, H, b.wall, 10);
  win(ox + 12, top + 10, 32, 26, { frame: '#f6efd8', curtain: '#f6c9d4' });
  win(ox + fw - 44, top + 10, 32, 26, { frame: '#f6efd8', blinds: true });
  box(ox + fw / 2 - 11, top + 10, 22, 22, '#ffffff');
  fill_cross(ox + fw / 2, top + 21);
  signBoard(ox + fw / 2, top + 44, 'KLINIK DESA', '#f6efd8', '#2c6a5a', 2);
  canopy(ox + fw / 2 - 30, ground - 70, 60, b.roof);
  glassDoor(ox + fw / 2 - 22, ground - 62, 44, 62, '#2c6a5a');
  win(ox + 10, ground - 56, 30, 34, { frame: '#f6efd8', blinds: true, single: true });
  win(ox + fw - 40, ground - 56, 30, 34, { frame: '#f6efd8', blinds: true, single: true });
  plant(ox + fw / 2 - 34, ground, 2);
  grime(ox, top + H * 0.5, fw, H * 0.5, 0.2);
}
function apotek(b, ox, oy) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  flatRoof(ox, oy, fw, fh);
  acUnit(ox + 12, oy + 16);
  acUnit(ox + 34, oy + 16);
  condenser(ox + fw - 34, oy + 20);
  pastelWall(ox, top, fw, H, b.wall, 12);
  win(ox + 10, top + 10, 28, 26, { frame: '#f6efd8', blinds: true });
  win(ox + fw - 38, top + 10, 28, 26, { frame: '#f6efd8', curtain: '#cdebd9' });
  box(ox + 8, top + 44, 18, 18, '#5fbf8a');
  fill_cross(ox + 17, top + 53);
  signBoard(ox + fw / 2 + 12, top + 46, 'APOTEK', '#f6efd8', '#2c7a52', 2);
  box(ox + 8, ground - 64, 44, 64, '#5d6b66');
  rect(ox + 10, ground - 62, 40, 62, '#9fc2b5');
  for (let s = 0; s < 4; s++) {
    hline(ox + 11, ground - 52 + s * 13, 38, '#f6efd8');
    for (let i = ox + 12; i < ox + 48; i += 3) box(i, ground - 59 + s * 13, 2, 6, ['#f2f2ea', '#8fc3e0', '#f2b6b6', '#c9e8a8'][(i + s) % 4]);
  }
  glowFrom(ox + 10, ground - 62, 40, 62, 1.2);
  light(ox + 30, ground + 6, 50, '#d8fff0', 0.8);
  glassDoor(ox + fw - 56, ground - 60, 44, 60, '#2c6a5a');
  grime(ox, top + H * 0.5, fw, H * 0.5, 0.2);
}
function loket(b, ox, oy) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  roofTiles(ox - 6, oy - 2, fw + 12, fh + 4, b.roof);
  pastelWall(ox, top, fw, H, b.wall, 0);
  for (let j = ground - 46; j < ground - 4; j += 6) for (let i = ox + ((j / 6) % 2) * 6; i < ox + fw - 2; i += 12) box(i, j, 12, 6, '#a0705a');
  win(ox + 12, top + 10, 30, 28, { frame: '#f6efd8', curtain: '#e3c17a' });
  win(ox + 56, top + 10, 30, 28, { frame: '#f6efd8', blinds: true });
  vertSign(ox + fw - 26, top + 6, ['SIMPAN', 'PINJAM'], K.blueD);
  box(ox + 12, ground - 70, 64, 70, '#8f9696');
  for (let j = ground - 68; j < ground - 40; j += 2) hline(ox + 13, j, 62, '#b4bbbb');
  rect(ox + 13, ground - 40, 62, 40, '#fff1d6');
  rect(ox + 20, ground - 30, 48, 14, K.woodL);
  hline(ox + 20, ground - 30, 48, '#e0c090');
  glowRect(ox + 13, ground - 40, 62, 10, '#ffe2a6');
  light(ox + 44, ground + 6, 50, K.warm, 0.9);
  poster(ox + 84, ground - 60, 18, 24, '#d9b45a');
  grime(ox, top + H * 0.5, fw, H * 0.5, 0.2);
}
function balai(b, ox, oy) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  // lantai panggung dan tiang kayu pendopo terbuka
  box(ox - 4, ground - 14, fw + 8, 14, '#b9a27a');
  hline(ox - 3, ground - 13, fw + 6, '#d8c49a');
  noiseFill(ox + 2, top + 8, fw - 4, H - 22, ['#5c4433', '#54402f', '#634a37'], 6);
  for (let i = 0; i < 6; i++) {
    const px = ox + 6 + i * ((fw - 18) / 5);
    box(px, top + 4, 6, H - 18, K.woodD);
    vline(px + 1, top + 5, H - 20, K.woodL);
  }
  // atap joglo bertingkat (dasar lebar, tengah, puncak)
  const layer = (lx, ly, lw, lh) => {
    rect(lx, ly, lw, lh, '#7a4a33');
    for (let r = ly; r < ly + lh; r += 3) {
      hline(lx, r, lw, '#94593c');
      hline(lx, r + 2, lw, '#5f3826');
    }
    rect(lx, ly + lh - 2, lw, 2, '#3f2418');
    hline(lx, ly, lw, '#b77a52');
    vline(lx, ly, lh, K.ol);
    vline(lx + lw - 1, ly, lh, K.ol);
  };
  layer(ox - 10, oy + fh * 0.45, fw + 20, fh * 0.55 + 12);
  layer(ox + fw * 0.15, oy + fh * 0.18, fw * 0.7, fh * 0.32);
  layer(ox + fw * 0.32, oy - 4, fw * 0.36, fh * 0.24);
  rect(ox + fw / 2 - 2, oy - 10, 4, 7, '#d9a54a');
  signBoard(ox + fw / 2, top + 16, 'BALAI DESA', '#f5ead2', '#5a3a26', 1);
  light(ox + fw / 2, ground - 20, 70, K.warm, 0.9);
  glowRect(ox + fw / 2 - 3, top + 30, 6, 4, '#fff1c0');
}
function gudang(b, ox, oy) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  // atap seng pelana: bidang belakang lebih gelap, garis gelombang tegak
  const ridge = Math.round(fh * 0.35);
  for (let i = 0; i < fw + 8; i++) {
    const t = i % 4;
    const col = t === 0 ? '#c3ccd0' : t === 1 ? '#a8b4b8' : t === 2 ? '#8f9ca2' : '#9fabb0';
    vline(ox - 4 + i, oy, ridge, shade(col, 0.82));
    vline(ox - 4 + i, oy + ridge, fh - ridge, col);
  }
  rect(ox - 4, oy + ridge - 1, fw + 8, 2, '#6c7a83');
  hline(ox - 4, oy + ridge - 1, fw + 8, '#d5e0e5');
  for (let k = 0; k < 18; k++) rect(ox + Math.floor((k * 97) % fw), oy + ridge + 4 + ((k * 13) % (fh - ridge - 8)), 3, 2, '#a07a5a', 0.55);
  rect(ox - 4, oy + fh - 3, fw + 8, 3, '#5d6a72');
  vline(ox - 4, oy, fh, K.ol);
  vline(ox + fw + 3, oy, fh, K.ol);
  sengWall(ox, ox + fw, top, ground);
  vline(ox, top, H, K.ol);
  vline(ox + fw - 1, top, H, K.ol);
  signBoard(ox + fw / 2, top + 6, 'GUDANG KOMODITAS', '#f6efd8', K.ol, 2);
  [0, 1, 2].forEach((k) => rollDoor(ox + 20 + k * 104, top + 40, 76, ground, `D${k + 1}`));
  box(ox + 98, top + 50, 8, 14, K.red);
  hline(ox + 99, top + 51, 6, K.redL);
  box(ox + 306, top + 40, 14, 14, '#e8e0c8');
  text('K3', ox + 308, top + 45, K.redD);
  pipe(ox + fw - 4, top, H, K.sengD);
}
function pendingin(b, ox, oy) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  flatRoof(ox, oy, fw, fh);
  for (let i = 0; i < 4; i++) condenser(ox + 14 + i * 48, oy + 24 + (i % 2) * 22);
  noiseFill(ox, top, fw, H, ['#eef1ee', '#e6eae7', '#f3f5f1'], 8);
  for (let i = ox + 8; i < ox + fw; i += 12) vline(i, top, H, '#cdd5d3');
  vline(ox, top, H, K.ol);
  vline(ox + fw - 1, top, H, K.ol);
  box(ox, top, fw, 10, K.blueD);
  hline(ox + 1, top + 1, fw - 2, K.blueL);
  signBoard(ox + fw / 2, top + 16, 'COLD STORAGE', K.blue, '#fffaf2', 2);
  const dx = ox + fw / 2 - 36;
  box(dx - 3, ground - 66, 78, 66, '#7d8a90');
  rect(dx, ground - 63, 72, 63, '#aac9db');
  for (let i = dx + 1; i < dx + 72; i += 4) {
    vline(i, ground - 63, 63, '#d4e8f2');
    vline(i + 1, ground - 63, 63, '#b9d6e6');
  }
  glowFrom(dx, ground - 63, 72, 63, 1.15);
  light(dx + 36, ground + 8, 60, '#bfe4ff', 0.9);
  box(ox + 14, ground - 56, 16, 12, '#2b3540');
  text('-', ox + 20, ground - 52, '#6fe0ff');
  glowRect(ox + 15, ground - 55, 14, 10, '#3b8fb0');
  grime(ox, top + H * 0.5, fw, H * 0.5, 0.2);
}
function rumah(b, ox, oy, kind) {
  const { w: fw, h: fh } = b.foot;
  const H = b.height;
  const top = oy + fh;
  const ground = top + H;
  castShadow(ox, oy, fw, fh, H);
  roofTiles(ox - 5, oy - 2, fw + 10, fh + 4, b.roof);
  pastelWall(ox, top, fw, H, b.wall, 0);
  const doorX = kind === 'b' ? ox + 14 : ox + fw / 2 - 8;
  box(doorX, ground - 30, 16, 30, kind === 'c' ? '#5b7a8c' : K.woodD);
  vline(doorX + 8, ground - 29, 28, shade(K.woodD, 0.8));
  rect(doorX + 12, ground - 16, 2, 2, '#e4c26a');
  const wins = kind === 'b' ? [ox + 40, ox + fw - 30] : [ox + 10, ox + fw - 30];
  for (const wx of wins) win(wx, top + 12, 20, 16, { frame: '#f6efd8', curtain: ['#c9876a', '#93b5a6', '#e3c17a'][(wx + fw) % 3], single: true });
  if (kind === 'b') {
    canopy(ox + 4, ground - 38, 34, b.roof);
  }
  box(ox - 2, ground - 4, fw + 4, 4, '#b9ad94');
  plant(ox + 2, ground + 1, 2);
  if (kind !== 'c') plant(ox + fw - 10, ground + 1, 1);
  if (kind === 'c') for (let i = ox - 4; i < ox + fw + 4; i += 5) {
    vline(i, ground + 2, 9, '#c9a86a');
    rect(i, ground + 1, 1, 1, '#e0c48a');
  }
  grime(ox, top + H * 0.5, fw, H * 0.5, 0.15);
}
const STYLE = { kantor, toko, klinik, apotek, loket, balai, gudang, pendingin };

function writeSprite(dir, name, w, h, draw, seedFrom) {
  beginCanvas(w, h, hash(seedFrom));
  draw();
  mkdirSync(`${OUT}/${dir}`, { recursive: true });
  writeFileSync(`${OUT}/${dir}/${name}.png`, pngRGBA(spriteRGBA(gradeRgb), w, h));
  const glow = glowRGBA();
  if (glow.some((v, i) => i % 4 === 3 && v > 0)) writeFileSync(`${OUT}/${dir}/${name}-malam.png`, pngRGBA(glow, w, h));
}

let bytes = 0;
for (const b of mapBuildings) {
  const w = b.foot.w + M * 2;
  const h = b.foot.h + b.height + M * 2;
  writeSprite('bangunan', b.sprite || b.id, w, h, () => STYLE[b.style](b, M, M), b.id);
}
for (const [kind, look] of Object.entries(HOUSE_KINDS))
  for (const fw of HOUSE_WIDTHS) {
    const b = { foot: { w: fw, h: HOUSE_DEPTH }, height: look.height, wall: look.wall, roof: look.roof };
    writeSprite('bangunan', `rumah-${kind}-${fw}`, fw + M * 2, HOUSE_DEPTH + look.height + M * 2, () => rumah(b, M, M, kind), `rumah-${kind}-${fw}`);
  }
for (const r of TREE_SIZES)
  for (const blossom of [null, '#e85a7a']) {
    const w = r * 3 + 24;
    const h = Math.round(r * 3.4) + 24;
    writeSprite('pohon', `pohon-${r}${blossom ? '-bunga' : ''}`, w, h, () => {
      pastelTree(w / 2, h - 12, r, blossom, r);
      if (r === 16) bush(w / 2 - 22, h - 10, 12, blossom);
    }, `pohon-${r}${blossom}`);
  }
for (const dir of ['bangunan', 'pohon'])
  for (const f of (await import('node:fs')).readdirSync(`${OUT}/${dir}`)) bytes += (await import('node:fs')).statSync(`${OUT}/${dir}/${f}`).size;
console.log(`aset ditulis ke ${OUT} (${(bytes / 1024).toFixed(0)} KB)`);
