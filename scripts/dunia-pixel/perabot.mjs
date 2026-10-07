// Perabot jalan dan detail area (P3c) pada skala dunia: tinggi ±24 px/m, kedalaman 12 px/m.
// Setiap sprite punya jangkar di titik tapak (tengah dasar); `box` = batas isi relatif jangkar
// (untuk klik dan penanda); `wire` = titik kabel listrik relatif jangkar.
import {
  K,
  box,
  bush,
  crate,
  ellipse,
  glowRect,
  hline,
  light,
  line,
  mix,
  rect,
  shade,
  shadowRect,
  signBoard,
  text,
  vline,
} from './preview.mjs';

const METAL = '#3f4c5c';
const STONE = '#c9bfb0';
const STONE_D = '#8f877a';
const POLE = '#8f8a80';

function lampu(ax, ay) {
  shadowRect(ax + 2, ay - 2, 20, 3, 1);
  box(ax - 6, ay - 7, 13, 7, METAL);
  box(ax - 3, ay - 98, 6, 92, METAL);
  vline(ax - 2, ay - 97, 90, mix(METAL, '#ffffff', 0.35));
  box(ax - 12, ay - 106, 25, 9, '#2e3a48');
  hline(ax - 11, ay - 105, 23, '#55667a');
  rect(ax - 10, ay - 98, 21, 2, '#fff1c4');
  glowRect(ax - 10, ay - 98, 21, 2, '#fff4cf');
  light(ax, ay - 24, 62, '#ffc672', 1.1);
}
function tiang(ax, ay, trafo) {
  shadowRect(ax + 3, ay - 2, 30, 3, 1);
  box(ax - 4, ay - 162, 8, 162, POLE);
  vline(ax - 2, ay - 160, 158, mix(POLE, '#ffffff', 0.35));
  for (let y = ay - 150; y < ay - 4; y += 26) hline(ax - 3, y, 6, shade(POLE, 0.8));
  box(ax - 24, ay - 152, 49, 5, '#5a5550');
  box(ax - 17, ay - 132, 35, 4, '#5a5550');
  for (const dx of [-21, -9, 7, 19]) box(dx + ax - 1, ay - 158, 4, 6, '#eeeae0');
  for (const dx of [-14, 12]) box(dx + ax - 1, ay - 137, 4, 5, '#eeeae0');
  if (trafo) {
    box(ax + 5, ay - 118, 18, 24, '#98a2a2');
    hline(ax + 6, ay - 117, 16, '#c6ccc8');
    for (let j = 0; j < 4; j++) hline(ax + 6, ay - 112 + j * 4, 16, '#737d7e');
    box(ax + 9, ay - 124, 3, 6, '#eeeae0');
    box(ax + 16, ay - 124, 3, 6, '#eeeae0');
  }
}
function bangku(ax, ay) {
  shadowRect(ax - 20, ay - 2, 48, 4, 1);
  box(ax - 23, ay - 32, 46, 13, K.woodL);
  for (const y of [ay - 28, ay - 24]) hline(ax - 22, y, 44, K.wood);
  box(ax - 23, ay - 19, 46, 6, K.woodL);
  hline(ax - 22, ay - 18, 44, '#d9a777');
  box(ax - 23, ay - 13, 46, 3, K.wood);
  for (const lx of [ax - 21, ax + 17]) box(lx, ay - 12, 4, 12, METAL);
}
function sampah(ax, ay) {
  shadowRect(ax - 8, ay - 2, 28, 3, 1);
  for (const [dx, c] of [
    [-12, '#5f8a4a'],
    [1, '#d9b24a'],
  ]) {
    box(ax + dx, ay - 18, 12, 18, c);
    vline(ax + dx + 1, ay - 17, 16, mix(c, '#ffffff', 0.3));
    box(ax + dx - 1, ay - 21, 14, 4, shade(c, 0.7));
  }
}
function pot(ax, ay, flower) {
  shadowRect(ax - 4, ay - 2, 16, 3, 1);
  box(ax - 7, ay - 11, 14, 11, '#b9694a');
  hline(ax - 6, ay - 10, 12, '#d4805c');
  box(ax - 8, ay - 13, 16, 3, '#a85a3a');
  bush(ax - 10, ay - 11, 20, flower);
}
function airMancur(ax, ay) {
  shadowRect(ax - 44, ay - 4, 100, 8, 1);
  ellipse(ax, ay - 18, 52, 25, K.ol);
  ellipse(ax, ay - 18, 51, 24, STONE_D);
  ellipse(ax, ay - 26, 52, 24, K.ol);
  ellipse(ax, ay - 26, 51, 23, STONE);
  ellipse(ax, ay - 26, 45, 19, '#5f8fa0');
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    rect(ax + Math.cos(a * 3) * 30 * Math.cos(a), ay - 26 + Math.sin(a) * 12, 3, 1, '#9fd0e6');
  }
  box(ax - 6, ay - 62, 12, 38, STONE);
  vline(ax - 4, ay - 60, 34, '#e3dcd0');
  ellipse(ax, ay - 62, 18, 7, K.ol);
  ellipse(ax, ay - 62, 17, 6, STONE);
  ellipse(ax, ay - 63, 13, 4, '#5f8fa0');
  box(ax - 2, ay - 80, 5, 18, STONE);
  for (const dir of [-1, 1])
    for (let t = 0; t < 20; t++) rect(ax + dir * t * 0.8, ay - 82 + t * t * 0.05 + t * 0.4, 1, 1, '#cfeefa');
  for (const dir of [-1, 1])
    for (let t = 0; t < 26; t++) rect(ax + dir * (14 + t * 0.9), ay - 62 + t * t * 0.06, 1, 1, '#b4e0f0');
  glowRect(ax - 1, ay - 83, 3, 2, '#e8fbff');
  light(ax, ay - 30, 72, '#bfe8ff', 0.8);
}
function tiangBendera(ax, ay) {
  shadowRect(ax - 8, ay - 2, 40, 4, 1);
  box(ax - 13, ay - 8, 27, 8, STONE);
  box(ax - 9, ay - 14, 19, 7, '#ddd4c6');
  box(ax - 2, ay - 150, 5, 138, '#e6e2d8');
  vline(ax + 1, ay - 148, 134, '#b8b2a6');
  box(ax - 3, ay - 155, 7, 5, '#d9b24a');
  for (let i = 0; i < 42; i++) {
    const wave = Math.round(Math.sin(i / 6) * 2);
    vline(ax + 3 + i, ay - 148 + wave, 13, i === 41 ? K.redD : K.red);
    vline(ax + 3 + i, ay - 135 + wave, 13, i === 41 ? '#d9d4ca' : '#f1ebd6');
  }
}
function umbul(ax, ay) {
  const top = [ax + 12, ay - 118];
  for (let t = 0; t <= 118; t++) {
    const x = ax + Math.round((t / 118) ** 2 * 12);
    rect(x - 1, ay - t, 3, 1, t % 18 === 0 ? '#9a7c40' : '#c9a86a');
  }
  for (let t = 0; t < 84; t++) {
    const x = top[0] + 2 + Math.round(Math.sin(t / 9) * 2 + (t / 84) * 4);
    rect(x, top[1] + 4 + t, 7 - Math.round((t / 84) * 3), 1, t < 42 ? K.red : '#f1ebd6');
  }
  shadowRect(ax + 2, ay - 2, 10, 3, 1);
}
function tenda(ax, ay, color) {
  shadowRect(ax - 34, ay - 3, 76, 6, 1);
  for (const px of [ax - 35, ax + 32]) box(px, ay - 58, 4, 58, K.woodD);
  box(ax - 33, ay - 26, 66, 8, K.woodL);
  hline(ax - 32, ay - 25, 64, '#d9a777');
  box(ax - 33, ay - 18, 66, 10, mix(color, '#3a2f36', 0.25));
  for (let i = 0; i < 12; i++)
    ellipse(ax - 28 + i * 5, ay - 29, 2.4, 2.4, ['#e35d4a', '#f2c84b', '#6fae5f', '#e88b3a', '#a2c45a', '#7a4f9a'][i % 6]);
  crate(ax - 28, ay - 9, '#e35d4a');
  crate(ax + 12, ay - 9, '#6fae5f');
  box(ax - 39, ay - 78, 78, 18, color);
  for (let i = ax - 38; i < ax + 38; i += 12) rect(i, ay - 77, 6, 16, '#f1ebd6');
  hline(ax - 38, ay - 77, 76, mix(color, '#ffffff', 0.3));
  for (let i = ax - 38; i < ax + 38; i += 6) {
    ellipse(i + 3, ay - 60, 3, 2, color);
    rect(i + 3, ay - 58, 1, 1, K.ol);
  }
  for (let i = ax - 33; i < ax + 33; i++) for (let j = 0; j < 5; j++) shadowRect(i, ay - 57 + j, 1, 1, 0.8 - j * 0.12);
}
function pagarH(ax, ay) {
  shadowRect(ax, ay - 2, 48, 3, 1);
  rect(ax, ay - 34, 48, 2, '#6f7878');
  rect(ax, ay - 8, 48, 2, '#6f7878');
  for (let x = ax + 2; x < ax + 48; x += 4) vline(x, ay - 32, 24, '#c9cfcb');
  box(ax - 2, ay - 40, 5, 40, '#6f7878');
  vline(ax - 1, ay - 39, 38, '#c9cfcb');
}
function pagarV(ax, ay) {
  shadowRect(ax + 2, ay - 26, 3, 28, 1);
  for (const y of [ay, ay - 24]) {
    box(ax - 2, y - 40, 5, 40, '#6f7878');
    vline(ax - 1, y - 39, 38, '#c9cfcb');
  }
  rect(ax - 1, ay - 64, 3, 64, '#a3abab');
  for (let y = ay - 62; y < ay - 4; y += 4) rect(ax - 1, y, 3, 1, '#c9cfcb');
}
function gerbang(ax, ay, label) {
  shadowRect(ax + 6, ay - 3, 22, 4, 1);
  box(ax - 10, ay - 72, 20, 72, STONE);
  vline(ax - 8, ay - 70, 68, '#e3dcd0');
  for (let y = ay - 60; y < ay - 2; y += 10) hline(ax - 9, y, 18, STONE_D);
  box(ax - 12, ay - 79, 24, 8, '#a8563c');
  hline(ax - 11, ay - 78, 22, '#cf7656');
  box(ax - 4, ay - 88, 8, 9, '#2e3a48');
  rect(ax - 3, ay - 84, 6, 2, '#fff1c4');
  glowRect(ax - 3, ay - 84, 6, 2, '#fff4cf');
  light(ax, ay - 40, 44, '#ffc672', 0.9);
  if (label) signBoard(ax, ay - 56, label, K.blue, '#fffaf2', 1);
}
function saung(ax, ay) {
  shadowRect(ax - 26, ay - 3, 66, 6, 1);
  for (const [px, h] of [
    [ax - 30, 46],
    [ax + 27, 46],
  ])
    box(px, ay - h, 4, h, '#a8884f');
  box(ax - 32, ay - 24, 64, 8, '#c9a86a');
  for (let i = ax - 30; i < ax + 30; i += 4) vline(i, ay - 23, 6, '#a8884f');
  box(ax - 32, ay - 16, 64, 4, '#9a7c40');
  for (let j = 0; j < 30; j++) {
    const half = 20 + j * 0.9;
    hline(ax - half, ay - 76 + j, half * 2, j % 4 === 3 ? '#a8884f' : j % 2 ? '#c6a35c' : '#d4b26a');
  }
  hline(ax - 47, ay - 46, 94, K.ol);
  hline(ax - 20, ay - 77, 40, '#e3c98a');
}
function jemuran(ax, ay) {
  shadowRect(ax - 22, ay - 2, 50, 3, 1);
  for (const px of [ax - 24, ax + 22]) box(px, ay - 44, 3, 44, '#9a7c40');
  for (let i = 0; i <= 44; i++) rect(ax - 22 + i, ay - 42 + Math.round(Math.sin((i / 44) * Math.PI) * 4), 1, 1, K.olS);
  const clothes = ['#5f84b3', '#f1ebd6', '#c2463a', '#e3bd57', '#93b5a6'];
  clothes.forEach((c, i) => {
    const x = ax - 19 + i * 9;
    const y = ay - 40 + Math.round(Math.sin(((x - ax + 22) / 44) * Math.PI) * 4);
    box(x, y, 7, 10 + (i % 2) * 4, c);
    vline(x + 5, y + 1, 8 + (i % 2) * 4, shade(c, 0.8));
  });
}
function papan(ax, ay) {
  shadowRect(ax - 14, ay - 2, 40, 4, 1);
  for (const px of [ax - 17, ax + 14]) box(px, ay - 30, 4, 30, K.woodD);
  box(ax - 22, ay - 54, 44, 30, K.woodD);
  rect(ax - 20, ay - 52, 40, 26, '#b98a5a');
  for (const [px, py, c] of [
    [ax - 18, ay - 50, '#f1ebd6'],
    [ax - 6, ay - 49, '#f4e3a1'],
    [ax + 6, ay - 50, '#cfe3e0'],
    [ax - 15, ay - 39, '#f1ebd6'],
    [ax - 2, ay - 38, '#f1ebd6'],
  ])
    box(px, py, 10, 11, c);
  box(ax - 24, ay - 58, 48, 5, '#a8563c');
  hline(ax - 23, ay - 57, 46, '#cf7656');
  text('INFO', ax - 7, ay - 22, '#f1ebd6');
}

/** Daftar sprite perabot: kanvas, jangkar, batas isi (klik/penanda) dan titik kabel. */
export const PERABOT = [
  { name: 'lampu', w: 150, h: 170, ax: 75, ay: 150, box: [-12, -106, 25, 106], draw: lampu },
  {
    name: 'tiang',
    w: 90,
    h: 190,
    ax: 45,
    ay: 180,
    box: [-24, -162, 49, 162],
    wire: [
      [-20, -157],
      [20, -157],
      [-13, -136],
    ],
    draw: (x, y) => tiang(x, y, false),
  },
  {
    name: 'tiang-trafo',
    w: 90,
    h: 190,
    ax: 45,
    ay: 180,
    box: [-24, -162, 49, 162],
    wire: [
      [-20, -157],
      [20, -157],
      [-13, -136],
    ],
    draw: (x, y) => tiang(x, y, true),
  },
  { name: 'bangku', w: 80, h: 52, ax: 40, ay: 44, box: [-23, -32, 46, 32], draw: bangku },
  { name: 'sampah', w: 48, h: 40, ax: 22, ay: 32, box: [-13, -21, 27, 21], draw: sampah },
  { name: 'pot', w: 40, h: 40, ax: 20, ay: 32, box: [-10, -24, 20, 24], draw: (x, y) => pot(x, y, '#e85a7a') },
  { name: 'pot-kuning', w: 40, h: 40, ax: 20, ay: 32, box: [-10, -24, 20, 24], draw: (x, y) => pot(x, y, '#f2c84b') },
  { name: 'air-mancur', w: 200, h: 170, ax: 100, ay: 130, box: [-52, -86, 104, 86], draw: airMancur },
  { name: 'tiang-bendera', w: 90, h: 180, ax: 24, ay: 168, box: [-13, -155, 60, 155], draw: tiangBendera },
  { name: 'umbul', w: 50, h: 140, ax: 12, ay: 132, box: [-2, -118, 24, 118], draw: umbul },
  ...[
    ['tenda-1', K.red],
    ['tenda-2', '#5e968f'],
    ['tenda-3', '#dd9f55'],
  ].map(([name, c]) => ({ name, w: 110, h: 100, ax: 55, ay: 90, box: [-39, -78, 78, 78], draw: (x, y) => tenda(x, y, c) })),
  { name: 'pagar-h', w: 64, h: 52, ax: 8, ay: 46, box: [0, -40, 48, 40], draw: pagarH },
  { name: 'pagar-v', w: 24, h: 76, ax: 12, ay: 70, box: [-2, -64, 5, 64], draw: pagarV },
  { name: 'gerbang', w: 110, h: 110, ax: 55, ay: 100, box: [-12, -88, 24, 88], draw: (x, y) => gerbang(x, y, '') },
  {
    name: 'gerbang-papan',
    w: 110,
    h: 110,
    ax: 55,
    ay: 100,
    box: [-24, -88, 48, 88],
    draw: (x, y) => gerbang(x, y, 'LOGISTIK'),
  },
  { name: 'saung', w: 120, h: 96, ax: 60, ay: 88, box: [-47, -78, 94, 78], draw: saung },
  { name: 'jemuran', w: 70, h: 56, ax: 35, ay: 50, box: [-25, -44, 50, 44], draw: jemuran },
  { name: 'papan', w: 70, h: 72, ax: 35, ay: 64, box: [-24, -58, 48, 58], draw: papan },
];
