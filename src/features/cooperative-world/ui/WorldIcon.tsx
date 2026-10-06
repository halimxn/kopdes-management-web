/**
 * Ilustrasi isometrik kecil untuk kartu Dunia Koperasi (pengganti ikon garis pada kartu
 * detail, stok, daftar dan KPI), meniru ikon kardus/kemasan/truk berwarna pada video.
 * Setiap ikon disusun dari kotak 3D di koordinat dunia lalu diproyeksikan; viewBox
 * menyesuaikan sendiri sehingga ikon baru cukup menambah daftar bentuk.
 */
type Point3 = [number, number, number];
type Shape =
  | { box: [number, number, number, number, number, number]; color: string }
  | { poly: Point3[]; color: string }
  | { dot: Point3; r: number; color: string };

export type WorldIconKind =
  | 'kardus'
  | 'kemasan'
  | 'kardus-minimum'
  | 'palet'
  | 'gudang'
  | 'truk'
  | 'forklift'
  | 'kantor'
  | 'gerai'
  | 'lahan'
  | 'rak'
  | 'orang'
  | 'rapat'
  | 'tugas'
  | 'papan'
  | 'kawasan'
  | 'suasana';

const k = 1;
const project = ([x, y, z]: Point3): [number, number] => [(x - y) * k, ((x + y) * k) / 2 - z * k];

function shade(hex: string, amount: number) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (value >> shift) & 255;
    return Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount));
  };
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

/** Tiga sisi terlihat sebuah kotak: atas (terang), depan-kiri (dasar), depan-kanan (gelap). */
function boxFaces([x, y, z, dx, dy, dz]: [number, number, number, number, number, number], color: string) {
  const X = x + dx,
    Y = y + dy,
    Z = z + dz;
  return [
    { points: [[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]] as Point3[], fill: shade(color, 0.22) },
    { points: [[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]] as Point3[], fill: color },
    { points: [[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]] as Point3[], fill: shade(color, -0.16) },
  ];
}

const tape = '#fbe0b0';
const blue = '#3866f6';

function crate(x: number, y: number, z: number, size: number, height: number, color: string, strap: string): Shape[] {
  const m = x + size / 2;
  return [
    { box: [x, y, z, size, size, height], color },
    {
      poly: [
        [m - 0.35, y, z + height + 0.01],
        [m + 0.35, y, z + height + 0.01],
        [m + 0.35, y + size, z + height + 0.01],
        [m - 0.35, y + size, z + height + 0.01],
      ],
      color: strap,
    },
    {
      poly: [
        [m - 0.35, y + size + 0.01, z + height],
        [m + 0.35, y + size + 0.01, z + height],
        [m + 0.35, y + size + 0.01, z + height * 0.55],
        [m - 0.35, y + size + 0.01, z + height * 0.55],
      ],
      color: strap,
    },
  ];
}

function person(x: number, y: number, shirt: string): Shape[] {
  return [
    { box: [x - 1, y - 0.8, 0, 2, 1.6, 3.2], color: shirt },
    { dot: [x, y, 4.4], r: 1.25, color: '#efc6a0' },
    { dot: [x - 0.1, y - 0.1, 5.1], r: 1.05, color: '#3a3346' },
  ];
}

const shapes: Record<WorldIconKind, Shape[]> = {
  kardus: crate(-3, -3, 0, 6, 5, '#f2b36b', tape),
  'kardus-minimum': [...crate(-3, -3, 0, 6, 2.6, '#f2b36b', tape), { dot: [3.4, 3.4, 4.6], r: 1.6, color: '#f5a524' }],
  kemasan: [...crate(-3, -3, 0, 6, 3, '#4f78f2', '#a9c0ff'), ...crate(-3, -3, 3.05, 6, 3, '#5d84f5', '#a9c0ff')],
  palet: [
    { box: [-4, -4, 0, 8, 8, 0.8], color: '#d9b07a' },
    ...crate(-3.8, -3.8, 0.8, 3.7, 3, '#f2b36b', tape),
    ...crate(0.1, -3.8, 0.8, 3.7, 3, '#e9a35a', tape),
    ...crate(-3.8, 0.1, 0.8, 3.7, 3, '#e9a35a', tape),
    ...crate(0.1, 0.1, 0.8, 3.7, 3, '#f2b36b', tape),
  ],
  gudang: [
    { box: [-6, -3, 0, 12, 6, 4], color: '#eef1f8' },
    ...[-4.6, -1.2, 2.2].flatMap((x): Shape[] => [
      { poly: [[x, 3.01, 0], [x + 2, 3.01, 0], [x + 2, 3.01, 3], [x, 3.01, 3]], color: blue },
      { poly: [[x + 0.3, 3.02, 0], [x + 1.7, 3.02, 0], [x + 1.7, 3.02, 2.6], [x + 0.3, 3.02, 2.6]], color: '#cdd5e3' },
    ]),
    { poly: [[6.01, -3, 4], [6.01, 3, 4], [6.01, 0, 6.6]], color: '#d6dded' },
    { poly: [[-6.4, -3.6, 3.7], [6.4, -3.6, 3.7], [6.4, 0, 6.7], [-6.4, 0, 6.7]], color: '#2f58e6' },
    { poly: [[-6.4, 0, 6.7], [6.4, 0, 6.7], [6.4, 3.6, 3.7], [-6.4, 3.6, 3.7]], color: blue },
  ],
  truk: [
    { box: [-5.6, -1.2, 0.9, 7, 2.4, 3.4], color: '#f7f9fd' },
    { poly: [[-5.6, 1.21, 1.3], [1.4, 1.21, 1.3], [1.4, 1.21, 2], [-5.6, 1.21, 2]], color: blue },
    { box: [1.6, -1.2, 0.6, 2.4, 2.4, 3], color: blue },
    { poly: [[4.01, -1, 2.2], [4.01, 1, 2.2], [4.01, 1, 3.3], [4.01, -1, 3.3]], color: '#26354f' },
    { dot: [-3.6, 1.3, 0.6], r: 1.1, color: '#262c3b' },
    { dot: [-1.8, 1.3, 0.6], r: 1.1, color: '#262c3b' },
    { dot: [2.8, 1.3, 0.6], r: 1.1, color: '#262c3b' },
  ],
  forklift: [
    { box: [-2.4, -1.6, 0.5, 4, 3.2, 2.2], color: '#f5b82e' },
    { box: [-2.6, -1.6, 0.5, 1, 3.2, 2.6], color: '#e3a419' },
    { box: [1.8, -1.2, 0, 0.5, 0.5, 6], color: '#3a4560' },
    { box: [1.8, 0.7, 0, 0.5, 0.5, 6], color: '#3a4560' },
    { box: [2.3, -1, 0, 3, 0.5, 0.3], color: '#59647b' },
    { box: [2.3, 0.6, 0, 3, 0.5, 0.3], color: '#59647b' },
    { box: [-2, -1.7, 5.6, 3.6, 3.4, 0.3], color: '#2d3b56' },
    { dot: [-1.4, 1.7, 0.5], r: 1, color: '#262c3b' },
    { dot: [1.2, 1.7, 0.5], r: 1, color: '#262c3b' },
  ],
  kantor: [
    { box: [-4.5, -3, 0, 9, 6, 6.4], color: '#fafcff' },
    { poly: [[-4, 3.01, 1.2], [4, 3.01, 1.2], [4, 3.01, 2.6], [-4, 3.01, 2.6]], color: '#9fc0f5' },
    { poly: [[-4, 3.01, 3.7], [4, 3.01, 3.7], [4, 3.01, 5.1], [-4, 3.01, 5.1]], color: '#9fc0f5' },
    { poly: [[4.51, -2.5, 3.7], [4.51, 2.5, 3.7], [4.51, 2.5, 5.1], [4.51, -2.5, 5.1]], color: '#8fb4f0' },
    { box: [-4.7, -3.2, 6.4, 9.4, 6.4, 0.6], color: blue },
  ],
  gerai: [
    { box: [-4, -3, 0, 8, 6, 4.2], color: '#fafcff' },
    { poly: [[-3.4, 3.01, 0.4], [3.4, 3.01, 0.4], [3.4, 3.01, 2.4], [-3.4, 3.01, 2.4]], color: '#9fc0f5' },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(
      (i): Shape => ({
        poly: [[-4 + i, 3, 3.4], [-3 + i, 3, 3.4], [-3 + i, 4.6, 2.5], [-4 + i, 4.6, 2.5]],
        color: i % 2 ? '#ffffff' : blue,
      }),
    ),
    { box: [-4.2, -3.2, 4.2, 8.4, 6.4, 0.5], color: blue },
  ],
  lahan: [
    { box: [-5, -5, 0, 10, 10, 0.6], color: '#cfeedd' },
    { poly: [[-0.5, -2.5, 0.61], [0.5, -2.5, 0.61], [0.5, 2.5, 0.61], [-0.5, 2.5, 0.61]], color: '#5fae84' },
    { poly: [[-2.5, -0.5, 0.61], [2.5, -0.5, 0.61], [2.5, 0.5, 0.61], [-2.5, 0.5, 0.61]], color: '#5fae84' },
  ],
  rak: [
    { box: [-4, -1.4, 0, 0.5, 0.5, 7], color: blue },
    { box: [3.5, -1.4, 0, 0.5, 0.5, 7], color: blue },
    ...crate(-3.2, -1.2, 0.5, 2.8, 2.2, '#f2b36b', tape),
    ...crate(0.3, -1.2, 0.5, 2.8, 2.2, '#e9a35a', tape),
    ...crate(-3.2, -1.2, 3.9, 2.8, 2.2, '#4f78f2', '#a9c0ff'),
    { box: [-4, 0.9, 0, 0.5, 0.5, 7], color: blue },
    { box: [3.5, 0.9, 0, 0.5, 0.5, 7], color: blue },
    { box: [-4, 0.9, 3.4, 8, 0.5, 0.5], color: '#ef7d32' },
    { box: [-4, 0.9, 0, 8, 0.5, 0.5], color: '#ef7d32' },
  ],
  orang: person(0, 0, blue),
  rapat: [
    { box: [-4, -2, 1.6, 8, 4, 0.6], color: '#dfc59c' },
    ...person(-2.4, -3.4, '#8a72e0'),
    ...person(2, -3.4, blue),
  ],
  tugas: [
    { box: [-3.5, -0.5, 0, 7, 1, 8.5], color: blue },
    { poly: [[-2.7, 0.51, 0.8], [2.7, 0.51, 0.8], [2.7, 0.51, 7.2], [-2.7, 0.51, 7.2]], color: '#ffffff' },
    { poly: [[-1.8, 0.52, 4.2], [-0.6, 0.52, 3], [-0.1, 0.52, 3.5], [-1.3, 0.52, 4.7]], color: '#36b37e' },
    { poly: [[-0.6, 0.52, 3], [2, 0.52, 5.6], [1.5, 0.52, 6.1], [-1.1, 0.52, 3.5]], color: '#36b37e' },
  ],
  papan: [
    { box: [-0.3, -0.3, 0, 0.6, 0.6, 3], color: '#2d3b56' },
    { box: [-4, -0.4, 3, 8, 0.8, 5], color: '#2443a6' },
    { poly: [[-3.4, 0.41, 3.6], [3.4, 0.41, 3.6], [3.4, 0.41, 7.4], [-3.4, 0.41, 7.4]], color: '#ffffff' },
    { poly: [[-2.6, 0.42, 6.2], [2.6, 0.42, 6.2], [2.6, 0.42, 6.6], [-2.6, 0.42, 6.6]], color: '#c9d3e6' },
    { poly: [[-2.6, 0.42, 5], [1.4, 0.42, 5], [1.4, 0.42, 5.4], [-2.6, 0.42, 5.4]], color: '#c9d3e6' },
  ],
  kawasan: [
    { box: [-6, -6, 0, 12, 12, 0.8], color: '#e3e9f6' },
    { box: [-5, -5, 0.8, 6, 4, 2.4], color: '#eef1f8' },
    { poly: [[-5.2, -5.2, 3.2], [1.2, -5.2, 3.2], [1.2, -1, 3.2], [-5.2, -1, 3.2]], color: blue },
    { box: [1.5, 1.5, 0.8, 3, 3, 2.6], color: '#fafcff' },
    { box: [1.4, 1.4, 3.4, 3.2, 3.2, 0.4], color: blue },
    { dot: [-3, 3, 3.2], r: 1.6, color: '#4cc47f' },
  ],
  suasana: [
    { dot: [0, 0, 4], r: 3.6, color: '#f5c542' },
    { dot: [2.6, 2.6, 2.4], r: 2.4, color: '#ffffff' },
    { dot: [1, 3.6, 2], r: 2.1, color: '#eef3ff' },
  ],
};

export function WorldIcon({ kind, size = 28 }: { kind: WorldIconKind; size?: number }) {
  const items = shapes[kind].flatMap((shape) =>
    'box' in shape
      ? boxFaces(shape.box, shape.color).map((face) => ({ ...face, r: 0 }))
      : 'poly' in shape
        ? [{ points: shape.poly, fill: shape.color, r: 0 }]
        : [{ points: [shape.dot], fill: shape.color, r: shape.r }],
  );
  const projected = items.map((item) => ({ ...item, at: item.points.map(project) }));
  const xs = projected.flatMap((item) => item.at.map(([x]) => [x - item.r, x + item.r]).flat());
  const ys = projected.flatMap((item) => item.at.map(([, y]) => [y - item.r, y + item.r]).flat());
  const minX = Math.min(...xs),
    minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) + 1.2;
  const offsetX = minX - (span - (Math.max(...xs) - minX)) / 2;
  const offsetY = minY - (span - (Math.max(...ys) - minY)) / 2;
  return (
    <svg
      className="cw-world-icon"
      width={size}
      height={size}
      viewBox={`${offsetX.toFixed(2)} ${offsetY.toFixed(2)} ${span.toFixed(2)} ${span.toFixed(2)}`}
      aria-hidden="true"
      focusable="false"
    >
      {projected.map((item, index) =>
        item.r ? (
          <circle key={index} cx={item.at[0][0]} cy={item.at[0][1]} r={item.r} fill={item.fill} />
        ) : (
          <polygon
            key={index}
            points={item.at.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}
            fill={item.fill}
            stroke={item.fill}
            strokeWidth={0.12}
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  );
}
