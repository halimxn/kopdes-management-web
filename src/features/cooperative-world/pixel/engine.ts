import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
  TextureStyle,
  TilingSprite,
  type FederatedPointerEvent,
} from 'pixi.js';
import type { WorldZone } from '../layout';
import { clampCamera, followStep, pixelScale, viewCenter, zoomForStep, type View } from './camera';
import {
  TILE,
  WORLD,
  areas,
  blockedGrid,
  boxCenter,
  bridges,
  buildingBounds,
  buildingFor,
  grid,
  houses,
  mapBuildings,
  pixelZones,
  river,
  riverCenter,
  roads,
  trees,
  villageLanes,
  SPRITE_MARGIN,
  TREE_SIZES,
  type Box,
  type MapBuilding,
} from './map';
import { findPath, type Cell } from './path';
import { drawPixelText, pixelTextWidth } from './pixel-font';
import { gradeCss, gradeHex } from './grade';

export type StageState = {
  selected: string;
  location: string;
  zone: WorldZone;
  zoom: number;
  recenter: number;
  occlusion: { right: number; top: number; bottom: number };
  control: boolean;
  night: boolean;
};
export type StageCallbacks = {
  onSelect: (id: string) => void;
  onZoom: (zoom: number) => void;
  onControl: (control: boolean) => void;
};
export type WorldHandle = { update: (state: StageState) => void; destroy: () => void };

const OL = 0x3a2f36;

const spriteUrl = (dir: string, name: string) => `/dunia/${dir}/${name}.png`;
/** Muat tekstur; berkas yang tidak ada (mis. pohon tanpa lapisan malam) menjadi null. */
async function loadTextures(urls: string[]) {
  const results = await Promise.allSettled(urls.map((url) => Assets.load<Texture>(url)));
  const map = new Map<string, Texture>();
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') map.set(urls[i], r.value);
  });
  return map;
}
const treeSize = (r: number) =>
  TREE_SIZES.reduce(
    (best, size) => (Math.abs(size - r) < Math.abs(best - r) ? size : best),
    TREE_SIZES[0],
  );
const hex = (c: string) => parseInt(c.slice(1), 16);
function shadeHex(c: string, f: number) {
  const n = hex(c);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Tekstur noise kecil yang diulang (rumput, aspal, beton) agar tanah tidak datar. */
function noiseTexture(colors: string[], seed: number, size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  return Texture.from(canvas);
}

function tiled(texture: Texture, box: Box) {
  const sprite = new TilingSprite({ texture, width: box.w, height: box.h });
  sprite.position.set(box.x, box.y);
  return sprite;
}

/** Label area digambar di lapisan teratas agar tidak tertutup bangunan atau pohon. */
function drawAreaLabels() {
  const labels = new Graphics();
  for (const a of areas)
    if (a.label) {
      const w = pixelTextWidth(a.label, 2) + 12;
      labels
        .rect(a.box.x + a.box.w / 2 - w / 2, a.box.y - 8, w, 18)
        .fill(gradeHex('#f6efd8'))
        .stroke({ width: 2, color: OL });
      drawPixelText(labels, a.label, a.box.x + a.box.w / 2 - w / 2 + 6, a.box.y - 4, OL, 2);
    }
  return labels;
}

function drawGround(layer: Container) {
  const grass = noiseTexture(
    [
      gradeCss('#7f9550'),
      gradeCss('#879c58'),
      gradeCss('#76894a'),
      gradeCss('#8fa35e'),
      gradeCss('#7f9550'),
    ],
    7,
  );
  const asphalt = noiseTexture(
    [gradeCss('#6a6560'), gradeCss('#6f6a64'), gradeCss('#65605b'), gradeCss('#74706a')],
    11,
  );
  const pave = noiseTexture([gradeCss('#b5a685'), gradeCss('#ad9f80'), gradeCss('#bcae8c')], 13);
  const concrete = noiseTexture(
    [gradeCss('#a3a08f'), gradeCss('#a9a694'), gradeCss('#9c9988')],
    17,
  );
  layer.addChild(tiled(grass, { x: 0, y: 0, w: WORLD.w, h: WORLD.h }));
  const g = new Graphics();
  for (const a of areas) {
    const { x, y, w, h } = a.box;
    if (a.kind === 'sawah') {
      g.rect(x, y, w, h).fill(gradeHex('#6f8a4a'));
      for (let r = y + 6; r < y + h; r += 10) g.rect(x + 4, r, w - 8, 3).fill(gradeHex('#8fae5e'));
      for (let c = x + 120; c < x + w; c += 130) g.rect(c, y, 6, h).fill(gradeHex('#8a7a56'));
    } else if (a.kind === 'kebun') {
      g.rect(x, y, w, h).fill(gradeHex('#6a8044'));
      for (let r = y + 12; r < y + h; r += 24)
        for (let c = x + 12; c < x + w; c += 24) g.circle(c, r, 7).fill(gradeHex('#557540'));
    } else if (a.kind === 'alun' || a.kind === 'taman') {
      layer.addChild(tiled(pave, a.box));
      g.rect(x + 20, y + 20, w - 40, h - 40).fill(
        a.kind === 'alun' ? gradeHex('#7a9550') : gradeHex('#86a05a'),
      );
      g.rect(x + w / 2 - 20, y, 40, h).fill(gradeHex('#b5a685'));
      g.rect(x, y + h / 2 - 20, w, 40).fill(gradeHex('#b5a685'));
    } else if (a.kind === 'pasar') {
      layer.addChild(tiled(pave, a.box));
    } else if (a.kind === 'pool' || a.kind === 'dok') {
      layer.addChild(tiled(concrete, a.box));
      if (a.kind === 'pool')
        for (let c = x + 20; c < x + w; c += 70)
          g.rect(c, y + 20, 3, h - 40).fill(gradeHex('#e3bd57'));
    } else if (a.kind === 'rencana') {
      for (let i = 0; i < w; i += 12) {
        g.rect(x + i, y, 6, 2).fill(gradeHex('#ece2c2'));
        g.rect(x + i, y + h - 2, 6, 2).fill(gradeHex('#ece2c2'));
      }
    }
  }
  layer.addChild(g);
  for (const lane of villageLanes) layer.addChild(tiled(pave, lane));
  for (const road of roads) layer.addChild(tiled(asphalt, road));
  const marks = new Graphics();
  for (const road of roads) {
    if (road.w > road.h)
      for (let x = road.x + 10; x < road.x + road.w; x += 48)
        marks.rect(x, road.y + road.h / 2 - 1, 24, 3).fill(gradeHex('#ece2c2'));
    else
      for (let y = road.y + 10; y < road.y + road.h; y += 48)
        marks.rect(road.x + road.w / 2 - 1, y, 3, 24).fill(gradeHex('#ece2c2'));
  }
  for (let i = 0; i < 7; i++) marks.rect(960 + i * 12, 704, 6, 56).fill(gradeHex('#ece2c2'));
  const water = new Graphics();
  for (let y = 0; y < WORLD.h; y += 4) {
    const cx = riverCenter(y);
    water.rect(cx - river.width / 2 - 6, y, river.width + 12, 4).fill(gradeHex('#6f8a4a'));
    water
      .rect(cx - river.width / 2, y, river.width, 4)
      .fill(y % 24 < 4 ? gradeHex('#8fb4c0') : gradeHex('#5f8fa0'));
  }
  for (const b of bridges) {
    water.rect(b.x, b.y, b.w, b.h).fill(gradeHex('#956847')).stroke({ width: 2, color: OL });
    for (let x = b.x + 6; x < b.x + b.w; x += 10)
      water.rect(x, b.y + 2, 2, b.h - 4).fill(gradeHex('#6b4a34'));
  }
  water.circle(930, 1040, 44).fill(gradeHex('#d0c8b8')).stroke({ width: 3, color: OL });
  water.circle(930, 1040, 36).fill(gradeHex('#6fa7c0'));
  layer.addChild(water, marks);
  return drawAreaLabels();
}

/** Bangunan greybox bergaya pixel: atap, fasad, jendela, pintu, papan nama. Aset final di P3. */
function drawBuilding(b: MapBuilding) {
  const g = new Graphics();
  const { x, y, w, h } = b.foot;
  const top = y + h - b.height;
  g.rect(x + 8, y + h - 2, w + 4, 10).fill({ color: 0x1b2238, alpha: 0.22 });
  g.rect(x + w, top + 10, 10, b.height - 8).fill({ color: 0x1b2238, alpha: 0.18 });
  // atap (bidang atas) dengan garis genteng / seng
  g.rect(x - 4, y - b.height - 2, w + 8, h + 4)
    .fill(hex(b.roof))
    .stroke({ width: 2, color: OL });
  for (let r = y - b.height + 4; r < y + h - b.height; r += 6)
    g.rect(x - 3, r, w + 6, 1).fill(shadeHex(b.roof, 0.82));
  // fasad
  g.rect(x, top, w, b.height).fill(hex(b.wall)).stroke({ width: 2, color: OL });
  g.rect(x + 1, top + 1, w - 2, 3).fill(shadeHex(b.wall, 0.78));
  g.rect(x + 1, y + h - 6, w - 2, 5).fill(shadeHex(b.wall, 0.7));
  const door = b.style === 'gudang' || b.style === 'pendingin' ? 64 : b.style === 'rumah' ? 16 : 30;
  const doorH =
    b.style === 'rumah' ? 26 : b.style === 'gudang' || b.style === 'pendingin' ? 70 : 56;
  // jendela per lantai
  const floors = Math.max(1, Math.floor((b.height - doorH) / 44));
  for (let f = 0; f < floors; f++)
    for (let wx = x + 14; wx + 24 < x + w - 10; wx += 40) {
      const wy = top + 16 + f * 44;
      if (b.style === 'rumah' && f > 0) continue;
      g.rect(wx, wy, 24, 20).fill(0xf6efd8).stroke({ width: 2, color: OL });
      g.rect(wx + 3, wy + 3, 18, 14).fill(0x475b6e);
      g.rect(wx + 4, wy + 4, 6, 3).fill(0x8fb0bf);
    }
  const dx = x + w / 2 - door / 2;
  g.rect(dx, y + h - doorH, door, doorH)
    .fill(b.style === 'gudang' ? 0x5a4636 : 0x2d3746)
    .stroke({ width: 2, color: OL });
  if (b.style === 'gudang')
    for (let r = y + h - doorH + 4; r < y + h - doorH + 24; r += 3)
      g.rect(dx + 2, r, door - 4, 1).fill(0x9aa0a0);
  if (b.style === 'toko') {
    for (let i = 0; i < w; i += 10) g.rect(x + i, y + h - doorH - 14, 5, 10).fill(0xc2463a);
    g.rect(x, y + h - doorH - 14, w, 10).stroke({ width: 2, color: OL });
  }
  if (b.sign) {
    const tw = pixelTextWidth(b.sign, 2) + 12;
    const sx = x + w / 2 - tw / 2;
    const sy = top + (b.style === 'rumah' ? 4 : 8 + floors * 44 - 4);
    g.rect(sx, sy, tw, 18)
      .fill(b.id === 'kantor' ? 0xc2463a : 0xf6efd8)
      .stroke({ width: 2, color: OL });
    drawPixelText(g, b.sign, sx + 6, sy + 4, b.id === 'kantor' ? 0xf6efd8 : OL, 2);
  }
  return g;
}

function drawTree(x: number, y: number, r: number) {
  const g = new Graphics();
  g.ellipse(x + r * 0.5, y, r * 1.1, r * 0.35).fill({ color: 0x1b2238, alpha: 0.22 });
  g.rect(x - 4, y - r, 8, r)
    .fill(0x5c4535)
    .stroke({ width: 2, color: OL });
  const cy = y - r - r * 0.5;
  g.circle(x, cy, r + 2).fill(OL);
  g.circle(x, cy, r).fill(0x3d5a32);
  g.circle(x - r * 0.2, cy - r * 0.2, r * 0.75).fill(0x557540);
  g.circle(x - r * 0.35, cy - r * 0.4, r * 0.35).fill(0x8fae5e);
  return g;
}

/** Avatar manajer greybox (±28×56). Sprite final berpose dari generator di P4. */
function drawManager(g: Graphics, step: number, facing: 1 | -1) {
  g.clear();
  const leg = Math.round(Math.sin(step) * 3);
  g.ellipse(2, 0, 14, 4).fill({ color: 0x1b2238, alpha: 0.3 });
  g.rect(-8, -18 + Math.max(0, leg), 7, 18 - Math.max(0, leg))
    .fill(0x2e3442)
    .stroke({ width: 2, color: OL });
  g.rect(1, -18 + Math.max(0, -leg), 7, 18 - Math.max(0, -leg))
    .fill(0x2e3442)
    .stroke({ width: 2, color: OL });
  g.rect(-11, -40, 22, 24).fill(0x405d84).stroke({ width: 2, color: OL });
  g.rect(-2, -40, 4, 6).fill(0xf1ebd6);
  g.rect(-12, -56, 24, 18).fill(0xf0c39a).stroke({ width: 2, color: OL });
  g.rect(-12, -58, 24, 8).fill(0x2b2220);
  g.rect(facing > 0 ? 2 : -6, -49, 3, 4).fill(OL);
  g.rect(facing > 0 ? -5 : 3, -49, 3, 4).fill(OL);
}

export async function createWorld(
  host: HTMLElement,
  callbacks: StageCallbacks,
  initial: StageState,
): Promise<WorldHandle> {
  TextureStyle.defaultOptions.scaleMode = 'nearest';
  const app = new Application();
  await app.init({
    resizeTo: host,
    antialias: false,
    background: '#7f9550',
    roundPixels: true,
    resolution: 1,
  });
  host.appendChild(app.canvas);
  app.canvas.setAttribute('aria-hidden', 'true');

  let state = initial;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const world = new Container();
  const ground = new Container();
  const actors = new Container();
  actors.sortableChildren = true;
  const overlay = new Container();
  world.addChild(ground, actors, overlay);
  const night = new Graphics();
  // Lapisan cahaya malam (jendela, papan, kolam lampu) dicampur aditif di atas penggelapan.
  const glow = new Container();
  glow.blendMode = 'add';
  app.stage.addChild(world, night, glow);
  overlay.addChild(drawGround(ground));

  let tapGuard = false;
  const all = [...mapBuildings, ...houses];
  const treeName = (x: number, y: number, r: number) =>
    `pohon-${treeSize(r)}${(x + y) % 5 === 0 ? '-bunga' : ''}`;
  const urls = [
    ...new Set([
      ...all.flatMap((b) => [
        spriteUrl('bangunan', b.sprite || b.id),
        spriteUrl('bangunan', `${b.sprite || b.id}-malam`),
      ]),
      ...trees.map(([x, y, r]) => spriteUrl('pohon', treeName(x, y, r))),
    ]),
  ];
  const textures = await loadTextures(urls);
  const M = SPRITE_MARGIN;
  for (const b of all) {
    const name = b.sprite || b.id;
    const tex = textures.get(spriteUrl('bangunan', name));
    let g: Container;
    if (tex) {
      g = new Sprite(tex);
      g.position.set(b.foot.x - M, b.foot.y - b.height - M);
      const lit = textures.get(spriteUrl('bangunan', `${name}-malam`));
      if (lit) {
        const s = new Sprite(lit);
        s.position.copyFrom(g.position);
        glow.addChild(s);
      }
    } else g = drawBuilding(b);
    g.zIndex = b.foot.y + b.foot.h;
    if (b.style !== 'rumah') {
      const bounds = buildingBounds(b);
      g.eventMode = 'static';
      g.cursor = 'pointer';
      g.hitArea = tex
        ? new Rectangle(bounds.x - g.x, bounds.y - g.y, bounds.w, bounds.h)
        : new Rectangle(bounds.x, bounds.y, bounds.w, bounds.h);
      g.on('pointertap', () => {
        if (tapGuard) return;
        tapGuard = true;
        callbacks.onSelect(b.select === 'kawasan' ? 'kawasan' : b.select);
      });
    }
    actors.addChild(g);
  }
  for (const [x, y, r] of trees) {
    const tex = textures.get(spriteUrl('pohon', treeName(x, y, r)));
    let t: Container;
    if (tex) {
      t = new Sprite(tex);
      t.position.set(Math.round(x - tex.width / 2), Math.round(y - tex.height + 12));
    } else t = drawTree(x, y, r);
    t.zIndex = y;
    actors.addChild(t);
  }

  // avatar manajer dan jalurnya
  const blocked = blockedGrid();
  const avatar = new Graphics();
  const pos = { x: 790, y: 740 };
  let path: [number, number][] = [];
  let walkPhase = 0;
  let facing: 1 | -1 = 1;
  let idleTimer = 2;
  const wander: [number, number][] = [
    [700, 742],
    [930, 760],
    [1100, 742],
    [930, 900],
    [700, 760],
  ];
  let wanderIndex = 0;
  avatar.eventMode = 'static';
  avatar.cursor = 'pointer';
  avatar.hitArea = new Rectangle(-14, -60, 28, 62);
  avatar.on('pointertap', () => {
    tapGuard = true;
    callbacks.onSelect('karakter');
  });
  actors.addChild(avatar);
  const walkTo = (x: number, y: number) => {
    const cell = (px: number, py: number): Cell => [Math.floor(px / TILE), Math.floor(py / TILE)];
    const route = findPath(blocked, grid.cols, grid.rows, cell(pos.x, pos.y), cell(x, y));
    path = route ? route.slice(1).map(([c, r]) => [c * TILE + TILE / 2, r * TILE + TILE / 2]) : [];
  };
  const walkable = (x: number, y: number) => {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    return c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && !blocked[r * grid.cols + c];
  };

  // penanda siku objek terpilih
  const marker = new Graphics();
  overlay.addChild(marker);

  // kamera
  const camera: [number, number] = [...pixelZones[initial.zone].center];
  let following = true;
  let lastRecenter = initial.recenter;
  let lastSelected = initial.selected;
  const view = (): View => ({
    width: app.screen.width,
    height: app.screen.height,
    ...state.occlusion,
  });
  const target = (): [number, number] => {
    if (state.selected === 'karakter') return [pos.x, pos.y - 28];
    const b = buildingFor(state.selected, state.location);
    if (b) return boxCenter(buildingBounds(b));
    return pixelZones[state.zone].center;
  };

  // masukan: geser, cubit, gulir, ketuk tanah, WASD
  const pointers = new Map<number, { x: number; y: number }>();
  let dragStart: { x: number; y: number } | null = null;
  let moved = false;
  let pinchStart = 0;
  let pinchZoom = state.zoom;
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
    tapGuard = false;
    pointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    dragStart = { x: e.global.x, y: e.global.y };
    moved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      pinchZoom = state.zoom;
    }
  });
  app.stage.on('pointermove', (e: FederatedPointerEvent) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / (pinchStart || 1);
      if (Math.abs(ratio - 1) > 0.25) {
        callbacks.onZoom(zoomForStep(app.screen, pinchZoom, ratio > 1 ? 1 : -1));
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        pinchZoom = state.zoom;
      }
      moved = true;
      return;
    }
    if (dragStart && Math.hypot(e.global.x - dragStart.x, e.global.y - dragStart.y) > 6)
      moved = true;
    if (moved) {
      const scale = pixelScale(app.screen, state.zoom);
      camera[0] -= (e.global.x - prev.x) / scale;
      camera[1] -= (e.global.y - prev.y) / scale;
      following = false;
    }
  });
  const release = (e: FederatedPointerEvent) => {
    pointers.delete(e.pointerId);
    if (!moved && !tapGuard && e.target === app.stage) {
      const local = world.toLocal(e.global);
      walkTo(local.x, local.y);
      if (!state.control) callbacks.onControl(true);
    }
    if (!pointers.size) dragStart = null;
  };
  app.stage.on('pointerup', release);
  app.stage.on('pointerupoutside', release);
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    callbacks.onZoom(zoomForStep(app.screen, state.zoom, e.deltaY < 0 ? 1 : -1));
  };
  app.canvas.addEventListener('wheel', onWheel, { passive: false });
  const keys = new Set<string>();
  const typing = () => {
    const el = document.activeElement;
    return (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    );
  };
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (
      !['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) ||
      typing()
    )
      return;
    if (e.type === 'keydown') {
      keys.add(k);
      path = [];
      if (!state.control) callbacks.onControl(true);
    } else keys.delete(k);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  // jeda saat tersembunyi agar hemat baterai
  const visibility = { page: !document.hidden, screen: true };
  const syncTicker = () =>
    visibility.page && visibility.screen ? app.ticker.start() : app.ticker.stop();
  const onVisibility = () => {
    visibility.page = !document.hidden;
    syncTicker();
  };
  document.addEventListener('visibilitychange', onVisibility);
  const observer = new IntersectionObserver(([entry]) => {
    visibility.screen = entry.isIntersecting;
    syncTicker();
  });
  observer.observe(host);

  let pulse = 0;
  app.ticker.add((ticker) => {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    pulse += dt;
    // gerak avatar
    let vx = 0;
    let vy = 0;
    if (keys.has('a') || keys.has('arrowleft')) vx -= 1;
    if (keys.has('d') || keys.has('arrowright')) vx += 1;
    if (keys.has('w') || keys.has('arrowup')) vy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) vy += 1;
    const speed = 110;
    let walking = false;
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      const nx = pos.x + (vx / len) * speed * dt;
      const ny = pos.y + (vy / len) * speed * dt;
      if (walkable(nx, pos.y)) pos.x = nx;
      if (walkable(pos.x, ny)) pos.y = ny;
      if (vx) facing = vx > 0 ? 1 : -1;
      walking = true;
    } else if (path.length) {
      const [tx, ty] = path[0];
      const d = Math.hypot(tx - pos.x, ty - pos.y);
      if (d < 2) path.shift();
      else {
        pos.x += ((tx - pos.x) / d) * Math.min(d, speed * dt);
        pos.y += ((ty - pos.y) / d) * Math.min(d, speed * dt);
        if (Math.abs(tx - pos.x) > 0.5) facing = tx > pos.x ? 1 : -1;
        walking = true;
      }
    } else if (!state.control && !reduced) {
      idleTimer -= dt;
      if (idleTimer <= 0) {
        wanderIndex = (wanderIndex + 1) % wander.length;
        walkTo(...wander[wanderIndex]);
        idleTimer = 4;
      }
    }
    if (walking && !reduced) walkPhase += dt * 12;
    drawManager(avatar, walking ? walkPhase : 0, facing);
    avatar.position.set(Math.round(pos.x), Math.round(pos.y));
    avatar.zIndex = pos.y;

    // kamera
    const scale = pixelScale(app.screen, state.zoom);
    if (following) {
      const [tx, ty] = target();
      camera[0] = followStep(camera[0], tx, dt, reduced);
      camera[1] = followStep(camera[1], ty, dt, reduced);
    }
    const v = view();
    const [cx, cy] = clampCamera(camera, v, scale, WORLD);
    camera[0] = cx;
    camera[1] = cy;
    const [vx0, vy0] = viewCenter(v);
    world.scale.set(scale);
    world.position.set(Math.round(vx0 - cx * scale), Math.round(vy0 - cy * scale));

    // penanda
    marker.clear();
    const b = state.selected === 'karakter' ? null : buildingFor(state.selected, state.location);
    const box: Box | null =
      state.selected === 'karakter'
        ? { x: pos.x - 18, y: pos.y - 64, w: 36, h: 68 }
        : b
          ? buildingBounds(b)
          : null;
    if (box) {
      const grow = reduced ? 0 : Math.round((Math.sin(pulse * 4) + 1) * 2);
      const x0 = box.x - 6 - grow;
      const y0 = box.y - 6 - grow;
      const x1 = box.x + box.w + 6 + grow;
      const y1 = box.y + box.h + 6 + grow;
      const arm = Math.min(28, box.w / 3, box.h / 3);
      const c = 0xf6efd8;
      for (const [px, py, sx, sy] of [
        [x0, y0, 1, 1],
        [x1, y0, -1, 1],
        [x0, y1, 1, -1],
        [x1, y1, -1, -1],
      ] as const) {
        marker
          .rect(Math.min(px, px + sx * arm), py - (sy > 0 ? 0 : 4), arm, 4)
          .fill(c)
          .stroke({ width: 1, color: OL });
        marker
          .rect(px - (sx > 0 ? 0 : 4), Math.min(py, py + sy * arm), 4, arm)
          .fill(c)
          .stroke({ width: 1, color: OL });
      }
    }
    night.clear();
    if (state.night)
      night.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0x1c2550, alpha: 0.5 });
    glow.visible = state.night;
    glow.scale.copyFrom(world.scale);
    glow.position.copyFrom(world.position);
  });

  return {
    update(next) {
      if (next.recenter !== lastRecenter || next.selected !== lastSelected) following = true;
      lastRecenter = next.recenter;
      lastSelected = next.selected;
      if (state.control && !next.control) path = [];
      state = next;
    },
    destroy() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      app.canvas.removeEventListener('wheel', onWheel);
      app.destroy(true, { children: true });
    },
  };
}
