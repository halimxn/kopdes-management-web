'use client';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCheck, ChevronRight, Dumbbell, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { today } from '@/lib/date';
import { recordHref } from '../../workspace/workspace-navigation';
import { warehouse, worldStations, worldZones, type WorldZone } from '../layout';
import { truckRoute } from '../truck-routes';
import { WorldIcon } from './WorldIcon';
import { StockBar } from './Charts';
import {
  deliverySteps,
  isBelowMinimum,
  type CharacterActivity,
  type MeetingStep,
  type RackId,
  type WorldLocation,
  type WorldModel,
  type WorldPreferences,
} from '../world-model';
import type { Item } from '../../records/schemas';
import { npcActivityNames, type NpcPlan } from '../npc/schedule';

/** aktif: data barang dimuat; belum-aktif: migrasi pencatatan belum terpasang di server. */
export type StockState = 'aktif' | 'belum-aktif' | 'pratinjau' | 'tidak-tersedia';

/** Daftar barang bergaya kartu inventory video: barang di bawah minimum didahulukan. */
function StockList({ items, state, empty }: { items: Item[]; state: StockState; empty: string }) {
  if (state === 'belum-aktif')
    return (
      <p className="cw-note">
        Pencatatan barang belum aktif di server, sehingga isi gudang belum dapat ditampilkan.{' '}
        <Link href="/pencatatan">Buka Pencatatan</Link>
      </p>
    );
  if (state !== 'aktif')
    return (
      <p className="cw-note">
        {state === 'pratinjau' ? 'Pratinjau tanpa data barang.' : 'Data barang belum tersedia.'}
      </p>
    );
  if (!items.length) return <p className="cw-note">{empty}</p>;
  const sorted = [...items].sort(
    (a, b) =>
      Number(isBelowMinimum(b)) - Number(isBelowMinimum(a)) ||
      String(a.data.title).localeCompare(String(b.data.title)),
  );
  return (
    <div className="cw-stock">
      <h2 className="cw-section-title cw-section-split">
        Inventaris <span>stok buku</span>
      </h2>
      {sorted.slice(0, 8).map((item) => {
        const low = isBelowMinimum(item);
        return (
          <Link
            key={item.id}
            className="cw-stock-row"
            href={recordHref('inventory-items', item)}
            title={`Minimum ${String(item.data.minimum_quantity ?? '—')}`}
          >
            <WorldIcon kind={low ? 'kardus-minimum' : 'kardus'} size={30} />
            <span className="cw-stock-main">
              <span className="cw-stock-name">{String(item.data.title)}</span>
              <StockBar
                stock={Number(item.data.book_quantity)}
                minimum={Number(item.data.minimum_quantity) || 0}
              />
            </span>
            <span className="cw-stock-qty">
              {String(item.data.book_quantity ?? '—')}
              <small> {String(item.data.measurement || '')}</small>
            </span>
            <span className={`cw-pill ${low ? 'is-amber' : 'is-green'}`}>
              {low ? 'Minimum' : 'Cukup'}
            </span>
          </Link>
        );
      })}
      {sorted.length > 8 && (
        <Link className="cw-secondary" href="/barang">
          {sorted.length - 8} barang lainnya <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

/** Warna pill tahap pengiriman: tiba/diperiksa (bongkar) hijau, dikirim biru, lainnya abu. */
function deliveryTone(status: string) {
  return ['tiba', 'diperiksa'].includes(status)
    ? 'is-green'
    : status === 'dikirim'
      ? 'is-blue'
      : status === 'selesai'
        ? ''
        : 'is-amber';
}

export const activityNames: Record<CharacterActivity, string> = {
  idle: 'Bersantai',
  meeting: 'Duduk rapat',
  work: 'Mengerjakan tugas',
  gym: 'Berolahraga',
};

type Props = {
  /** Alasan rencana maskot manajer dari data (pengganti bubble di peta). */
  mascotNote: string;
  selected: string;
  location: WorldLocation;
  zone: WorldZone;
  model: WorldModel;
  timeline: MeetingStep[];
  plans: NpcPlan[];
  preferences: WorldPreferences;
  onPreference: <K extends keyof WorldPreferences>(key: K, value: WorldPreferences[K]) => void;
  rehearsal: CharacterActivity | 'otomatis';
  onRehearsal: (value: CharacterActivity | 'otomatis') => void;
  activity: CharacterActivity;
  weatherIcon: React.ReactNode;
  status: { label: string; tone: 'green' | 'muted' | 'red' };
  unavailable: boolean;
  onSelect: (id: string) => void;
  stockState: StockState;
  onEnter: (location: WorldLocation) => void;
  onClose?: () => void;
};

function Rows({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="cw-kv">
      {items.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
function Meter({
  label,
  value,
  total,
  tone = 'blue',
}: {
  label: string;
  value: number | string;
  total: number | string;
  tone?: 'blue' | 'green';
}) {
  const ratio =
    typeof value === 'number' && typeof total === 'number' && total > 0 ? value / total : 0;
  return (
    <div className="cw-meter">
      <small>{label}</small>
      <strong>
        {value}
        <span> / {total}</span>
      </strong>
      <i className={`is-${tone}`}>
        <b style={{ width: `${Math.min(1, ratio) * 100}%` }} />
      </i>
    </div>
  );
}

export function DetailCard(props: Props) {
  const { selected, location, zone, model, timeline, unavailable, onSelect, onClose } = props;
  const plot = model.plots.find((item) => item.id === selected);
  const station = worldStations.find((item) => item.id === selected);
  const count = (value: number) => (unavailable ? '—' : value);
  const inventory = model.inventory;
  const rackId = selected.startsWith('rak-') ? (selected.slice(4) as RackId) : null;
  const rackItems = rackId ? inventory.racks[rackId] || [] : [];
  const stockReady = props.stockState === 'aktif';
  const person = selected.startsWith('staf-')
    ? props.plans.find((plan) => `staf-${plan.staff.id}` === selected)
    : undefined;
  const delivery = selected.startsWith('kirim-')
    ? model.deliveries.find((row) => row.id === selected.slice(6))
    : undefined;
  // Item daftar yang "pergi ke tempatnya": rapat (ruang rapat), tugas (meja), barang (rak).
  const meetingStep = selected.startsWith('rapat-')
    ? timeline.find((step) => step.row.id === selected.slice(6))
    : undefined;
  const task = selected.startsWith('tugas-')
    ? model.tasks.find((row) => row.id === selected.slice(6))
    : undefined;
  const item = selected.startsWith('barang-')
    ? inventory.items.find((row) => row.id === selected.slice(7))
    : undefined;
  const head = meetingStep
    ? {
        eyebrow: `Rapat · ${meetingStep.time}–${meetingStep.end} WIB`,
        title: String(meetingStep.row.data.title),
        subtitle: String(
          meetingStep.row.data.location || meetingStep.row.data.mode || 'Ruang rapat koperasi',
        ),
        icon: <WorldIcon kind="rapat" size={40} />,
      }
    : task
      ? {
          eyebrow: `Tugas · ${String(task.data.status || 'rencana')}`,
          title: String(task.data.title),
          subtitle: String(task.data.assignee || 'Penanggung jawab belum diisi'),
          icon: <WorldIcon kind="tugas" size={40} />,
        }
      : item
        ? {
            eyebrow: `Barang · ${item.data.rack ? `rak ${String(item.data.rack)}` : item.data.unit_id ? 'di gerai' : 'staging'}`,
            title: String(item.data.title),
            subtitle: String(item.data.sku || 'Tanpa SKU'),
            icon: <WorldIcon kind={isBelowMinimum(item) ? 'kardus-minimum' : 'kardus'} size={40} />,
          }
        : selected === 'lingkungan'
          ? {
              eyebrow: 'Pengaturan',
              title: 'Suasana & karakter',
              subtitle: 'Cuaca, waktu dan grafis',
              icon: <WorldIcon kind="suasana" size={40} />,
            }
          : selected === 'karakter'
            ? {
                eyebrow: 'Maskot',
                title: 'Maskot koperasi',
                subtitle: activityNames[props.activity],
                icon: <WorldIcon kind="orang" size={40} />,
              }
            : selected === 'gudang'
              ? {
                  eyebrow:
                    location === 'gudang'
                      ? 'Gudang · interior'
                      : `Gudang · ${warehouse.docks.length} dok`,
                  title: worldZones.gudang.title,
                  subtitle: 'Bongkar muat dan stok',
                  icon: <WorldIcon kind="gudang" size={40} />,
                }
              : selected === 'papan'
                ? {
                    eyebrow: 'Taman · papan',
                    title: 'Papan pengumuman',
                    subtitle: 'Keputusan rapat dan masa berlaku dokumen',
                    icon: <WorldIcon kind="papan" size={40} />,
                  }
                : person
                  ? {
                      eyebrow: `Tim · ${person.staff.data.section || 'seksi belum ditentukan'}`,
                      title: String(person.staff.data.title),
                      subtitle: String(person.staff.data.role || 'Peran belum diisi'),
                      icon: <WorldIcon kind="orang" size={40} />,
                    }
                  : delivery
                    ? {
                        eyebrow: `Pengiriman · ${delivery.data.direction === 'keluar' ? 'keluar' : 'masuk'}`,
                        title: String(delivery.data.title),
                        subtitle: String(delivery.data.vehicle || 'Kendaraan belum dicatat'),
                        icon: <WorldIcon kind="truk" size={40} />,
                      }
                    : selected.startsWith('kendaraan-suasana') || selected === 'forklift-suasana'
                      ? {
                          eyebrow:
                            selected === 'forklift-suasana' ? 'Halaman gudang' : 'Jalan utama',
                          title: selected === 'forklift-suasana' ? 'Forklift' : 'Kendaraan lewat',
                          subtitle: 'Simulasi lingkungan',
                          icon: (
                            <WorldIcon
                              kind={selected === 'forklift-suasana' ? 'forklift' : 'truk'}
                              size={40}
                            />
                          ),
                        }
                      : rackId
                        ? {
                            eyebrow: 'Gudang · rak',
                            title: `Rak ${rackId}`,
                            subtitle: stockReady
                              ? `${rackItems.length} barang tercatat`
                              : 'Isi mengikuti daftar Barang',
                            icon: <WorldIcon kind="rak" size={40} />,
                          }
                        : selected === 'staging'
                          ? {
                              eyebrow: 'Gudang · staging',
                              title: 'Area staging',
                              subtitle: 'Barang tanpa rak dan tanpa gerai',
                              icon: <WorldIcon kind="palet" size={40} />,
                            }
                          : plot
                            ? {
                                eyebrow: `${plot.lotName} · ${plot.unit ? 'gerai' : 'rencana'}`,
                                title: plot.unit ? String(plot.unit.data.title) : plot.name,
                                subtitle: plot.unit
                                  ? 'Terhubung ke catatan gerai'
                                  : 'Belum ada catatan gerai untuk bangunan ini',
                                icon: <WorldIcon kind={plot.unit ? 'gerai' : 'lahan'} size={40} />,
                              }
                            : station
                              ? {
                                  eyebrow: 'Kantor · interior',
                                  title: station.title,
                                  subtitle: 'Pilih area untuk membuka catatan',
                                  icon: <WorldIcon kind="kantor" size={40} />,
                                }
                              : {
                                  eyebrow:
                                    location === 'dalam'
                                      ? 'Kantor · interior'
                                      : zone === 'semua'
                                        ? 'Dunia koperasi'
                                        : `Zona · ${worldZones[zone].title}`,
                                  title: 'Kawasan koperasi',
                                  subtitle: model.title,
                                  icon: <WorldIcon kind="kawasan" size={40} />,
                                };
  const truckSpot = delivery
    ? model.trucks.find((row) => row.delivery.id === delivery.id)
    : undefined;
  const route = truckSpot ? truckRoute(truckSpot, model.trucks) : null;
  const step = Math.max(
    0,
    deliverySteps.indexOf(String(delivery?.data.status) as (typeof deliverySteps)[number]),
  );
  const routeNote = !truckSpot
    ? 'Truk tampil saat status dikirim, tiba atau diperiksa'
    : truckSpot.place === 'dok'
      ? `Di dok D${truckSpot.index + 1}`
      : route?.dock !== null && route?.dock !== undefined
        ? `Antre · menuju dok D${route.dock + 1}`
        : 'Antre · semua dok terisi';
  const date = today();
  const overdue = model.tasks.filter(
    (row) => row.data.due_date && String(row.data.due_date) < date,
  );
  return (
    <article className="cw-detail-card">
      <header className="cw-detail-head">
        <span className="cw-detail-icon">{head.icon}</span>
        <div>
          <span className="cw-eyebrow">{head.eyebrow}</span>
          <h1>{head.title}</h1>
          <p>{head.subtitle}</p>
        </div>
        {onClose && (
          <Button className="cw-close" aria-label="Tutup detail" onClick={onClose}>
            <X size={17} />
          </Button>
        )}
      </header>
      <div className="cw-detail-body">
        {meetingStep ? (
          <>
            <div className="cw-status-line">
              <span
                className={`cw-pill ${meetingStep.state === 'berlangsung' ? 'is-green' : meetingStep.state === 'nanti' ? 'is-blue' : ''}`}
              >
                {
                  { selesai: 'Selesai', berlangsung: 'Berlangsung', nanti: 'Nanti' }[
                    meetingStep.state
                  ]
                }
              </span>
              <small>Ruang rapat kantor koperasi</small>
            </div>
            <div className="cw-progress" aria-label="Jalannya rapat">
              <i>
                <b
                  style={{
                    width: `${meetingStep.state === 'selesai' ? 100 : meetingStep.state === 'nanti' ? 0 : 50}%`,
                  }}
                />
              </i>
              <span>{meetingStep.time}</span>
            </div>
            <Rows
              items={[
                ['Tempat', String(meetingStep.row.data.location || '')],
                ['Peserta', String(meetingStep.row.data.participants || '')],
                ['Agenda', String(meetingStep.row.data.agenda || '')],
              ]}
            />
            <Link className="cw-primary" href={recordHref('meetings', meetingStep.row)}>
              Buka catatan rapat <ArrowRight size={15} />
            </Link>
            <Button className="cw-secondary" onClick={() => props.onEnter('luar')}>
              Kembali ke kawasan <ArrowRight size={14} />
            </Button>
          </>
        ) : task ? (
          <>
            <div className="cw-status-line">
              <span className={`cw-pill ${task.data.status === 'proses' ? 'is-blue' : 'is-amber'}`}>
                {String(task.data.status || 'rencana')}
              </span>
              <small>
                {task.data.due_date && String(task.data.due_date) < date
                  ? 'Lewat tenggat'
                  : task.data.due_date
                    ? `Tenggat ${String(task.data.due_date)}`
                    : 'Tanpa tenggat'}
              </small>
            </div>
            <Rows
              items={[
                ['Penanggung jawab', String(task.data.assignee || '')],
                ['Mulai', String(task.data.start_date || '')],
                ['Prioritas', String(task.data.priority || '')],
              ]}
            />
            {task.data.description ? (
              <p className="cw-note">{String(task.data.description)}</p>
            ) : null}
            <Link className="cw-primary" href={recordHref('work-items', task)}>
              Buka catatan tugas <ArrowRight size={15} />
            </Link>
            <Button className="cw-secondary" onClick={() => props.onEnter('luar')}>
              Kembali ke kawasan <ArrowRight size={14} />
            </Button>
          </>
        ) : item ? (
          <>
            <div className="cw-status-line">
              <span className={`cw-pill ${isBelowMinimum(item) ? 'is-amber' : 'is-green'}`}>
                {isBelowMinimum(item) ? 'Di bawah minimum' : 'Cukup'}
              </span>
              <small>Stok buku, bukan hitung fisik</small>
            </div>
            <div className="cw-meters">
              <div className="cw-meter">
                <small>Stok buku</small>
                <strong>
                  {String(item.data.book_quantity ?? '—')}
                  <span> {String(item.data.measurement || '')}</span>
                </strong>
                <StockBar
                  stock={Number(item.data.book_quantity)}
                  minimum={Number(item.data.minimum_quantity) || 0}
                />
              </div>
              <div className="cw-meter">
                <small>Minimum</small>
                <strong>{String(item.data.minimum_quantity ?? '—')}</strong>
              </div>
            </div>
            <Link className="cw-primary" href={recordHref('inventory-items', item)}>
              Buka catatan barang <ArrowRight size={15} />
            </Link>
            <Link className="cw-secondary" href="/stok-opname">
              Mulai stok opname <ArrowRight size={14} />
            </Link>
          </>
        ) : selected === 'lingkungan' ? (
          <>
            <p className="cw-note">
              Cuaca adalah simulasi, bukan prakiraan cuaca setempat. Jam di header tetap WIB aktual.
            </p>
            <label className="cw-field">
              Cuaca
              <Select
                ariaLabel="Cuaca simulasi"
                value={props.preferences.weather}
                onChange={(value) =>
                  props.onPreference('weather', value as WorldPreferences['weather'])
                }
                options={['cerah', 'berawan', 'hujan']}
              />
            </label>
            <label className="cw-field">
              Waktu & pencahayaan
              <Select
                ariaLabel="Waktu pencahayaan"
                value={props.preferences.time}
                onChange={(value) => props.onPreference('time', value as WorldPreferences['time'])}
                options={[
                  { value: 'otomatis', label: 'Otomatis · WIB' },
                  'pagi',
                  'siang',
                  'senja',
                  'malam',
                ]}
              />
            </label>
            <label className="cw-field">
              Pakaian maskot
              <Select
                ariaLabel="Warna pakaian maskot"
                value={props.preferences.outfit}
                onChange={(value) =>
                  props.onPreference('outfit', value as WorldPreferences['outfit'])
                }
                options={['biru', 'lavender', 'hijau']}
              />
            </label>
            <label className="cw-field">
              Kualitas grafis
              <Select
                ariaLabel="Kualitas grafis"
                value={props.preferences.quality}
                onChange={(value) =>
                  props.onPreference('quality', value as WorldPreferences['quality'])
                }
                options={[
                  { value: 'otomatis', label: 'Otomatis · sesuai perangkat' },
                  { value: 'tinggi', label: 'Tinggi · bayangan halus' },
                  { value: 'sedang', label: 'Sedang' },
                  { value: 'hemat', label: 'Hemat · tanpa bayangan' },
                ]}
              />
            </label>
            <p className="cw-note">Pilihan suasana disimpan di perangkat ini.</p>
          </>
        ) : selected === 'karakter' ? (
          <>
            <div className="cw-status-line">
              <span className="cw-pill is-blue">{activityNames[props.activity]}</span>
              <small>Visualisasi, bukan kehadiran</small>
            </div>
            <Rows items={[['Sedang', props.mascotNote]]} />
            <p className="cw-note">
              Maskot ruang kerja. Gerakan mengikuti jadwal rapat, kegiatan hari ini, lalu tugas
              dalam proses.
            </p>
            <label className="cw-field">
              Pratinjau gerakan
              <Select
                ariaLabel="Pratinjau gerakan karakter"
                value={props.rehearsal}
                onChange={(value) => props.onRehearsal(value as CharacterActivity | 'otomatis')}
                options={[
                  { value: 'otomatis', label: 'Ikuti data ruang kerja' },
                  ...Object.entries(activityNames).map(([value, label]) => ({ value, label })),
                ]}
              />
            </label>
            {props.rehearsal !== 'otomatis' && (
              <p className="cw-note">Mode pratinjau; tidak mengubah data rapat atau kegiatan.</p>
            )}
          </>
        ) : selected === 'gudang' ? (
          <>
            <div className="cw-status-line">
              <span
                className={`cw-pill ${stockReady && inventory.low.length ? 'is-amber' : 'is-blue'}`}
              >
                {stockReady && inventory.low.length
                  ? `${inventory.low.length} di bawah minimum`
                  : 'Area logistik'}
              </span>
              <small>{warehouse.docks.length} pintu dok · 6 rak</small>
            </div>
            {stockReady && (
              <div className="cw-meters">
                <Meter
                  label="Barang di rak"
                  value={
                    inventory.items.length - inventory.staging.length - inventory.atUnits.length
                  }
                  total={inventory.items.length}
                  tone="green"
                />
                <Meter
                  label="Di bawah minimum"
                  value={inventory.low.length}
                  total={inventory.items.length}
                />
              </div>
            )}
            <StockList
              items={inventory.items}
              state={props.stockState}
              empty="Belum ada barang tercatat."
            />
            {location === 'gudang' ? (
              <Button className="cw-secondary" onClick={() => props.onEnter('luar')}>
                Kembali ke kawasan <ArrowRight size={14} />
              </Button>
            ) : (
              <Button className="cw-primary" onClick={() => props.onEnter('gudang')}>
                Masuk gudang <ArrowRight size={15} />
              </Button>
            )}
            <Link className="cw-secondary" href="/barang">
              Buka daftar barang <ArrowRight size={14} />
            </Link>
          </>
        ) : selected === 'papan' ? (
          <>
            <h2 className="cw-section-title">Keputusan terbaru</h2>
            {model.notices.decisions.length ? (
              model.notices.decisions.map((row) => (
                <Link key={row.id} className="cw-row" href={recordHref('decisions', row)}>
                  <span className="cw-row-text">
                    <strong>{String(row.data.title)}</strong>
                    <small>{String(row.data.date || '')}</small>
                  </span>
                  <ChevronRight size={15} />
                </Link>
              ))
            ) : (
              <p className="cw-note">
                {unavailable ? 'Data belum tersedia.' : 'Belum ada keputusan tercatat.'}
              </p>
            )}
            <h2 className="cw-section-title">Dokumen perlu diperbarui</h2>
            {model.notices.documents.length ? (
              model.notices.documents.map((row) => {
                const expired = String(row.data.expires_date) < today();
                return (
                  <Link key={row.id} className="cw-row" href={recordHref('documents', row)}>
                    <span className="cw-row-text">
                      <strong>{String(row.data.title)}</strong>
                      <small>Berlaku sampai {String(row.data.expires_date)}</small>
                    </span>
                    <span className={`cw-pill ${expired ? 'is-red' : 'is-amber'}`}>
                      {expired ? 'Kedaluwarsa' : '≤ 30 hari'}
                    </span>
                  </Link>
                );
              })
            ) : (
              <p className="cw-note">
                {unavailable
                  ? 'Data belum tersedia.'
                  : 'Tidak ada dokumen yang habis dalam 30 hari.'}
              </p>
            )}
          </>
        ) : person ? (
          <>
            <div className="cw-status-line">
              <span className="cw-pill is-blue">{npcActivityNames[person.activity]}</span>
              <small>Visualisasi jadwal/tugas, bukan kehadiran</small>
            </div>
            <Rows
              items={[
                ['Alasan', person.reason],
                ['Tempat kerja', String(person.staff.data.workplace || 'kantor')],
                ['Jam kerja', String(person.staff.data.work_hours || '08:00-16:00')],
              ]}
            />
            <p className="cw-note">
              Posisi mengikuti rapat berlangsung, pengiriman di dok, tugas berstatus proses yang
              menyebut nama ini, dan jam kerja. Ubah data di halaman Tim.
            </p>
            <Link className="cw-primary" href={recordHref('staff', person.staff)}>
              Buka catatan tim <ArrowRight size={15} />
            </Link>
            <Link className="cw-secondary" href="/tugas">
              Lihat tugas <ArrowRight size={14} />
            </Link>
          </>
        ) : delivery ? (
          <>
            <div className="cw-status-line">
              <span className={`cw-pill ${deliveryTone(String(delivery.data.status))}`}>
                {String(delivery.data.status)}
              </span>
              <small>{routeNote}</small>
            </div>
            <div
              className="cw-progress"
              aria-label={`Tahap ${step + 1} dari ${deliverySteps.length}`}
            >
              <i>
                <b style={{ width: `${((step + 1) / deliverySteps.length) * 100}%` }} />
              </i>
              <span>
                {step + 1}/{deliverySteps.length}
              </span>
            </div>
            <Rows
              items={[
                ['Pintu dok', String(delivery.data.dock || '')],
                ['Tanggal rencana', String(delivery.data.planned_date || '')],
                ['Tanggal tiba', String(delivery.data.arrived_date || '')],
                ['Kendaraan', String(delivery.data.vehicle || '')],
                ['Rincian barang', String(delivery.data.items || '')],
              ]}
            />
            {truckSpot && (
              <p className="cw-note">
                Garis biru di peta adalah rute skematis di dalam kawasan (jalan utama → gerbang →
                dok), bukan pelacakan GPS.
              </p>
            )}
            <p className="cw-note">
              Ubah status di halaman Pengiriman. Stok berubah hanya saat mutasi stok dicatat.
            </p>
            <Link className="cw-primary" href={recordHref('deliveries', delivery)}>
              Buka catatan pengiriman <ArrowRight size={15} />
            </Link>
            <Link className="cw-secondary" href="/pengiriman?bagian=stock-movements">
              Catat mutasi stok <ArrowRight size={14} />
            </Link>
          </>
        ) : selected.startsWith('kendaraan-suasana') || selected === 'forklift-suasana' ? (
          <>
            <div className="cw-status-line">
              <span className="cw-pill">Simulasi lingkungan</span>
            </div>
            <p className="cw-note">
              {selected === 'forklift-suasana'
                ? 'Forklift ini bergerak sebagai suasana halaman gudang, bukan alat atau mutasi stok tercatat.'
                : 'Kendaraan ini hanya suasana jalan, bukan kendaraan atau pengiriman tercatat.'}{' '}
              Truk di dok dan petak antre berasal dari catatan Pengiriman.
            </p>
          </>
        ) : rackId || selected === 'staging' ? (
          <>
            <p className="cw-note">
              {rackId
                ? `Barang dengan kolom Rak gudang = ${rackId}. Setiap kardus mewakili satu jenis barang; kardus pendek berarti stok buku di bawah minimum.`
                : 'Barang tanpa rak dan tanpa gerai. Isi kolom Rak gudang agar barang tampil di rak.'}
            </p>
            <StockList
              items={rackId ? rackItems : inventory.staging}
              state={props.stockState}
              empty={rackId ? `Belum ada barang di rak ${rackId}.` : 'Tidak ada barang tanpa rak.'}
            />
            <Link className="cw-primary" href="/barang">
              Atur barang <ArrowRight size={15} />
            </Link>
            <Link className="cw-secondary" href="/stok-opname">
              Mulai stok opname <ArrowRight size={14} />
            </Link>
          </>
        ) : plot ? (
          <>
            <div className="cw-status-line">
              <span
                className={`cw-pill ${plot.unit ? (plot.unit.data.status === 'aktif' ? 'is-green' : 'is-amber') : 'is-muted'}`}
              >
                {plot.unit ? String(plot.unit.data.status || 'rencana') : 'Belum buka'}
              </span>
              <small>
                {plot.building.kinds.length
                  ? `Jenis: ${plot.building.kinds[0]}`
                  : 'Kavling gerai tambahan'}
              </small>
            </div>
            {plot.unit ? (
              <Rows
                items={[
                  ['Jenis', String(plot.unit.data.kind || '')],
                  ['Penanggung jawab', String(plot.unit.data.assignee || '')],
                  ['Lokasi', String(plot.unit.data.location || '')],
                  ['Petugas', String(plot.unit.data.staff || '')],
                ]}
              />
            ) : (
              <p className="cw-note">
                {plot.building.kinds.length
                  ? `Tambahkan gerai berjenis “${plot.building.kinds[0]}” di halaman Gerai; bangunan berdiri sesuai statusnya (rencana: pondasi, persiapan: rangka).`
                  : 'Gerai berjenis lain menempati kavling ini menurut kolom Lahan (1–3) lalu urutan dibuat.'}
              </p>
            )}
            <Link
              className="cw-primary"
              href={plot.unit ? recordHref('units', plot.unit) : '/gerai'}
            >
              {plot.unit ? 'Buka catatan gerai' : 'Tambahkan gerai'}
              <ArrowRight size={15} />
            </Link>
          </>
        ) : station ? (
          <>
            <div className="cw-status-line">
              <span className="cw-pill is-blue">Ruang kerja</span>
            </div>
            <p className="cw-note">{station.description}</p>
            <div className="cw-room-links">
              {worldStations.map((item) => (
                <Button
                  key={item.id}
                  aria-pressed={selected === item.id}
                  onClick={() => onSelect(item.id)}
                >
                  {item.id === 'rapat' ? (
                    <Users size={17} />
                  ) : item.id === 'tugas' ? (
                    <CheckCheck size={17} />
                  ) : item.id === 'kegiatan' ? (
                    <Dumbbell size={17} />
                  ) : (
                    <BookOpen size={17} />
                  )}
                  {item.title}
                  <ChevronRight size={14} />
                </Button>
              ))}
            </div>
            <Link className="cw-primary" href={station.href}>
              Buka {station.title.toLowerCase()}
              <ArrowRight size={15} />
            </Link>
            {selected === 'dokumen' && (
              <Link className="cw-secondary" href="/pencatatan">
                Buka buku pencatatan <ArrowRight size={14} />
              </Link>
            )}
          </>
        ) : (
          <>
            <div className="cw-status-line">
              <span className={`cw-pill is-${props.status.tone}`}>{props.status.label}</span>
              <small>{model.plots.length} bangunan gerai · gudang · kantor</small>
            </div>
            <div className="cw-meters">
              <Meter
                label="Gerai terisi"
                value={count(model.plots.filter((plot) => plot.unit).length)}
                total={model.plots.length}
                tone="green"
              />
              <Meter
                label="Tugas diproses"
                value={count(model.tasks.filter((row) => row.data.status === 'proses').length)}
                total={count(model.tasks.length)}
              />
            </div>
            <h2 className="cw-section-title">Hari ini</h2>
            <div className="cw-mini-rows">
              <Link href="/rapat">
                <Users size={16} /> Rapat <strong>{count(timeline.length)}</strong>
              </Link>
              <Link href="/jurnal">
                <Dumbbell size={16} /> Kegiatan <strong>{count(model.activities.length)}</strong>
              </Link>
              <Link href="/tugas">
                <CheckCheck size={16} /> Tugas lewat tenggat
                <strong className={overdue.length && !unavailable ? 'is-alert' : ''}>
                  {count(overdue.length)}
                </strong>
              </Link>
            </div>
            <Button className="cw-secondary" onClick={() => onSelect('koperasi')}>
              Masuk kantor koperasi <ArrowRight size={14} />
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
