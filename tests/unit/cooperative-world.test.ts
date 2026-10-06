import { describe, expect, it } from 'vitest';
import {
  getWorldHour,
  getWorldModel,
  worldPreferencesSchema,
} from '@/features/cooperative-world/world-model';
import type { Item } from '@/features/records/schemas';
import { dayPhase, getLighting } from '@/features/cooperative-world/lighting';
import {
  detectQualityTier,
  qualitySettings,
  resolveQuality,
} from '@/features/cooperative-world/render-quality';
const row = (
  id: string,
  data: Record<string, unknown>,
  created = '2026-10-01T00:00:00Z',
): Item => ({ id, data, created_at: created, updated_at: created });
describe('pemetaan dunia koperasi', () => {
  it('menyediakan tujuh lahan kosong tanpa mengarang unit atau identitas', () => {
    const result = getWorldModel({}, new Date('2026-10-04T05:00:00Z'));
    expect(result.plots).toHaveLength(7);
    expect(result.plots.every((plot) => !plot.unit)).toBe(true);
    expect(result.manager).toBe('Manajer');
    expect(result.activity).toBe('idle');
  });
  it('penempatan stabil terhadap urutan respons dan melaporkan gerai di luar tujuh slot', () => {
    const units = Array.from({ length: 9 }, (_, i) => row(`unit-${i}`, { title: `Gerai ${i}` }));
    const first = getWorldModel({ units }, new Date());
    const reversed = getWorldModel({ units: [...units].reverse() }, new Date());
    expect(first.plots.map((plot) => plot.unit?.id)).toEqual(
      reversed.plots.map((plot) => plot.unit?.id),
    );
    expect(first.overflow).toBe(2);
    expect(first.units).toHaveLength(9);
  });
  it('rapat aktif berdasarkan waktu Jakarta dan durasi, bukan seluruh hari', () => {
    const data = {
      meetings: [
        row('meeting', { title: 'Rapat', date: '2026-10-04', time: '09:00', duration: 60 }),
      ],
    };
    expect(getWorldModel(data, new Date('2026-10-04T01:59:00Z')).activity).toBe('idle');
    expect(getWorldModel(data, new Date('2026-10-04T02:00:00Z')).activity).toBe('meeting');
    expect(getWorldModel(data, new Date('2026-10-04T02:59:00Z')).activity).toBe('meeting');
    expect(getWorldModel(data, new Date('2026-10-04T03:00:00Z')).activity).toBe('idle');
  });
  it('kegiatan hari Jakarta memicu olahraga; catatan kemarin tidak', () => {
    const journal = [row('activity', { title: 'Kunjungan', date: '2026-10-05' })];
    expect(getWorldModel({ journal }, new Date('2026-10-04T17:01:00Z')).activity).toBe('gym');
    expect(getWorldModel({ journal }, new Date('2026-10-05T17:01:00Z')).activity).toBe('idle');
  });
  it('tugas selesai dan dibatalkan tidak menggerakkan aktivitas kerja', () => {
    const tasks = ['selesai', 'dibatalkan', 'rencana', 'proses'].map((status) =>
      row(status, { title: status, status }),
    );
    const model = getWorldModel({ 'work-items': tasks }, new Date());
    expect(model.tasks).toHaveLength(2);
    expect(model.activity).toBe('work');
  });
  it('waktu otomatis memakai WIB dan preferensi menolak nilai tidak dikenal', () => {
    expect(getWorldHour('otomatis', new Date('2026-10-04T17:00:00Z'))).toBe(0);
    expect(getWorldHour('senja', new Date())).toBe(17);
    expect(worldPreferencesSchema.safeParse({ weather: 'salju' }).success).toBe(false);
    expect(worldPreferencesSchema.parse({}).time).toBe('otomatis');
  });
});

describe('fondasi render dunia', () => {
  it('memilih kualitas sesuai petunjuk perangkat dan menghormati pilihan manual', () => {
    expect(detectQualityTier({ width: 1440, cores: 8, memory: 8 })).toBe('tinggi');
    expect(detectQualityTier({ width: 390, cores: 8, memory: 8 })).toBe('sedang');
    expect(detectQualityTier({ width: 1440, cores: 2, memory: 8 })).toBe('hemat');
    expect(detectQualityTier({ width: 1440, cores: 8, memory: 8, saveData: true })).toBe('hemat');
    expect(resolveQuality('tinggi', { width: 360, cores: 2 })).toBe('tinggi');
    expect(qualitySettings.hemat.shadows).toBe(false);
    expect(qualitySettings.sedang.pixelRatio).toBeLessThanOrEqual(1.5);
  });
  it('siang cerah lebih terang dari malam, dan malam tidak hitam', () => {
    const day = getLighting(12, 'cerah');
    const night = getLighting(22, 'cerah');
    expect(day.sun).toBeGreaterThan(night.sun);
    expect(day.ambient).toBeGreaterThan(night.ambient);
    expect(night.sky).not.toBe('#000000');
    expect(getLighting(12, 'hujan').sun).toBeLessThan(day.sun);
    expect([5, 7, 12, 17, 19].map(dayPhase)).toEqual(['malam', 'pagi', 'siang', 'senja', 'malam']);
  });
  it('preferensi lama tanpa kualitas tetap valid dengan bawaan otomatis', () => {
    const old = worldPreferencesSchema.parse({
      version: 1,
      weather: 'hujan',
      time: 'malam',
      outfit: 'hijau',
    });
    expect(old.quality).toBe('otomatis');
    expect(old.weather).toBe('hujan');
    expect(worldPreferencesSchema.safeParse({ quality: 'ultra' }).success).toBe(false);
  });
});

describe('slot lahan gerai', () => {
  const unit = (id: string, slot: string | undefined, created: string) =>
    row(id, { title: id, ...(slot ? { slot } : {}) }, created);
  it('gerai dengan pilihan lahan tetap di lahannya walau gerai lain dihapus', () => {
    const a = unit('a', undefined, '2026-10-01T00:00:00Z');
    const b = unit('b', '5', '2026-10-02T00:00:00Z');
    const c = unit('c', 'otomatis', '2026-10-03T00:00:00Z');
    const before = getWorldModel({ units: [a, b, c] }, new Date());
    expect(before.plots.map((plot) => plot.unit?.id ?? null)).toEqual([
      'a',
      'c',
      null,
      null,
      'b',
      null,
      null,
    ]);
    const after = getWorldModel({ units: [b, c] }, new Date());
    expect(after.plots[4].unit?.id).toBe('b');
    expect(after.plots[0].unit?.id).toBe('c');
  });
  it('pilihan ganda dimenangkan gerai paling awal, sisanya mengisi lahan kosong', () => {
    const units = [
      unit('lama', '2', '2026-10-01T00:00:00Z'),
      unit('baru', '2', '2026-10-02T00:00:00Z'),
      unit('aneh', '9', '2026-10-03T00:00:00Z'),
    ];
    const model = getWorldModel({ units }, new Date());
    expect(model.plots[1].unit?.id).toBe('lama');
    expect(model.plots[0].unit?.id).toBe('baru');
    expect(model.plots[2].unit?.id).toBe('aneh');
    expect(model.overflow).toBe(0);
  });
});
