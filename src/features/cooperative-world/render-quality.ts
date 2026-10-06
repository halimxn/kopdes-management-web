export type QualityTier = 'tinggi' | 'sedang' | 'hemat';
export type QualityChoice = QualityTier | 'otomatis';

export type QualitySettings = {
  pixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  /** Jeda minimum antarframe (ms); membatasi fps agar baterai ponsel tidak terkuras. */
  frameInterval: number;
  rainCount: number;
};

export const qualitySettings: Record<QualityTier, QualitySettings> = {
  tinggi: {
    pixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    frameInterval: 15,
    rainCount: 350,
  },
  sedang: {
    pixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    frameInterval: 32,
    rainCount: 220,
  },
  hemat: {
    pixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 0,
    frameInterval: 32,
    rainCount: 120,
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
