import { today } from '@/lib/date';
import type { Item } from '@/features/records/schemas';
import type { Workspace } from '@/features/workspace/useWorkspace';

// Contoh khusus halaman development (?contoh=1) untuk memeriksa tampilan dunia berisi data.
// Semua judul diawali "Contoh" agar tidak terbaca sebagai catatan koperasi sungguhan.
const created = '2026-10-01T00:00:00Z';
const row = (id: string, data: Record<string, unknown>): Item => ({
  id,
  data,
  created_at: created,
  updated_at: created,
});

export function sampleWorkspace(): Workspace {
  const date = today();
  const items: [string, string, number, number, string][] = [
    ['Contoh beras 5 kg', 'A', 40, 20, 'karung'],
    ['Contoh minyak 1 L', 'A', 6, 24, 'botol'],
    ['Contoh gula 1 kg', 'A', 30, 20, 'pak'],
    ['Contoh tepung 1 kg', 'B', 12, 10, 'pak'],
    ['Contoh telur', 'B', 3, 10, 'tray'],
    ['Contoh pupuk 25 kg', 'C', 18, 5, 'karung'],
    ['Contoh air mineral', 'D', 50, 24, 'dus'],
    ['Contoh sabun', 'D', 2, 12, 'pak'],
    ['Contoh kopi sachet', 'belum ditentukan', 20, 10, 'renceng'],
  ];
  return {
    organization: [row('org', { title: 'Contoh Koperasi', manager: 'Contoh Manajer' })],
    units: [
      row('unit-1', { title: 'Contoh Gerai Sembako', kind: 'sembako', status: 'aktif', slot: '2' }),
      row('unit-2', { title: 'Contoh Apotek', kind: 'apotek', status: 'persiapan', slot: '5' }),
    ],
    'inventory-items': items.map(([title, rack, stock, minimum, measurement], index) =>
      row(`item-${index}`, {
        title,
        sku: `CTH-${index + 1}`,
        rack,
        book_quantity: stock,
        minimum_quantity: minimum,
        measurement,
      }),
    ),
    'work-items': [
      row('task-1', {
        title: 'Contoh cek stok minyak',
        status: 'proses',
        due_date: date,
        assignee: 'Contoh Budi',
      }),
      row('task-2', {
        title: 'Contoh susun rak B',
        status: 'rencana',
        due_date: '2026-10-01',
        assignee: 'Contoh Citra',
      }),
    ],
    staff: [
      row('st-1', {
        title: 'Contoh Ani',
        role: 'Kasir',
        status: 'aktif',
        section: 'layanan anggota',
        outfit: 'hijau',
        hair: 'berkerudung',
        work_hours: '00:00-23:59',
      }),
      row('st-2', {
        title: 'Contoh Budi',
        role: 'Admin',
        status: 'aktif',
        section: 'administrasi & keuangan',
        outfit: 'biru',
        hair: 'pendek',
        work_hours: '00:00-23:59',
      }),
      row('st-3', {
        title: 'Contoh Citra',
        role: 'Usaha',
        status: 'aktif',
        section: 'usaha & gerai',
        outfit: 'lavender',
        hair: 'panjang',
        work_hours: '00:00-23:59',
      }),
      row('st-4', {
        title: 'Contoh Dodi',
        role: 'Gudang',
        status: 'aktif',
        section: 'gudang & logistik',
        workplace: 'gudang',
        outfit: 'oranye',
        hair: 'topi',
        work_hours: '00:00-23:59',
      }),
      row('st-5', {
        title: 'Contoh Eka',
        role: 'Umum',
        status: 'aktif',
        section: 'umum',
        outfit: 'abu',
        hair: 'pendek',
        work_hours: '00:00-23:59',
      }),
    ],
    deliveries: [
      row('del-1', {
        title: 'Contoh kiriman beras',
        direction: 'masuk',
        status: 'tiba',
        dock: 'D2',
        vehicle: 'Contoh truk boks',
        planned_date: date,
      }),
      row('del-2', {
        title: 'Contoh kiriman minyak',
        direction: 'masuk',
        status: 'diperiksa',
        planned_date: date,
      }),
      row('del-3', {
        title: 'Contoh kiriman pupuk',
        direction: 'masuk',
        status: 'dikirim',
        planned_date: date,
      }),
    ],
    decisions: [row('dec-1', { title: 'Contoh keputusan jam buka gerai', date })],
    documents: [row('doc-1', { title: 'Contoh izin usaha', expires_date: date })],
    meetings: [
      row('meet-1', { title: 'Contoh briefing pagi', date, time: '08:00', duration: 30 }),
      row('meet-2', { title: 'Contoh rapat pengurus', date, time: '15:00', duration: 60 }),
    ],
  };
}
