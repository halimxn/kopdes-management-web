import Link from 'next/link';
import { CheckCheck, Store, Users } from 'lucide-react';
import type { MeetingStep, WorldModel } from '../world-model';
import { landPositions } from '../layout';

type Props = {
  model: WorldModel;
  timeline: MeetingStep[];
  /** Saat memuat atau galat angka diganti tanda — agar tidak terbaca sebagai nol. */
  unavailable: boolean;
  loading: boolean;
};

export function KpiCards({ model, timeline, unavailable, loading }: Props) {
  const value = (count: number) => (unavailable ? '—' : count);
  const working = model.tasks.filter((row) => row.data.status === 'proses').length;
  const current = timeline.find((step) => step.state === 'berlangsung');
  const next = timeline.find((step) => step.state === 'nanti');
  const cards = [
    {
      href: '/gerai',
      icon: <Store size={20} />,
      label: 'Gerai tercatat',
      value: value(model.units.length),
      unit: `/ ${landPositions.length} lahan`,
      note: loading ? 'Memuat data…' : unavailable ? 'Data belum tersedia' : 'Terhubung ke Gerai',
    },
    {
      href: '/tugas',
      icon: <CheckCheck size={20} />,
      label: 'Tugas terbuka',
      value: value(model.tasks.length),
      unit: '',
      note: unavailable ? 'Data belum tersedia' : `${working} sedang dikerjakan`,
    },
    {
      href: '/rapat',
      icon: <Users size={20} />,
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
