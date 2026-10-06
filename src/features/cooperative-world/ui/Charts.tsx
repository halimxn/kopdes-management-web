/**
 * Grafik kecil kartu Dunia Koperasi (pola kartu video): batang stok buku terhadap batas
 * minimum, dan mini grafik batang 7 hari. Hanya menggambar angka dari data; tanpa riwayat
 * grafik tidak ditampilkan agar tidak terbaca sebagai nol.
 */
export function StockBar({ stock, minimum }: { stock: number; minimum: number }) {
  if (!Number.isFinite(stock)) return null;
  const scale = Math.max(stock, minimum > 0 ? minimum * 2 : stock, 1);
  const low = minimum > 0 && stock < minimum;
  return (
    <span
      className={`cw-stock-bar ${low ? 'is-low' : ''}`}
      role="img"
      aria-label={`Stok buku ${stock}${minimum > 0 ? `, minimum ${minimum}` : ''}`}
    >
      <b style={{ width: `${Math.min(1, stock / scale) * 100}%` }} />
      {minimum > 0 && <u style={{ left: `${(minimum / scale) * 100}%` }} />}
    </span>
  );
}

export function Spark({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values);
  if (!max) return null;
  return (
    <span
      className="cw-spark"
      role="img"
      aria-label={`${label}: ${values.join(', ')}`}
      title={label}
    >
      {values.map((value, index) => (
        <i
          key={index}
          className={index === values.length - 1 ? 'is-today' : ''}
          style={{ height: `${Math.max(12, (value / max) * 100)}%` }}
        />
      ))}
    </span>
  );
}
