// Gambar denah Distrik Koperasi dari src/features/cooperative-world/district.ts:
// tampak atas (denah-distrik.svg) dan sketsa isometrik (denah-distrik-iso.svg) di
// docs/referensi-dunia/blueprint/. Jalankan: node scripts/denah-dunia.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync('src/features/cooperative-world/district.ts', 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('require', 'exports', 'module', code)(require, mod.exports, mod);
const { streets, lots, farmPlots, cityBlocks, docks, logisticsYard, sidewalk, validateDistrict } =
  mod.exports;

// Palet: warna dasar sampel video, aksen pastel senada (lihat DUNIA-KOPERASI Blueprint v4).
const C = {
  page: '#eef2fc',
  city: '#dfe6f7',
  road: '#c6d1ee',
  walk: '#f3f6fe',
  lot: '#e8eefc',
  yard: '#d7dff5',
  grass: '#cdeedd',
  tree: '#5cc489',
  fence: '#9fb0d6',
  wall: '#ececfc',
  wallShade: '#d3daf2',
  roof: '#2f6be8',
  roofTop: '#5c94ec',
  trim: '#1454cc',
  mark: '#f5c542',
  white: '#ffffff',
  ink: '#1f2f4a',
  muted: '#6b7a92',
  farm: '#d6f0dc',
  farmRow: '#b9e4c6',
};
const roofOf = {
  gudang: C.roofTop,
  pendingin: '#f4f7ff',
  kantor: C.roofTop,
  loket: '#b4a8f4',
  toko: '#f7c39b',
  apotek: '#8fdcbc',
  klinik: '#8fcdee',
};
const errors = validateDistrict();
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- Tampak atas ----------
{
  const S = 5.2,
    X0 = -92,
    Z0 = -80;
  const X = (x) => ((x - X0) * S).toFixed(1),
    Z = (z) => ((z - Z0) * S).toFixed(1);
  const W = Math.round(190 * S),
    H = Math.round(165 * S);
  const rect = (r, fill, extra = '') =>
    `<rect x="${X(r.x)}" y="${Z(r.z)}" width="${(r.w * S).toFixed(1)}" height="${(r.d * S).toFixed(1)}" fill="${fill}" ${extra}/>`;
  const label = (x, z, t, size = 11, fill = C.ink, weight = 600) =>
    `<text x="${X(x)}" y="${Z(z)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" font-family="Inter,Arial">${esc(t)}</text>`;
  const g = [];
  g.push(`<rect width="100%" height="100%" fill="${C.city}"/>`);
  for (const b of cityBlocks) g.push(rect(b, '#f6f8ff', `stroke="${C.wallShade}"`));
  for (const s of streets) {
    const r = s.rect;
    const walk =
      s.axis === 'x'
        ? { x: r.x, z: r.z - sidewalk, w: r.w, d: r.d + sidewalk * 2 }
        : { x: r.x - sidewalk, z: r.z, w: r.w + sidewalk * 2, d: r.d };
    g.push(rect(walk, C.walk));
  }
  for (const s of streets) {
    g.push(rect(s.rect, C.road));
    const r = s.rect;
    const mid =
      s.axis === 'x'
        ? `M${X(r.x)} ${Z(r.z + r.d / 2)}H${X(r.x + r.w)}`
        : `M${X(r.x + r.w / 2)} ${Z(r.z)}V${Z(r.z + r.d)}`;
    g.push(`<path d="${mid}" stroke="#fff" stroke-width="1.6" stroke-dasharray="8 7"/>`);
    g.push(
      s.axis === 'x'
        ? label(r.x + 14, r.z + r.d / 2 + 0.8, s.name, 10, C.muted)
        : `<text transform="translate(${X(r.x + r.w / 2 + 0.6)} ${Z(r.z + 12)}) rotate(90)" font-size="10" fill="${C.muted}" font-family="Inter,Arial">${esc(s.name)}</text>`,
    );
  }
  for (const lot of lots) {
    g.push(
      rect(
        lot.fence,
        lot.id === 'lahan' ? '#e3f3e6' : C.lot,
        `stroke="${C.fence}" stroke-width="2"`,
      ),
    );
    for (const y of lot.yards) g.push(rect(y, C.yard));
    for (const gd of lot.gardens) g.push(rect(gd, C.grass));
    for (const p of lot.parking) {
      g.push(rect(p.rect, C.yard));
      const n = p.kind === 'truk' ? p.bays : Math.ceil(p.bays / 2);
      const bw = p.rect.w / n;
      for (let i = 0; i <= n; i++) {
        const x = p.rect.x + i * bw;
        const color = p.kind === 'truk' ? C.mark : C.white;
        if (p.kind === 'truk')
          g.push(
            `<line x1="${X(x)}" y1="${Z(p.rect.z)}" x2="${X(x)}" y2="${Z(p.rect.z + p.rect.d)}" stroke="${color}" stroke-width="1.6"/>`,
          );
        else
          for (const [z1, z2] of [
            [p.rect.z, p.rect.z + p.rect.d * 0.42],
            [p.rect.z + p.rect.d * 0.58, p.rect.z + p.rect.d],
          ])
            g.push(
              `<line x1="${X(x)}" y1="${Z(z1)}" x2="${X(x)}" y2="${Z(z2)}" stroke="${color}" stroke-width="1.4"/>`,
            );
      }
    }
    for (const gate of lot.gates) {
      const f = lot.fence;
      const horiz = gate.side === 'utara' || gate.side === 'selatan';
      const at =
        gate.side === 'utara'
          ? f.z
          : gate.side === 'selatan'
            ? f.z + f.d
            : gate.side === 'barat'
              ? f.x
              : f.x + f.w;
      const color = gate.use === 'barang' ? '#e2534f' : gate.use === 'pejalan' ? '#36b37e' : C.roof;
      g.push(
        horiz
          ? `<line x1="${X(gate.from)}" y1="${Z(at)}" x2="${X(gate.to)}" y2="${Z(at)}" stroke="${color}" stroke-width="5"/>`
          : `<line x1="${X(at)}" y1="${Z(gate.from)}" x2="${X(at)}" y2="${Z(gate.to)}" stroke="${color}" stroke-width="5"/>`,
      );
    }
    for (const b of lot.buildings) {
      g.push(rect(b.rect, roofOf[b.style], `stroke="${C.trim}" stroke-width="1.5" rx="4"`));
      g.push(label(b.rect.x + b.rect.w / 2, b.rect.z + b.rect.d / 2 + 1, b.name, 11));
    }
    if (lot.id !== 'lahan')
      g.push(
        label(
          lot.fence.x + lot.fence.w / 2,
          lot.fence.z + 3,
          lot.name.toUpperCase(),
          10,
          C.roof,
          700,
        ),
      );
  }
  // Halaman logistik: lantai dok, petak dok, cas forklift, staging.
  const wz = docks.wallZ;
  g.push(
    rect(
      { x: 12, z: wz, w: 26, d: docks.platformDepth },
      '#c1cbe6',
      `stroke="${C.mark}" stroke-width="2"`,
    ),
  );
  g.push(
    rect(
      { x: 43, z: wz, w: 16, d: docks.platformDepth },
      '#c1cbe6',
      `stroke="${C.mark}" stroke-width="2"`,
    ),
  );
  for (const x of [...docks.gudang, ...docks.pendingin])
    g.push(
      rect(
        { x: x - 1.7, z: wz + docks.platformDepth, w: 3.4, d: 6.6 },
        'none',
        `stroke="${C.mark}" stroke-width="1.6"`,
      ),
    );
  g.push(rect(logisticsYard.charging, C.grass, `stroke="#8fd6a8"`));
  g.push(label(logisticsYard.charging.x + 3.5, logisticsYard.charging.z + 4.5, 'cas forklift', 9));
  g.push(
    rect(
      logisticsYard.staging,
      'none',
      `stroke="${C.mark}" stroke-width="1.6" stroke-dasharray="6 4"`,
    ),
  );
  g.push(
    label(
      logisticsYard.staging.x + 8,
      logisticsYard.staging.z + 4.5,
      'staging kardus (barang tanpa rak)',
      9,
    ),
  );
  g.push(rect(logisticsYard.rack, '#f2a65a'));
  for (const p of farmPlots) {
    g.push(rect(p, C.farm, `stroke="#8fd6a8" stroke-dasharray="5 3"`));
    for (let i = 1; i < 8; i++)
      g.push(
        `<line x1="${X(p.x + 1)}" y1="${Z(p.z + (i * p.d) / 8)}" x2="${X(p.x + p.w - 1)}" y2="${Z(p.z + (i * p.d) / 8)}" stroke="${C.farmRow}" stroke-width="2"/>`,
      );
  }
  farmPlots.forEach((p, i) =>
    g.push(label(p.x + p.w / 2, p.z + p.d / 2 + 1, `Lahan 0${i + 1}`, 11)),
  );
  // Rute truk: dari timur Jalan Raya ke gerbang barang lalu mundur ke dok.
  g.push(
    `<polyline points="${X(80)},${Z(-2.5)} ${X(42)},${Z(-2.5)} ${X(42)},${Z(-20)} ${X(28)},${Z(-20)} ${X(28)},${Z(-25)}" fill="none" stroke="${C.roof}" stroke-width="4" stroke-linejoin="round" opacity=".8"/>`,
  );
  g.push(label(64, -6.5, 'rute truk: masuk dari timur, tidak melewati area warga', 10, C.roof));
  const legend = [
    ['#e2534f', 'gerbang barang'],
    [C.roof, 'gerbang kendaraan'],
    ['#36b37e', 'gerbang pejalan kaki'],
    [C.mark, 'marka kuning / lantai dok tinggi'],
  ];
  g.push(
    `<g font-family="Inter,Arial" font-size="12" fill="${C.ink}">` +
      legend
        .map(
          ([c, t], i) =>
            `<rect x="${20 + i * 220}" y="${H - 34}" width="14" height="14" rx="3" fill="${c}"/><text x="${40 + i * 220}" y="${H - 22}">${t}</text>`,
        )
        .join('') +
      '</g>',
  );
  g.push(
    `<text x="20" y="30" font-family="Inter,Arial" font-size="20" font-weight="700" fill="${C.ink}">Denah Distrik Koperasi v4 · tampak atas</text>`,
  );
  g.push(
    `<text x="20" y="50" font-family="Inter,Arial" font-size="12" fill="${C.muted}">Dibuat dari district.ts · X timur, Z selatan · validasi: ${errors.length ? esc(errors.join('; ')) : 'lolos'}</text>`,
  );
  writeFileSync(
    'docs/referensi-dunia/blueprint/denah-distrik.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g.join('')}</svg>`,
  );
}

// ---------- Sketsa isometrik (kamera dari tenggara) ----------
{
  const U = 5.6,
    CX = 830,
    CY = 470;
  const P = (x, z, y = 0) => [CX + (x - z) * U * 0.87, CY + (x + z) * U * 0.5 - y * U];
  const pts = (list) =>
    list
      .map(([x, z, y]) =>
        P(x, z, y)
          .map((v) => v.toFixed(1))
          .join(','),
      )
      .join(' ');
  const poly = (list, fill, extra = '') =>
    `<polygon points="${pts(list)}" fill="${fill}" ${extra}/>`;
  const flat = (r, fill, y = 0, extra = '') =>
    poly(
      [
        [r.x, r.z, y],
        [r.x + r.w, r.z, y],
        [r.x + r.w, r.z + r.d, y],
        [r.x, r.z + r.d, y],
      ],
      fill,
      extra,
    );
  // Kotak 3 sisi terlihat: atas, selatan (z+d), timur (x+w).
  const box = (r, h, top, south, east, y = 0) => [
    poly(
      [
        [r.x, r.z + r.d, y],
        [r.x + r.w, r.z + r.d, y],
        [r.x + r.w, r.z + r.d, y + h],
        [r.x, r.z + r.d, y + h],
      ],
      south,
    ),
    poly(
      [
        [r.x + r.w, r.z, y],
        [r.x + r.w, r.z + r.d, y],
        [r.x + r.w, r.z + r.d, y + h],
        [r.x + r.w, r.z, y + h],
      ],
      east,
    ),
    poly(
      [
        [r.x, r.z, y + h],
        [r.x + r.w, r.z, y + h],
        [r.x + r.w, r.z + r.d, y + h],
        [r.x, r.z + r.d, y + h],
      ],
      top,
    ),
  ];
  const ground = [];
  const solids = [];
  const add = (r, parts) => solids.push({ key: r.x + r.w / 2 + r.z + r.d / 2, parts });
  ground.push(flat({ x: -100, z: -90, w: 200, d: 180 }, C.city));
  for (const s of streets) {
    const r = s.rect;
    ground.push(
      flat(
        s.axis === 'x'
          ? { x: r.x, z: r.z - sidewalk, w: r.w, d: r.d + sidewalk * 2 }
          : { x: r.x - sidewalk, z: r.z, w: r.w + sidewalk * 2, d: r.d },
        C.walk,
      ),
    );
  }
  for (const s of streets) ground.push(flat(s.rect, C.road));
  for (const lot of lots) {
    ground.push(flat(lot.fence, lot.id === 'lahan' ? '#e3f3e6' : C.lot));
    for (const y of lot.yards) ground.push(flat(y, C.yard));
    for (const p of lot.parking) ground.push(flat(p.rect, C.yard));
    for (const gd of lot.gardens) ground.push(flat(gd, C.grass));
    const f = lot.fence;
    ground.push(
      poly(
        [
          [f.x, f.z, 0],
          [f.x + f.w, f.z, 0],
          [f.x + f.w, f.z + f.d, 0],
          [f.x, f.z + f.d, 0],
        ],
        'none',
        `stroke="${C.fence}" stroke-width="1.4"`,
      ),
    );
  }
  for (const p of farmPlots) ground.push(flat(p, C.farm, 0, `stroke="#a6dcb5"`));
  for (const x of [...docks.gudang, ...docks.pendingin])
    ground.push(
      flat(
        { x: x - 1.7, z: docks.wallZ + docks.platformDepth, w: 3.4, d: 6.6 },
        'none',
        0,
        `stroke="${C.mark}" stroke-width="1.3"`,
      ),
    );
  ground.push(
    flat(
      logisticsYard.staging,
      'none',
      0,
      `stroke="${C.mark}" stroke-width="1.3" stroke-dasharray="5 3"`,
    ),
  );
  ground.push(flat(logisticsYard.charging, C.grass));
  for (const b of cityBlocks) add(b, box(b, b.h, '#f7f9ff', C.wall, C.wallShade));
  // Lantai dok ditinggikan bertepi kuning.
  for (const r of [
    { x: 12, z: docks.wallZ, w: 26, d: docks.platformDepth },
    { x: 43, z: docks.wallZ, w: 16, d: docks.platformDepth },
  ])
    add(r, box(r, docks.platformHeight, '#c9d2ec', C.mark, '#b8c3e2'));
  for (const lot of lots)
    for (const b of lot.buildings) {
      const r = b.rect;
      const roof = roofOf[b.style];
      const parts = box(r, b.height, roof, C.wall, C.wallShade);
      if (b.style === 'gudang')
        for (const x of docks.gudang)
          parts.push(
            poly(
              [
                [x - 1.4, r.z + r.d + 0.01, 0.4],
                [x + 1.4, r.z + r.d + 0.01, 0.4],
                [x + 1.4, r.z + r.d + 0.01, 3.6],
                [x - 1.4, r.z + r.d + 0.01, 3.6],
              ],
              C.roof,
            ),
          );
      parts.push(
        poly(
          [
            [r.x, r.z + r.d + 0.02, b.height - 0.5],
            [r.x + r.w, r.z + r.d + 0.02, b.height - 0.5],
            [r.x + r.w, r.z + r.d + 0.02, b.height],
            [r.x, r.z + r.d + 0.02, b.height],
          ],
          C.trim,
        ),
      );
      const [lx, ly] = P(r.x + r.w / 2, r.z + r.d / 2, b.height + 2.2);
      parts.push(
        `<g transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)})"><rect x="-${b.name.length * 3.4 + 10}" y="-11" width="${b.name.length * 6.8 + 20}" height="22" rx="7" fill="#fff" opacity=".95"/><text y="4" text-anchor="middle" font-size="11" font-weight="600" font-family="Inter,Arial" fill="${C.ink}">${esc(b.name)}</text></g>`,
      );
      add(r, parts);
    }
  // Pohon di jalur rumput sepanjang pagar luar dan taman.
  for (const lot of lots.filter((l) => l.id !== 'lahan')) {
    const f = lot.fence;
    for (let x = f.x + 3; x < f.x + f.w - 2; x += 6) {
      const t = { x, z: f.z + f.d + 0.9, w: 0.1, d: 0.1 };
      const [tx, ty] = P(x, t.z, 0);
      add(t, [
        `<line x1="${tx}" y1="${ty}" x2="${tx}" y2="${ty - 9}" stroke="#8a7a66" stroke-width="2"/><ellipse cx="${tx}" cy="${ty - 14}" rx="7" ry="8.5" fill="${C.tree}"/>`,
      ]);
    }
  }
  // Truk di dok dan di parkir (ilustrasi skala).
  for (const [x, z] of [
    [22, -25.8],
    [47, -25.8],
    [50.1, -15],
    [54.3, -15],
  ]) {
    const r = { x: x - 1.15, z: z - 3.3, w: 2.3, d: 6.6 };
    add(r, box(r, 3.3, '#f7f9fd', '#eef1f8', '#d9deea'));
  }
  solids.sort((a, b) => a.key - b.key);
  const W = 1640,
    H = 1000;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${C.page}"/>${ground.join('')}${solids.flatMap((s) => s.parts).join('')}<text x="24" y="36" font-family="Inter,Arial" font-size="20" font-weight="700" fill="${C.ink}">Denah Distrik Koperasi v4 · sketsa isometrik (kamera dari tenggara)</text><text x="24" y="58" font-family="Inter,Arial" font-size="12" fill="${C.muted}">Warna dasar sampel video; atap unit pastel senada. Bangunan unit tampil jadi bila ada catatan Gerai berjenis itu.</text></svg>`;
  writeFileSync('docs/referensi-dunia/blueprint/denah-distrik-iso.svg', svg);
}
console.log(
  errors.length ? `PELANGGARAN: ${errors.join('; ')}` : 'denah lolos validasi; SVG ditulis',
);
