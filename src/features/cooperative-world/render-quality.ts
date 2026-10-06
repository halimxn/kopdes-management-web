export type QualityTier = 'tinggi' | 'sedang' | 'hemat';
export type QualityChoice = QualityTier | 'otomatis';

export type QualitySettings = {
  pixelRatio: number;
  /** Skala downsample resolusi internal untuk estetika piksel retro & efisiensi GPU. */
  downsampleScale: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  /** Jeda minimum antarframe (ms); membatasi fps agar baterai perangkat hemat. */
  frameInterval: number;
  rainCount: number;
  /** Ambient occlusion layar; dinonaktifkan pada mode retro piksel agar gambar crisp & ringan. */
  ambientOcclusion: boolean;
};

export const qualitySettings: Record<QualityTier, QualitySettings> = {
  tinggi: {
    pixelRatio: 1,
    downsampleScale: 0.5,
    antialias: false,
    shadows: true,
    shadowMapSize: 512,
    frameInterval: 16,
    rainCount: 160,
    ambientOcclusion: false,
  },
  sedang: {
    pixelRatio: 1,
    downsampleScale: 0.4,
    antialias: false,
    shadows: true,
    shadowMapSize: 512,
    frameInterval: 24,
    rainCount: 100,
    ambientOcclusion: false,
  },
  hemat: {
    pixelRatio: 1,
    downsampleScale: 0.33,
    antialias: false,
    shadows: false,
    shadowMapSize: 0,
    frameInterval: 32,
    rainCount: 60,
    ambientOcclusion: false,
  },
};

export type DeviceHints = {
  width: number;
  cores?: number;
  memory?: number;
  saveData?: boolean;
  reducedMotion?: boolean;
};

/** Perkiraan kasar dari petunjuk browser; pengguna dapat menimpa lewat pilihan manual. */
export function detectQualityTier(hints: DeviceHints): QualityTier {
  const cores = hints.cores ?? 4;
  const memory = hints.memory ?? 4;
  if (hints.saveData || cores <= 2 || memory <= 2) return 'hemat';
  if (hints.width < 768 || cores <= 4 || memory <= 4 || hints.reducedMotion) return 'sedang';
  return 'tinggi';
}

export function resolveQuality(choice: QualityChoice, hints: DeviceHints): QualityTier {
  return choice === 'otomatis' ? detectQualityTier(hints) : choice;
}

export function readDeviceHints(): DeviceHints {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    width: window.innerWidth,
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}
