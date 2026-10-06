import Link from 'next/link';
import { WorldIcon } from './WorldIcon';
import type { StockState } from './DetailCard';
import { rackIds, type MeetingStep, type WorldModel } from '../world-model';

type Props = {
  model: WorldModel;
  timeline: MeetingStep[];
  /** Saat memuat atau galat angka diganti tanda — agar tidak terbaca sebagai nol. */
  unavailable: boolean;
  loading: boolean;
  /** Zona/interior gudang menampilkan ringkasan stok, bukan ringkasan kantor. */
  warehouse: boolean;
  stockState: StockState;
};

export function KpiCards({ model, timeline, unavailable, loading, warehouse, stockState }: Props) {
  const value = (count: number) => (unavailable ? '—' : count);
  const working = model.tasks.filter((row) => row.data.status === 'proses').length;
  const current = timeline.find((step) => step.state === 'berlangsung');
  const next = timeline.find((step) => step.state === 'nanti');
  const inventory = model.inventory;
  const stockReady = stockState === 'aktif';
  const stockNote = (text: string) =>
    stockState === 'belum-aktif'
      ? 'Pencatatan belum aktif'
      : stockState === 'pratinjau'
        ? 'Tanpa data pratinjau'
        : stockReady
          ? text
          : 'Data belum tersedia';
  const stockValue = (count: number) => (stockReady ? count : '—');
  const filledRacks = rackIds.filter((id) => inventory.racks[id].length).length;
  const stockCards = [
    {
      href: '/barang',
      icon: <WorldIcon kind="kardus" size={34} />,
      label: 'Barang tercatat',
      value: stockValue(inventory.items.length),
      unit: '',
      note: stockNote(`${inventory.atUnits.length} ditempatkan di gerai`),
    },
    {
      href: '/barang',
      icon: <WorldIcon kind="kardus-minimum" size={34} />,
      label: 'Di bawah minimum',
      value: stockValue(inventory.low.length),
      unit: '',
      note: stockNote(inventory.low.length ? 'Perlu ditambah' : 'Semua di atas minimum'),
    },
    {
      href: '/barang',
      icon: <WorldIcon kind="rak" size={34} />,
      label: 'Rak terisi',
      value: stockValue(filledRacks),
      unit: `/ ${rackIds.length} rak`,
      note: stockNote(`${inventory.staging.length} belum punya rak`),
    },
  ];
  const officeCards = [
    {
      href: '/gerai',
      icon: <WorldIcon kind="gerai" size={34} />,
      label: 'Gerai tercatat',
      value: value(model.units.length),
      unit: `/ ${model.plots.length} bangunan`,
      note: loading ? 'Memuat data…' : unavailable ? 'Data belum tersedia' : 'Terhubung ke Gerai',
    },
    {
      href: '/tugas',
      icon: <WorldIcon kind="tugas" size={34} />,
      label: 'Tugas terbuka',
      value: value(model.tasks.length),
      unit: '',
      note: unavailable ? 'Data belum tersedia' : `${working} sedang dikerjakan`,
    },
    {
      href: '/rapat',
      icon: <WorldIcon kind="rapat" size={34} />,
      label: 'Rapat hari ini',
      value: value(model.meetings.length),
      unit: '',
      note: unavailable
        ? 'Data belum tersedia'
        : current
          ? 'Sedang berlangsung'
          : next
            ? `Berikutnya ${next.time} WIB`
            : 'Tidak ada jadwal lagi',
    },
  ];
  const cards = warehouse ? stockCards : officeCards;
  return (
    <div className="cw-kpis">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className="cw-kpi cw-card">
          <span className="cw-kpi-icon">{card.icon}</span>
          <span className="cw-kpi-text">
            <small>{card.label}</small>
            <strong>
              {card.value}
              {card.unit && <em> {card.unit}</em>}
            </strong>
            <span className="cw-kpi-note">{card.note}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
