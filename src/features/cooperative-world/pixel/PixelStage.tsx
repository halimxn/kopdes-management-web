'use client';

import { useEffect, useRef, useState } from 'react';
import type { WorldZone } from '../layout';
import type { SheetSnap } from '../ui/MobileSheet';
import type { StageState, StageTruck, WorldHandle } from './engine';

type Props = {
  trucks: StageTruck[];
  selected: string;
  location: string;
  zone: WorldZone;
  zoom: number;
  recenter: number;
  occlusion: { right: number; top: number; sheet: SheetSnap | null };
  control: boolean;
  night: boolean;
  onSelect: (id: string) => void;
  onZoom: (zoom: number) => void;
  onControl: (control: boolean) => void;
};

/** Lembar bawah ponsel menutupi bagian bawah layar; kamera menengahkan objek di atasnya. */
function sheetHeight(sheet: SheetSnap | null) {
  if (!sheet || typeof window === 'undefined') return 0;
  return sheet === 'ringkas'
    ? 120
    : sheet === 'setengah'
      ? window.innerHeight * 0.5
      : window.innerHeight * 0.85;
}

/** Pembungkus React untuk mesin PixiJS; mesin dibuat sekali dan diberi keadaan terbaru. */
export function PixelStage(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<WorldHandle | null>(null);
  const callbacks = useRef({
    onSelect: props.onSelect,
    onZoom: props.onZoom,
    onControl: props.onControl,
  });
  const [failed, setFailed] = useState(false);
  const state: StageState = {
    trucks: props.trucks,
    selected: props.selected,
    location: props.location,
    zone: props.zone,
    zoom: props.zoom,
    recenter: props.recenter,
    occlusion: {
      right: props.occlusion.right,
      top: props.occlusion.top,
      bottom: sheetHeight(props.occlusion.sheet),
    },
    control: props.control,
    night: props.night,
  };
  const latest = useRef(state);

  useEffect(() => {
    callbacks.current = {
      onSelect: props.onSelect,
      onZoom: props.onZoom,
      onControl: props.onControl,
    };
    latest.current = state;
    handle.current?.update(state);
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let world: WorldHandle | null = null;
    import('./engine')
      .then(({ createWorld }) =>
        createWorld(
          el,
          {
            onSelect: (id) => callbacks.current.onSelect(id),
            onZoom: (zoom) => callbacks.current.onZoom(zoom),
            onControl: (control) => callbacks.current.onControl(control),
          },
          latest.current,
        ),
      )
      .then((created) => {
        if (cancelled) created.destroy();
        else {
          world = created;
          handle.current = created;
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      world?.destroy();
      handle.current = null;
    };
  }, []);

  return (
    <div className="cw-pixel" ref={host}>
      {failed && <div className="cw-loading">Dunia tidak dapat ditampilkan di perangkat ini.</div>}
    </div>
  );
}
