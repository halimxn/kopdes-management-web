'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { warehouse } from '../layout';
import { createSelectionBox } from '../objects/highlight';
import { building } from '../objects/office';
import {
  disposeSharedResources,
  mergeStatic,
  palette,
} from '../objects/primitives';
import {
  cardboardPallet,
  container,
  dropPin,
  forklift,
  palletRack,
  tree,
} from '../objects/props';
import { createRoute } from '../objects/route';
import { truck, truckSchemes } from '../objects/vehicles';
import { createWarehouse } from '../objects/warehouse';

type Cell = { title: string; note: string; build: (parent: THREE.Group) => void; wide?: boolean };

/**
 * Lembar aset Dunia Koperasi (hanya development): setiap mesh dirender dari fungsi aslinya
 * sehingga panduan aset tidak bisa berbeda dari kode. Dipakai sebagai acuan AI dan QA visual.
 */
const cells: Cell[] = [
  {
    title: 'Gudang koperasi',
    note: 'createWarehouse · 24 × 10, dinding 5,4 + atap 1,8',
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
    note: 'building(main) · putih, pita kaca, parapet biru',
    build: (parent) => {
      building(parent, 0, 0, 'Koperasi', true);
    },
  },
  {
    title: 'Gerai',
    note: 'building · tenda bergaris, etalase',
    build: (parent) => {
      building(parent, 0, 0, 'Contoh Gerai', false, 'gerai');
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
      if (cell.title === 'Gudang koperasi') group.position.set(-warehouse.center[0], 0, -warehouse.center[1]);
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
      camera.position.copy(center).add(new THREE.Vector3(26, 23, 26).normalize().multiplyScalar(80));
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
    return () => {
      observer.disconnect();
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
        bagian Blueprint visual v3.
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
                gridColumn: cell.wide ? 'span 2' : undefined,
                margin: 0,
                border: '1px solid #e2e8f4',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div data-cell={index} style={{ height: 230 }} />
              <figcaption
                style={{ padding: '8px 12px', background: '#ffffffd9', fontSize: 12, lineHeight: 1.4 }}
              >
                <strong style={{ display: 'block', fontSize: 13 }}>{cell.title}</strong>
                <span style={{ color: '#6b7a92' }}>{cell.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </main>
  );
}
