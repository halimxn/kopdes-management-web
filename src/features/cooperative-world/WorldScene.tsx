'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Building2, Plus, MessageCircle, MapPin, Truck, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { animateCharacter, createCharacter } from './objects/characters';
import { createExterior } from './objects/exterior';
import { createInterior } from './objects/office';
import { disposeSharedResources, mergeStatic, palette } from './objects/primitives';
import {
  cameraSpan,
  characterSpots,
  officePosition,
  officeInterior,
  officeSize,
  warehouse,
  warehouseInterior,
  worldStations,
} from './layout';
import { getLighting } from './lighting';
import {
  qualitySettings,
  readDeviceHints,
  resolveQuality,
  type QualityChoice,
} from './render-quality';
import {
  isBelowMinimum,
  rackIds,
  type CharacterActivity,
  type WorldLocation,
  type WorldModel,
  type WorldPreferences,
} from './world-model';
import { createWarehouseInterior } from './objects/warehouse-interior';
import { briefingSpot, createNpcs, updateNpcs, walkToward } from './npc/movement';
import { npcActivityNames, type ManagerPlan, type NpcPlan } from './npc/schedule';
import type { CharacterPose } from './objects/characters';
import { createAmbientCars, createTrucks, truckPose, type AmbientCar } from './objects/vehicles';

type Props = {
  model: WorldModel;
  location: WorldLocation;
  weather: WorldPreferences['weather'];
  hour: number;
  outfit: WorldPreferences['outfit'];
  quality: QualityChoice;
  activity: CharacterActivity;
  /** Titik X/Z yang dituju kamera (pusat zona). */
  focus: readonly [number, number];
  /** Bertambah setiap kali pengguna meminta kamera kembali ke tujuan meski nilainya sama. */
  recenter: number;
  /**
   * Bagian layar yang tertutup kartu (px dari kanan/atas, dan lembar bawah ponsel).
   * Titik fokus kamera ditempatkan di tengah area yang masih terlihat.
   */
  occlusion: { right: number; top: number; sheet: 'ringkas' | 'setengah' | 'penuh' | null };
  zoom: number;
  rotation: number;
  selected: string;
  bubble: string;
  /** Rencana kegiatan karakter Tim (dihitung ulang tiap menit tanpa membangun ulang scene). */
  plans: NpcPlan[];
  managerPlan: ManagerPlan;
  /** Bubble maskot tampil otomatis sesekali (selain saat maskot dipilih). */
  bubbleOpen: boolean;
  onSelect: (id: string) => void;
};
export function WorldScene({
  model,
  location,
  weather,
  hour,
  outfit,
  quality,
  activity,
  focus,
  recenter,
  occlusion,
  zoom,
  rotation,
  selected,
  bubble,
  plans,
  managerPlan,
  bubbleOpen,
  onSelect,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  // Komponen ini hanya dirender di browser, sehingga petunjuk perangkat aman dibaca di sini.
  const tier = useMemo(() => resolveQuality(quality, readDeviceHints()), [quality]);
  const markerRefs = useRef(new Map<string, HTMLDivElement>());
  const covered = useRef(occlusion);
  const runtime = useRef<{
    camera: THREE.OrthographicCamera;
    controls: OrbitControls;
    world: THREE.Group;
    resize: () => void;
  } | null>(null);
  const motion = useRef({ activity, weather, hour });
  const npcPlans = useRef(plans);
  const bossPlan = useRef(managerPlan);
  useEffect(() => {
    npcPlans.current = plans;
    bossPlan.current = managerPlan;
  }, [plans, managerPlan]);
  const selectAction = useRef(onSelect);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    motion.current = { activity, weather, hour };
  }, [activity, weather, hour]);
  useEffect(() => {
    selectAction.current = onSelect;
  }, [onSelect]);
  // Tujuan kamera dibaca saat scene dibangun lalu dianimasikan di loop saat berubah.
  const view = useRef({ focus, zoom, rotation, moving: false });
  useEffect(() => {
    view.current = { focus, zoom, rotation, moving: true };
  }, [focus, zoom, rotation, recenter]);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const settings = qualitySettings[tier];
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: settings.antialias, alpha: false });
    } catch {
      const failureFrame = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(failureFrame);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.pixelRatio));
    renderer.shadowMap.enabled = settings.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute(
      'aria-label',
      location === 'luar'
        ? 'Lingkungan koperasi 3D. Geser untuk memutar, cubit untuk memperbesar.'
        : location === 'gudang'
          ? 'Interior gudang 3D. Pilih rak melalui penanda atau daftar.'
          : 'Interior koperasi 3D. Pilih meja melalui penanda atau panel.',
    );
    node.prepend(renderer.domElement);
    // Hanya development: memeriksa anggaran draw call dari konsol (window.__cwRenderInfo).
    if (process.env.NODE_ENV === 'development')
      (window as Window & { __cwRenderInfo?: THREE.WebGLInfo }).__cwRenderInfo = renderer.info;
    const scene = new THREE.Scene();
    const background = new THREE.Color('#eef3fc');
    scene.background = background;
    const camera = new THREE.OrthographicCamera(-20, 20, 14, -14, 0.1, 200);
    const cameraOffset = (turn: number) =>
      new THREE.Vector3(Math.sin(Math.PI / 4 + turn) * 26, 23, Math.cos(Math.PI / 4 + turn) * 26);
    const goalTarget = new THREE.Vector3(),
      goalOffset = new THREE.Vector3(),
      offset = new THREE.Vector3();
    const readGoal = () => {
      goalTarget.set(view.current.focus[0], 0, view.current.focus[1]);
      goalOffset.copy(cameraOffset(view.current.rotation));
    };
    readGoal();
    camera.zoom = view.current.zoom;
    camera.position.copy(goalTarget).add(goalOffset);
    camera.lookAt(goalTarget);
    camera.updateProjectionMatrix();
    view.current.moving = false;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(goalTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minZoom = 0.35;
    controls.maxZoom = 2.8;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = 1.18;
    controls.enablePan = true;
    controls.maxTargetRadius = location === 'luar' ? 30 : 10;
    const ambient = new THREE.HemisphereLight('#f5f9ff', '#aeb8cf', 2.8);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight('#fff7e8', 3.8);
    sun.castShadow = settings.shadows;
    if (settings.shadows) sun.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
    const shadowExtent = location === 'luar' ? 38 : 22;
    Object.assign(sun.shadow.camera, {
      left: -shadowExtent,
      right: shadowExtent,
      top: shadowExtent,
      bottom: -shadowExtent,
      near: 0.5,
      far: 90,
    });
    sun.position.set(-14, 28, 14);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: '#eef3fc', roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.4;
    floor.receiveShadow = true;
    scene.add(floor);
    const world = new THREE.Group();
    scene.add(world);
    let cars: AmbientCar[] = [];
    if (location === 'luar') {
      createExterior(world, model);
      createTrucks(world, model.trucks);
      cars = createAmbientCars(world);
    }
    if (location === 'gudang') createWarehouseInterior(world, model.inventory);
    if (location === 'dalam') {
      createInterior(world);
      mergeStatic(world);
    }
    const color = { biru: palette.blue, lavender: '#a18ae0', hijau: '#51aa8a' }[outfit];
    const spots = characterSpots[location];
    // Maskot manajer; karakter Tim berasal dari catatan Tim (tidak ada karakter karangan).
    const manager = createCharacter(world, spots[0], color);
    manager.group.userData.selection = 'karakter';
    const npcs = createNpcs(world, model.staff);
    let npcSnap = true;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart = [0, 0];
    const startPointer = (event: PointerEvent) => {
      pointerStart = [event.clientX, event.clientY];
    };
    const pickObject = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(world, true)[0];
      let object: THREE.Object3D | null = hit?.object || null;
      while (object) {
        if (typeof object.userData.selection === 'string') {
          selectAction.current(object.userData.selection);
          return;
        }
        object = object.parent;
      }
    };
    renderer.domElement.addEventListener('pointerdown', startPointer);
    renderer.domElement.addEventListener('pointerup', pickObject);
    const rainCount = settings.rainCount,
      rainPositions = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      const x = ((i * 17.37) % 34) - 17,
        y = (i * 7.19) % 16,
        z = ((i * 11.63) % 26) - 13;
      rainPositions.set([x, y, z, x - 0.12, y + 0.5, z], i * 6);
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rain = new THREE.LineSegments(
      rainGeometry,
      new THREE.LineBasicMaterial({ color: '#8cadd9', transparent: true, opacity: 0.6 }),
    );
    scene.add(rain);
    const projected = new THREE.Vector3();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0,
      previous = 0,
      elapsed = 0,
      disposed = false;
    const resize = () => {
      const { width, height } = node.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      const aspect = width / height;
      const span = cameraSpan[location][aspect < 1 ? 'portrait' : 'landscape'];
      const cover = covered.current;
      const sheet =
        cover.sheet === 'ringkas'
          ? 170
          : cover.sheet === 'setengah'
            ? Math.min(window.innerHeight * 0.52, 460) + 84
            : 0;
      // Fraksi posisi fokus; dibatasi agar fokus tidak terdorong ke tepi layar kecil.
      const fx = Math.max(0.3, (width - cover.right) / 2 / width);
      const visible = Math.max(height * 0.3, height - cover.top - sheet);
      const fy = Math.min(0.6, Math.max(0.25, (cover.top + visible / 2) / height));
      camera.left = -2 * span * aspect * fx;
      camera.right = 2 * span * aspect * (1 - fx);
      camera.top = 2 * span * fy;
      camera.bottom = -2 * span * (1 - fy);
      camera.updateProjectionMatrix();
    };
    runtime.current = { camera, controls, world, resize };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    const positions = new Map<string, THREE.Vector3>();
    if (location === 'luar') {
      positions.set(
        'koperasi',
        new THREE.Vector3(officePosition[0], officeSize.height + 1, officePosition[1]),
      );
      positions.set(
        'gudang',
        new THREE.Vector3(warehouse.center[0], warehouse.size[1] + 2, warehouse.center[1]),
      );
      for (const spot of model.trucks) {
        const [x, z] = truckPose(spot);
        positions.set(`kirim-${spot.delivery.id}`, new THREE.Vector3(x, 3.8, z));
      }
      model.plots.forEach((plot) =>
        positions.set(
          plot.id,
          new THREE.Vector3(plot.position[0], plot.unit ? 3.1 : 0.6, plot.position[1]),
        ),
      );
    } else if (location === 'gudang') {
      for (const id of rackIds) {
        const [x, z] = warehouseInterior.racks[id];
        positions.set(`rak-${id}`, new THREE.Vector3(x, warehouseInterior.rackSize[1] + 0.6, z));
      }
      const [sx, sz] = warehouseInterior.staging;
      positions.set('staging', new THREE.Vector3(sx, 1.6, sz));
    } else
      worldStations.forEach((station) =>
        positions.set(station.id, new THREE.Vector3(station.position[0], 2.2, station.position[2])),
      );
    const draw = (stamp: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden || stamp - previous < settings.frameInterval) return;
      const delta = (stamp - previous) / 1000;
      elapsed += Math.min(delta, 0.06);
      previous = stamp;
      if (view.current.moving) {
        readGoal();
        // Laju berbasis waktu agar kamera tetap tiba ±0,6 detik walau frame tersendat.
        const k = reduced.matches ? 1 : 1 - Math.exp(-Math.min(delta, 0.5) * 7);
        offset.copy(camera.position).sub(controls.target).lerp(goalOffset, k);
        controls.target.lerp(goalTarget, k);
        camera.position.copy(controls.target).add(offset);
        camera.zoom += (view.current.zoom - camera.zoom) * k;
        camera.updateProjectionMatrix();
        if (
          controls.target.distanceTo(goalTarget) < 0.02 &&
          offset.distanceTo(goalOffset) < 0.02 &&
          Math.abs(camera.zoom - view.current.zoom) < 0.002
        )
          view.current.moving = false;
      }
      controls.update();
      const state = motion.current,
        light = getLighting(state.hour, state.weather);
      background.set(light.sky);
      (floor.material as THREE.MeshStandardMaterial).color.set(light.sky);
      ambient.intensity = light.ambient;
      sun.intensity = light.sun;
      sun.color.set(light.sunColor);
      renderer.toneMappingExposure = light.exposure;
      // Manajer: rapat/gym dari aktivitas; selain itu mengikuti rencana (briefing, meja staf, dok).
      const boss = bossPlan.current;
      const [rx, rz] = officeInterior.manager;
      let goal: [number, number, number, CharacterPose] = [
        rx + 1.4,
        rz + 1.6,
        Math.PI * 0.85,
        'idle',
      ];
      if (location === 'dalam') {
        const [mx, mz] = officeInterior.meeting;
        const [gx, gz] = officeInterior.gym;
        const visit =
          boss.kind === 'meja-staf'
            ? npcs.find((actor) => actor.id === boss.staffId && actor.character.group.visible)
            : undefined;
        if (state.activity === 'meeting') goal = [mx - 2.5, mz, Math.PI / 2, 'meeting'];
        else if (state.activity === 'gym') goal = [gx - 1.2, gz + 0.1, Math.PI, 'gym'];
        else if (boss.kind === 'briefing')
          goal = [briefingSpot.manager[0], briefingSpot.manager[1], 0, 'idle'];
        else if (visit) {
          const { x, z } = visit.character.base;
          goal = [x + 0.9, z + 0.7, Math.atan2(-0.9, -0.7), 'idle'];
        } else if (state.activity === 'work') goal = [rx, rz + 1, Math.PI, 'desk'];
      } else if (location === 'luar') {
        const front = warehouse.center[1] + warehouse.size[2] / 2;
        goal =
          boss.kind === 'dok'
            ? [warehouse.docks[0] - 2.4, front + 1.6, Math.PI / 2, 'idle']
            : [spots[0][0], spots[0][2], 0, 'idle'];
      } else {
        const [sx, sz] = warehouseInterior.staging;
        goal = [sx + 2.4, sz - 1, -Math.PI / 2, 'idle'];
      }
      if (npcSnap || reduced.matches) manager.base.set(goal[0], manager.base.y, goal[1]);
      const arrived =
        npcSnap || reduced.matches || walkToward(manager, goal[0], goal[1], Math.min(delta, 0.25));
      if (arrived) manager.group.rotation.y = goal[2];
      manager.base.y = arrived && goal[3] === 'gym' ? 0.3 : 0.1;
      animateCharacter(manager, elapsed, arrived ? goal[3] : 'walk', reduced.matches);
      positions.set('karakter', manager.group.position.clone().add(new THREE.Vector3(0, 2.4, 0)));
      const chatting = updateNpcs(
        npcs,
        npcPlans.current,
        location,
        model,
        Math.min(delta, 0.25),
        elapsed,
        reduced.matches,
        npcSnap,
      );
      npcSnap = false;
      for (const actor of npcs)
        markerRefs.current
          .get(`staf-${actor.id}`)
          ?.classList.toggle('is-chatting', chatting.has(actor.id));
      for (const actor of npcs)
        if (actor.character.group.visible)
          positions.set(
            `staf-${actor.id}`,
            actor.character.group.position.clone().add(new THREE.Vector3(0, 2.3, 0)),
          );
        else positions.delete(`staf-${actor.id}`);
      for (const [id, position] of positions) {
        const marker = markerRefs.current.get(id);
        if (!marker) continue;
        projected.copy(position).project(camera);
        marker.style.left = `${(projected.x * 0.5 + 0.5) * node.clientWidth}px`;
        marker.style.top = `${(-projected.y * 0.5 + 0.5) * node.clientHeight}px`;
        marker.style.visibility =
          Math.abs(projected.x) > 1.05 || Math.abs(projected.y) > 1.05 ? 'hidden' : 'visible';
      }
      // Mobil suasana melaju dan kembali dari sisi lain; berhenti bila pengguna memilih gerak minimal.
      if (!reduced.matches)
        for (const car of cars) {
          car.group.position.x += car.speed * Math.min(delta, 0.06);
          if (car.group.position.x > 33) car.group.position.x = -33;
          if (car.group.position.x < -33) car.group.position.x = 33;
        }
      rain.visible = state.weather === 'hujan' && location === 'luar';
      rain.position.set(controls.target.x, 0, controls.target.z);
      if (rain.visible && !reduced.matches) {
        const a = rainGeometry.attributes.position;
        for (let i = 0; i < rainCount; i++) {
          const y = (16 + ((i * 7.19) % 16) - ((elapsed * 7) % 16)) % 16;
          a.setY(i * 2, y);
          a.setY(i * 2 + 1, y + 0.5);
        }
        a.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);
    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      runtime.current = null;
      renderer.domElement.removeEventListener('pointerdown', startPointer);
      renderer.domElement.removeEventListener('pointerup', pickObject);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((mat) => {
            if ('map' in mat && mat.map instanceof THREE.Texture) mat.map.dispose();
            mat.dispose();
          });
        }
      });
      disposeSharedResources();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
      renderer.domElement.remove();
    };
    // The scene is rebuilt only when its geometry/data changes; animation settings use motion.current.
  }, [location, model, outfit, tier]);
  // Kartu/lembar berubah ukuran: hitung ulang proyeksi agar fokus tetap di area terlihat.
  useEffect(() => {
    covered.current = occlusion;
    runtime.current?.resize();
  }, [occlusion]);
  // Kotak sorot biru di sekitar objek terpilih, seperti kotak seleksi truk pada video acuan.
  useEffect(() => {
    const world = runtime.current?.world;
    if (!world) return;
    let target: THREE.Object3D | undefined;
    world.traverse((object) => {
      if (!target && object.userData.selection === selected) target = object;
    });
    if (!target) return;
    const bounds = new THREE.Box3().setFromObject(target);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const highlight = new THREE.Group();
    const color = palette.blue;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.5, size.y + 0.3, size.z + 0.5)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }),
    );
    edges.position.copy(center);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x + 1, size.z + 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, depthWrite: false }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(center.x, 0.07, center.z);
    highlight.add(edges, floor);
    world.add(highlight);
    return () => {
      highlight.removeFromParent();
      edges.geometry.dispose();
      (edges.material as THREE.Material).dispose();
      floor.geometry.dispose();
      floor.material.dispose();
    };
  }, [selected, location, model, tier]);
  const low = model.inventory.low.length;
  const markers: {
    id: string;
    label: string;
    occupied: boolean;
    status: string;
    alert?: boolean;
  }[] =
    location === 'gudang'
      ? [
          ...rackIds.map((id) => {
            const items = model.inventory.racks[id];
            const lowItems = items.filter(isBelowMinimum).length;
            return {
              id: `rak-${id}`,
              label: `Rak ${id}`,
              occupied: items.length > 0,
              status: lowItems ? `${lowItems} di bawah minimum` : `${items.length} barang`,
              alert: lowItems > 0,
            };
          }),
          ...(model.inventory.staging.length
            ? [
                {
                  id: 'staging',
                  label: 'Area staging',
                  occupied: true,
                  status: `${model.inventory.staging.length} belum ber-rak`,
                },
              ]
            : []),
        ]
      : location === 'luar'
        ? [
            { id: 'koperasi', label: 'Kantor koperasi', occupied: true, status: 'Masuk' },
            {
              id: 'gudang',
              label: 'Gudang koperasi',
              occupied: true,
              status: low ? `${low} di bawah minimum` : `${warehouse.docks.length} dok`,
              alert: low > 0,
            },
            ...model.trucks.map((spot) => ({
              id: `kirim-${spot.delivery.id}`,
              label: String(spot.delivery.data.title),
              occupied: true,
              status:
                spot.place === 'dok'
                  ? `${spot.delivery.data.status} · D${spot.index + 1}`
                  : 'dikirim · antre',
            })),
            ...model.plots.map((plot, i) => ({
              id: plot.id,
              label: plot.unit
                ? String(plot.unit.data.title)
                : `Lahan ${String(i + 1).padStart(2, '0')}`,
              occupied: Boolean(plot.unit),
              status: plot.unit ? String(plot.unit.data.status || 'rencana') : 'Kosong',
            })),
          ]
        : worldStations.map((station) => ({
            id: station.id,
            label: station.title,
            occupied: true,
            status: 'Buka',
          }));
  return (
    <div className="cw-scene" ref={host}>
      {failed && (
        <div className="cw-render-error" role="alert">
          Tampilan 3D tidak tersedia di perangkat ini. Gunakan daftar lokasi untuk membuka gerai dan
          ruang kerja.
        </div>
      )}
      {!failed &&
        markers.map((marker) => (
          <div
            className="cw-marker"
            key={marker.id}
            ref={(node) => {
              if (node) markerRefs.current.set(marker.id, node);
              else markerRefs.current.delete(marker.id);
            }}
          >
            <Button
              className={`cw-map-pin ${selected === marker.id ? 'is-selected' : ''} ${!marker.occupied ? 'is-empty' : ''} ${marker.alert ? 'is-alert' : ''}`}
              onClick={() => onSelect(marker.id)}
              aria-label={marker.id === 'koperasi' ? 'Masuk kantor koperasi' : marker.label}
            >
              {marker.id === 'koperasi' ? (
                <Building2 size={16} />
              ) : marker.id === 'gudang' ? (
                <Warehouse size={16} />
              ) : marker.id.startsWith('kirim-') ? (
                <Truck size={15} />
              ) : marker.occupied ? (
                <MapPin size={14} />
              ) : (
                <Plus size={14} />
              )}
              <span>{marker.label}</span>
              {(selected === marker.id || marker.alert) && (
                <em className="cw-pin-status">{marker.status}</em>
              )}
            </Button>
          </div>
        ))}
      {!failed &&
        plans
          .filter((plan) => plan.location === location)
          .slice(0, 12)
          .map((plan) => {
            const id = `staf-${plan.staff.id}`;
            return (
              <div
                className="cw-marker"
                key={id}
                ref={(node) => {
                  if (node) markerRefs.current.set(id, node);
                  else markerRefs.current.delete(id);
                }}
              >
                <Button
                  className={`cw-map-pin cw-person-pin ${selected === id ? 'is-selected' : ''}`}
                  onClick={() => onSelect(id)}
                  aria-label={`${plan.staff.data.title}: ${npcActivityNames[plan.activity]}`}
                >
                  <span>{String(plan.staff.data.title)}</span>
                  {selected === id && (
                    <em className="cw-pin-status">{npcActivityNames[plan.activity]}</em>
                  )}
                </Button>
              </div>
            );
          })}
      {!failed && (
        <div
          className="cw-marker cw-character-marker"
          ref={(node) => {
            if (node) markerRefs.current.set('karakter', node);
          }}
        >
          {(selected === 'karakter' || bubbleOpen) && (
            <div className="cw-speech" role="status">
              {bubble}
            </div>
          )}
          <Button
            className="cw-character-pin"
            aria-label="Ajak maskot berbicara"
            onClick={() => onSelect('karakter')}
          >
            <MessageCircle size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
