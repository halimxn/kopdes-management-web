import { gradeRgb, type Rgb } from './grade';
import { SKIN_HEX, type Look } from './look';

/**
 * Penggambar karakter pixel (±30×56) di browser: rupa dari data Tim/preferensi digambar per
 * bingkai lalu disimpan sebagai tekstur. Tampak kiri = tampak samping yang dicerminkan
 * (karakter tanpa tulisan). Warna melewati grading Eastward yang sama dengan dunia.
 */
export type CharView = 'depan' | 'belakang' | 'samping';
export type CharPose = 'diam' | 'jalan' | 'bicara';
export const CHAR_W = 40;
export const CHAR_H = 68;
const OX = 5;
const OY = 7;
/** Jangkar kaki di dalam bingkai (tengah telapak). */
export const CHAR_FOOT = { x: OX + 15, y: OY + 57 } as const;
export const WALK_FRAMES = 4;

type Color = string | Rgb;
const hexRgb = (c: string): Rgb => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as Rgb;
const rgbOf = (c: Color): Rgb => (typeof c === 'string' ? hexRgb(c) : c);
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const shade = (c: Color, f: number): Rgb => rgbOf(c).map((v) => clamp(v * f)) as Rgb;
const mix = (a: Color, b: Color, t: number): Rgb => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return x.map((v, i) => clamp(v + (y[i] - v) * t)) as Rgb;
};

const OL = '#3a2f36';
const HAIR = '#3b2e2e';
const PANTS = '#3f4659';
const SHOE = '#5b4a52';
const CAP = '#c2463a';
const BATIK = '#8a5a3a';
const T_TOP = 28;
const T_BOT = 44;
const LEG_END = 53;

const HEAD_FRONT: Record<number, [number, number]> = {
  4: [10, 19],
  5: [8, 21],
  6: [7, 22],
  7: [6, 23],
  22: [6, 23],
  23: [6, 23],
  24: [7, 22],
  25: [8, 21],
  26: [10, 19],
};
const HEAD_SIDE: Record<number, [number, number]> = {
  4: [9, 18],
  5: [7, 20],
  6: [6, 21],
  7: [5, 22],
  21: [6, 23],
  22: [6, 23],
  23: [6, 23],
  24: [7, 22],
  25: [9, 21],
  26: [11, 19],
};
const headSpan = (y: number, side: boolean) =>
  (side ? HEAD_SIDE : HEAD_FRONT)[y] ||
  (y >= 8 && y <= (side ? 20 : 21) ? ((side ? [5, 23] : [5, 24]) as [number, number]) : null);

/** Gambar satu bingkai; hasil RGBA CHAR_W × CHAR_H. */
export function drawCharacter(
  look: Look,
  view: CharView,
  pose: CharPose,
  frame = 0,
): Uint8ClampedArray {
  const cells: (Rgb | null)[] = new Array(CHAR_W * CHAR_H).fill(null);
  const walk = pose === 'jalan';
  const f = walk ? frame % WALK_FRAMES : 0;
  const bob = walk && (f === 0 || f === 2) ? -1 : 0;
  const set = (x: number, y: number, c: Color) => {
    const X = Math.floor(x) + OX;
    const Y = Math.floor(y) + OY + bob;
    if (X >= 0 && Y >= 0 && X < CHAR_W && Y < CHAR_H) cells[Y * CHAR_W + X] = rgbOf(c);
  };
  const fill = (x0: number, y0: number, w: number, h: number, c: Color) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x0 + i, y0 + j, c);
  };
  const thick = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    w: number,
    c: (t: number) => Color,
  ) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= n; s++)
      fill(
        Math.round(x0 + ((x1 - x0) * s) / n),
        Math.round(y0 + ((y1 - y0) * s) / n),
        w,
        1,
        c(s / n),
      );
  };

  const side = view === 'samping';
  const back = view === 'belakang';
  const sk = SKIN_HEX[look.skin];
  const skS = shade(sk, 0.87);
  const skD = shade(sk, 0.75);
  const skL = shade(sk, 1.05);
  const topBase = look.batik ? BATIK : look.outfit;
  const tp = {
    b: rgbOf(topBase),
    s: shade(topBase, 0.84),
    d: shade(topBase, 0.72),
    l: mix(topBase, '#ffffff', 0.22),
  };
  const pantsBase = look.batik ? '#3a3036' : PANTS;
  const pa = {
    b: rgbOf(pantsBase),
    s: shade(pantsBase, 0.82),
    d: shade(pantsBase, 0.7),
    l: mix(pantsBase, '#ffffff', 0.15),
  };
  const hS = shade(HAIR, 0.72);
  const hL = mix(HAIR, '#c9b8d8', 0.45);
  const topAt = (x: number, y: number, lvl: keyof typeof tp): Rgb => {
    if (look.batik) {
      if (x % 5 === 2 && y % 5 === 2) return hexRgb('#d9a54a');
      if ((x + y) % 5 === 0 && (x - y + 50) % 5 === 0) return hexRgb('#5a3a26');
    }
    return tp[lvl];
  };
  const tt = T_TOP;
  const tb = T_BOT;
  const lb = LEG_END;

  // rambut panjang terurai di belakang badan (tampak depan/samping)
  if (look.head === 'none' && look.hair === 'long' && !back)
    fill(side ? 5 : 3, 8, side ? 12 : 24, 30, hS);

  // ----- kaki dan sepatu -----
  const shoeAt = (x0: number, x1: number, y0: number) => {
    for (let y = y0; y <= y0 + 2; y++)
      for (let x = x0; x <= x1; x++)
        set(x, y, y === y0 ? mix(SHOE, '#ffffff', 0.25) : x === x1 ? shade(SHOE, 0.8) : SHOE);
  };
  const legCol = (x: number, l: number, r: number) =>
    x === l ? pa.l : x === r ? pa.d : x === r - 1 ? pa.s : pa.b;
  if (side) {
    const stride = walk ? [1, 0, -1, 0][f] : 0;
    if (stride) {
      const front = stride > 0 ? 1 : -1;
      thick(13, tb + 1, 13 - 4 * front, lb, 5, () => pa.d);
      thick(14, tb + 1, 14 + 4 * front, lb, 5, () => pa.b);
      shoeAt(14 + 4 * front, 20 + 4 * front, lb + 1);
      shoeAt(8 - 4 * front, 13 - 4 * front, lb);
    } else {
      for (let y = tb + 1; y <= lb; y++)
        for (let x = 12; x <= 17; x++) set(x, y, legCol(x, 12, 17));
      shoeAt(12, 20, lb + 1);
    }
  } else {
    const liftL = walk && f === 0 ? 2 : 0;
    const liftR = walk && f === 2 ? 2 : 0;
    fill(9, tb + 1, 12, 3, pa.b);
    for (let y = tb + 1; y <= lb - liftL; y++)
      for (let x = 9; x <= 13; x++) set(x, y, legCol(x, 9, 13));
    for (let y = tb + 1; y <= lb - liftR; y++)
      for (let x = 16; x <= 20; x++) set(x, y, legCol(x, 16, 20));
    fill(14, tb + 1, 2, 3, pa.s);
    shoeAt(8, 13, lb + 1 - liftL);
    shoeAt(16, 21, lb + 1 - liftR);
  }

  // ----- badan -----
  const [bx0, bx1] = side ? [10, 20] : [8, 21];
  for (let y = tt; y <= tb - 1; y++) {
    const inset = y === tt ? 2 : y === tt + 1 ? 1 : 0;
    for (let x = bx0 + inset; x <= bx1 - inset; x++) {
      const lvl = x >= bx1 - 1 ? 'd' : x >= bx1 - 3 ? 's' : x <= bx0 + 1 && y < tt + 8 ? 'l' : 'b';
      set(x, y, topAt(x, y, back ? (lvl === 'l' ? 'b' : lvl) : lvl));
    }
  }
  fill(bx0, tb - 1, bx1 - bx0 + 1, 1, '#4a3a36');
  if (view === 'depan') {
    fill(14, tb - 1, 2, 1, '#e8c66a');
    if (!look.batik) {
      const acc = '#f1ebd6';
      for (const [x, y] of [
        [11, tt],
        [12, tt],
        [12, tt + 1],
        [13, tt + 1],
        [17, tt],
        [18, tt],
        [17, tt + 1],
        [16, tt + 1],
        [14, tt + 2],
        [15, tt + 2],
      ] as const)
        set(x, y, acc);
      for (let y = tt + 5; y < tb - 2; y += 3) set(15, y, tp.d);
      // lambang KDMP merah-putih dan kartu identitas berlanyard
      fill(10, tt + 4, 3, 1, CAP);
      fill(10, tt + 5, 3, 1, '#f1ebd6');
      for (const [x, y] of [
        [13, tt + 2],
        [13, tt + 3],
        [17, tt + 2],
        [17, tt + 3],
        [14, tt + 4],
        [16, tt + 4],
        [15, tt + 5],
      ] as const)
        set(x, y, look.head === 'hijab' ? look.outfit : CAP);
      fill(14, tt + (look.head === 'hijab' ? 12 : 7), 3, 4, '#f1ebd6');
    }
    for (const [x, y] of [
      [13, tt],
      [14, tt],
      [15, tt],
      [16, tt],
      [14, tt + 1],
      [15, tt + 1],
    ] as const)
      set(x, y, skS);
  }

  // ----- lengan -----
  const sleeveEnd = look.batik ? tb - 4 : tt + 7;
  const sleeveC = (x: number, y: number, lvl: keyof typeof tp) => topAt(x, y, lvl);
  const arm = (ax: number, y1: number, left: boolean) => {
    for (let y = tt + 1; y <= y1; y++)
      for (let i = 0; i < 4; i++) {
        const lvl = left
          ? i === 0
            ? 'l'
            : i === 3
              ? 's'
              : 'b'
          : i === 3
            ? 'd'
            : i === 0
              ? 'b'
              : 's';
        set(
          ax + i,
          y,
          y <= sleeveEnd ? sleeveC(ax + i, y, lvl) : i === 3 ? skS : i === 0 ? skL : sk,
        );
      }
    fill(ax, y1 + 1, 4, 1, skS);
    fill(ax + 1, y1 + 2, 2, 1, skS);
  };
  if (side) {
    const stride = walk ? [1, 0, -1, 0][f] : 0;
    thick(14, tt + 2, 14 + 3 * stride, tb - 2, 4, (t) =>
      t < (sleeveEnd - tt) / (tb - tt) ? sleeveC(15, tt, 's') : t > 0.9 ? skS : sk,
    );
  } else {
    const swing = walk ? [1, 0, -1, 0][f] : 0;
    const talk = pose === 'bicara';
    arm(4, tb - 2 - (swing > 0 ? 2 : 0), true);
    if (talk && !back) {
      // tangan kanan terangkat sebatas dada saat berbicara
      arm(22, tt + 8, false);
      fill(19, tt + 9, 4, 3, sk);
      fill(19, tt + 11, 4, 1, skS);
    } else arm(22, tb - 2 - (swing < 0 ? 2 : 0), false);
    for (let y = tt + 3; y <= tb - 3; y++) {
      set(8, y, OL);
      if (!(talk && !back)) set(21, y, OL);
    }
  }

  // ----- kepala -----
  for (let y = 4; y <= 26; y++) {
    const sp = headSpan(y, side);
    if (!sp) continue;
    for (let x = sp[0]; x <= sp[1]; x++)
      set(x, y, (!side && x >= 22) || y >= 24 ? skS : x <= 6 && y >= 10 && y <= 18 ? skL : sk);
  }
  fill(13, 26, 4, 2, skD);
  const blush = mix(sk, '#f08a8a', 0.4);
  const eye = (x: number) => {
    fill(x, 16, 2, 3, OL);
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
    fill(21, 22, 2, 1, pose === 'bicara' ? mix(sk, '#b85a68', 0.55) : skD);
    if (look.glasses) {
      fill(18, 15, 6, 1, '#5b4a52');
      fill(18, 19, 6, 1, '#5b4a52');
      fill(13, 16, 5, 1, '#5b4a52');
    }
  } else if (!back) {
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
    if (pose === 'bicara') fill(14, 22, 2, 2, mouth);
    else {
      set(13, 22, skD);
      fill(14, 23, 2, 1, mouth);
      set(16, 22, skD);
    }
    if (look.glasses)
      for (const gx of [8, 16]) {
        fill(gx, 15, 6, 1, '#5b4a52');
        fill(gx, 19, 6, 1, '#5b4a52');
        for (const yy of [16, 17, 18]) {
          set(gx, yy, '#5b4a52');
          set(gx + 5, yy, '#5b4a52');
        }
      }
    if (look.glasses) fill(14, 16, 2, 1, '#5b4a52');
  } else {
    for (let y = 16; y <= 19; y++) {
      set(4, y, skS);
      set(25, y, skD);
    }
  }

  // ----- rambut dan penutup kepala -----
  const hairPx = (x: number, y: number) =>
    set(x, y, (!side && x >= 21) || (side && x <= 8) ? hS : HAIR);
  const capRows: Record<number, [number, number]> = {
    2: [10, 19],
    3: [8, 21],
    4: [6, 23],
    5: [5, 24],
  };
  if (look.head !== 'hijab') {
    const hairBottom = back ? (look.hair === 'long' && look.head === 'none' ? tt + 8 : 22) : 11;
    for (let y = 2; y <= hairBottom; y++) {
      const [a, b] = capRows[y] || headSpan(y, side) || [4, 25];
      for (let x = side ? Math.max(a, 4) : a; x <= (side ? Math.min(b, 23) : b); x++) hairPx(x, y);
    }
    if (back && look.hair === 'long' && look.head === 'none')
      for (let y = 22; y <= tt + 8; y++) for (let x = 5; x <= 24; x++) hairPx(x, y);
    if (side) {
      for (let y = 12; y <= (look.hair === 'long' ? 34 : 21); y++)
        for (let x = 5; x <= (y < 16 ? 12 : 10); x++) hairPx(x, y);
      for (const x of [17, 18, 19, 20, 21, 22]) hairPx(x, 12);
      for (const x of [19, 20, 21]) hairPx(x, 13);
    } else if (!back) {
      const fringe =
        look.hair === 'long'
          ? [4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 21, 22, 23, 24, 25]
          : look.hair === 'curly'
            ? [4, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 25]
            : [4, 5, 6, 7, 8, 11, 12, 13, 17, 18, 19, 22, 23, 24, 25];
      for (const x of fringe) hairPx(x, 12);
      for (const x of [4, 5, 6, 23, 24, 25]) hairPx(x, 13);
      for (let y = 12; y <= 17; y++) {
        hairPx(4, y);
        hairPx(25, y);
      }
      if (look.hair === 'long')
        for (let y = 12; y <= 38; y++) {
          for (const x of [3, 4, 5]) hairPx(x, y);
          for (const x of [24, 25, 26]) set(x, y, hS);
        }
    }
    if (look.hair === 'curly')
      for (const [x, y] of [
        [5, 1],
        [9, 1],
        [13, 1],
        [17, 1],
        [21, 1],
        [3, 5],
        [26, 5],
        [3, 9],
        [26, 9],
      ] as const)
        hairPx(x, y + 1);
    for (const [x, y] of [
      [9, 3],
      [10, 3],
      [11, 3],
      [12, 3],
      [7, 4],
      [8, 4],
      [9, 4],
      [10, 4],
      [6, 5],
      [7, 5],
      [8, 5],
      [6, 6],
    ] as const)
      set(x, y, hL);
    for (const [x, y] of [
      [13, 7],
      [17, 8],
      [20, 6],
      [10, 9],
      [15, 5],
    ] as const)
      set(x, y, hS);
  }
  if (look.head === 'peci')
    for (let y = 1; y <= 9; y++)
      for (let x = y === 1 ? 7 : 6; x <= (y === 1 ? 22 : 23); x++)
        set(
          x,
          y,
          y === 1
            ? '#6a6478'
            : y === 9
              ? '#3a3542'
              : x <= 8
                ? '#544e60'
                : x >= 21
                  ? '#2c2832'
                  : '#3d3846',
        );
  if (look.head === 'cap') {
    for (let y = 3; y <= 10; y++) {
      const [a, b] = y === 3 ? [9, 20] : [6, 23];
      for (let x = a; x <= b; x++)
        set(x, y, x >= 21 ? shade(CAP, 0.8) : x <= 9 && y <= 6 ? mix(CAP, '#ffffff', 0.25) : CAP);
    }
    if (side) fill(20, 10, 7, 2, shade(CAP, 0.7));
    else if (!back) {
      fill(6, 11, 18, 1, shade(CAP, 0.65));
      fill(13, 5, 4, 2, '#f1ebd6');
    }
  }
  if (look.head === 'hijab') {
    const hj = {
      b: rgbOf(look.outfit),
      s: shade(look.outfit, 0.84),
      l: mix(look.outfit, '#ffffff', 0.22),
    };
    const [fx0, fy0, frx, fry] = side ? [20, 18.5, 4.6, 7.6] : [14.5, 18.5, 7.4, 8.4];
    for (let y = 2; y <= tt + 1; y++) {
      const [a, b] = capRows[y] || [3, 26];
      for (let x = side ? Math.max(a, 4) : a; x <= (side ? Math.min(b, 24) : b); x++) {
        const dx = (x - fx0) / frx;
        const dy = (y - fy0) / fry;
        const d = dx * dx + dy * dy;
        if (!back && d < 1 && y >= 11) continue;
        set(
          x,
          y,
          !back && d < 1.35 && y >= 10
            ? hj.s
            : (!side && x >= 22) || (side && x <= 8)
              ? hj.s
              : x <= 6 && y < 18
                ? hj.l
                : hj.b,
        );
      }
    }
    const drop = back ? 13 : 11;
    for (let y = tt; y <= tt + drop; y++) {
      const cut = Math.max(0, y - (tt + drop - 5)) * 1.6;
      const [l, r] = side ? [8, 22] : [5, 24];
      for (let x = Math.ceil(l + cut); x <= Math.floor(r - cut); x++)
        set(x, y, x >= r - 2 ? hj.s : x === l + 4 ? hj.s : hj.b);
    }
  }

  // ----- garis tepi dan bayangan kaki -----
  const out = new Uint8ClampedArray(CHAR_W * CHAR_H * 4);
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < CHAR_W && y < CHAR_H ? cells[y * CHAR_W + x] : null;
  const write = (i: number, c: Rgb, a = 255) => {
    const g = gradeRgb(c);
    out[i * 4] = g[0];
    out[i * 4 + 1] = g[1];
    out[i * 4 + 2] = g[2];
    out[i * 4 + 3] = a;
  };
  for (let y = 0; y < CHAR_H; y++)
    for (let x = 0; x < CHAR_W; x++) {
      const c = at(x, y);
      if (c) write(y * CHAR_W + x, c);
      else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))
        write(y * CHAR_W + x, rgbOf(OL));
    }
  const shadow = rgbOf('#1b2238');
  for (let y = -3; y <= 3; y++)
    for (let x = -11; x <= 11; x++) {
      if ((x * x) / 121 + (y * y) / 9 > 1) continue;
      const X = CHAR_FOOT.x + 1 + x;
      const Y = CHAR_FOOT.y + y;
      const i = Y * CHAR_W + X;
      if (X < 0 || Y < 0 || X >= CHAR_W || Y >= CHAR_H || out[i * 4 + 3]) continue;
      write(i, shadow, 70);
    }
  return out;
}

/** Urutan bingkai dalam satu lembar: per tampak, diam + 4 jalan + bicara. */
export const SHEET_VIEWS: CharView[] = ['depan', 'belakang', 'samping'];
export const SHEET_POSES: { pose: CharPose; frame: number }[] = [
  { pose: 'diam', frame: 0 },
  ...Array.from({ length: WALK_FRAMES }, (_, frame) => ({ pose: 'jalan' as const, frame })),
  { pose: 'bicara', frame: 0 },
];
export const frameIndex = (view: CharView, pose: CharPose, frame = 0) => {
  const v = SHEET_VIEWS.indexOf(view);
  const p =
    pose === 'diam' ? 0 : pose === 'bicara' ? SHEET_POSES.length - 1 : 1 + (frame % WALK_FRAMES);
  return v * SHEET_POSES.length + p;
};

/** Lembar sprite satu rupa (RGBA): baris = tampak, kolom = pose/bingkai. */
export function drawSheet(look: Look): { width: number; height: number; data: Uint8ClampedArray } {
  const cols = SHEET_POSES.length;
  const width = CHAR_W * cols;
  const height = CHAR_H * SHEET_VIEWS.length;
  const data = new Uint8ClampedArray(width * height * 4);
  SHEET_VIEWS.forEach((view, row) =>
    SHEET_POSES.forEach(({ pose, frame }, col) => {
      const px = drawCharacter(look, view, pose, frame);
      for (let y = 0; y < CHAR_H; y++)
        data.set(
          px.subarray(y * CHAR_W * 4, (y + 1) * CHAR_W * 4),
          ((row * CHAR_H + y) * width + col * CHAR_W) * 4,
        );
    }),
  );
  return { width, height, data };
}
