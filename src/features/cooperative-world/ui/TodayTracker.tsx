import Link from 'next/link';
import { CalendarClock, Check, ChevronRight, Users } from 'lucide-react';
import { recordHref } from '../../workspace/workspace-navigation';
import type { MeetingStep, WorldModel } from '../world-model';

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
export function TodayTracker({ model, timeline, dateLabel, unavailable }: Props) {
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
