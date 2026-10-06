'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, Plus, Store, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { recordHref } from '../../workspace/workspace-navigation';
import type { MeetingStep, WorldModel } from '../world-model';

export type ListTab = 'lokasi' | 'tugas' | 'rapat';
type Props = {
  model: WorldModel;
  timeline: MeetingStep[];
  query: string;
  unavailable: boolean;
  onSelect: (id: string) => void;
};

const meetingState = { selesai: 'Selesai', berlangsung: 'Berlangsung', nanti: 'Nanti' };
const matches = (text: string, query: string) =>
  text.toLowerCase().includes(query.trim().toLowerCase());

/** Kartu bertab seperti daftar dok/forklift/truk pada video, berisi catatan koperasi. */
export function ListCard({ model, timeline, query, unavailable, onSelect }: Props) {
  const [tab, setTab] = useState<ListTab>('lokasi');
  const places = [
    {
      id: 'koperasi',
      title: 'Kantor koperasi',
      note: 'Rapat, tugas, kegiatan, arsip',
      pill: 'Masuk',
      tone: 'blue',
      icon: <Building2 size={17} />,
    },
    {
      id: 'gudang',
      title: 'Gudang koperasi',
      note: 'Dok bongkar muat dan stok',
      pill: '4 dok',
      tone: 'blue',
      icon: <Warehouse size={17} />,
    },
    ...model.plots.map((plot) => ({
      id: plot.id,
      title: plot.unit ? String(plot.unit.data.title) : `Lahan gerai ${plot.id.split('-')[1]}`,
      note: `Lahan ${plot.id.split('-')[1].padStart(2, '0')} · ${plot.unit ? plot.unit.data.kind || 'Gerai' : 'Belum ada bangunan'}`,
      pill: plot.unit ? String(plot.unit.data.status || 'rencana') : 'Kosong',
      tone: plot.unit ? (plot.unit.data.status === 'aktif' ? 'green' : 'amber') : 'muted',
      icon: plot.unit ? <Store size={17} /> : <Plus size={17} />,
    })),
  ].filter((item) => !query || matches(`${item.title} ${item.note}`, query));
  const tasks = model.tasks.filter((row) => !query || matches(String(row.data.title), query));
  const meetings = timeline.filter((step) => !query || matches(String(step.row.data.title), query));
  const tabs: { id: ListTab; label: string; count: number }[] = [
    { id: 'lokasi', label: 'Lokasi', count: places.length },
    { id: 'tugas', label: 'Tugas', count: tasks.length },
    { id: 'rapat', label: 'Rapat', count: meetings.length },
  ];
  return (
    <section className="cw-list" aria-label="Daftar lokasi dan catatan">
      <div className="cw-tabs" role="tablist">
        {tabs.map((item) => (
          <Button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            <span className="cw-tab-count">
              {unavailable && item.id !== 'lokasi' ? '—' : item.count}
            </span>
          </Button>
        ))}
      </div>
      <div className="cw-list-rows" role="tabpanel">
        {tab === 'lokasi' &&
          places.map((item) => (
            <Button key={item.id} className="cw-row" onClick={() => onSelect(item.id)}>
              <span className={`cw-row-icon is-${item.tone}`}>{item.icon}</span>
              <span className="cw-row-text">
                <strong>{item.title}</strong>
                <small>{item.note}</small>
              </span>
              <span className={`cw-pill is-${item.tone}`}>{item.pill}</span>
              <ChevronRight size={15} />
            </Button>
          ))}
        {tab === 'tugas' &&
          tasks.slice(0, 8).map((row) => (
            <Link key={row.id} className="cw-row" href={recordHref('work-items', row)}>
              <span className="cw-row-text">
                <strong>{String(row.data.title)}</strong>
                <small>
                  {row.data.due_date ? `Tenggat ${row.data.due_date}` : 'Tanpa tenggat'}
                </small>
              </span>
              <span className={`cw-pill ${row.data.status === 'proses' ? 'is-blue' : 'is-muted'}`}>
                {String(row.data.status || 'rencana')}
              </span>
              <ChevronRight size={15} />
            </Link>
          ))}
        {tab === 'rapat' &&
          meetings.map((step) => (
            <Link key={step.row.id} className="cw-row" href={recordHref('meetings', step.row)}>
              <span className="cw-row-text">
                <strong>{String(step.row.data.title)}</strong>
                <small>
                  {step.time}–{step.end} WIB
                </small>
              </span>
              <span
                className={`cw-pill ${step.state === 'berlangsung' ? 'is-green' : step.state === 'nanti' ? 'is-blue' : 'is-muted'}`}
              >
                {meetingState[step.state]}
              </span>
              <ChevronRight size={15} />
            </Link>
          ))}
        {tab === 'lokasi' && !places.length && <p className="cw-empty">Lokasi tidak ditemukan.</p>}
        {tab === 'tugas' &&
          !tasks.length &&
          (unavailable ? (
            <p className="cw-empty">Data tugas belum tersedia.</p>
          ) : (
            <p className="cw-empty">
              Tidak ada tugas terbuka{query ? ' yang cocok' : ''}.{' '}
              <Link href="/tugas">Buka Tugas</Link>
            </p>
          ))}
        {tab === 'rapat' &&
          !meetings.length &&
          (unavailable ? (
            <p className="cw-empty">Data rapat belum tersedia.</p>
          ) : (
            <p className="cw-empty">
              Tidak ada rapat hari ini{query ? ' yang cocok' : ''}.{' '}
              <Link href="/rapat">Jadwalkan rapat</Link>
            </p>
          ))}
        {tab === 'lokasi' && model.overflow > 0 && (
          <p className="cw-empty">
            {model.overflow} gerai lain ada di daftar Gerai; kawasan ini memiliki tujuh lahan.
          </p>
        )}
      </div>
    </section>
  );
}
