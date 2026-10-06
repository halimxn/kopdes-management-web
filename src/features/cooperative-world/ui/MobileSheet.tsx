'use client';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';

export type SheetSnap = 'ringkas' | 'setengah' | 'penuh';
export type SheetTab = 'detail' | 'lokasi' | 'hari-ini';
const order: SheetSnap[] = ['ringkas', 'setengah', 'penuh'];
const tabs: { id: SheetTab; label: string }[] = [
  { id: 'detail', label: 'Detail' },
  { id: 'lokasi', label: 'Daftar' },
  { id: 'hari-ini', label: 'Hari ini' },
];

type Props = {
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  tab: SheetTab;
  onTab: (tab: SheetTab) => void;
  /** Ringkasan satu baris yang tetap terlihat saat lembar diciutkan. */
  summary: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Lembar bawah untuk layar < 1024 px. Menarik pegangan memilih posisi terdekat;
 * tombol pegangan berganti posisi untuk pengguna keyboard dan pembaca layar.
 */
export function MobileSheet({ snap, onSnap, tab, onTab, summary, children }: Props) {
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  // Tarikan selesai juga memicu click; click itu diabaikan agar posisi tidak bergeser dua kali.
  const skipClick = useRef(false);
  const next = () => onSnap(order[(order.indexOf(snap) + 1) % order.length]);
  return (
    <section className={`cw-sheet is-${snap}`} aria-label="Panel informasi dunia">
      <Button
        className="cw-sheet-handle"
        aria-label={`Ubah ukuran panel (sekarang ${snap})`}
        aria-expanded={snap !== 'ringkas'}
        onPointerDown={(event) => {
          drag.current = { y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current && Math.abs(event.clientY - drag.current.y) > 8)
            drag.current.moved = true;
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          if (!start?.moved) return;
          skipClick.current = true;
          const delta = event.clientY - start.y;
          const index =
            order.indexOf(snap) + (delta < 0 ? 1 : -1) * (Math.abs(delta) > 220 ? 2 : 1);
          onSnap(order[Math.max(0, Math.min(order.length - 1, index))]);
        }}
        onClick={() => {
          if (skipClick.current) skipClick.current = false;
          else next();
        }}
      >
        <i />
      </Button>
      <div className="cw-sheet-summary">{summary}</div>
      {snap !== 'ringkas' && (
        <>
          <div className="cw-tabs cw-sheet-tabs" role="tablist">
            {tabs.map((item) => (
              <Button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => onTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="cw-sheet-body" role="tabpanel">
            {children}
          </div>
        </>
      )}
    </section>
  );
}
