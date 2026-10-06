import Link from 'next/link';
import { CalendarClock, Check, ChevronRight, Truck, Users } from 'lucide-react';
import { recordHref } from '../../workspace/workspace-navigation';
import { deliverySteps, type MeetingStep, type WorldModel } from '../world-model';
import { WorldIcon } from './WorldIcon';

type Props = {
  model: WorldModel;
  timeline: MeetingStep[];
  dateLabel: string;
  unavailable: boolean;
};

const stateLabel = { selesai: 'Selesai', berlangsung: 'Berlangsung', nanti: 'Nanti' };

/**
 * Pengganti "Shipment Tracking" pada video: urutan rapat hari ini. Setelah domain Pengiriman
 * tersedia, kartu ini dapat menampilkan tahap pengiriman dengan pola langkah yang sama.
 */
/** Pengiriman yang ditampilkan: yang sedang di dok, lalu dalam perjalanan, lalu yang dipesan. */
function activeDelivery(model: WorldModel) {
  const order = ['diperiksa', 'tiba', 'dikirim', 'dipesan'];
  return [...model.deliveries]
    .filter((row) => order.includes(String(row.data.status)))
    .sort((a, b) => order.indexOf(String(a.data.status)) - order.indexOf(String(b.data.status)))[0];
}

const deliveryLabel: Record<string, string> = {
  dipesan: 'Dipesan',
  dikirim: 'Dikirim',
  tiba: 'Tiba',
  diperiksa: 'Diperiksa',
  selesai: 'Selesai',
};

export function TodayTracker({ model, timeline, dateLabel, unavailable }: Props) {
  const delivery = unavailable ? undefined : activeDelivery(model);
  if (delivery) {
    const current = deliverySteps.indexOf(
      String(delivery.data.status) as (typeof deliverySteps)[number],
    );
    const others = model.deliveries.filter(
      (row) =>
        row.id !== delivery.id &&
        ['dipesan', 'dikirim', 'tiba', 'diperiksa'].includes(String(row.data.status)),
    ).length;
    return (
      <section className="cw-tracker" aria-label="Pelacak pengiriman">
        <div className="cw-tracker-main">
          <div className="cw-tracker-title">
            <span>
              <Truck size={17} />
              <strong>Pelacak pengiriman</strong>
            </span>
            <small>{others ? `+${others} lain` : dateLabel}</small>
          </div>
          <ol className="cw-steps">
            {deliverySteps.map((step, index) => (
              <li
                key={step}
                className={
                  index < current ? 'is-selesai' : index === current ? 'is-berlangsung' : 'is-nanti'
                }
              >
                <span className="cw-step-dot">
                  {index < current ? <Check size={13} /> : <Truck size={13} />}
                </span>
                <strong>{deliveryLabel[step]}</strong>
                <small>{index === current ? 'Sekarang' : index < current ? 'Selesai' : ''}</small>
              </li>
            ))}
          </ol>
        </div>
        <div className="cw-tracker-side">
          <Link className="cw-next cw-next-art" href={recordHref('deliveries', delivery)}>
            <span className="cw-next-icon">
              <WorldIcon kind="truk" size={38} />
            </span>
            <small>{delivery.data.direction === 'keluar' ? 'Barang keluar' : 'Barang masuk'}</small>
            <strong>{String(delivery.data.title)}</strong>
            <span>
              {delivery.data.dock && delivery.data.dock !== 'belum ditentukan'
                ? `Dok ${delivery.data.dock}`
                : 'Dok belum ditentukan'}
              {delivery.data.arrival_time ? ` · ${delivery.data.arrival_time} WIB` : ''}
              {delivery.data.license_plate
                ? ` · ${delivery.data.license_plate}`
                : delivery.data.vehicle
                  ? ` · ${delivery.data.vehicle}`
                  : ''}
              {delivery.data.driver_name ? ` · ${delivery.data.driver_name}` : ''}
            </span>
            <span className="cw-pill is-blue">{deliveryLabel[String(delivery.data.status)]}</span>
            <ChevronRight size={16} className="cw-next-arrow" />
          </Link>
        </div>
      </section>
    );
  }
  const steps = timeline.slice(0, 5);
  const focus =
    timeline.find((step) => step.state === 'berlangsung') ||
    timeline.find((step) => step.state === 'nanti');
  return (
    <section className="cw-tracker" aria-label="Jadwal hari ini">
      <div className="cw-tracker-main">
        <div className="cw-tracker-title">
          <span>
            <CalendarClock size={17} />
            <strong>Jadwal hari ini</strong>
          </span>
          <small>{dateLabel}</small>
        </div>
        {unavailable ? (
          <p className="cw-empty">Jadwal belum dapat dimuat.</p>
        ) : steps.length ? (
          <ol className="cw-steps">
            {steps.map((step) => (
              <li key={step.row.id} className={`is-${step.state}`}>
                <span className="cw-step-dot">
                  {step.state === 'selesai' ? <Check size={13} /> : <Users size={13} />}
                </span>
                <strong>{String(step.row.data.title)}</strong>
                <small>
                  {step.time} · {stateLabel[step.state]}
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="cw-empty">
            Tidak ada rapat terjadwal hari ini. <Link href="/rapat">Jadwalkan rapat</Link>
          </p>
        )}
      </div>
      {!unavailable && (
        <div className="cw-tracker-side">
          {focus ? (
            <Link className="cw-next" href={recordHref('meetings', focus.row)}>
              <small>
                {focus.state === 'berlangsung' ? 'Sedang berlangsung' : 'Rapat berikutnya'}
              </small>
              <strong>{String(focus.row.data.title)}</strong>
              <span>
                {focus.time}–{focus.end} WIB
                {focus.row.data.location ? ` · ${focus.row.data.location}` : ''}
              </span>
              <span className={`cw-pill ${focus.state === 'berlangsung' ? 'is-green' : 'is-blue'}`}>
                {stateLabel[focus.state]}
              </span>
              <ChevronRight size={16} className="cw-next-arrow" />
            </Link>
          ) : (
            <div className="cw-next-links">
              <Link href="/tugas">
                <span>Tugas terbuka</span>
                <strong>{model.tasks.length}</strong>
              </Link>
              <Link href="/jurnal">
                <span>Kegiatan hari ini</span>
                <strong>{model.activities.length}</strong>
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
