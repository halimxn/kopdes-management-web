import { Rectangle, Sprite, Texture } from 'pixi.js';
import {
  CHAR_FOOT,
  CHAR_H,
  CHAR_W,
  SHEET_POSES,
  SHEET_VIEWS,
  drawSheet,
  frameIndex,
  type CharPose,
  type CharView,
} from './character';
import { lookKey, type Look } from './look';

/** Lembar sprite per rupa digambar sekali lalu dipakai bersama semua karakter berupa sama. */
const sheets = new Map<string, Texture[]>();
function sheetTextures(look: Look): Texture[] {
  const key = lookKey(look);
  const cached = sheets.get(key);
  if (cached) return cached;
  const { width, height, data } = drawSheet(look);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas
    .getContext('2d')
    ?.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  const base = Texture.from(canvas);
  const frames: Texture[] = [];
  SHEET_VIEWS.forEach((_, row) =>
    SHEET_POSES.forEach((__, col) =>
      frames.push(
        new Texture({
          source: base.source,
          frame: new Rectangle(col * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H),
        }),
      ),
    ),
  );
  sheets.set(key, frames);
  return frames;
}

/** Karakter berjalan: arah dari pergeseran, langkah 8 bingkai per detik, kiri = samping dicermin. */
export class Walker {
  readonly sprite = new Sprite();
  private frames: Texture[];
  private view: CharView = 'depan';
  private flip = false;
  private phase = 0;
  pose: CharPose = 'diam';

  constructor(look: Look) {
    this.frames = sheetTextures(look);
    this.sprite.anchor.set(CHAR_FOOT.x / CHAR_W, CHAR_FOOT.y / CHAR_H);
    this.apply();
  }

  setLook(look: Look) {
    this.frames = sheetTextures(look);
    this.apply();
  }

  /** Hadapkan ke titik tertentu tanpa berjalan (mis. saat berbicara). */
  face(dx: number, dy: number) {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.view = 'samping';
      this.flip = dx < 0;
    } else this.view = dy < 0 ? 'belakang' : 'depan';
    this.apply();
  }

  step(dx: number, dy: number, seconds: number, reduced: boolean) {
    if (Math.hypot(dx, dy) > 0.01) {
      this.face(dx, dy);
      if (!reduced) this.phase += seconds * 8;
      this.pose = 'jalan';
    } else if (this.pose === 'jalan') this.pose = 'diam';
    this.apply();
  }

  private apply() {
    this.sprite.texture = this.frames[frameIndex(this.view, this.pose, Math.floor(this.phase))];
    this.sprite.scale.x = this.view === 'samping' && this.flip ? -1 : 1;
  }
}
