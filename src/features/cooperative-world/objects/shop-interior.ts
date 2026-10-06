import * as THREE from 'three';
import type { BuildingStyle } from '../district';
import { shopInterior } from '../layout';
import { isBelowMinimum } from '../world-model';
import type { Item } from '../../records/schemas';
import { box, cylinder, mergeStatic, palette, sign, sphere } from './primitives';
import { chair } from './props';

/** Warna aksen interior per jenis gerai, senada dengan atap pastel di distrik. */
const accent: Record<BuildingStyle, string> = {
  toko: palette.pastelPeach,
  apotek: palette.pastelMint,
  klinik: palette.pastelSky,
  loket: palette.pastelLavender,
  kantor: palette.blue,
  gudang: palette.blue,
  pendingin: palette.pastelSky,
};
const goodsColors = ['#f2b36b', '#9fd8b0', '#f7c39b', '#a9c6f5', '#c9b8f6', '#f6d36b'];

function room(scenery: THREE.Object3D, tone: string) {
  const [w, d] = shopInterior.size;
  box(scenery, [w + 0.6, 0.3, d + 0.6], [0, -0.2, 0], '#d6def0', 0.12);
  box(scenery, [w, 0.05, d], [0, -0.02, 0], '#f1ece4', 0);
  for (let x = -w / 2 + 1; x < w / 2; x += 2)
    box(scenery, [0.04, 0.012, d], [x, 0.012, 0], '#e7dfd2', 0);
  box(scenery, [w, 3.6, 0.28], [0, 1.8, -d / 2], '#f7f8fe', 0.04);
  box(scenery, [0.28, 3.6, d], [-w / 2, 1.8, 0], '#f1f4fd', 0.04);
  box(scenery, [w, 0.36, 0.32], [0, 3.6, -d / 2], tone, 0.06);
  box(scenery, [0.32, 0.36, d], [-w / 2, 3.6, 0], tone, 0.06);
}

/** Rak barang: setiap barang yang ditempatkan di gerai ini menjadi satu blok berwarna. */
function shelf(
  parent: THREE.Object3D,
  x: number,
  z: number,
  items: Item[],
  tone: string,
  glass: boolean,
) {
  const w = 3.4,
    d = 0.9,
    h = 2.4;
  // Rak terbuka: panel belakang dan dua sisi, agar barang di tingkat terlihat dari kamera.
  box(parent, [w, h, 0.12], [x, h / 2, z - d / 2], glass ? '#ffffff' : palette.wood, 0.04);
  for (const side of [-1, 1])
    box(
      parent,
      [0.12, h, d],
      [x + (side * w) / 2, h / 2, z],
      glass ? '#ffffff' : palette.wood,
      0.04,
    );
  for (const y of [0.55, 1.25, 1.95])
    box(parent, [w - 0.2, 0.06, d - 0.1], [x, y, z + 0.02], glass ? '#e9f2ff' : '#ead8b8', 0);
  box(parent, [w + 0.1, 0.16, d + 0.1], [x, h, z], tone, 0.04);
  items.slice(0, 12).forEach((item, index) => {
    const row = Math.floor(index / 4);
    const low = isBelowMinimum(item);
    box(
      parent,
      [0.62, low ? 0.22 : 0.44, 0.5],
      [
        x - w / 2 + 0.55 + (index % 4) * 0.78,
        [0.58, 1.28, 1.98][row] + (low ? 0.11 : 0.22),
        z + 0.06,
      ],
      goodsColors[index % goodsColors.length],
      0.05,
    );
  });
  if (glass)
    box(parent, [w - 0.1, h - 0.3, 0.04], [x, h / 2 + 0.1, z + d / 2 + 0.03], '#cfe0fb', 0);
}

function counter(parent: THREE.Object3D, tone: string, label: string) {
  const [cx, cz] = shopInterior.counter;
  box(parent, [4.4, 1.1, 1], [cx, 0.55, cz], '#ffffff', 0.1);
  box(parent, [4.6, 0.1, 1.15], [cx, 1.14, cz], tone, 0.04);
  box(parent, [0.7, 0.45, 0.5], [cx - 1.2, 1.42, cz - 0.1], palette.glassDark, 0.06);
  sign(parent, label, [cx, 0.62, cz + 0.52], 3.2, palette.ink);
}

/**
 * Interior gerai per jenis (pola ruang video: cutaway putih, lantai kayu muda, aksen pastel).
 * toko: rak barang kayu + kasir; apotek: lemari obat kaca + loket; klinik: ruang tunggu,
 * meja pendaftaran dan ruang periksa; loket (simpan pinjam): meja teller berkaca + kursi tunggu.
 * Barang yang kolom Gerai-nya menunjuk gerai ini mengisi rak/lemari.
 */
export function createShopInterior(
  parent: THREE.Group,
  style: BuildingStyle,
  plotId: string,
  items: Item[],
) {
  const scenery = new THREE.Group();
  parent.add(scenery);
  const tone = accent[style];
  room(scenery, tone);
  const goods = new THREE.Group();
  goods.userData.selection = `isi-${plotId}`;
  parent.add(goods);
  const [w, d] = shopInterior.size;
  if (style === 'toko' || style === 'apotek') {
    const glass = style === 'apotek';
    shopInterior.shelves.forEach(([x, z], i) =>
      shelf(goods, x, z, items.slice(i * 12, i * 12 + 12), tone, glass),
    );
    counter(scenery, tone, glass ? 'LOKET OBAT' : 'KASIR');
    if (!glass)
      for (const x of [-5.6, -4.8]) {
        box(scenery, [0.6, 0.35, 0.45], [x, 0.18, 3.6], '#e8737a', 0.06);
        box(scenery, [0.5, 0.04, 0.04], [x, 0.5, 3.6], '#c5525a', 0);
      }
  } else if (style === 'klinik') {
    counter(scenery, tone, 'PENDAFTARAN');
    for (let i = 0; i < 4; i++) chair(scenery, -4.5 + i * 1.1, 2.6, Math.PI);
    // Ruang periksa bersekat di belakang kiri: ranjang periksa dan tirai.
    box(scenery, [0.12, 2.4, 4], [-1.4, 1.2, -2.9], '#eef3fd', 0.03);
    box(scenery, [2.2, 0.6, 0.9], [-4.2, 0.55, -3.6], '#ffffff', 0.1);
    box(scenery, [2.1, 0.12, 0.85], [-4.2, 0.9, -3.6], tone, 0.05);
    box(scenery, [0.8, 1.4, 0.5], [-2.3, 0.7, -4.3], '#f4f6fb', 0.06);
    // Papan tanda hanya hiasan; loket dipilih lewat penandanya.
    delete goods.userData.selection;
    box(goods, [1.2, 1.2, 0.1], [2, 2.4, -d / 2 + 0.2], '#e8737a', 0.12);
    box(goods, [0.8, 0.24, 0.05], [2, 2.4, -d / 2 + 0.28], '#ffffff', 0);
    box(goods, [0.24, 0.8, 0.05], [2, 2.4, -d / 2 + 0.28], '#ffffff', 0);
  } else {
    // Loket simpan pinjam: tiga jendela teller berkaca.
    for (const x of [-3, 0, 3]) {
      box(scenery, [2.6, 1.1, 0.9], [x, 0.55, -2.2], '#ffffff', 0.08);
      box(scenery, [2.7, 0.08, 1], [x, 1.12, -2.2], tone, 0.03);
      box(scenery, [2.4, 1.2, 0.05], [x, 1.8, -2.65], '#d3e1fb', 0);
      box(scenery, [0.6, 0.4, 0.45], [x - 0.5, 1.35, -2.35], palette.glassDark, 0.05);
    }
    for (let i = 0; i < 5; i++) chair(scenery, -4.4 + i * 1.1, 2.4, Math.PI);
    // Papan tanda hanya hiasan; loket dipilih lewat penandanya.
    delete goods.userData.selection;
    box(goods, [3, 0.6, 0.1], [0, 3, -d / 2 + 0.2], tone, 0.08);
    sign(goods, 'LOKET LAYANAN', [0, 3, -d / 2 + 0.27], 2.8, palette.ink);
  }
  // Tanaman sudut dan lampu gantung bulat.
  cylinder(scenery, 0.35, 0.6, [w / 2 - 0.8, 0.3, -d / 2 + 0.8], '#e7ecf8');
  sphere(scenery, 0.5, [w / 2 - 0.8, 0.95, -d / 2 + 0.8], palette.green);
  mergeStatic(scenery);
  mergeStatic(goods);
}
