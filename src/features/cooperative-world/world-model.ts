import { z } from 'zod';
import { today } from '@/lib/date';
import type { Workspace } from '../workspace/useWorkspace';
import { landPositions } from './layout';
import type { Item } from '../records/schemas';

export const worldPreferencesSchema = z.object({
  version: z.literal(1).default(1),
  weather: z.enum(['cerah', 'berawan', 'hujan']).default('cerah'),
  time: z.enum(['otomatis', 'pagi', 'siang', 'senja', 'malam']).default('otomatis'),
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
    title: String(data.organization?.[0]?.data.title || 'Koperasi'),
    manager: String(data.organization?.[0]?.data.manager || 'Manajer'),
  };
}
export type WorldModel = ReturnType<typeof getWorldModel>;

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

/**
 * Gerai dengan pilihan lahan menempati lahan itu lebih dulu, sehingga posisinya tidak bergeser
 * saat gerai lain dihapus. Pilihan ganda dimenangkan gerai yang dibuat lebih dulu; sisanya,
 * termasuk "otomatis", mengisi lahan kosong sesuai urutan dibuat.
 */
export function placeUnits(units: Item[]) {
  const slots: (Item | undefined)[] = landPositions.map(() => undefined);
  const waiting: Item[] = [];
  for (const unit of units) {
    const index = Number(unit.data.slot) - 1;
    if (Number.isInteger(index) && index >= 0 && index < slots.length && !slots[index])
      slots[index] = unit;
    else waiting.push(unit);
  }
  for (let i = 0; i < slots.length && waiting.length; i++)
    if (!slots[i]) slots[i] = waiting.shift();
  return {
    plots: landPositions.map((position, index) => ({
      id: `lahan-${index + 1}`,
      position,
      unit: slots[index],
    })),
    overflow: waiting.length,
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
