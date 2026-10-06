import type { WorldPreferences } from './world-model';

export type Lighting = {
  sky: string;
  ambient: number;
  sun: number;
  sunColor: string;
  exposure: number;
};

export function dayPhase(hour: number) {
  if (hour < 6 || hour >= 19) return 'malam' as const;
  if (hour >= 16) return 'senja' as const;
  if (hour < 9) return 'pagi' as const;
  return 'siang' as const;
}

/**
 * Siang dibuat cerah seperti video acuan. Malam tetap terbaca: langit biru tua,
 * bukan hitam, agar gedung dan karakter tidak hilang.
 */
export function getLighting(hour: number, weather: WorldPreferences['weather']): Lighting {
  const phase = dayPhase(hour);
  if (phase === 'malam')
    return { sky: '#4a5b8f', ambient: 1.9, sun: 1.1, sunColor: '#b4c8ff', exposure: 1.18 };
  const overcast = weather !== 'cerah';
  const sun = weather === 'hujan' ? 1.8 : overcast ? 2.2 : 3.5;
  if (phase === 'senja')
    return {
      sky: overcast ? '#ddd6e6' : '#efdfe8',
      ambient: 2.4,
      sun: sun * 0.85,
      sunColor: '#ffcfa3',
      exposure: 1.2,
    };
  return {
    sky:
      weather === 'hujan'
        ? '#cdd8ea'
        : overcast
          ? '#d9e2f1'
          : phase === 'pagi'
            ? '#f1f2f8'
            : '#e4ecfc',
    // Ambient lebih rendah dari v3 agar sisi bayangan biru terbaca (video tidak pucat).
    ambient: 2.1,
    sun,
    sunColor: phase === 'pagi' ? '#ffeccc' : '#fff7e8',
    exposure: 1.12,
  };
}
