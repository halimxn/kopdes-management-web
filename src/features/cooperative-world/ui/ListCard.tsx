'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { today } from '@/lib/date';
import { recordHref } from '../../workspace/workspace-navigation';
import {
  deliverySteps,
  isBelowMinimum,
  rackIds,
  type MeetingStep,
  type WorldLocation,
  type WorldModel,
} from '../world-model';
import type { StockState } from './DetailCard';
import { npcActivityNames, type NpcPlan } from '../npc/schedule';
import { warehouse } from '../layout';
import { truckRoute } from '../truck-routes';
import { WorldIcon } from './WorldIcon';

export type ListTab = 'lokasi' | 'dok' | 'hari' | 'tim' | 'stok' | 'tugas' | 'rapat';
type Props = {
  model: WorldModel;
  timeline: MeetingStep[];
  query: string;
  unavailable: boolean;
  plans: NpcPlan[];
  location: WorldLocation;
  stockState: StockState;
  onSelect: (id: string) => void;
};

const meetingState = { selesai: 'Selesai', berlangsung: 'Berlangsung', nanti: 'Nanti' };
const matches = (text: string, query: string) =>
  text.toLowerCase().includes(query.trim().toLowerCase());

/** Kartu bertab seperti daftar dok/forklift/truk pada video, berisi catatan koperasi. */
export function ListCard({
  model,
  timeline,
  query,
  unavailable,
  plans,
  location,
  stockState,
  onSelect,
}: Props) {
  // Linimasa hari ini: rapat berjam lebih dulu, lalu pengiriman dan kegiatan bertanggal hari ini.
  const date = today();
  const events = [
    ...timeline.map((step) => ({
      key: `m-${step.row.id}`,
      time: step.time,
      title: String(step.row.data.title),
      kind: 'Rapat',
      href: recordHref('meetings', step.row),
    })),
    ...model.deliveries
      .filter((row) => row.data.planned_date === date || row.data.arrived_date === date)
      .map((row) => ({
        key: `d-${row.id}`,
        time: 'hari ini',
        title: String(row.data.title),
        kind: `Pengiriman · ${row.data.status}`,
        href: recordHref('deliveries', row),
      })),
    ...model.activities.map((row) => ({
      key: `j-${row.id}`,
      time: 'hari ini',
      title: String(row.data.title),
      kind: 'Kegiatan',
      href: recordHref('journal', row),
    })),
  ].filter((event) => !query || matches(event.title, query));
  const team = plans.filter(
    (plan) => !query || matches(`${plan.staff.data.title} ${plan.staff.data.section}`, query),
  );
  const [tab, setTab] = useState<ListTab>('lokasi');
  const inventory = model.inventory;
  const stockReady = stockState === 'aktif';
  const low = stockReady ? inventory.low.length : 0;
  // Di dalam gudang, tab Lokasi berisi rak; di kawasan berisi kantor, gudang dan lahan.
  const rackPlaces = [
    ...rackIds.map((id) => {
      const items = inventory.racks[id];
      const lowItems = items.filter(isBelowMinimum).length;
      return {
        id: `rak-${id}`,
        title: `Rak ${id}`,
        note: stockReady ? `${items.length} barang` : 'Isi mengikuti daftar Barang',
        pill: !stockReady
          ? '—'
          : lowItems
            ? `${lowItems} minimum`
            : items.length
              ? 'Cukup'
              : 'Kosong',
        tone: !stockReady ? 'muted' : lowItems ? 'amber' : items.length ? 'green' : 'muted',
        icon: <WorldIcon kind="rak" size={30} />,
      };
    }),
    {
      id: 'staging',
      title: 'Area staging',
      note: 'Barang tanpa rak',
      pill: stockReady ? `${inventory.staging.length} barang` : '—',
      tone: 'muted',
      icon: <WorldIcon kind="palet" size={30} />,
    },
  ];
  const sitePlaces = [
    {
      id: 'koperasi',
      title: 'Kantor koperasi',
      note: 'Rapat, tugas, kegiatan, arsip',
      pill: 'Masuk',
      tone: 'blue',
      icon: <WorldIcon kind="kantor" size={30} />,
    },
    {
      id: 'gudang',
      title: 'Gudang koperasi',
      note: 'Dok bongkar muat dan stok',
      pill: low ? `${low} minimum` : '4 dok',
      tone: low ? 'amber' : 'blue',
      icon: <WorldIcon kind="gudang" size={30} />,
    },
    ...model.plots.map((plot) => ({
      id: plot.id,
      title: plot.unit ? String(plot.unit.data.title) : `Lahan gerai ${plot.id.split('-')[1]}`,
      note: `Lahan ${plot.id.split('-')[1].padStart(2, '0')} · ${plot.unit ? plot.unit.data.kind || 'Gerai' : 'Belum ada bangunan'}`,
      pill: plot.unit ? String(plot.unit.data.status || 'rencana') : 'Kosong',
      tone: plot.unit ? (plot.unit.data.status === 'aktif' ? 'green' : 'amber') : 'muted',
      icon: <WorldIcon kind={plot.unit ? 'gerai' : 'lahan'} size={30} />,
    })),
  ];
  const places = (location === 'gudang' ? rackPlaces : sitePlaces).filter(
    (item) => !query || matches(`${item.title} ${item.note}`, query),
  );
  const stock = stockReady
    ? [...inventory.items]
        .filter((row) => !query || matches(`${row.data.title} ${row.data.sku || ''}`, query))
        .sort((a, b) => Number(isBelowMinimum(b)) - Number(isBelowMinimum(a)))
    : [];
  // Tab Dok meniru tab "Docks" video: empat pintu dok dengan truk dari Pengiriman, lalu truk antre.
  const docks = [
    ...warehouse.docks.map((_, index) => {
      const spot = model.trucks.find((row) => row.place === 'dok' && row.index === index);
      return { key: `D${index + 1}`, label: `D${index + 1}`, note: 'Gudang', spot };
    }),
    ...model.trucks
      .filter((row) => row.place === 'antre')
      .map((spot) => {
        const route = truckRoute(spot, model.trucks);
        return {
          key: `antre-${spot.delivery.id}`,
          label: 'Antre',
          note: route.dock === null ? 'Dok penuh' : `Ke D${route.dock + 1}`,
          spot,
        };
      }),
  ].filter(
    (row) => !query || matches(`${row.label} ${row.spot?.delivery.data.title || ''}`, query),
  );
  const tasks = model.tasks.filter((row) => !query || matches(String(row.data.title), query));
  const meetings = timeline.filter((step) => !query || matches(String(step.row.data.title), query));
  const tabs: { id: ListTab; label: string; count: number }[] = [
    { id: 'lokasi', label: location === 'gudang' ? 'Rak' : 'Lokasi', count: places.length },
    { id: 'dok', label: 'Dok', count: model.trucks.length },
    { id: 'hari', label: 'Hari ini', count: events.length },
    { id: 'tim', label: 'Tim', count: team.length },
    { id: 'stok', label: 'Stok', count: stock.length },
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
              {(unavailable && item.id !== 'lokasi') || (item.id === 'stok' && !stockReady)
                ? '—'
                : item.count}
            </span>
          </Button>
        ))}
      </div>
      <div className="cw-list-rows" role="tabpanel">
        {tab === 'lokasi' &&
          places.map((item) => (
            <Button key={item.id} className="cw-row" onClick={() => onSelect(item.id)}>
              <span className="cw-row-art">{item.icon}</span>
              <span className="cw-row-text">
                <strong>{item.title}</strong>
                <small>{item.note}</small>
              </span>
              <span className={`cw-pill is-${item.tone}`}>{item.pill}</span>
              <ChevronRight size={15} />
            </Button>
          ))}
        {tab === 'dok' &&
          docks.map((row) => {
            const status = String(row.spot?.delivery.data.status || '');
            const step = deliverySteps.indexOf(status as (typeof deliverySteps)[number]) + 1;
            return (
              <Button
                key={row.key}
                className="cw-row cw-dock-row"
                onClick={() => onSelect(row.spot ? `kirim-${row.spot.delivery.id}` : 'gudang')}
              >
                <span className="cw-dock-code">
                  <strong>{row.label}</strong>
                  <small>{row.note}</small>
                </span>
                <span className="cw-row-text">
                  {row.spot ? (
                    <strong>
                      <i className="cw-dot" /> {String(row.spot.delivery.data.title)}
                    </strong>
                  ) : (
                    <small>Belum ada truk</small>
                  )}
                </span>
                <span
                  className={`cw-pill ${row.spot ? (row.spot.place === 'dok' ? 'is-green' : 'is-blue') : 'is-muted'}`}
                >
                  {row.spot ? (row.spot.place === 'dok' ? 'Bongkar' : 'Antre') : 'Kosong'}
                </span>
                {row.spot ? (
                  <span
                    className="cw-mini-progress"
                    aria-label={`Tahap ${step} dari ${deliverySteps.length}`}
                  >
                    <i>
                      <b style={{ width: `${(step / deliverySteps.length) * 100}%` }} />
                    </i>
                    {step}/{deliverySteps.length}
                  </span>
                ) : (
                  <span className="cw-mini-progress" />
                )}
                <ChevronRight size={15} />
              </Button>
            );
          })}
        {tab === 'dok' && !model.trucks.length && (
          <p className="cw-empty">
            {unavailable ? 'Data pengiriman belum tersedia.' : 'Tidak ada truk di kawasan.'}{' '}
            <Link href="/pengiriman">Buka Pengiriman</Link>
          </p>
        )}
        {tab === 'hari' &&
          events.map((event) => (
            <Link key={event.key} className="cw-row" href={event.href}>
              <span className="cw-row-time">{event.time}</span>
              <span className="cw-row-text">
                <strong>{event.title}</strong>
                <small>{event.kind}</small>
              </span>
              <ChevronRight size={15} />
            </Link>
          ))}
        {tab === 'hari' && !events.length && (
          <p className="cw-empty">
            {unavailable
              ? 'Data belum tersedia.'
              : 'Belum ada rapat, pengiriman, atau kegiatan hari ini.'}
          </p>
        )}
        {tab === 'tim' &&
          team.map((plan) => (
            <Button
              key={plan.staff.id}
              className="cw-row"
              onClick={() => onSelect(`staf-${plan.staff.id}`)}
            >
              <span className="cw-row-text">
                <strong>{String(plan.staff.data.title)}</strong>
                <small>{String(plan.staff.data.section || 'seksi belum ditentukan')}</small>
              </span>
              <span className={`cw-pill ${plan.activity === 'pulang' ? 'is-muted' : 'is-blue'}`}>
                {npcActivityNames[plan.activity]}
              </span>
              <ChevronRight size={15} />
            </Button>
          ))}
        {tab === 'tim' && !team.length && (
          <p className="cw-empty">
            {unavailable ? 'Data tim belum tersedia.' : 'Belum ada anggota tim aktif.'}{' '}
            <Link href="/tim">Buka Tim</Link>
          </p>
        )}
        {tab === 'stok' &&
          stock.slice(0, 10).map((row) => {
            const short = isBelowMinimum(row);
            return (
              <Link key={row.id} className="cw-stock-row" href={recordHref('inventory-items', row)}>
                <WorldIcon kind={short ? 'kardus-minimum' : 'kardus'} size={30} />
                <span className="cw-row-text">
                  <strong>{String(row.data.title)}</strong>
                  <small>Rak {String(row.data.rack || 'belum ditentukan')}</small>
                </span>
                <span className="cw-stock-qty">
                  {String(row.data.book_quantity ?? '—')}
                  <small> {String(row.data.measurement || '')}</small>
                </span>
                <span className={`cw-pill ${short ? 'is-amber' : 'is-green'}`}>
                  {short ? 'Minimum' : 'Cukup'}
                </span>
              </Link>
            );
          })}
        {tab === 'stok' && !stock.length && (
          <p className="cw-empty">
            {stockState === 'belum-aktif' ? (
              <>
                Pencatatan barang belum aktif. <Link href="/pencatatan">Buka Pencatatan</Link>
              </>
            ) : !stockReady ? (
              'Data barang belum tersedia.'
            ) : (
              <>
                Belum ada barang{query ? ' yang cocok' : ''}.{' '}
                <Link href="/barang">Buka Barang</Link>
              </>
            )}
          </p>
        )}
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
