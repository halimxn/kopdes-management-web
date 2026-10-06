import type { Item } from '../../records/schemas';
import type { WorldLocation } from '../world-model';

export type NpcActivity = 'rapat' | 'bongkar' | 'kerja' | 'istirahat' | 'keliling' | 'pulang';
export type NpcPlan = {
  staff: Item;
  activity: NpcActivity;
  /** Lokasi dunia tempat karakter digambar; pulang berarti tidak digambar. */
  location: WorldLocation | null;
  /** Alasan dari catatan asli, ditampilkan di kartu karakter. */
  reason: string;
};

export const npcActivityNames: Record<NpcActivity, string> = {
  rapat: 'Ikut rapat',
  bongkar: 'Bongkar muat',
  kerja: 'Bekerja di meja',
  istirahat: 'Istirahat',
  keliling: 'Keliling',
  pulang: 'Di luar jam kerja',
};

const minutesOf = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};
function jakartaMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return minutesOf(parts);
}
const nameIn = (text: unknown, name: string) =>
  String(text || '')
    .toLocaleLowerCase('id')
    .includes(name.toLocaleLowerCase('id'));
const hashOf = (id: string) => [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);

/**
 * Kegiatan karakter Tim menurut prioritas: rapat → bongkar muat → tugas proses → istirahat
 * 12:00–13:00 → kerja/keliling bergiliran di jam kerja → pulang. Ini visualisasi jadwal dan
 * tugas tercatat, bukan bukti kehadiran. Nama dicocokkan dengan teks peserta/penanggung jawab.
 */
export function planStaff(
  staff: Item[],
  context: { currentMeeting?: Item; tasks: Item[]; deliveries: Item[] },
  now: Date,
): NpcPlan[] {
  const minutes = jakartaMinutes(now);
  const atDock = context.deliveries.some(
    (row) =>
      row.data.direction !== 'keluar' && ['tiba', 'diperiksa'].includes(String(row.data.status)),
  );
  return staff
    .filter((row) => ['aktif', 'ditunjuk'].includes(String(row.data.status)))
    .map((row): NpcPlan => {
      const name = String(row.data.title);
      const workplace = String(row.data.workplace || 'kantor');
      const home: WorldLocation =
        workplace === 'gudang' ? 'gudang' : workplace === 'gerai' ? 'luar' : 'dalam';
      const [start, end] = String(row.data.work_hours || '08:00-16:00').split('-');
      const working = minutes >= minutesOf(start) && minutes < minutesOf(end);
      const meeting = context.currentMeeting;
      const participants = String(meeting?.data.participants || '').trim();
      if (meeting && (participants ? nameIn(participants, name) : workplace === 'kantor'))
        return {
          staff: row,
          activity: 'rapat',
          location: 'dalam',
          reason: `Rapat: ${meeting.data.title}`,
        };
      if (!working)
        return {
          staff: row,
          activity: 'pulang',
          location: null,
          reason: `Jam kerja ${start}–${end}`,
        };
      if (atDock && row.data.section === 'gudang & logistik')
        return {
          staff: row,
          activity: 'bongkar',
          location: 'gudang',
          reason: 'Truk pengiriman di dok',
        };
      const task = context.tasks.find(
        (item) => item.data.status === 'proses' && nameIn(item.data.assignee, name),
      );
      if (task)
        return {
          staff: row,
          activity: 'kerja',
          location: home,
          reason: `Tugas: ${task.data.title}`,
        };
      if (minutes >= 12 * 60 && minutes < 13 * 60)
        return {
          staff: row,
          activity: 'istirahat',
          location: 'dalam',
          reason: 'Jam istirahat 12:00–13:00',
        };
      // Giliran 15 menit: sebagian karakter keliling agar kantor tidak diam, tanpa acak tiap muat.
      const roaming = (hashOf(row.id) + Math.floor(minutes / 15)) % 4 === 0;
      return roaming
        ? { staff: row, activity: 'keliling', location: home, reason: 'Keliling di jam kerja' }
        : { staff: row, activity: 'kerja', location: home, reason: 'Jam kerja' };
    });
}
