'use client';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Truck,
  Building2,
  CheckCheck,
  ChevronRight,
  Dumbbell,
  Map,
  MessageCircle,
  Store,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { today } from '@/lib/date';
import { recordHref } from '../../workspace/workspace-navigation';
import { landPositions, warehouse, worldStations, worldZones, type WorldZone } from '../layout';
import {
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
      <h2 className="cw-section-title">
        Barang <span>stok buku</span>
      </h2>
      {sorted.slice(0, 8).map((item) => {
        const low = isBelowMinimum(item);
        return (
          <Link key={item.id} className="cw-row" href={recordHref('inventory-items', item)}>
            <span className={`cw-row-icon ${low ? 'is-amber' : ''}`}>
              <Boxes size={16} />
            </span>
            <span className="cw-row-text">
              <strong>{String(item.data.title)}</strong>
              <small>
                Stok {String(item.data.book_quantity ?? '—')} {String(item.data.measurement || '')}{' '}
                · min {String(item.data.minimum_quantity ?? '—')}
              </small>
            </span>
            <span className={`cw-pill ${low ? 'is-amber' : 'is-green'}`}>
              {low ? 'Di bawah minimum' : 'Cukup'}
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

export const activityNames: Record<CharacterActivity, string> = {
  idle: 'Bersantai',
  meeting: 'Duduk rapat',
  work: 'Mengerjakan tugas',
  gym: 'Berolahraga',
};

type Props = {
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
  const plotNumber = plot ? plot.id.split('-')[1] : '';
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
  const head =
    selected === 'lingkungan'
      ? {
          eyebrow: 'Pengaturan',
          title: 'Suasana & karakter',
          subtitle: 'Cuaca, waktu dan grafis',
          icon: props.weatherIcon,
        }
      : selected === 'karakter'
        ? {
            eyebrow: 'Maskot',
            title: 'Maskot koperasi',
            subtitle: activityNames[props.activity],
            icon: <MessageCircle size={22} />,
          }
        : selected === 'gudang'
          ? {
              eyebrow:
                location === 'gudang'
                  ? 'Gudang · interior'
                  : `Gudang · ${warehouse.docks.length} dok`,
              title: worldZones.gudang.title,
              subtitle: 'Bongkar muat dan stok',
              icon: <Warehouse size={22} />,
            }
          : selected === 'papan'
            ? {
                eyebrow: 'Taman · papan',
                title: 'Papan pengumuman',
                subtitle: 'Keputusan rapat dan masa berlaku dokumen',
                icon: <BookOpen size={22} />,
              }
            : person
              ? {
                  eyebrow: `Tim · ${person.staff.data.section || 'seksi belum ditentukan'}`,
                  title: String(person.staff.data.title),
                  subtitle: String(person.staff.data.role || 'Peran belum diisi'),
                  icon: <Users size={22} />,
                }
              : delivery
                ? {
                    eyebrow: `Pengiriman · ${delivery.data.direction === 'keluar' ? 'keluar' : 'masuk'}`,
                    title: String(delivery.data.title),
                    subtitle: String(delivery.data.vehicle || 'Kendaraan belum dicatat'),
                    icon: <Truck size={22} />,
                  }
                : selected === 'kendaraan-suasana'
                  ? {
                      eyebrow: 'Kendaraan',
                      title: 'Mobil di jalan utama',
                      subtitle: 'Simulasi lingkungan',
                      icon: <Truck size={22} />,
                    }
                  : rackId
                    ? {
                        eyebrow: 'Gudang · rak',
                        title: `Rak ${rackId}`,
                        subtitle: stockReady
                          ? `${rackItems.length} barang tercatat`
                          : 'Isi mengikuti daftar Barang',
                        icon: <Boxes size={22} />,
                      }
                    : selected === 'staging'
                      ? {
                          eyebrow: 'Gudang · staging',
                          title: 'Area staging',
                          subtitle: 'Barang tanpa rak dan tanpa gerai',
                          icon: <Boxes size={22} />,
                        }
                      : plot
                        ? {
                            eyebrow: `Lahan ${plotNumber.padStart(2, '0')} · Boulevard gerai`,
                            title: plot.unit ? String(plot.unit.data.title) : `Lahan ${plotNumber}`,
                            subtitle: plot.unit
                              ? 'Terhubung ke catatan gerai'
                              : 'Bidang tersedia untuk gerai baru',
                            icon: <Store size={22} />,
                          }
                        : station
                          ? {
                              eyebrow: 'Kantor · interior',
                              title: station.title,
                              subtitle: 'Pilih area untuk membuka catatan',
                              icon: <Building2 size={22} />,
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
                              icon: <Map size={22} />,
                            };
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
        {selected === 'lingkungan' ? (
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
              <span className="cw-pill is-blue">{String(delivery.data.status)}</span>
              <small>Truk tampil saat status dikirim, tiba atau diperiksa</small>
            </div>
            <Rows
              items={[
                ['Pintu dok', String(delivery.data.dock || '')],
                ['Tanggal rencana', String(delivery.data.planned_date || '')],
                ['Tanggal tiba', String(delivery.data.arrived_date || '')],
                ['Rincian barang', String(delivery.data.items || '')],
              ]}
            />
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
        ) : selected === 'kendaraan-suasana' ? (
          <p className="cw-note">
            Mobil ini hanya suasana jalan, bukan kendaraan atau pengiriman tercatat. Truk di kawasan
            berasal dari catatan Pengiriman.
          </p>
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
                {plot.unit ? String(plot.unit.data.status || 'rencana') : 'Lahan kosong'}
              </span>
              <small>
                {plot.unit?.data.slot && plot.unit.data.slot !== 'otomatis'
                  ? 'Lahan dipilih'
                  : 'Penempatan otomatis'}
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
                Tambahkan unit pada halaman Gerai dan pilih lahan ini di kolom “Lahan di Dunia
                Koperasi”. Bangunan muncul setelah data dimuat ulang.
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
              <small>{landPositions.length} lahan · 1 gudang · 1 kantor</small>
            </div>
            <div className="cw-meters">
              <Meter
                label="Gerai terisi"
                value={count(Math.min(model.units.length, landPositions.length))}
                total={landPositions.length}
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
