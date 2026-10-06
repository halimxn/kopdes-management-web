'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { Building2, Plus, MapPin, Truck, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { animateCharacter, createCharacter } from './objects/characters';
import { cityGround, createExterior, createNightLights } from './objects/exterior';
import { createInterior } from './objects/office';
import { disposeSharedResources, mergeStatic, palette } from './objects/primitives';
import {
  cameraSpan,
  characterSpots,
  officePosition,
  officeInterior,
  officeSize,
  park,
  warehouse,
  coldInterior,
  shopInterior,
  warehouseInterior,
  worldStations,
  yardForkliftPath,
  minWorldZoom,
} from './layout';
import { dayPhase, getLighting } from './lighting';
import {
  qualitySettings,
  readDeviceHints,
  resolveQuality,
  type QualityChoice,
} from './render-quality';
import {
  coldRackIds,
  isBelowMinimum,
  rackIds,
  roomKind,
  type CharacterActivity,
  type WorldLocation,
  type WorldModel,
  type WorldPreferences,
} from './world-model';
import { createWarehouseInterior } from './objects/warehouse-interior';
import { createColdStorageInterior } from './objects/cold-storage-interior';
import { createShopInterior } from './objects/shop-interior';
import { briefingSpot, createNpcs, updateNpcs, walkToward } from './npc/movement';
import { npcActivityNames, type ManagerPlan, type NpcPlan } from './npc/schedule';
import type { CharacterPose } from './objects/characters';
import {
  createAmbientCars,
  createTrucks,
  createYardForklift,
  placeOnCurve,
  roundedPath,
  type AmbientCar,
  type TruckActor,
} from './objects/vehicles';
import { pathPose, truckArrival, truckPose, truckRoute } from './truck-routes';
import { createSelectionBox, disposeGroup } from './objects/highlight';
import { createRoute } from './objects/route';

/** ID objek yang bergerak sendiri: forklift dan kendaraan suasana, karakter Tim, maskot. */
const movingSelection = /^(forklift-suasana|kendaraan-suasana|staf-|karakter$)/;

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
  /** Rencana kegiatan karakter Tim (dihitung ulang tiap menit tanpa membangun ulang scene). */
  plans: NpcPlan[];
  managerPlan: ManagerPlan;
  onSelect: (id: string) => void;
  /** Pratinjau desain development: truk contoh selalu diperagakan datang. */
  preview?: boolean;
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
  plans,
  managerPlan,
  onSelect,
  preview = false,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  // Komponen ini hanya dirender di browser, sehingga petunjuk perangkat aman dibaca di sini.
  const tier = useMemo(() => resolveQuality(quality, readDeviceHints()), [quality]);
  const markerRefs = useRef(new Map<string, HTMLDivElement>());
  /** Pin tujuan rute truk terpilih; dianimasikan naik-turun di loop gambar. */
  const routePin = useRef<THREE.Object3D | null>(null);
  /** Kamera sedang mengikuti objek bergerak terpilih; posisi terakhir untuk mendeteksi lompatan. */
  const cameraFollow = useRef(false);
  const lastFollow = useRef(new THREE.Vector3(Number.NaN, 0, 0));
  /** Penunjuk terpilih dan objek yang diikutinya (lihat efek kotak sorot). */
  const followed = useRef<{
    box: THREE.Object3D;
    target: THREE.Object3D;
    anchor: THREE.Vector3;
    turn: number;
  } | null>(null);
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
    const room = roomKind(location);
    const shopPlot =
      room === 'gerai' ? model.plots.find((plot) => plot.id === location.slice(6)) : undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        // Hanya development: tangkapan layar QA dapat membaca isi kanvas.
        preserveDrawingBuffer: process.env.NODE_ENV === 'development',
      });
    } catch {
      const failureFrame = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(failureFrame);
    }
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = settings.shadows;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral menjaga rona biru-pastel video; ACES memudarkan warna ke abu-abu.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.imageRendering = 'pixelated';
    renderer.domElement.setAttribute(
      'aria-label',
      location === 'luar'
        ? 'Lingkungan koperasi 3D. Geser untuk memutar, cubit untuk memperbesar.'
        : location === 'gudang'
          ? 'Interior gudang 3D. Pilih rak melalui penanda atau daftar.'
          : location === 'pendingin'
            ? 'Interior cold storage 3D. Pilih rak pendingin melalui penanda atau daftar.'
            : room === 'gerai'
              ? 'Interior gerai 3D. Pilih rak atau loket melalui penanda.'
              : 'Interior koperasi 3D. Pilih meja melalui penanda atau panel.',
    );
    node.prepend(renderer.domElement);
    // Hanya development: memeriksa anggaran draw call dari konsol (window.__cwRenderInfo).
    if (process.env.NODE_ENV === 'development')
      (window as Window & { __cwRenderInfo?: THREE.WebGLInfo }).__cwRenderInfo = renderer.info;
    const scene = new THREE.Scene();
    const background = new THREE.Color('#eef3fc');
    scene.background = background;
    // Kawasan: tanah kompak memudar lembut ke warna langit.
    const fog = location === 'luar' ? new THREE.Fog(background, 85, 140) : null;
    scene.fog = fog;
    const camera = new THREE.OrthographicCamera(-20, 20, 14, -14, 1, 420);
    const cameraOffset = (turn: number) =>
      // Kamera ortografis dijauhkan (sudut sama) agar tanah di tepi bawah tidak terpotong bidang dekat saat zoom keluar.
      new THREE.Vector3(Math.sin(Math.PI / 4 + turn) * 78, 69, Math.cos(Math.PI / 4 + turn) * 78);
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
    controls.minZoom = location === 'luar' ? minWorldZoom : 0.35;
    controls.maxZoom = 2.8;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = 1.18;
    controls.enablePan = true;
    controls.maxTargetRadius = location === 'luar' ? 55 : 10;
    // Cahaya bawah biru memberi sisi bayangan berona biru seperti video (bukan abu-abu).
    const ambient = new THREE.HemisphereLight('#f5f9ff', '#8fa3d8', 2.2);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight('#fff7e8', 3.8);
    sun.castShadow = settings.shadows;
    if (settings.shadows) sun.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
    // Komplek kompak: bayangan terpusat pada area kavling aktif.
    const shadowExtent = location === 'luar' ? 36 : 22;
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
    scene.add(sun, sun.target);
    const sunOffset = new THREE.Vector3(-14, 28, 14);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(360, 360),
      new THREE.MeshStandardMaterial({
        color: location === 'luar' ? cityGround : '#eef3fc',
        roughness: 1,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    // Sedikit di bawah tanah kota (puncak −0,08) dan berwarna sama agar sambungannya tak terlihat.
    floor.position.y = location === 'luar' ? -0.1 : -0.4;
    floor.receiveShadow = true;
    scene.add(floor);
    const world = new THREE.Group();
    scene.add(world);
    let cars: AmbientCar[] = [];
    const arrivals: (TruckActor & {
      drive: THREE.CurvePath<THREE.Vector3>;
      reverse: THREE.CurvePath<THREE.Vector3> | null;
      time: number;
      done: boolean;
    })[] = [];
    let yardForklift: THREE.Group | null = null;
    let nightLights: THREE.Object3D | null = null;
    if (location === 'luar') {
      createExterior(world, model);
      // Truk beranimasi datang bila statusnya baru berubah (≤ 15 menit) atau di pratinjau desain.
      const fresh = Date.now() - 15 * 60000;
      for (const actor of createTrucks(world, model.trucks)) {
        const recent = Date.parse(actor.spot.delivery.updated_at) >= fresh;
        if (!recent && !preview) continue;
        const path = truckArrival(actor.spot, model.trucks);
        arrivals.push({
          ...actor,
          drive: roundedPath(path.drive, 3.5),
          reverse: path.reverse.length ? roundedPath(path.reverse, 3.2) : null,
          time: -arrivals.length * 2.2,
          done: false,
        });
      }
      nightLights = createNightLights(world);
      cars = createAmbientCars(world);
      yardForklift = createYardForklift(world);
    }
    if (location === 'gudang') createWarehouseInterior(world, model.inventory);
    if (location === 'pendingin') createColdStorageInterior(world, model.inventory);
    // Gerai: barang berkolom Gerai = gerai ini mengisi rak/lemari.
    if (shopPlot)
      createShopInterior(
        world,
        shopPlot.building.style,
        shopPlot.id,
        model.inventory.atUnits.filter((item) => item.data.unit_id === shopPlot.unit?.id),
      );
    if (location === 'dalam') {
      createInterior(world);
      mergeStatic(world);
    }
    const color = { biru: palette.blue, lavender: '#a18ae0', hijau: '#51aa8a' }[outfit];
    const spots = characterSpots[roomKind(location)];
    // Maskot manajer; karakter Tim berasal dari catatan Tim (tidak ada karakter karangan).
    const manager = createCharacter(world, spots[0], color);
    manager.group.userData.selection = 'karakter';
    const allNpcs = createNpcs(world, model.staff);
    // Staf Tim gerai yang dimasuki berdiri di balik loket (maks. tiga); sisanya tetap terjadwal.
    const pinned = shopPlot?.unit
      ? allNpcs
          .filter(
            (actor) =>
              model.staff.find((row) => row.id === actor.id)?.data.unit_id === shopPlot.unit?.id,
          )
          .slice(0, shopInterior.staff.length)
      : [];
    pinned.forEach((actor, index) => {
      const [x, z] = shopInterior.staff[index];
      actor.character.base.set(x, 0.1, z);
      actor.character.group.position.copy(actor.character.base);
      actor.character.group.rotation.y = 0;
      actor.character.group.visible = true;
    });
    const npcs = allNpcs.filter((actor) => !pinned.includes(actor));
    let npcSnap = true;
    const talk = { key: '', since: 0 };
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
    const quaternion = new THREE.Quaternion();
    const shift = new THREE.Vector3();
    // Geser/putar/zoom oleh pengguna menghentikan kamera mengikuti objek.
    const stopFollow = () => {
      cameraFollow.current = false;
    };
    controls.addEventListener('start', stopFollow);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0,
      previous = 0,
      elapsed = 0,
      disposed = false;
    // Ambient occlusion (GTAO) di kawasan kualitas Tinggi: sudut, celah dan kaki bangunan
    // menggelap lembut sehingga objek tidak tampak datar. Kualitas lain memakai render biasa.
    let composer: EffectComposer | null = null;
    if (settings.ambientOcclusion && location === 'luar') {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const ao = new GTAOPass(scene, camera, node.clientWidth || 1, node.clientHeight || 1);
      ao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.6, thickness: 1.2, scale: 1 });
      ao.blendIntensity = 0.85;
      composer.addPass(ao);
      composer.addPass(new OutputPass());
    }
    const resize = () => {
      const { width, height } = node.getBoundingClientRect();
      if (!width || !height) return;
      const scale = settings.downsampleScale ?? 0.5;
      const renderW = Math.max(320, Math.floor(width * scale));
      const renderH = Math.max(180, Math.floor(height * scale));
      renderer.setPixelRatio(1);
      renderer.setSize(renderW, renderH, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.imageRendering = 'pixelated';
      composer?.setSize(renderW, renderH);
      const aspect = width / height;
      const span = cameraSpan[roomKind(location)][aspect < 1 ? 'portrait' : 'landscape'];
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
        new THREE.Vector3(
          warehouse.center[0],
          warehouse.size[1] + warehouse.roofRise + 1.6,
          warehouse.center[1],
        ),
      );
      positions.set(
        'papan',
        new THREE.Vector3(park.center[0] + 5, 3.4, park.center[1] - park.size[1] / 2 + 0.6),
      );
      for (const spot of model.trucks) {
        const [x, z] = truckPose(spot);
        positions.set(`kirim-${spot.delivery.id}`, new THREE.Vector3(x, 4.3, z));
      }
      model.plots.forEach((plot) =>
        positions.set(
          plot.id,
          new THREE.Vector3(
            plot.position[0],
            plot.unit ? plot.building.height + 1.6 : 0.9,
            plot.position[1],
          ),
        ),
      );
    } else if (location === 'pendingin') {
      for (const id of coldRackIds) {
        const [x, z] = coldInterior.racks[id];
        positions.set(`rak-${id}`, new THREE.Vector3(x, coldInterior.rackSize[1] + 0.7, z));
      }
    } else if (shopPlot) {
      positions.set(
        shopPlot.id,
        new THREE.Vector3(shopInterior.counter[0], 2.2, shopInterior.counter[1]),
      );
      if (['toko', 'apotek'].includes(shopPlot.building.style))
        positions.set(`isi-${shopPlot.id}`, new THREE.Vector3(0, 3.1, -3.9));
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
        const k = reduced.matches ? 1 : 1 - Math.exp(-Math.min(delta, 0.5) * 4.5);
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
      if (location === 'luar') {
        sun.target.position.copy(controls.target);
        sun.position.copy(controls.target).add(sunOffset);
      }
      const state = motion.current,
        light = getLighting(state.hour, state.weather);
      background.set(light.sky);
      if (fog) fog.color.set(light.sky);
      else (floor.material as THREE.MeshStandardMaterial).color.set(light.sky);
      ambient.intensity = light.ambient;
      sun.intensity = light.sun;
      sun.color.set(light.sunColor);
      renderer.toneMappingExposure = light.exposure;
      if (nightLights) nightLights.visible = dayPhase(state.hour) === 'malam';
      // Manajer: rapat/gym dari aktivitas; selain itu mengikuti rencana (briefing, meja staf, dok).
      const boss = bossPlan.current;
      const [rx, rz] = officeInterior.manager;
      // Percakapan manajer: dengan staf yang didatangi di mejanya, atau dengan sopir di dok.
      let talkKey = '';
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
          talkKey = `staf-${visit.id}`;
        } else if (state.activity === 'work') goal = [rx, rz + 1, Math.PI, 'desk'];
      } else if (location === 'luar') {
        const front = warehouse.center[1] + warehouse.size[2] / 2;
        if (boss.kind === 'dok') talkKey = 'dok';
        goal =
          boss.kind === 'dok'
            ? [warehouse.docks[0] - 2.4, front + 1.6, Math.PI / 2, 'idle']
            : [spots[0][0], spots[0][2], 0, 'idle'];
      } else if (location === 'gudang') {
        const [sx, sz] = warehouseInterior.staging;
        goal = [sx + 2.4, sz - 1, -Math.PI / 2, 'idle'];
      } else goal = [spots[0][0], spots[0][2], Math.PI * 0.85, 'idle'];
      if (npcSnap || reduced.matches) manager.base.set(goal[0], manager.base.y, goal[1]);
      const arrived =
        npcSnap || reduced.matches || walkToward(manager, goal[0], goal[1], Math.min(delta, 0.25));
      if (arrived) manager.group.rotation.y = goal[2];
      manager.base.y = arrived && goal[3] === 'gym' ? 0.3 : 0.1;
      animateCharacter(manager, elapsed, arrived ? goal[3] : 'walk', reduced.matches);
      // Bubble "…" 4 detik setiap kali manajer tiba di lawan bicara baru.
      const talkNow = arrived && !npcSnap ? talkKey : '';
      if (talkNow !== talk.key) {
        talk.key = talkNow;
        talk.since = elapsed;
      }
      const talking = Boolean(talk.key) && !reduced.matches && elapsed - talk.since < 4;
      markerRefs.current.get('karakter')?.classList.toggle('is-chatting', talking);
      positions.set('karakter', manager.group.position.clone().add(new THREE.Vector3(0, 2.4, 0)));
      for (const actor of pinned)
        animateCharacter(actor.character, elapsed, 'idle', reduced.matches);
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
          ?.classList.toggle(
            'is-chatting',
            chatting.has(actor.id) || (talking && talk.key === `staf-${actor.id}`),
          );
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
          car.distance = (car.distance + car.speed * Math.min(delta, 0.06)) % car.length;
          placeOnCurve(car.group, car.curve, car.distance / car.length);
        }
      // Truk yang baru tiba: maju lewat gerbang, berhenti sejenak, lalu mundur berbelok ke dok.
      for (const arrival of arrivals) {
        if (arrival.done) continue;
        const step = reduced.matches ? 1e6 : Math.min(delta, 0.06);
        arrival.time += step;
        const driveTime = arrival.drive.getLength() / 12;
        const reverseTime = arrival.reverse ? arrival.reverse.getLength() / 3.2 : 0;
        const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, t), 2.2);
        if (arrival.time < driveTime)
          placeOnCurve(arrival.group, arrival.drive, ease(arrival.time / driveTime));
        else if (arrival.reverse && arrival.time < driveTime + 0.7)
          placeOnCurve(arrival.group, arrival.drive, 1);
        else if (arrival.reverse && arrival.time < driveTime + 0.7 + reverseTime)
          placeOnCurve(
            arrival.group,
            arrival.reverse,
            ease((arrival.time - driveTime - 0.7) / reverseTime),
            true,
          );
        else {
          const [x, z] = truckPose(arrival.spot);
          arrival.group.position.set(x, 0, z);
          arrival.group.rotation.y = 0;
          arrival.done = true;
        }
        positions.set(
          `kirim-${arrival.spot.delivery.id}`,
          arrival.group.position.clone().add(new THREE.Vector3(0, 4.3, 0)),
        );
      }
      // Forklift suasana bolak-balik staging → rak luar; diam di titik awal saat gerak minimal.
      if (yardForklift) {
        const pose = pathPose(yardForkliftPath, reduced.matches ? 0 : elapsed, 1.6, 1.8);
        yardForklift.position.set(pose.x, 0, pose.z);
        yardForklift.rotation.y = pose.angle;
      }
      const follow = followed.current;
      if (follow) {
        follow.target.updateWorldMatrix(true, false);
        follow.box.position.copy(follow.target.localToWorld(follow.anchor.clone()));
        follow.box.rotation.y =
          new THREE.Euler().setFromQuaternion(follow.target.getWorldQuaternion(quaternion), 'YXZ')
            .y - follow.turn;
        follow.box.visible = follow.target.visible;
        if (cameraFollow.current && follow.box.visible) {
          const at = follow.box.position;
          // Kendaraan yang melompat ke ujung jalan lain: berhenti mengikuti, jangan ikut melompat.
          // Di luar radius fokus OrbitControls kamera juga berhenti agar sudut pandang tidak bergeser.
          if (
            (!Number.isNaN(lastFollow.current.x) && lastFollow.current.distanceTo(at) > 8) ||
            Math.hypot(at.x, at.z) > controls.maxTargetRadius - 1
          )
            cameraFollow.current = false;
          lastFollow.current.copy(at);
          if (cameraFollow.current) {
            const k = reduced.matches ? 1 : 1 - Math.exp(-Math.min(delta, 0.5) * 4);
            shift.set((at.x - controls.target.x) * k, 0, (at.z - controls.target.z) * k);
            controls.target.add(shift);
            camera.position.add(shift);
          }
        }
      }
      const pin = routePin.current;
      if (pin) pin.position.y = reduced.matches ? 0 : Math.sin(elapsed * 2.4) * 0.15;
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
      if (composer) composer.render();
      else renderer.render(scene, camera);
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
      controls.removeEventListener('start', stopFollow);
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
      composer?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // The scene is rebuilt only when its geometry/data changes; animation settings use motion.current.
  }, [location, model, outfit, tier, preview]);
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
    const highlight = createSelectionBox(new THREE.Box3().setFromObject(target));
    world.add(highlight);
    // Penunjuk diikat ke objek: posisi relatif disimpan di ruang lokal objek lalu diperbarui
    // tiap frame, sehingga ikut forklift, kendaraan, karakter yang berjalan, dan peta yang digeser.
    const turn = new THREE.Euler().setFromQuaternion(
      target.getWorldQuaternion(new THREE.Quaternion()),
      'YXZ',
    ).y;
    followed.current = {
      box: highlight,
      target,
      anchor: target.worldToLocal(highlight.position.clone()),
      turn,
    };
    // Objek bergerak yang dipilih diikuti kamera sampai pengguna menggerakkan kamera sendiri.
    cameraFollow.current = movingSelection.test(selected);
    lastFollow.current.set(Number.NaN, 0, 0);
    // Truk terpilih menampilkan rute seperti video: jalur dilalui, sisa jalur dan dok tujuan.
    const spot =
      location === 'luar'
        ? model.trucks.find((row) => `kirim-${row.delivery.id}` === selected)
        : undefined;
    const route = spot ? createRoute(world, truckRoute(spot, model.trucks)) : null;
    routePin.current = (route?.userData.pin as THREE.Object3D | undefined) || null;
    return () => {
      disposeGroup(highlight);
      followed.current = null;
      if (route) disposeGroup(route);
      routePin.current = null;
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
    location === 'pendingin'
      ? coldRackIds.map((id) => {
          const items = model.inventory.coldRacks[id];
          const lowItems = items.filter(isBelowMinimum).length;
          return {
            id: `rak-${id}`,
            label: `Rak ${id}`,
            occupied: items.length > 0,
            status: lowItems ? `${lowItems} di bawah minimum` : `${items.length} barang`,
            alert: lowItems > 0,
          };
        })
      : location.startsWith('gerai:')
        ? model.plots
            .filter((plot) => `gerai:${plot.id}` === location)
            .flatMap((plot) => [
              {
                id: plot.id,
                label:
                  plot.building.style === 'klinik'
                    ? 'Pendaftaran'
                    : plot.building.style === 'loket'
                      ? 'Loket layanan'
                      : 'Kasir',
                occupied: true,
                status: String(plot.unit?.data.status || ''),
              },
              ...(['toko', 'apotek'].includes(plot.building.style)
                ? [
                    {
                      id: `isi-${plot.id}`,
                      label: plot.building.style === 'apotek' ? 'Lemari obat' : 'Rak barang',
                      occupied: true,
                      status: `${model.inventory.atUnits.filter((item) => item.data.unit_id === plot.unit?.id).length} barang`,
                    },
                  ]
                : []),
            ])
        : location === 'gudang'
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
                {
                  id: 'papan',
                  label: 'Papan pengumuman',
                  occupied: true,
                  status: `${model.notices.decisions.length + model.notices.documents.length} info`,
                  alert: model.notices.documents.length > 0,
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
        // Tanpa tombol di atas kepala (keputusan pemilik); maskot dipilih dengan klik badannya.
        // Penanda ini hanya menampung bubble percakapan "…".
        <div
          className="cw-marker cw-manager-marker"
          aria-hidden="true"
          ref={(node) => {
            if (node) markerRefs.current.set('karakter', node);
          }}
        />
      )}
    </div>
  );
}
