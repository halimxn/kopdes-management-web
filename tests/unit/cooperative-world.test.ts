import { describe, expect, it } from 'vitest';
import {
  getWorldHour,
  getWorldModel,
  meetingTimeline,
  summarizeInventory,
  placeTrucks,
  noticeBoard,
  isBelowMinimum,
  worldPreferencesSchema,
  zoneSummaries,
  weekCounts,
} from '@/features/cooperative-world/world-model';
import type { Item } from '@/features/records/schemas';
import { dayPhase, getLighting } from '@/features/cooperative-world/lighting';
import { planManager, planStaff } from '@/features/cooperative-world/npc/schedule';
import {
  truckArrival,
  pathPose,
  truckFocus,
  truckPose,
  truckRoute,
} from '@/features/cooperative-world/truck-routes';
import { allBuildings, validateDistrict } from '@/features/cooperative-world/district';
import {
  WORLD,
  blockedGrid,
  bridges,
  buildingFor,
  grid,
  mapBuildings,
  validateMap,
} from '@/features/cooperative-world/pixel/map';
import { findPath } from '@/features/cooperative-world/pixel/path';
import {
  clampCamera,
  followStep,
  pixelScale,
  zoomForStep,
} from '@/features/cooperative-world/pixel/camera';
const row = (
  id: string,
  data: Record<string, unknown>,
  created = '2026-10-01T00:00:00Z',
): Item => ({ id, data, created_at: created, updated_at: created });
describe('pemetaan dunia koperasi', () => {
  it('menyediakan bangunan unit kosong (rencana) tanpa mengarang unit atau identitas', () => {
    const result = getWorldModel({}, new Date('2026-10-04T05:00:00Z'));
    expect(result.plots).toHaveLength(8);
    expect(result.plots.every((plot) => !plot.unit)).toBe(true);
    expect(result.manager).toBe('Manajer');
    expect(result.activity).toBe('idle');
  });
  it('penempatan stabil terhadap urutan respons dan melaporkan gerai di luar kavling', () => {
    const units = Array.from({ length: 9 }, (_, i) => row(`unit-${i}`, { title: `Gerai ${i}` }));
    const first = getWorldModel({ units }, new Date());
    const reversed = getWorldModel({ units: [...units].reverse() }, new Date());
    expect(first.plots.map((plot) => plot.unit?.id)).toEqual(
      reversed.plots.map((plot) => plot.unit?.id),
    );
    // Tanpa Jenis, gerai hanya mengisi tiga kavling gerai tambahan; sisanya overflow.
    expect(first.overflow).toBe(6);
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
    // Bawaan siang seperti video (keputusan pemilik v4); otomatis WIB tetap pilihan.
    expect(worldPreferencesSchema.parse({}).time).toBe('siang');
  });
});

describe('fondasi render dunia', () => {
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

describe('bangunan gerai menurut jenis', () => {
  const unit = (id: string, kind: string, slot: string | undefined, created: string) =>
    row(id, { title: id, kind, ...(slot ? { slot } : {}) }, created);
  const at = (model: ReturnType<typeof getWorldModel>, id: string) =>
    model.plots.find((plot) => plot.id === id)?.unit?.id ?? null;
  it('gerai menempati bangunan sesuai jenisnya; jenis logistik menjadi catatan gudang', () => {
    const model = getWorldModel(
      {
        units: [
          unit('s', 'Sembako', undefined, '2026-10-01T00:00:00Z'),
          unit('a', 'apotek desa', undefined, '2026-10-02T00:00:00Z'),
          unit('k', 'Klinik', undefined, '2026-10-03T00:00:00Z'),
          unit('g', 'logistik', undefined, '2026-10-04T00:00:00Z'),
        ],
      },
      new Date(),
    );
    expect(at(model, 'sembako')).toBe('s');
    expect(at(model, 'apotek')).toBe('a');
    expect(at(model, 'klinik')).toBe('k');
    expect(model.warehouseUnit?.id).toBe('g');
    expect(at(model, 'simpan-pinjam')).toBeNull();
  });
  it('jenis lain mengisi kavling gerai tambahan menurut kolom Lahan lalu urutan dibuat', () => {
    const model = getWorldModel(
      {
        units: [
          unit('x', 'kuliner', undefined, '2026-10-01T00:00:00Z'),
          unit('y', 'bengkel', '3', '2026-10-02T00:00:00Z'),
          unit('s2', 'sembako', undefined, '2026-10-03T00:00:00Z'),
        ],
      },
      new Date(),
    );
    expect(at(model, 'gerai-3')).toBe('y');
    expect(at(model, 'gerai-1')).toBe('x');
    // Sembako kedua tidak menggeser yang pertama: mengisi kavling tambahan berikutnya.
    expect(at(model, 'sembako')).toBe('s2');
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

describe('papan pengumuman', () => {
  it('keputusan terbaru dan dokumen yang habis dalam 30 hari', () => {
    const decisions = ['2026-09-01', '2026-10-05', '2026-08-01', '2026-10-01'].map((date, i) =>
      row(`k${i}`, { title: `K${i}`, date }),
    );
    const documents = [
      row('lama', { title: 'Lama', expires_date: '2026-09-30' }),
      row('dekat', { title: 'Dekat', expires_date: '2026-10-20' }),
      row('jauh', { title: 'Jauh', expires_date: '2027-01-01' }),
      row('tanpa', { title: 'Tanpa' }),
    ];
    const board = noticeBoard(decisions, documents, '2026-10-06');
    expect(board.decisions.map((item) => item.id)).toEqual(['k1', 'k3', 'k0']);
    expect(board.documents.map((item) => item.id)).toEqual(['lama', 'dekat']);
  });
});

describe('rute truk dan forklift suasana', () => {
  const trucks = placeTrucks([
    row('a', { title: 'A', status: 'tiba', dock: 'D2' }, '2026-10-01T01:00:00Z'),
    row('b', { title: 'B', status: 'dikirim', dock: 'D2' }, '2026-10-01T02:00:00Z'),
    row('c', { title: 'C', status: 'dikirim' }, '2026-10-01T03:00:00Z'),
  ]);
  const atDock = trucks.find((spot) => spot.delivery.id === 'a')!;
  const queued = trucks.find((spot) => spot.delivery.id === 'b')!;

  it('truk di dok hanya punya jalur dilalui yang berakhir di posisinya', () => {
    const route = truckRoute(atDock, trucks);
    expect(route.ahead).toEqual([]);
    expect(route.dock).toBe(1);
    expect(route.done.at(-1)).toEqual(truckPose(atDock));
  });

  it('truk antre menuju dok kosong bila dok pilihannya sudah terisi', () => {
    const route = truckRoute(queued, trucks);
    expect(route.done.at(-1)).toEqual(truckPose(queued));
    expect(route.ahead[0]).toEqual(truckPose(queued));
    expect(route.dock).toBe(0);
    expect(route.target?.[0]).toBe(route.ahead.at(-1)?.[0]);
  });

  it('tanpa dok kosong rute antre tidak mengarang tujuan', () => {
    const full = placeTrucks([
      ...[1, 2, 3, 4].map((n) => row(`d${n}`, { status: 'tiba' }, `2026-10-01T0${n}:00:00Z`)),
      row('q', { status: 'dikirim' }, '2026-10-01T09:00:00Z'),
    ]);
    const route = truckRoute(
      full.find((spot) => spot.place === 'antre')!,
      full,
    );
    expect(route.target).toBeNull();
    expect(route.ahead).toEqual([]);
  });

  it('fokus kamera truk antre berada di antara truk dan dok tujuan', () => {
    const [x] = truckFocus(queued, trucks);
    const [tx] = truckRoute(queued, trucks).target!;
    expect(x).toBeGreaterThan(Math.min(truckPose(queued)[0], tx));
    expect(x).toBeLessThan(Math.max(truckPose(queued)[0], tx));
  });

  it('forklift bolak-balik: berangkat di awal, berhenti di ujung, kembali ke awal', () => {
    const path: [number, number][] = [
      [0, 0],
      [4, 0],
      [4, 2],
    ];
    expect(pathPose(path, 0, 2, 1)).toMatchObject({ x: 0, z: 0 });
    expect(pathPose(path, 3.5, 2, 1)).toMatchObject({ x: 4, z: 2 });
    const back = pathPose(path, 3 + 1 + 1, 2, 1);
    expect(back.x).toBeCloseTo(4);
    expect(back.z).toBeCloseTo(0);
    expect(pathPose(path, 2 * (3 + 1), 2, 1)).toMatchObject({ x: 0, z: 0 });
  });
});

describe('denah distrik v4', () => {
  it('lolos aturan denah: pagar, jarak, gerbang ke jalan, klinik–apotek, jauh dari dok', () => {
    expect(validateDistrict()).toEqual([]);
  });
  it('enam jenis unit KDMP punya bangunan tetap dan kantor selalu ada', () => {
    const ids = allBuildings().map((b) => b.id);
    for (const id of [
      'kantor',
      'simpan-pinjam',
      'sembako',
      'apotek',
      'klinik',
      'cold-storage',
      'gudang',
    ])
      expect(ids).toContain(id);
    expect(allBuildings().find((b) => b.id === 'kantor')?.kinds).toEqual([]);
  });
});

describe('ringkasan zona', () => {
  it('menghitung dok terisi, gerai tercatat dan tanpa angka lahan karangan', () => {
    const model = getWorldModel(
      {
        units: [row('k', { title: 'K', kind: 'klinik' })],
        deliveries: [
          row('d', { title: 'D', status: 'tiba' }),
          row('e', { title: 'E', status: 'dikirim' }),
        ],
      },
      new Date(),
    );
    const summary = zoneSummaries(model);
    expect(summary.gudang).toMatchObject({ value: 1, total: 4 });
    expect(summary.gudang.note).toContain('1 antre');
    expect(summary.kesehatan).toMatchObject({ value: 1, total: 2 });
    expect(summary.lahan.value).toBeUndefined();
  });
});

describe('riwayat 7 hari', () => {
  it('menghitung per hari dari tanggal tercatat, lama ke baru', () => {
    const rows = [
      row('a', { date: '2026-10-06' }),
      row('b', { date: '2026-10-06' }),
      row('c', { date: '2026-10-01' }),
      row('d', { date: '2026-09-20' }),
    ];
    expect(weekCounts(rows, (r) => String(r.data.date), '2026-10-06')).toEqual([
      0, 1, 0, 0, 0, 0, 2,
    ]);
  });
});

describe('animasi kedatangan truk', () => {
  it('truk dok maju melewati dok lalu mundur hingga posisi dok', () => {
    const spots = placeTrucks([row('a', { title: 'A', status: 'tiba', dock: 'D2' })]);
    const { drive, reverse } = truckArrival(spots[0], spots);
    expect(reverse.at(-1)).toEqual(truckPose(spots[0]));
    expect(drive.at(-1)).toEqual(reverse[0]);
    // Melewati dok: titik balik berada di seberang dok dari arah gerbang.
    expect(Math.abs(reverse[0][0] - truckPose(spots[0])[0])).toBeGreaterThan(4);
    expect(Math.abs(reverse[0][0] - truckPose(spots[0])[0])).toBeLessThanOrEqual(7);
  });
  it('truk antre hanya maju ke petaknya', () => {
    const spots = placeTrucks([row('b', { title: 'B', status: 'dikirim' })]);
    const { drive, reverse } = truckArrival(spots[0], spots);
    expect(reverse).toEqual([]);
    expect(drive.at(-1)).toEqual(truckPose(spots[0]));
  });
});

describe('rak pendingin cold storage', () => {
  it('barang berak C1–C3 masuk cold storage, bukan staging atau rak gudang', () => {
    const summary = summarizeInventory([
      row('a', { title: 'Ikan', rack: 'C1' }),
      row('b', { title: 'Beras', rack: 'A' }),
      row('c', { title: 'Kopi', rack: 'belum ditentukan' }),
    ]);
    expect(summary.coldRacks.C1.map((item) => item.id)).toEqual(['a']);
    expect(summary.racks.A.map((item) => item.id)).toEqual(['b']);
    expect(summary.staging.map((item) => item.id)).toEqual(['c']);
  });
});

describe('dunia pixel: denah, jalur, kamera', () => {
  it('denah valid: id unik, di dalam dunia, tidak saling tumpang atau di atas jalan', () => {
    expect(validateMap()).toEqual([]);
  });
  it('setiap bangunan unit data punya bangunan pixel dengan id yang sama', () => {
    const ids = mapBuildings.map((b) => b.id);
    for (const b of allBuildings()) expect(ids).toContain(b.id);
  });
  it('lokasi dalam ruangan memfokuskan bangunannya', () => {
    expect(buildingFor('rapat', 'dalam')?.id).toBe('kantor');
    expect(buildingFor('x', 'pendingin')?.id).toBe('cold-storage');
    expect(buildingFor('kawasan', 'luar')).toBeUndefined();
  });
  it('A* menghindari bangunan, menyeberang sungai lewat jembatan', () => {
    const blocked = blockedGrid();
    const path = findPath(blocked, grid.cols, grid.rows, [5, 45], [40, 45]);
    expect(path).not.toBeNull();
    expect(path!.every(([c, r]) => !blocked[r * grid.cols + c])).toBe(true);
    const bridge = bridges[0];
    expect(
      path!.some(
        ([c, r]) =>
          c * 16 >= bridge.x &&
          c * 16 < bridge.x + bridge.w &&
          r * 16 >= bridge.y - 16 &&
          r * 16 < bridge.y + bridge.h,
      ),
    ).toBe(true);
  });
  it('tujuan di atap diganti sel terdekat yang dapat dilalui', () => {
    const blocked = blockedGrid();
    const kantor = mapBuildings.find((b) => b.id === 'kantor')!.foot;
    const goal = [Math.floor((kantor.x + 40) / 16), Math.floor((kantor.y + 20) / 16)] as const;
    const path = findPath(blocked, grid.cols, grid.rows, [50, 46], goal);
    const end = path!.at(-1)!;
    expect(blocked[end[1] * grid.cols + end[0]]).toBe(0);
  });
  it('skala pixel bulat, zoom bertingkat, kamera tetap di dalam dunia', () => {
    const desktop = { width: 1920, height: 1080 };
    expect(pixelScale(desktop, 0.62)).toBe(3);
    expect(pixelScale({ width: 375, height: 812 }, 0.62)).toBe(1);
    expect(pixelScale(desktop, 0.1)).toBe(1);
    expect(pixelScale(desktop, zoomForStep(desktop, 0.62, 1))).toBe(4);
    const view = { width: 1440, height: 900, right: 352, top: 0, bottom: 0 };
    const [x, y] = clampCamera([-500, 99999], view, 3, WORLD);
    expect(x).toBeGreaterThanOrEqual((1440 - 352) / 6);
    expect(y).toBeLessThanOrEqual(WORLD.h - 900 / 6);
    expect(followStep(0, 100, 1, true)).toBe(100);
    expect(followStep(0, 100, 0.1, false)).toBeGreaterThan(0);
  });
});

describe('aset pixel', () => {
  it('setiap bangunan dan rumah di denah punya sprite di public/dunia', async () => {
    const { existsSync } = await import('node:fs');
    const { houses } = await import('@/features/cooperative-world/pixel/map');
    for (const b of [...mapBuildings, ...houses])
      expect(existsSync(`public/dunia/bangunan/${b.sprite || b.id}.png`), b.sprite || b.id).toBe(
        true,
      );
  });
});

describe('kendaraan pixel', () => {
  it('lalu lintas suasana berlajur kiri dan berputar di luar layar', async () => {
    const { ambientTraffic, ambientPose } =
      await import('@/features/cooperative-world/pixel/vehicles');
    const east = ambientTraffic.find((v) => v.dir === 1 && v.road === 'desa')!;
    const west = ambientTraffic.find((v) => v.dir === -1 && v.road === 'desa')!;
    expect(ambientPose(east, 0).y).toBeLessThan(ambientPose(west, 0).y);
    expect(ambientPose(east, 0).view).toBe('kanan');
    const a = ambientPose(east, 10);
    const b = ambientPose(east, 11);
    expect(b.x - a.x).toBeCloseTo(east.speed, 0);
    const lanes = new Map<string, Set<number>>();
    for (const v of ambientTraffic) {
      const key = `${v.road}${v.dir}`;
      lanes.set(key, (lanes.get(key) || new Set()).add(v.speed));
    }
    for (const speeds of lanes.values()) expect(speeds.size).toBe(1);
  });
  it('rute kedatangan berakhir dengan ekor truk di muka dok', async () => {
    const { arrivalRoute, poseAlong, dockPose } =
      await import('@/features/cooperative-world/pixel/vehicles');
    const route = arrivalRoute(1);
    expect(poseAlong(route, 0).view).toBe('kiri');
    const end = poseAlong(route, 999);
    expect(end.done).toBe(true);
    expect([end.x, end.y]).toEqual([dockPose(1).x, dockPose(1).y]);
    expect(end.view).toBe('depan');
  });
  it('jenis truk dari teks kendaraan, D4 tanpa keterangan = pendingin', async () => {
    const { truckKind, recentArrival } =
      await import('@/features/cooperative-world/pixel/vehicles');
    expect(truckKind('Colt diesel bak', 'dok', 0)).toBe('bakkayu');
    expect(truckKind('Truk reefer', 'antre', 0)).toBe('pendingin');
    expect(truckKind('', 'dok', 3)).toBe('pendingin');
    expect(truckKind('', 'dok', 0)).toBe('boks');
    expect(recentArrival('2026-10-07T01:00:00Z', new Date('2026-10-07T01:10:00Z'))).toBe(true);
    expect(recentArrival('2026-10-07T01:00:00Z', new Date('2026-10-07T01:20:00Z'))).toBe(false);
  });
});

describe('perabot pixel', () => {
  it('perabot di dalam dunia, tidak menimpa bangunan, dan punya sprite', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const { mapProps } = await import('@/features/cooperative-world/pixel/props');
    const { houses } = await import('@/features/cooperative-world/pixel/map');
    const manifest = JSON.parse(readFileSync('public/dunia/perabot/manifest.json', 'utf8'));
    const hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const p of mapProps) {
      expect(manifest[p.sprite], p.sprite).toBeTruthy();
      expect(existsSync(`public/dunia/perabot/${p.sprite}.png`)).toBe(true);
      expect(p.x >= 0 && p.x <= WORLD.w && p.y >= 0 && p.y <= WORLD.h, p.id).toBe(true);
      if (p.block)
        for (const b of [...mapBuildings, ...houses])
          expect(hit(p.block, b.foot), `${p.id} ${b.id}`).toBe(false);
    }
    expect(mapProps.filter((p) => p.select)).toEqual([
      expect.objectContaining({ sprite: 'papan', select: 'papan' }),
    ]);
  });
  it('pagar logistik berpintu: avatar dapat berjalan dari Jalan Desa ke depan dok', async () => {
    const { propBlocks } = await import('@/features/cooperative-world/pixel/props');
    const blocked = blockedGrid(propBlocks());
    const path = findPath(blocked, grid.cols, grid.rows, [100, 46], [130, 66]);
    expect(path).not.toBeNull();
    const gateCells = path!.filter(
      ([c, r]) => c === Math.floor(1834 / 16) && r * 16 > 1150 && r * 16 < 1250,
    );
    expect(gateCells.length).toBeGreaterThan(0);
  });
});

describe('sprite kendaraan per tampak', () => {
  it('setiap jenis dan tampak yang dipakai punya sprite, termasuk tampak kiri', async () => {
    const { readFileSync } = await import('node:fs');
    const { spriteFor, ambientTraffic } =
      await import('@/features/cooperative-world/pixel/vehicles');
    const manifest = JSON.parse(readFileSync('public/dunia/kendaraan/manifest.json', 'utf8'));
    for (const kind of ['boks', 'pendingin', 'bakkayu'] as const)
      for (const view of ['kanan', 'kiri', 'depan', 'belakang'] as const)
        expect(manifest[spriteFor(kind, view)], `${kind} ${view}`).toBeTruthy();
    for (const v of ambientTraffic)
      for (const view of ['kanan', 'kiri'] as const)
        expect(manifest[spriteFor(v.kind, view)]).toBeTruthy();
  });
});

describe('rupa karakter', () => {
  it('tanpa isian rupa = sosok netral bertopi KDMP; tidak ditebak dari nama', async () => {
    const { staffLook } = await import('@/features/cooperative-world/pixel/look');
    const look = staffLook({ title: 'Siti Aminah', outfit: 'hijau' });
    expect(look.neutral).toBe(true);
    expect(look.head).toBe('cap');
    expect(look.outfit).toBe('#6a9a5a');
  });
  it('isian rupa dan kedudukan dipakai; kolom lama hair dihormati bila rupa kosong', async () => {
    const { staffLook } = await import('@/features/cooperative-world/pixel/look');
    expect(
      staffLook({ look_head: 'hijab', look_skin: 'gelap', position: 'pengurus' }),
    ).toMatchObject({
      head: 'hijab',
      skin: 'dark',
      batik: true,
      neutral: false,
    });
    expect(staffLook({ hair: 'berkerudung' }).head).toBe('hijab');
    expect(staffLook({ hair: 'panjang' })).toMatchObject({
      head: 'none',
      hair: 'long',
      neutral: false,
    });
    expect(staffLook({ hair: 'panjang', look_head: 'peci' }).head).toBe('peci');
  });
  it('skema Tim menerima kolom rupa baru dan data lama tanpa kolom itu', async () => {
    const { schemas } = await import('@/features/records/schemas');
    const old = schemas.staff.parse({ title: 'Petugas', hair: 'topi' });
    expect(old.look_head).toBe('belum diisi');
    expect(old.position).toBe('karyawan');
    const fresh = schemas.staff.parse({ title: 'Petugas' });
    expect(fresh.hair).toBeUndefined();
    expect(schemas.staff.safeParse({ title: 'X', look_head: 'helm' }).success).toBe(false);
  });
});

describe('penggambar karakter', () => {
  it('bingkai berukuran tetap, berisi sosok, dan rupa berbeda menghasilkan gambar berbeda', async () => {
    const { drawCharacter, CHAR_W, CHAR_H, frameIndex, SHEET_POSES } =
      await import('@/features/cooperative-world/pixel/character');
    const { staffLook } = await import('@/features/cooperative-world/pixel/look');
    const netral = drawCharacter(staffLook({}), 'depan', 'diam');
    expect(netral.length).toBe(CHAR_W * CHAR_H * 4);
    let opaque = 0;
    for (let i = 3; i < netral.length; i += 4) if (netral[i] === 255) opaque++;
    expect(opaque).toBeGreaterThan(500);
    const hijab = drawCharacter(staffLook({ look_head: 'hijab' }), 'depan', 'diam');
    expect(Buffer.from(hijab).equals(Buffer.from(netral))).toBe(false);
    const step0 = drawCharacter(staffLook({}), 'samping', 'jalan', 0);
    const step2 = drawCharacter(staffLook({}), 'samping', 'jalan', 2);
    expect(Buffer.from(step0).equals(Buffer.from(step2))).toBe(false);
    expect(frameIndex('belakang', 'jalan', 5)).toBe(SHEET_POSES.length + 2);
    expect(frameIndex('samping', 'bicara')).toBe(SHEET_POSES.length * 3 - 1);
  });
});
