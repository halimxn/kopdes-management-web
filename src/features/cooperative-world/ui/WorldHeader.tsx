'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, Layers3, Map, Search, Store, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { worldZones, type WorldZone } from '../layout';
import type { WorldLocation } from '../world-model';

export function zoneIcon(zone: WorldZone, size = 18) {
  if (zone === 'kantor') return <Building2 size={size} />;
  if (zone === 'gudang') return <Warehouse size={size} />;
  if (zone === 'gerai') return <Store size={size} />;
  return <Map size={size} />;
}

type Props = {
  title: string;
  manager: string;
  location: WorldLocation;
  zone: WorldZone;
  onZone: (zone: WorldZone) => void;
  query: string;
  onQuery: (value: string) => void;
  clock: string;
  /** Chip suasana: ikon cuaca dan ringkasan waktu, membuka pengaturan Suasana. */
  ambience: { icon: React.ReactNode; label: string };
  onAmbience: () => void;
};

export function WorldHeader({
  title,
  manager,
  location,
  zone,
  onZone,
  query,
  onQuery,
  clock,
  ambience,
  onAmbience,
}: Props) {
  const [open, setOpen] = useState(false);
  const close = (event: React.KeyboardEvent) => event.key === 'Escape' && setOpen(false);
  return (
    <header className="cw-topbar">
      <Link className="cw-brand" href="/beranda" title="Kembali ke Beranda">
        <span className="cw-brand-icon">
          <Layers3 size={22} />
        </span>
        <span className="cw-brand-text">
          Dunia<span className="cw-brand-light">Koperasi</span>
        </span>
      </Link>
      <label className="cw-search">
        <Search size={16} />
        <Input
          aria-label="Cari lokasi, tugas, atau rapat"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Cari lahan, gerai, tugas, rapat…"
        />
      </label>
      <div className="cw-zone-picker">
        <Button
          className="cw-zone-button"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={close}
        >
          <span className="cw-zone-badge">{zoneIcon(location === 'dalam' ? 'kantor' : zone)}</span>
          <span className="cw-zone-text">
            <strong>{location === 'dalam' ? 'Kantor · interior' : worldZones[zone].title}</strong>
            <small>{title}</small>
          </span>
          <ChevronDown size={15} />
        </Button>
        {open && (
          <div className="cw-zone-menu cw-card" role="menu" aria-label="Pilih zona">
            {(Object.keys(worldZones) as WorldZone[]).map((key) => (
              <Button
                key={key}
                role="menuitem"
                aria-current={location === 'luar' && zone === key ? 'true' : undefined}
                onClick={() => {
                  setOpen(false);
                  onZone(key);
                }}
                onKeyDown={close}
              >
                <span className="cw-zone-badge">{zoneIcon(key)}</span>
                <span className="cw-zone-text">
                  <strong>{worldZones[key].title}</strong>
                  <small>{worldZones[key].subtitle}</small>
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
      <Button
        className="cw-ambience"
        onClick={onAmbience}
        aria-label={`Suasana: ${ambience.label}`}
      >
        {ambience.icon}
        <span>{ambience.label}</span>
      </Button>
      {/* Jam server dan browser bisa berbeda satu menit saat hidrasi. */}
      <span className="cw-live" aria-label={`Jam ${clock} WIB`} suppressHydrationWarning>
        <i />
        {clock}
        <span className="cw-live-zone"> WIB</span>
      </span>
      <div className="cw-profile">
        <span aria-hidden>{manager.slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{manager}</strong>
          <small>Manajer</small>
        </div>
      </div>
    </header>
  );
}
