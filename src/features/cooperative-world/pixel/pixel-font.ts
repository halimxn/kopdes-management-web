import type { Graphics } from 'pixi.js';

// Huruf pixel 3×5 untuk papan nama yang tajam; tiap pola = 5 baris × 3 kolom.
const GLYPHS: Record<string, string> = {
  A: '.#.#.#####.##.#',
  B: '##.#.###.#.###.',
  C: '.###..#..#...##',
  D: '##.#.##.##.###.',
  E: '####..##.#..###',
  F: '####..##.#..#..',
  G: '.###..#.##.#.##',
  H: '#.##.#####.##.#',
  I: '###.#..#..#.###',
  J: '..#..#..##.#.#.',
  K: '#.##.###.#.##.#',
  L: '#..#..#..#..###',
  M: '#.########.##.#',
  N: '##.#.##.##.##.#',
  O: '.#.#.##.##.#.#.',
  P: '##.#.###.#..#..',
  Q: '.#.#.##.###..##',
  R: '##.#.###.#.##.#',
  S: '.###...#...###.',
  T: '###.#..#..#..#.',
  U: '#.##.##.##.####',
  V: '#.##.##.##.#.#.',
  W: '#.##.########.#',
  X: '#.##.#.#.#.##.#',
  Y: '#.##.#.#..#..#.',
  Z: '###..#.#.#..###',
  '0': '####.##.##.####',
  '1': '.#.##..#..#.###',
  '2': '##...#.#.#..###',
  '3': '##...#.#...###.',
  '4': '#.##.####..#..#',
  '5': '####..##...###.',
  '6': '.###..####.####',
  '7': '###..#.#..#..#.',
  '8': '####.#####.####',
  '9': '####.####..###.',
  '-': '......###......',
  ' ': '...............',
};

export const pixelTextWidth = (text: string, scale = 1) => (text.length * 4 - 1) * scale;

export function drawPixelText(
  g: Graphics,
  text: string,
  x: number,
  y: number,
  color: number,
  scale = 1,
) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const pattern = GLYPHS[ch] || GLYPHS[' '];
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 3; i++)
        if (pattern[j * 3 + i] === '#')
          g.rect(cx + i * scale, y + j * scale, scale, scale).fill(color);
    cx += 4 * scale;
  }
}
