import { z } from 'zod';
import { addDays, today } from '@/lib/date';
import type { Workspace } from '../workspace/useWorkspace';
import { allBuildings, lots } from './district';
import type { Item } from '../records/schemas';

export const worldPreferencesSchema = z.object({
  version: z.literal(1).default(1),
  weather: z.enum(['cerah', 'berawan', 'hujan']).default('cerah'),
  // Bawaan siang seperti video; waktu otomatis WIB tetap dapat dipilih di Suasana.
  time: z.enum(['otomatis', 'pagi', 'siang', 'senja', 'malam']).default('siang'),
  outfit: z.enum(['biru', 'lavender', 'hijau']).default('biru'),
  quality: z.enum(['otomatis', 'tinggi', 'sedang', 'hemat']).default('otomatis'),
});
export type WorldPreferences = z.infer<typeof worldPreferencesSchema>;
/** luar: kawasan; dalam: interior kantor; gudang: interior gudang. */
export type WorldLocation = 'luar' | 'dalam' | 'gudang';
export type CharacterActivity = 'idle' | 'work' | 'meeting' | 'gym';

export function getWorldModel(data: Workspace, now: Date) {
  const date = today(now);
  const units = [...(data.units || [])].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
  const tasks = (data['work-items'] || []).filter(
    (row) => !['selesai', 'dibatalkan'].includes(String(row.data.status)),
  );
  const meetings = (data.meetings || []).filter((row) => row.data.date === date);
  const currentMeeting = meetings.find((row) => {
    const start = Date.parse(`${date}T${row.data.time || '09:00'}:00+07:00`);
    return (
      now.getTime() >= start && now.getTime() < start + Number(row.data.duration || 60) * 60000
    );
  });
  const activities = (data.journal || []).filter((row) => row.data.date === date);
  const activity: CharacterActivity = currentMeeting
    ? 'meeting'
    : activities.length
      ? 'gym'
      : tasks.some((row) => row.data.status === 'proses')
        ? 'work'
        : 'idle';
  return {
    units,
    tasks,
    meetings,
    activities,
    currentMeeting,
    activity,
    ...placeUnits(units),
    inventory: summarizeInventory(data['inventory-items'] || []),
    deliveries: data.deliveries || [],
    staff: data.staff || [],
    notices: noticeBoard(data.decisions || [], data.documents || [], date),
    trucks: placeTrucks(data.deliveries || []),
    title: String(data.organization?.[0]?.data.title || 'Koperasi'),
    manager: String(data.organization?.[0]?.data.manager || 'Manajer'),
  };
}
export type WorldModel = ReturnType<typeof getWorldModel>;

/**
 * Isi papan pengumuman: tiga keputusan terbaru dan dokumen yang kedaluwarsa atau akan
 * kedaluwarsa dalam 30 hari. Hanya dari catatan; tanpa catatan papan kosong.
 */
export function noticeBoard(decisions: Item[], documents: Item[], date: string) {
  const limit = addDays(date, 30);
  return {
    decisions: [...decisions]
      .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)))
      .slice(0, 3),
    documents: documents
      .filter((row) => row.data.expires_date && String(row.data.expires_date) <= limit)
      .sort((a, b) => String(a.data.expires_date).localeCompare(String(b.data.expires_date)))
      .slice(0, 3),
  };
}

export const deliverySteps = ['dipesan', 'dikirim', 'tiba', 'diperiksa', 'selesai'] as const;
export type TruckSpot = { delivery: Item; place: 'dok' | 'antre'; index: number };

/**
 * Truk hanya muncul dari pengiriman masuk berstatus dikirim (parkir antre) atau
 * tiba/diperiksa (di dok). Dok mengikuti kolom Pintu dok; tanpa dok memakai dok kosong pertama.
 * Kelebihan truk tidak digambar agar tidak menumpuk; daftar tetap menampilkannya.
 */
export function placeTrucks(deliveries: Item[], docks = 4, queue = 3): TruckSpot[] {
  const incoming = deliveries
    .filter((row) => row.data.direction !== 'keluar')
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const atDock = incoming.filter((row) => ['tiba', 'diperiksa'].includes(String(row.data.status)));
  const used = new Set<number>();
  const spots: TruckSpot[] = [];
  for (const delivery of atDock) {
    const wanted = Number(String(delivery.data.dock || '').replace('D', '')) - 1;
    const index =
      Number.isInteger(wanted) && wanted >= 0 && wanted < docks && !used.has(wanted)
        ? wanted
        : [...Array(docks).keys()].find((slot) => !used.has(slot));
    if (index === undefined) continue;
    used.add(index);
    spots.push({ delivery, place: 'dok', index });
  }
  incoming
    .filter((row) => row.data.status === 'dikirim')
    .slice(0, queue)
    .forEach((delivery, index) => spots.push({ delivery, place: 'antre', index }));
  return spots;
}

export const rackIds = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type RackId = (typeof rackIds)[number];

/** Stok buku di bawah batas minimum; batas 0 atau kosong berarti tidak dipantau. */
export function isBelowMinimum(item: Item) {
  const stock = Number(item.data.book_quantity);
  const minimum = Number(item.data.minimum_quantity);
  return Number.isFinite(stock) && Number.isFinite(minimum) && minimum > 0 && stock < minimum;
}

/**
 * Kelompokkan barang menurut rak gudang. Barang tanpa rak yang ditempatkan di gerai
 * dianggap berada di gerai; sisanya menunggu penempatan di area staging.
 */
export function summarizeInventory(items: Item[]) {
  const racks = Object.fromEntries(rackIds.map((id) => [id, [] as Item[]])) as Record<
    RackId,
    Item[]
  >;
  const staging: Item[] = [];
  const atUnits: Item[] = [];
  for (const item of items) {
    const rack = String(item.data.rack || '') as RackId;
    if (rackIds.includes(rack)) racks[rack].push(item);
    else if (item.data.unit_id) atUnits.push(item);
    else staging.push(item);
  }
  return { items, racks, staging, atUnits, low: items.filter(isBelowMinimum) };
}
export type InventorySummary = ReturnType<typeof summarizeInventory>;

export type MeetingStep = {
  row: Item;
  /** Jam mulai WIB "HH:MM"; rapat tanpa jam dianggap 09:00 seperti aturan rapat aktif. */
  time: string;
  end: string;
  state: 'selesai' | 'berlangsung' | 'nanti';
};
/** Rapat hari ini berurutan jam mulai beserta keadaannya terhadap waktu sekarang. */
export function meetingTimeline(meetings: Item[], now: Date): MeetingStep[] {
  const date = today(now);
  return meetings
    .map((row) => {
      const time = String(row.data.time || '09:00');
      const start = Date.parse(`${date}T${time}:00+07:00`);
      const finish = start + Number(row.data.duration || 60) * 60000;
      const end = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(finish);
      const state: MeetingStep['state'] =
        now.getTime() >= finish ? 'selesai' : now.getTime() >= start ? 'berlangsung' : 'nanti';
      return { row, time, end, state, start };
    })
    .sort((a, b) => a.start - b.start)
    .map(({ row, time, end, state }) => ({ row, time, end, state }));
}

/** Bangunan distrik yang bisa diisi Gerai: unit KDMP berjenis tetap, lalu kavling gerai tambahan. */
const unitBuildings = allBuildings().filter((b) => b.id !== 'kantor' && b.id !== 'gudang');
const extraBuildings = unitBuildings.filter((b) => !b.kinds.length);
const matchesKind = (unit: Item, kinds: string[]) => {
  const kind = String(unit.data.kind || '').toLowerCase();
  return kinds.some((word) => kind.includes(word));
};

/**
 * Gerai menempati bangunan sesuai Jenis (sembako, apotek, klinik, simpan pinjam, cold storage);
 * jenis lain mengisi kavling gerai tambahan menurut kolom Lahan (1–3) lalu urutan dibuat.
 * Gerai berjenis logistik menjadi catatan gudang. Bangunan tanpa gerai tampil sebagai rencana.
 * Gerai lebih banyak dari kavling tetap ada di daftar Gerai (overflow).
 */
export function placeUnits(units: Item[]) {
  const taken = new Map<string, Item>();
  const waiting: Item[] = [];
  let warehouseUnit: Item | undefined;
  for (const unit of units) {
    if (!warehouseUnit && matchesKind(unit, allBuildings().find((b) => b.id === 'gudang')!.kinds)) {
      warehouseUnit = unit;
      continue;
    }
    const fixed = unitBuildings.find(
      (b) => b.kinds.length && !taken.has(b.id) && matchesKind(unit, b.kinds),
    );
    if (fixed) taken.set(fixed.id, unit);
    else waiting.push(unit);
  }
  const rest: Item[] = [];
  for (const unit of waiting) {
    const chosen = extraBuildings[Number(unit.data.slot) - 1];
    if (chosen && !taken.has(chosen.id)) taken.set(chosen.id, unit);
    else rest.push(unit);
  }
  for (const building of extraBuildings)
    if (!taken.has(building.id) && rest.length) taken.set(building.id, rest.shift()!);
  return {
    plots: unitBuildings.map((building) => ({
      id: building.id,
      name: building.name,
      lotName: lots.find((lot) => lot.buildings.includes(building))!.name,
      building,
      position: [building.rect.x + building.rect.w / 2, building.rect.z + building.rect.d / 2] as [
        number,
        number,
      ],
      unit: taken.get(building.id),
    })),
    warehouseUnit,
    overflow: rest.length,
  };
}
export function getWorldHour(time: WorldPreferences['time'], now: Date) {
  if (time !== 'otomatis') return { pagi: 8, siang: 12, senja: 17, malam: 21 }[time];
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );
}
