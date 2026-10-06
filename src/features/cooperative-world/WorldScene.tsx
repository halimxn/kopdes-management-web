'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Building2, Plus, MessageCircle, MapPin, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { animateCharacter, createCharacter } from './objects/characters';
import { createExterior } from './objects/exterior';
import { createInterior } from './objects/office';
import { disposeSharedResources, mergeStatic, palette } from './objects/primitives';
import {
  cameraSpan,
  characterSpots,
  officePosition,
  officeSize,
  warehouse,
  worldStations,
} from './layout';
import { getLighting } from './lighting';
import {
  qualitySettings,
  readDeviceHints,
  resolveQuality,
  type QualityChoice,
} from './render-quality';
import type { CharacterActivity, WorldLocation, WorldModel, WorldPreferences } from './world-model';

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
  zoom: number;
  rotation: number;
  selected: string;
  bubble: string;
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
  zoom,
  rotation,
  selected,
  bubble,
  onSelect,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  // Komponen ini hanya dirender di browser, sehingga petunjuk perangkat aman dibaca di sini.
  const tier = useMemo(() => resolveQuality(quality, readDeviceHints()), [quality]);
  const markerRefs = useRef(new Map<string, HTMLDivElement>());
  const runtime = useRef<{ camera: THREE.OrthographicCamera; controls: OrbitControls } | null>(
    null,
  );
  const motion = useRef({ activity, weather, hour });
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
    runtime.current = { camera, controls };
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
    if (location === 'luar') createExterior(world, model);
    else {
      createInterior(world);
      mergeStatic(world);
    }
    const color = { biru: palette.blue, lavender: '#a18ae0', hijau: '#51aa8a' }[outfit];
    const spots = characterSpots[location];
    const characters = [
      createCharacter(world, spots[0], color),
      createCharacter(world, spots[1], '#a18ae0', 1),
      createCharacter(world, spots[2], '#50ab90', 2),
    ];
    characters.forEach((character) => {
      character.group.userData.selection = 'karakter';
    });
    if (location === 'dalam') {
      characters[0].group.rotation.y = Math.PI;
      characters[1].group.rotation.y = Math.PI;
      characters[2].group.rotation.y = Math.PI;
    }
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
      camera.left = -span * aspect;
      camera.right = span * aspect;
      camera.top = span;
      camera.bottom = -span;
      camera.updateProjectionMatrix();
    };
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
      model.plots.forEach((plot) =>
        positions.set(
          plot.id,
          new THREE.Vector3(plot.position[0], plot.unit ? 3.1 : 0.6, plot.position[1]),
        ),
      );
    } else
      worldStations.forEach((station) =>
        positions.set(station.id, new THREE.Vector3(station.position[0], 2.2, station.position[2])),
      );
    const draw = (stamp: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden || stamp - previous < settings.frameInterval) return;
      elapsed += Math.min((stamp - previous) / 1000, 0.06);
      previous = stamp;
      if (view.current.moving) {
        readGoal();
        const k = reduced.matches ? 1 : 0.14;
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
      characters.forEach((character, index) => {
        const mode =
          location === 'luar'
            ? 'idle'
            : index === 0
              ? state.activity === 'meeting'
                ? 'meeting'
                : 'idle'
              : index === 1
                ? state.activity === 'work'
                  ? 'work'
                  : 'idle'
                : state.activity === 'gym'
                  ? 'gym'
                  : 'idle';
        animateCharacter(character, elapsed + index * 2, mode, reduced.matches);
      });
      positions.set(
        'karakter',
        characters[0].group.position.clone().add(new THREE.Vector3(0, 2.4, 0)),
      );
      for (const [id, position] of positions) {
        const marker = markerRefs.current.get(id);
        if (!marker) continue;
        projected.copy(position).project(camera);
        marker.style.left = `${(projected.x * 0.5 + 0.5) * node.clientWidth}px`;
        marker.style.top = `${(-projected.y * 0.5 + 0.5) * node.clientHeight}px`;
        marker.style.visibility =
          Math.abs(projected.x) > 1.05 || Math.abs(projected.y) > 1.05 ? 'hidden' : 'visible';
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
  const markers =
    location === 'luar'
      ? [
          { id: 'koperasi', label: 'Kantor koperasi', occupied: true },
          { id: 'gudang', label: 'Gudang koperasi', occupied: true },
          ...model.plots.map((plot, i) => ({
            id: plot.id,
            label: plot.unit
              ? String(plot.unit.data.title)
              : `Lahan ${String(i + 1).padStart(2, '0')}`,
            occupied: Boolean(plot.unit),
          })),
        ]
      : worldStations.map((station) => ({ id: station.id, label: station.title, occupied: true }));
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
              className={`cw-map-pin ${selected === marker.id ? 'is-selected' : ''} ${!marker.occupied ? 'is-empty' : ''}`}
              onClick={() => onSelect(marker.id)}
              aria-label={marker.id === 'koperasi' ? 'Masuk kantor koperasi' : marker.label}
            >
              {marker.id === 'koperasi' ? (
                <Building2 size={16} />
              ) : marker.id === 'gudang' ? (
                <Warehouse size={16} />
              ) : marker.occupied ? (
                <MapPin size={14} />
              ) : (
                <Plus size={14} />
              )}
              <span>{marker.label}</span>
            </Button>
          </div>
        ))}
      {!failed && (
        <div
          className="cw-marker cw-character-marker"
          ref={(node) => {
            if (node) markerRefs.current.set('karakter', node);
          }}
        >
          {selected === 'karakter' && (
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
