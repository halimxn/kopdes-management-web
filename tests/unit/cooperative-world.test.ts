import { describe, expect, it } from 'vitest';
import {
  getWorldHour,
  getWorldModel,
  meetingTimeline,
  summarizeInventory,
  placeTrucks,
  isBelowMinimum,
  worldPreferencesSchema,
} from '@/features/cooperative-world/world-model';
import type { Item } from '@/features/records/schemas';
import { dayPhase, getLighting } from '@/features/cooperative-world/lighting';
import { planManager, planStaff } from '@/features/cooperative-world/npc/schedule';
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

describe('jadwal rapat hari ini', () => {
  it('mengurutkan rapat dan menandai selesai, berlangsung, nanti menurut WIB', () => {
    const meetings = [
      row('sore', { title: 'Sore', date: '2026-10-06', time: '15:00', duration: 30 }),
      row('pagi', { title: 'Pagi', date: '2026-10-06', time: '08:00', duration: 60 }),
      row('siang', { title: 'Siang', date: '2026-10-06', time: '10:00', duration: 90 }),
    ];
    // 10:30 WIB
    const steps = meetingTimeline(meetings, new Date('2026-10-06T03:30:00Z'));
    expect(steps.map((step) => [step.row.id, step.state])).toEqual([
      ['pagi', 'selesai'],
      ['siang', 'berlangsung'],
      ['sore', 'nanti'],
    ]);
    expect(steps[1].end).toBe('11:30');
  });
});

describe('inventaris gudang', () => {
  it('mengelompokkan barang per rak, gerai dan staging serta menandai stok minimum', () => {
    const items = [
      row('a', { title: 'A', rack: 'A', book_quantity: 2, minimum_quantity: 5 }),
      row('b', { title: 'B', rack: 'A', book_quantity: 9, minimum_quantity: 5 }),
      row('c', { title: 'C', rack: 'belum ditentukan', unit_id: 'unit-1', book_quantity: 1 }),
      row('d', { title: 'D', book_quantity: 0, minimum_quantity: 0 }),
    ];
    const inventory = summarizeInventory(items);
    expect(inventory.racks.A.map((item) => item.id)).toEqual(['a', 'b']);
    expect(inventory.atUnits.map((item) => item.id)).toEqual(['c']);
    expect(inventory.staging.map((item) => item.id)).toEqual(['d']);
    expect(inventory.low.map((item) => item.id)).toEqual(['a']);
    // Batas minimum 0 berarti tidak dipantau, bukan kekurangan.
    expect(isBelowMinimum(items[3])).toBe(false);
  });
});

describe('truk dari pengiriman', () => {
  const delivery = (id: string, status: string, extra: Record<string, unknown> = {}) =>
    row(id, { title: id, direction: 'masuk', status, ...extra });
  it('hanya pengiriman masuk aktif; dok pilihan dipakai, lainnya mengisi dok kosong', () => {
    const spots = placeTrucks([
      delivery('a', 'tiba', { dock: 'D3' }),
      delivery('b', 'diperiksa'),
      delivery('c', 'dikirim'),
      delivery('d', 'selesai'),
      delivery('e', 'tiba', { direction: 'keluar' }),
    ]);
    expect(spots.map((spot) => [spot.delivery.id, spot.place, spot.index])).toEqual([
      ['a', 'dok', 2],
      ['b', 'dok', 0],
      ['c', 'antre', 0],
    ]);
  });
  it('kelebihan truk tidak digambar melebihi jumlah dok dan antrean', () => {
    const many = Array.from({ length: 6 }, (_, i) => delivery(`t${i}`, 'tiba'));
    expect(placeTrucks(many).filter((spot) => spot.place === 'dok')).toHaveLength(4);
  });
});

describe('jadwal karakter tim', () => {
  const staff = (id: string, extra: Record<string, unknown> = {}) =>
    row(id, { title: id, status: 'aktif', work_hours: '08:00-16:00', ...extra });
  // 10:00 WIB
  const at10 = new Date('2026-10-06T03:00:00Z');
  const empty = { tasks: [], deliveries: [] };
  it('rapat mengalahkan kegiatan lain; peserta dicocokkan dengan nama', () => {
    const meeting = row('m', { title: 'Rapat', participants: 'Ani, Budi' });
    const plans = planStaff(
      [staff('Ani'), staff('Citra')],
      { ...empty, currentMeeting: meeting },
      at10,
    );
    expect(plans.map((plan) => plan.activity)).toEqual(['rapat', 'kerja']);
  });
  it('bongkar untuk seksi gudang saat truk di dok, tugas proses, istirahat dan pulang', () => {
    const deliveries = [row('d', { title: 'Kiriman', direction: 'masuk', status: 'tiba' })];
    const tasks = [row('t', { title: 'Cek kas', status: 'proses', assignee: 'Budi' })];
    const plans = planStaff(
      [staff('Dodi', { section: 'gudang & logistik', workplace: 'gudang' }), staff('Budi')],
      { tasks, deliveries },
      at10,
    );
    expect(plans.map((plan) => [plan.activity, plan.location])).toEqual([
      ['bongkar', 'gudang'],
      ['kerja', 'dalam'],
    ]);
    expect(planStaff([staff('Eka')], empty, new Date('2026-10-06T05:30:00Z'))[0].activity).toBe(
      'istirahat',
    );
    const night = planStaff([staff('Eka')], empty, new Date('2026-10-06T13:00:00Z'))[0];
    expect([night.activity, night.location]).toEqual(['pulang', null]);
  });
  it('staf nonaktif tidak digambar', () => {
    expect(planStaff([staff('Fajar', { status: 'nonaktif' })], empty, at10)).toHaveLength(0);
  });
});

describe('briefing dan rencana manajer', () => {
  const staff = (id: string, extra: Record<string, unknown> = {}) =>
    row(id, { title: id, status: 'aktif', work_hours: '08:00-16:00', ...extra });
  it('15 menit pertama jam kerja staf kantor ikut briefing, staf gudang tidak', () => {
    // 08:05 WIB
    const plans = planStaff(
      [staff('Ani'), staff('Dodi', { workplace: 'gudang' })],
      { tasks: [], deliveries: [] },
      new Date('2026-10-06T01:05:00Z'),
    );
    expect(plans[0].activity).toBe('briefing');
    expect(plans[1].activity).not.toBe('briefing');
    expect(planManager(plans, { tasks: [], deliveries: [] }, new Date(), '2026-10-06').kind).toBe(
      'briefing',
    );
  });
  it('manajer mendatangi meja staf dengan tugas lewat tenggat, lalu dok, lalu ruangannya', () => {
    const at10 = new Date('2026-10-06T03:00:00Z');
    const plans = planStaff([staff('Citra')], { tasks: [], deliveries: [] }, at10).map((plan) => ({
      ...plan,
      activity: 'kerja' as const,
    }));
    const late = [row('t', { title: 'Susun rak', due_date: '2026-10-01', assignee: 'Citra' })];
    const visit = planManager(plans, { tasks: late, deliveries: [] }, at10, '2026-10-06');
    expect(visit).toMatchObject({ kind: 'meja-staf', staffId: 'Citra' });
    const dock = [row('d', { title: 'Kiriman', direction: 'masuk', status: 'tiba' })];
    expect(planManager(plans, { tasks: [], deliveries: dock }, at10, '2026-10-06').kind).toBe(
      'dok',
    );
    expect(planManager(plans, { tasks: [], deliveries: [] }, at10, '2026-10-06').kind).toBe(
      'ruang',
    );
  });
});
