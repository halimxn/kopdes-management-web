'use client';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
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
import type {
  CharacterActivity,
  MeetingStep,
  WorldLocation,
  WorldModel,
  WorldPreferences,
} from '../world-model';

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
  preferences: WorldPreferences;
  onPreference: <K extends keyof WorldPreferences>(key: K, value: WorldPreferences[K]) => void;
  rehearsal: CharacterActivity | 'otomatis';
  onRehearsal: (value: CharacterActivity | 'otomatis') => void;
  activity: CharacterActivity;
  weatherIcon: React.ReactNode;
  status: { label: string; tone: 'green' | 'muted' | 'red' };
  unavailable: boolean;
  onSelect: (id: string) => void;
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
              eyebrow: `Gudang · ${warehouse.docks.length} dok`,
              title: worldZones.gudang.title,
              subtitle: 'Bongkar muat dan stok',
              icon: <Warehouse size={22} />,
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
              <span className="cw-pill is-blue">Area logistik</span>
              <small>{warehouse.docks.length} pintu dok · 1 area staging</small>
            </div>
            <Rows
              items={[
                ['Pintu dok', warehouse.docks.map((_, i) => `D${i + 1}`).join(', ')],
                ['Isi rak', 'Mengikuti daftar Barang'],
                ['Truk di dok', 'Mengikuti catatan Pengiriman'],
              ]}
            />
            <p className="cw-note">
              Kardus dan forklift di halaman gudang saat ini hanya pemandangan, bukan stok tercatat.
            </p>
            <Link className="cw-primary" href="/barang">
              Buka daftar barang <ArrowRight size={15} />
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
