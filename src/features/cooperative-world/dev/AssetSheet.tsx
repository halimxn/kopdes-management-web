'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { warehouse } from '../layout';
import { createSelectionBox } from '../objects/highlight';
import { allBuildings } from '../district';
import {
  clinicBuilding,
  coldStorageBuilding,
  counterBuilding,
  officeBuilding,
  pharmacyBuilding,
  plannedLot,
  shopBuilding,
} from '../objects/district-buildings';

const find = (id: string) => allBuildings().find((b) => b.id === id)!;
import { box, disposeSharedResources, mergeStatic, palette } from '../objects/primitives';
import {
  cardboardPallet,
  container,
  dropPin,
  fence,
  forklift,
  palletRack,
  tree,
  villageHouse,
} from '../objects/props';
import { createRoute } from '../objects/route';
import { truck, truckSchemes } from '../objects/vehicles';
import { createWarehouse } from '../objects/warehouse';

type Cell = {
  title: string;
  note: string;
  build: (parent: THREE.Group) => void;
  wide?: boolean;
  hero?: boolean;
};

/**
 * Membangun komplek terpadu sesuai gambar referensi:
 * Gudang WH-04 & Kantor Koperasi dalam satu halaman berpagar, truk di dok, forklift,
 * pohon voxel bertingkat, jalan raya depan, dan rumah pedesaan seberang.
 */
function buildCozyCompoundSample(parent: THREE.Group) {
  // 1. Lahan halaman kavling & rumput sekeliling
  box(parent, [56, 0.1, 46], [0, -0.05, 5], '#bbf7d0', 0);
  box(parent, [48, 0.12, 28], [-1, 0.05, -3], '#e2e8f0', 0.04);
  box(parent, [28, 0.14, 12], [-10, 0.06, 0], '#cbd5e1', 0.02);

  // 2. Pagar keliling komplek dengan bukaan gerbang
  fence(parent, [-25, -17], [23, -17]);
  fence(parent, [-25, -17], [-25, 11]);
  fence(parent, [23, -17], [23, 11]);
  fence(parent, [-25, 11], [-8, 11]);
  fence(parent, [0, 11], [23, 11]);
  box(parent, [0.35, 2.2, 0.35], [-8, 1.1, 11], '#475569', 0.04);
  box(parent, [0.35, 2.2, 0.35], [0, 1.1, 11], '#475569', 0.04);

  // 3. Gudang WH-04 di sisi kiri
  const wh = createWarehouse(parent);
  wh.position.set(-11, 0, -6);

  // 4. Kantor Koperasi HQ (Rural Cooperative HQ) di sisi kanan
  const office = officeBuilding(parent, find('kantor'));
  office.position.set(13, 0, -2);

  // 5. Truk logistik CO-OP terparkir di Dok 2
  const d2X = -11 + (warehouse.docks[1] - warehouse.center[0]);
  const truck1 = truck(parent, 'sample-truck-1', 'aset', truckSchemes[0]);
  truck1.position.set(d2X, 0, 1.6);
  truck1.rotation.y = Math.PI;

  // Truk logistik 2 di area parkir samping
  const truck2 = truck(parent, 'sample-truck-2', 'aset', truckSchemes[1]);
  truck2.position.set(13, 0, 7.5);
  truck2.rotation.y = -Math.PI / 2;
  truck2.scale.setScalar(0.85);

  // 6. Forklift membawa palet kardus
  forklift(parent, 1.8, 0, 1.5, 'kardus');

  // 7. Palet dan kontainer di sudut halaman
  cardboardPallet(parent, -22, -2, 3);
  cardboardPallet(parent, -22, 0.5, 2, true);
  container(parent, -21.5, 5);

  // 8. Pohon-pohon voxel bertingkat
  tree(parent, -23.5, -15, 1.25);
  tree(parent, -15, -15.5, 1.1);
  tree(parent, 1, -15.5, 1.3);
  tree(parent, 18, -15.5, 1.15);
  tree(parent, 21.5, -10, 1.2);
  tree(parent, 21.5, 3, 1.0);
  tree(parent, 21.5, 9, 1.15);
  tree(parent, -23.5, -8, 1.1);
  tree(parent, -23.5, 2, 1.2);

  // 9. Jalan raya depan, marka, dan trotoar
  box(parent, [56, 0.22, 2.4], [0, 0.05, 12.2], '#e2e8f0', 0.04);
  box(parent, [56, 0.16, 8.5], [0, 0.02, 17.65], '#334155', 0);
  for (let rx = -25; rx <= 25; rx += 4.5) {
    box(parent, [2.4, 0.02, 0.28], [rx, 0.11, 17.65], '#f8fafc', 0);
  }
  box(parent, [56, 0.22, 2.4], [0, 0.05, 23.1], '#e2e8f0', 0.04);

  // 10. Rumah pedesaan (Village Houses) di seberang jalan
  villageHouse(parent, -13, 29, 0, 1.05);
  villageHouse(parent, 14, 29, 0, 1.0);
  tree(parent, 0, 28.5, 1.35);
  tree(parent, -23, 28.5, 1.2);
  tree(parent, 23, 28.5, 1.15);
}

/**
 * Lembar aset Dunia Koperasi (hanya development): setiap mesh dirender dari fungsi aslinya
 * sehingga panduan aset tidak bisa berbeda dari kode. Dipakai sebagai acuan AI dan QA visual.
 */
const cells: Cell[] = [
  {
    title: 'Sample Diorama Komplek Terpadu (Cozy Compound Sesuai Gambar)',
    note: 'Gudang WH-04 & Kantor Koperasi dalam 1 kavling berpagar, truk dok D2, forklift, pohon voxel & rumah pedesaan',
    hero: true,
    wide: true,
    build: (parent) => {
      buildCozyCompoundSample(parent);
    },
  },
  {
    title: 'Rumah pedesaan (Village House)',
    note: 'villageHouse · dinding krem kayu, atap genteng terakota, cerobong asap',
    build: (parent) => {
      villageHouse(parent, 0, 0, 0, 1.1);
    },
  },
  {
    title: 'Pohon voxel bertingkat',
    note: 'tree · clustered voxel foliage cubes, batang silinder kayu',
    build: (parent) => {
      tree(parent, -1.2, 0, 1.2);
      tree(parent, 1.2, 0.5, 0.9);
    },
  },
  {
    title: 'Gudang koperasi',
    note: 'createWarehouse (WH-04) · 26 × 11, dinding 5,4 + atap 1,8',
    wide: true,
    build: (parent) => {
      const g = createWarehouse(parent);
      g.position.set(0, 0, 0);
    },
  },
  ...truckSchemes.map((scheme, index) => ({
    title: `Truk skema ${index + 1}`,
    note: index ? `Kabin putih · garis ${scheme.stripe}` : 'Kabin biru polos',
    build: (parent: THREE.Group) => {
      truck(parent, `contoh-${index}`, 'aset', scheme);
    },
  })),
  {
    title: 'Forklift',
    note: 'forklift(…, "kardus") · garpu ke +Z',
    build: (parent) => {
      forklift(parent, -1, 0, 0.5, 'kardus');
      forklift(parent, 1.4, 0, -0.4);
    },
  },
  {
    title: 'Palet',
    note: 'cardboardPallet · kardus / kemasan biru',
    build: (parent) => {
      cardboardPallet(parent, -0.7, 0, 2);
      cardboardPallet(parent, 0.7, 0, 2, true);
    },
  },
  {
    title: 'Rak palet luar',
    note: 'palletRack · tiang biru, balok oranye',
    build: (parent) => palletRack(parent, 0, 0, 2),
  },
  {
    title: 'Kontainer',
    note: 'container · teal bergaris',
    build: (parent) => container(parent, 0, 0),
  },
  {
    title: 'Kantor koperasi',
    note: 'officeBuilding · kayu hangat (timber slats), lantai 2, lis putih, plang HQ & taman bunga',
    build: (parent) => {
      officeBuilding(parent, find('kantor'));
    },
  },
  {
    title: 'Cold storage (WH-03)',
    note: 'coldStorageBuilding · lis navy, unit pendingin',
    build: (parent) => {
      coldStorageBuilding(parent, find('cold-storage'), 'aset');
    },
  },
  {
    title: 'Klinik desa',
    note: 'clinicBuilding · atap biru langit, kanopi',
    build: (parent) => {
      clinicBuilding(parent, find('klinik'), 'Contoh Klinik', 'aset');
    },
  },
  {
    title: 'Apotek',
    note: 'pharmacyBuilding · atap mint, palang hijau',
    build: (parent) => {
      pharmacyBuilding(parent, find('apotek'), 'Contoh Apotek', 'aset');
    },
  },
  {
    title: 'Simpan pinjam',
    note: 'counterBuilding · atap lavender',
    build: (parent) => {
      counterBuilding(parent, find('simpan-pinjam'), 'Contoh Simpan Pinjam', 'aset');
    },
  },
  {
    title: 'Gerai sembako',
    note: 'shopBuilding · tenda peach',
    build: (parent) => {
      shopBuilding(parent, find('sembako'), 'Contoh Sembako', 'aset', palette.pastelPeach);
    },
  },
  {
    title: 'Kavling rencana',
    note: 'plannedLot · kosong / pondasi / rangka',
    build: (parent) => {
      plannedLot(parent, find('gerai-1'), 'aset', 'rangka');
    },
  },
  {
    title: 'Pohon & pin',
    note: 'tree · dropPin (hanya dari data)',
    build: (parent) => {
      tree(parent, -1, 0);
      tree(parent, 0.6, 0.6, 0.8);
      dropPin(parent, 2.2, 0.6, 0);
    },
  },
  {
    title: 'Seleksi & rute truk',
    note: 'createSelectionBox · createRoute',
    wide: true,
    build: (parent) => {
      const t = truck(parent, 'rute', 'aset', truckSchemes[2]);
      t.position.set(0, 0, 0);
      mergeStatic(t);
      parent.add(createSelectionBox(new THREE.Box3().setFromObject(t)));
      createRoute(parent, {
        done: [
          [-9, -8],
          [-9, 0],
          [0, 0],
        ],
        ahead: [
          [0, 0],
          [7, 0],
          [7, -5],
        ],
        target: [7, -6],
        dock: 0,
      });
    },
  },
];

export function AssetSheet() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral menjaga rona biru-pastel video; ACES memudarkan warna ke abu-abu.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.setScissorTest(true);
    Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0' });
    node.prepend(renderer.domElement);
    const scenes = cells.map((cell) => {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#eef3fc');
      scene.add(new THREE.HemisphereLight('#f5f9ff', '#aeb8cf', 2.8));
      const sun = new THREE.DirectionalLight('#fff7e8', 3.8);
      sun.position.set(-14, 28, 14);
      scene.add(sun);
      const group = new THREE.Group();
      scene.add(group);
      cell.build(group);
      // Gudang dibangun di koordinat kawasan; geser ke titik asal agar kamera sederhana.
      if (cell.title === 'Gudang koperasi')
        group.position.set(-warehouse.center[0], 0, -warehouse.center[1]);
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshStandardMaterial({ color: palette.ground, roughness: 1 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.01;
      scene.add(floor);
      const bounds = new THREE.Box3().setFromObject(group);
      const center = bounds.getCenter(new THREE.Vector3());
      const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
      camera.position
        .copy(center)
        .add(new THREE.Vector3(26, 23, 26).normalize().multiplyScalar(80));
      camera.lookAt(center);
      return { scene, camera, radius };
    });
    const draw = () => {
      const width = node.clientWidth;
      renderer.setSize(width, node.clientHeight, false);
      node.querySelectorAll<HTMLElement>('[data-cell]').forEach((element) => {
        const index = Number(element.dataset.cell);
        const { scene, camera, radius } = scenes[index];
        const rect = element.getBoundingClientRect();
        const base = node.getBoundingClientRect();
        const x = rect.left - base.left,
          y = base.bottom - rect.bottom;
        renderer.setViewport(x, y, rect.width, rect.height);
        renderer.setScissor(x, y, rect.width, rect.height);
        const aspect = rect.width / rect.height;
        const half = radius * 0.78;
        camera.left = -half * aspect;
        camera.right = half * aspect;
        camera.top = half;
        camera.bottom = -half;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(node);
    window.addEventListener('scroll', draw, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', draw);
      scenes.forEach(({ scene }) =>
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        }),
      );
      disposeSharedResources();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#eef3fc',
        color: '#1f2f4a',
        fontFamily: 'Inter, Arial, sans-serif',
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Lembar aset Dunia Koperasi</h1>
      <p style={{ margin: '0 0 18px', color: '#6b7a92', fontSize: 13 }}>
        Render langsung dari src/features/cooperative-world/objects. Acuan: docs/DUNIA-KOPERASI.md
        bagian Distrik ala video v4 dan Blueprint visual v3.
      </p>
      <div ref={host} style={{ position: 'relative' }}>
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}
        >
          {cells.map((cell, index) => (
            <figure
              key={cell.title}
              style={{
                gridColumn: cell.hero ? 'span 4' : cell.wide ? 'span 2' : undefined,
                margin: 0,
                border: '1px solid #e2e8f4',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: cell.hero ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
              }}
            >
              <div data-cell={index} style={{ height: cell.hero ? 480 : 230 }} />
              <figcaption
                style={{
                  padding: '10px 14px',
                  background: '#ffffffea',
                  fontSize: 12,
                  lineHeight: 1.4,
                  borderTop: '1px solid #eef2f6',
                }}
              >
                <strong style={{ display: 'block', fontSize: cell.hero ? 15 : 13, color: '#1e293b' }}>
                  {cell.title}
                </strong>
                <span style={{ color: '#64748b' }}>{cell.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </main>
  );
}
