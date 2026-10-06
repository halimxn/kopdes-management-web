'use client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import './world.css';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Cloud,
  CloudRain,
  Expand,
  House,
  Map,
  MessageCircle,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Sunrise,
  Sunset,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePreference } from '@/lib/usePreference';
import type { Workspace } from '../workspace/useWorkspace';
import {
  getWorldHour,
  getWorldModel,
  meetingTimeline,
  worldPreferencesSchema,
  zoneSummaries,
  type CharacterActivity,
  type RackId,
  rackIds,
  type WorldLocation,
  type WorldPreferences,
} from './world-model';
import {
  minWorldZoom,
  warehouseInterior,
  worldStations,
  worldZones,
  type WorldZone,
} from './layout';
import { dayPhase } from './lighting';
import { truckFocus } from './truck-routes';
import { WorldHeader } from './ui/WorldHeader';
import { planManager, planStaff } from './npc/schedule';
import { today } from '@/lib/date';
import { KpiCards } from './ui/KpiCards';
import { DetailCard, activityNames, type StockState } from './ui/DetailCard';
import { ListCard } from './ui/ListCard';
import { TodayTracker } from './ui/TodayTracker';
import { MobileSheet, type SheetSnap, type SheetTab } from './ui/MobileSheet';

const WorldScene = dynamic(() => import('./WorldScene').then((module) => module.WorldScene), {
  ssr: false,
  loading: () => <div className="cw-loading">Menyiapkan lingkungan 3D…</div>,
});

const wideQuery = '(min-width: 1024px)';
/** Desktop memakai kartu mengambang; layar lebih kecil memakai lembar bawah. */
function useWideLayout() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia?.(wideQuery);
      query?.addEventListener('change', notify);
      return () => query?.removeEventListener('change', notify);
    },
    () => window.matchMedia?.(wideQuery).matches ?? true,
    () => true,
  );
}

type Props = {
  data: Workspace;
  preview?: boolean;
  loading?: boolean;
  error?: string;
  refresh?: () => Promise<void>;
  partial?: boolean;
  /** false bila pencatatan barang/kas belum aktif di server; undefined di pratinjau. */
  operations?: boolean;
};

export function CooperativeWorld({
  data,
  preview = false,
  loading = false,
  error = '',
  refresh,
  partial = false,
  operations,
}: Props) {
  const wide = useWideLayout();
  const [now, setNow] = useState(() => new Date());
  const [location, setLocation] = useState<WorldLocation>('luar');
  const [savedPreferences, savePreferences] = usePreference('hub-world-preferences-v1', '{}');
  const preferences = useMemo(() => {
    try {
      const result = worldPreferencesSchema.safeParse(JSON.parse(savedPreferences));
      if (result.success) return result.data;
    } catch {
      /* Invalid device preferences fall back without affecting workspace data. */
    }
    return worldPreferencesSchema.parse({});
  }, [savedPreferences]);
  const [selected, setSelected] = useState('kawasan');
  const [panelOpen, setPanelOpen] = useState(true);
  const [query, setQuery] = useState('');
  // Bawaan dekat seperti video: kavling logistik; zoom keluar tetap tersedia.
  const [zone, setZone] = useState<WorldZone>('gudang');
  // Titik khusus saat memilih lahan dari daftar; zona dipakai bila kosong.
  const [spot, setSpot] = useState<readonly [number, number] | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [zoom, setZoom] = useState(worldZones.gudang.zoom);
  const [rotation, setRotation] = useState(0);
  const [rehearsal, setRehearsal] = useState<CharacterActivity | 'otomatis'>('otomatis');
  const [sheet, setSheet] = useState<SheetSnap>('ringkas');
  const [sheetTab, setSheetTab] = useState<SheetTab>('detail');
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);
  const model = useMemo(() => getWorldModel(data, now), [data, now]);
  // Geometri tidak bergantung jam: tick menit tidak boleh mengatur ulang kamera.
  const sceneModel = useMemo(() => getWorldModel(data, new Date()), [data]);
  const timeline = useMemo(() => meetingTimeline(model.meetings, now), [model.meetings, now]);
  const plans = useMemo(
    () =>
      planStaff(
        model.staff,
        { currentMeeting: model.currentMeeting, tasks: model.tasks, deliveries: model.deliveries },
        now,
      ),
    [model, now],
  );
  const managerPlan = useMemo(
    () => planManager(plans, { tasks: model.tasks, deliveries: model.deliveries }, now, today(now)),
    [plans, model, now],
  );
  const hour = getWorldHour(preferences.time, now);
  const night = dayPhase(hour) === 'malam';
  const activity = rehearsal === 'otomatis' ? model.activity : rehearsal;
  const unavailable = loading || Boolean(error);
  // Pencatatan belum aktif berbeda dari stok nol; jangan tampilkan angka 0 untuk keadaan itu.
  // Pratinjau tanpa barang = pratinjau kosong; pratinjau development berisi contoh menampilkan contohnya.
  const stockState: StockState =
    preview && !model.inventory.items.length
      ? 'pratinjau'
      : unavailable
        ? 'tidak-tersedia'
        : operations === false
          ? 'belum-aktif'
          : 'aktif';
  const focus: readonly [number, number] =
    location === 'luar' ? spot || worldZones[zone].target : spot || [0, 0];
  const clock = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now);
  const phase = dayPhase(hour);
  const weatherIcon =
    preferences.weather === 'hujan' ? (
      <CloudRain size={18} />
    ) : preferences.weather === 'berawan' ? (
      <Cloud size={18} />
    ) : phase === 'malam' ? (
      <Moon size={18} />
    ) : phase === 'pagi' ? (
      <Sunrise size={18} />
    ) : phase === 'senja' ? (
      <Sunset size={18} />
    ) : (
      <Sun size={18} />
    );
  const weatherName = { cerah: 'Cerah', berawan: 'Berawan', hujan: 'Hujan' }[preferences.weather];
  const ambienceLabel = `${weatherName} · ${preferences.time === 'otomatis' ? phase : preferences.time}`;
  // Keterangan maskot di kartu detail (keputusan pemilik: tanpa bubble maskot di peta).
  const mascotNote =
    rehearsal !== 'otomatis'
      ? `Pratinjau animasi: ${activityNames[activity].toLowerCase()}.`
      : managerPlan.kind !== 'ruang'
        ? `${managerPlan.reason}.`
        : model.currentMeeting
          ? `Ada rapat: ${String(model.currentMeeting.data.title)}.`
          : model.tasks.length
            ? `${model.tasks.length} tugas masih terbuka. Mari lihat meja tugas!`
            : 'Klik gedung koperasi untuk masuk. Kita bisa melihat ruang rapat dan meja tugas!';
  const status: { label: string; tone: 'green' | 'muted' | 'red' } = preview
    ? { label: 'Pratinjau desain', tone: 'muted' }
    : error
      ? { label: 'Data tidak tersedia', tone: 'red' }
      : { label: 'Data ruang kerja', tone: 'green' };

  function showDetail() {
    setPanelOpen(true);
    setSheetTab('detail');
    setSheet((value) => (value === 'ringkas' ? 'setengah' : value));
  }
  function enter(next: WorldLocation) {
    setLocation(next);
    setSelected(next === 'luar' ? 'kawasan' : next === 'gudang' ? 'gudang' : 'rapat');
    if (next === 'gudang') setZone('gudang');
    setSpot(null);
    // Interior gudang lebih lebar dari kantor; zoom awal lebih jauh agar enam rak terlihat.
    setZoom(next === 'luar' ? worldZones[zone].zoom : 0.8);
    setRotation(0);
    setRecenter((value) => value + 1);
    setPanelOpen(true);
  }
  function chooseZone(next: WorldZone) {
    setZone(next);
    setSpot(null);
    setZoom(worldZones[next].zoom);
    setRecenter((value) => value + 1);
    setLocation('luar');
    setSelected(next === 'gudang' ? 'gudang' : 'kawasan');
    // Di ponsel lembar diciutkan agar zona yang dipilih terlihat.
    setSheet('ringkas');
  }
  function select(id: string, fly = false) {
    if (id === 'koperasi') return enter('dalam');
    setSelected(id);
    showDetail();
    // Pilihan dari daftar menggerakkan kamera; klik di scene tidak memindahkan kamera,
    // kecuali truk: seperti video, kamera terbang agar truk dan rutenya ke dok terlihat.
    const rack = id.startsWith('rak-') ? warehouseInterior.racks[id.slice(4) as RackId] : undefined;
    const truckSpot =
      location === 'luar'
        ? model.trucks.find((row) => `kirim-${row.delivery.id}` === id)
        : undefined;
    const target = model.plots.find((item) => item.id === id)?.position || rack;
    if (truckSpot) {
      setSpot(truckFocus(truckSpot, model.trucks));
      // Truk antre: rute ke dok panjang, jadi kamera lebih jauh agar truk dan dok sama-sama terlihat.
      setZoom(truckSpot.place === 'antre' ? 0.68 : 1.05);
      setRecenter((value) => value + 1);
    } else if (fly && target) {
      setSpot(target);
      setZoom(1.15);
      setRecenter((value) => value + 1);
    } else if (fly && id === 'gudang') {
      setZone('gudang');
      setSpot(null);
      setZoom(worldZones.gudang.zoom);
      setRecenter((value) => value + 1);
    }
  }
  /** Enter di kolom cari: kantor/gudang, lahan/gerai, rak/barang, lalu anggota Tim. */
  function searchGo() {
    const text = query.trim().toLowerCase();
    if (!text) return;
    const has = (value: unknown) =>
      String(value || '')
        .toLowerCase()
        .includes(text);
    if ('kantor koperasi'.includes(text)) return select('koperasi');
    if ('gudang koperasi'.includes(text)) return chooseZone('gudang');
    const plot = model.plots.find((item) => has(item.unit?.data.title) || has(item.name));
    if (plot) {
      if (location !== 'luar') enter('luar');
      return select(plot.id, true);
    }
    const rackMatch = /^rak\s*([a-f])$/.exec(text)?.[1]?.toUpperCase();
    const item = model.inventory.items.find((row) => has(row.data.title) || has(row.data.sku));
    const rack =
      rackMatch ||
      (item && rackIds.includes(item.data.rack as RackId) ? String(item.data.rack) : '');
    if (rack) {
      if (location !== 'gudang') enter('gudang');
      return select(`rak-${rack}`, true);
    }
    const person = plans.find((plan) => has(plan.staff.data.title) && plan.location);
    if (person?.location) {
      if (person.location !== location) enter(person.location);
      setSelected(`staf-${person.staff.id}`);
      showDetail();
    }
  }
  // Tur hari ini: kamera berpindah zona tiap 6 detik dengan ringkasan data nyata.
  const [tour, setTour] = useState<number | null>(null);
  const count = (value: number) => (unavailable ? '—' : value);
  const tourSteps: { zone: WorldZone; text: string }[] = [
    {
      zone: 'semua',
      text: `${count(model.units.length)} gerai · ${count(model.tasks.length)} tugas terbuka · ${count(model.meetings.length)} rapat hari ini`,
    },
    {
      zone: 'kantor',
      text: `${plans.filter((plan) => plan.location === 'dalam').length} anggota tim di kantor · ${count(model.activities.length)} kegiatan hari ini`,
    },
    {
      zone: 'gudang',
      text:
        stockState === 'aktif'
          ? `${model.inventory.items.length} barang · ${model.inventory.low.length} di bawah minimum · ${model.trucks.length} truk`
          : `Data barang: ${stockState === 'belum-aktif' ? 'pencatatan belum aktif' : 'belum tersedia'} · ${model.trucks.length} truk`,
    },
    {
      zone: 'gerai',
      text: (['aktif', 'persiapan', 'rencana'] as const)
        .map(
          (status) =>
            `${count(model.units.filter((unit) => unit.data.status === status).length)} ${status}`,
        )
        .join(' · '),
    },
  ];
  function runTour(step: number | null) {
    setTour(step);
    if (step === null) return;
    if (location !== 'luar') setLocation('luar');
    chooseZone(tourSteps[step].zone);
  }
  useEffect(() => {
    if (tour === null) return;
    const next = window.setTimeout(
      () => runTour(tour + 1 < tourSteps.length ? tour + 1 : null),
      6000,
    );
    return () => clearTimeout(next);
  });
  function preference<K extends keyof WorldPreferences>(key: K, value: WorldPreferences[K]) {
    savePreferences(JSON.stringify({ ...preferences, [key]: value }));
  }
  const detail = (
    <DetailCard
      key={selected}
      mascotNote={mascotNote}
      selected={selected}
      location={location}
      zone={zone}
      model={model}
      timeline={timeline}
      plans={plans}
      preferences={preferences}
      onPreference={preference}
      rehearsal={rehearsal}
      onRehearsal={(value) => {
        setRehearsal(value);
        if (value !== 'idle' && value !== 'otomatis') setLocation('dalam');
      }}
      activity={activity}
      weatherIcon={weatherIcon}
      status={status}
      unavailable={unavailable}
      stockState={stockState}
      onEnter={enter}
      onSelect={(id) => select(id)}
      onClose={wide ? () => setPanelOpen(false) : undefined}
    />
  );
  const list = (
    <ListCard
      model={model}
      timeline={timeline}
      query={query}
      unavailable={unavailable}
      plans={plans}
      location={location}
      stockState={stockState}
      onSelect={(id) => select(id, true)}
    />
  );
  const tracker = (
    <TodayTracker
      model={model}
      timeline={timeline}
      dateLabel={dateLabel}
      unavailable={unavailable}
    />
  );
  const selectedPlot = model.plots.find((plot) => plot.id === selected);
  const sheetTitle =
    selected === 'kawasan'
      ? location === 'dalam'
        ? 'Kantor koperasi'
        : worldZones[zone].title
      : selected.startsWith('staf-')
        ? String(
            plans.find((plan) => `staf-${plan.staff.id}` === selected)?.staff.data.title || 'Tim',
          )
        : selected.startsWith('kirim-')
          ? String(
              model.deliveries.find((row) => row.id === selected.slice(6))?.data.title ||
                'Pengiriman',
            )
          : selected.startsWith('kendaraan-suasana')
            ? 'Mobil di jalan utama'
            : selected.startsWith('rak-')
              ? `Rak ${selected.slice(4)}`
              : selected === 'staging'
                ? 'Area staging'
                : selectedPlot
                  ? String(selectedPlot.unit?.data.title || selectedPlot.name)
                  : selected === 'gudang'
                    ? worldZones.gudang.title
                    : selected === 'lingkungan'
                      ? 'Suasana'
                      : selected === 'karakter'
                        ? 'Maskot koperasi'
                        : worldStations.find((item) => item.id === selected)?.title ||
                          'Kantor koperasi';
  // Kartu kanan desktop (320 px + jarak) atau lembar bawah ponsel menutupi sebagian scene.
  const occlusion = useMemo(
    () =>
      wide ? { right: panelOpen ? 352 : 0, top: 110, sheet: null } : { right: 0, top: 130, sheet },
    [wide, panelOpen, sheet],
  );

  return (
    <main
      className={`cooperative-world ${night ? 'cw-night' : ''} ${preferences.quality === 'hemat' ? 'cw-solid' : ''}`}
    >
      <WorldHeader
        summaries={zoneSummaries(model)}
        title={model.title}
        manager={model.manager}
        location={location}
        zone={zone}
        onZone={chooseZone}
        query={query}
        onQuery={(value) => {
          setQuery(value);
          setSheetTab('lokasi');
          if (!wide) setSheet((current) => (current === 'ringkas' ? 'setengah' : current));
        }}
        onSearchGo={searchGo}
        clock={clock}
        ambience={{ icon: weatherIcon, label: ambienceLabel }}
        onAmbience={() => select('lingkungan')}
      />

      <section className="cw-viewport" aria-label="Dunia koperasi interaktif">
        <WorldScene
          model={sceneModel}
          location={location}
          weather={preferences.weather}
          hour={hour}
          outfit={preferences.outfit}
          quality={preferences.quality}
          focus={focus}
          recenter={recenter}
          occlusion={occlusion}
          activity={activity}
          zoom={zoom}
          rotation={rotation}
          selected={selected}
          plans={plans}
          managerPlan={managerPlan}
          onSelect={select}
        />
        <KpiCards
          model={model}
          timeline={timeline}
          unavailable={unavailable}
          loading={loading}
          warehouse={location === 'gudang' || (location === 'luar' && zone === 'gudang')}
          stockState={stockState}
        />
        <div className="cw-crumbs">
          <Button onClick={() => enter('luar')} aria-label="Lihat kawasan">
            <House size={14} />
            Kawasan
          </Button>
          {location !== 'luar' && (
            <>
              <ChevronRight size={13} />
              <span>{location === 'gudang' ? 'Gudang koperasi' : 'Kantor koperasi'}</span>
            </>
          )}
          <Button className="cw-tour-button" onClick={() => runTour(tour === null ? 0 : null)}>
            {tour === null ? 'Tur hari ini' : 'Hentikan tur'}
          </Button>
          {(preview || partial || error || loading) && (
            <span className="cw-notice" role={error ? 'alert' : 'status'}>
              {preview
                ? 'Pratinjau desain · tanpa data operasional'
                : error
                  ? `Data tidak dapat dimuat. ${error}`
                  : loading
                    ? 'Memuat catatan koperasi…'
                    : 'Menampilkan catatan yang sudah dimuat.'}
              {error && refresh && <Button onClick={() => void refresh()}>Coba lagi</Button>}
            </span>
          )}
        </div>
        <div className="cw-camera cw-card" aria-label="Kontrol kamera">
          <Button
            aria-label="Perbesar"
            disabled={zoom >= 2.4}
            onClick={() => setZoom((value) => Math.min(2.4, value + 0.2))}
          >
            <Plus size={18} />
          </Button>
          <Button
            aria-label="Perkecil"
            disabled={zoom <= 0.35}
            onClick={() =>
              setZoom((value) => Math.max(location === 'luar' ? minWorldZoom : 0.35, value - 0.2))
            }
          >
            <Minus size={18} />
          </Button>
          <span />
          <Button
            aria-label="Putar kamera"
            onClick={() => setRotation((value) => value + Math.PI / 2)}
          >
            <RotateCcw size={17} />
          </Button>
          <Button
            aria-label="Atur ulang kamera"
            onClick={() => {
              setSpot(null);
              setZoom(location === 'luar' ? worldZones[zone].zoom : 0.8);
              setRotation(0);
              setRecenter((value) => value + 1);
            }}
          >
            <Expand size={17} />
          </Button>
        </div>

        {wide ? (
          <>
            <div className="cw-right">
              {panelOpen ? (
                <div className="cw-card cw-detail">{detail}</div>
              ) : (
                <Button className="cw-card cw-open-detail" onClick={() => setPanelOpen(true)}>
                  <Map size={17} />
                  Detail kawasan
                </Button>
              )}
              <div className="cw-card cw-list-card">{list}</div>
            </div>
            <div className="cw-card cw-tracker-card">{tracker}</div>
          </>
        ) : (
          <MobileSheet
            snap={sheet}
            onSnap={setSheet}
            tab={sheetTab}
            onTab={setSheetTab}
            summary={
              <Button
                className="cw-sheet-line"
                onClick={() => setSheet(sheet === 'ringkas' ? 'setengah' : 'ringkas')}
              >
                <strong>{sheetTitle}</strong>
                <small>
                  {timeline.find((step) => step.state !== 'selesai')
                    ? `Rapat ${timeline.find((step) => step.state !== 'selesai')?.time} WIB`
                    : `${unavailable ? '—' : model.tasks.length} tugas terbuka`}
                </small>
              </Button>
            }
          >
            {sheetTab === 'detail' ? detail : sheetTab === 'lokasi' ? list : tracker}
          </MobileSheet>
        )}
        {tour !== null && (
          <div className="cw-tour cw-card" role="status">
            <small>
              Tur hari ini · {tour + 1}/{tourSteps.length} ·{' '}
              {worldZones[tourSteps[tour].zone].title}
            </small>
            <strong>{tourSteps[tour].text}</strong>
          </div>
        )}
        <div className="cw-hint">Geser untuk memutar · Cubit / gulir untuk zoom</div>
      </section>
      <nav className="cw-dock" aria-label="Navigasi dunia koperasi">
        <Link href="/beranda" aria-label="Kembali ke Beranda">
          <ArrowLeft size={18} />
          <span>Beranda</span>
        </Link>
        <i />
        <Button aria-pressed={location === 'luar'} onClick={() => enter('luar')}>
          <Map size={19} />
          <span>Kawasan</span>
        </Button>
        <Button aria-pressed={location === 'dalam'} onClick={() => enter('dalam')}>
          <Building2 size={19} />
          <span>Kantor</span>
        </Button>
        <Button aria-pressed={location === 'gudang'} onClick={() => enter('gudang')}>
          <Warehouse size={19} />
          <span>Gudang</span>
        </Button>
        <Button aria-pressed={selected === 'karakter'} onClick={() => select('karakter')}>
          <MessageCircle size={19} />
          <span>Karakter</span>
        </Button>
        <Button aria-pressed={selected === 'lingkungan'} onClick={() => select('lingkungan')}>
          <Sun size={19} />
          <span>Suasana</span>
        </Button>
      </nav>
    </main>
  );
}
