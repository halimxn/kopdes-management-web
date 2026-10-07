/**
 * Rupa karakter Dunia Koperasi dari data Tim atau preferensi manajer. Rupa tidak ditebak dari
 * nama atau ID: bila belum ada isian sama sekali, karakter tampil sebagai sosok netral bertopi
 * KDMP. Kolom lama `hair` (dunia 3D) tetap dihormati bila kolom rupa baru belum diisi.
 */
export type Look = {
  head: 'none' | 'hijab' | 'peci' | 'cap';
  hair: 'short' | 'long' | 'curly';
  skin: 'light' | 'tan' | 'dark';
  glasses: boolean;
  /** Warna seragam/baju (hex); hijab memakai warna yang sama. */
  outfit: string;
  /** Pengurus dan pengawas berbatik. */
  batik: boolean;
  neutral: boolean;
};

export const OUTFIT_HEX: Record<string, string> = {
  biru: '#5f84b3',
  hijau: '#6a9a5a',
  oranye: '#d98a4a',
  lavender: '#9a8ac0',
  abu: '#8a8f96',
};
export const SKIN_HEX: Record<Look['skin'], string> = {
  light: '#f0c39a',
  tan: '#d29868',
  dark: '#a8714c',
};

const HEAD: Record<string, Look['head']> = {
  'tidak ada': 'none',
  hijab: 'hijab',
  peci: 'peci',
  'topi KDMP': 'cap',
};
const HAIR: Record<string, Look['hair']> = { pendek: 'short', panjang: 'long', ikal: 'curly' };
const SKIN: Record<string, Look['skin']> = { terang: 'light', 'sawo matang': 'tan', gelap: 'dark' };

type LookFields = {
  look_head?: unknown;
  look_hair?: unknown;
  look_skin?: unknown;
  look_glasses?: unknown;
  outfit?: unknown;
};

function fromFields(data: LookFields, legacyHair?: unknown): Omit<Look, 'batik'> {
  const filled = (v: unknown) => typeof v === 'string' && v !== '' && v !== 'belum diisi';
  let head = filled(data.look_head) ? HEAD[String(data.look_head)] : undefined;
  let hair = filled(data.look_hair) ? HAIR[String(data.look_hair)] : undefined;
  const skin = filled(data.look_skin) ? SKIN[String(data.look_skin)] : undefined;
  // Kolom lama dunia 3D: berkerudung → hijab, topi → topi KDMP, pendek/panjang → rambut.
  if (!head && !hair && typeof legacyHair === 'string') {
    if (legacyHair === 'berkerudung') head = 'hijab';
    else if (legacyHair === 'topi') head = 'cap';
    else if (legacyHair === 'panjang' || legacyHair === 'pendek') {
      head = 'none';
      hair = HAIR[legacyHair];
    }
  }
  const neutral = !head && !hair && !skin;
  return {
    head: neutral ? 'cap' : (head ?? 'none'),
    hair: hair ?? 'short',
    skin: skin ?? 'tan',
    glasses: data.look_glasses === 'ya',
    outfit: OUTFIT_HEX[String(data.outfit)] ?? OUTFIT_HEX.biru,
    neutral,
  };
}

export function staffLook(data: Record<string, unknown>): Look {
  const position = String(data.position || 'karyawan');
  return {
    ...fromFields(data, data.hair),
    batik: position === 'pengurus' || position === 'pengawas',
  };
}

/** Rupa manajer dari preferensi perangkat (editor di kartu Karakter). */
export function managerLook(prefs: LookFields): Look {
  return { ...fromFields(prefs), batik: false };
}

/** Kunci tekstur: karakter berupa sama memakai lembar sprite yang sama. */
export const lookKey = (look: Look) =>
  [
    look.head,
    look.hair,
    look.skin,
    look.glasses ? 'k' : '',
    look.outfit,
    look.batik ? 'b' : '',
  ].join('|');
