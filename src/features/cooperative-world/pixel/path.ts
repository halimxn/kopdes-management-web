export type Cell = readonly [number, number];

/** Sel terdekat yang dapat dilalui (pencarian melebar), atau null bila tidak ada. */
export function nearestWalkable(
  blocked: Uint8Array,
  cols: number,
  rows: number,
  cell: Cell,
): Cell | null {
  const [c0, r0] = cell;
  for (let d = 0; d < Math.max(cols, rows); d++)
    for (let dr = -d; dr <= d; dr++)
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c >= 0 && r >= 0 && c < cols && r < rows && !blocked[r * cols + c]) return [c, r];
      }
  return null;
}

/**
 * A* delapan arah tanpa memotong sudut bangunan. Tujuan terhalang diganti sel terdekat
 * yang dapat dilalui agar ketukan di atap tetap membawa avatar ke depan bangunan.
 */
export function findPath(
  blocked: Uint8Array,
  cols: number,
  rows: number,
  start: Cell,
  goal: Cell,
): Cell[] | null {
  const from = nearestWalkable(blocked, cols, rows, start);
  const to = nearestWalkable(blocked, cols, rows, goal);
  if (!from || !to) return null;
  const key = (c: number, r: number) => r * cols + c;
  const goalKey = key(to[0], to[1]);
  const g = new Float32Array(cols * rows).fill(Infinity);
  const came = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const open: { k: number; f: number }[] = [];
  const h = (c: number, r: number) => {
    const dx = Math.abs(c - to[0]);
    const dy = Math.abs(r - to[1]);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };
  const startKey = key(from[0], from[1]);
  g[startKey] = 0;
  open.push({ k: startKey, f: h(from[0], from[1]) });
  while (open.length) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const { k } = open.splice(best, 1)[0];
    if (closed[k]) continue;
    if (k === goalKey) break;
    closed[k] = 1;
    const c = k % cols;
    const r = Math.floor(k / cols);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const nk = key(nc, nr);
        if (blocked[nk] || closed[nk]) continue;
        if (dr && dc && (blocked[key(c + dc, r)] || blocked[key(c, r + dr)])) continue;
        const cost = g[k] + (dr && dc ? Math.SQRT2 : 1);
        if (cost < g[nk]) {
          g[nk] = cost;
          came[nk] = k;
          open.push({ k: nk, f: cost + h(nc, nr) });
        }
      }
  }
  if (goalKey !== startKey && came[goalKey] < 0) return null;
  const path: Cell[] = [];
  for (let k = goalKey; k !== -1; k = k === startKey ? -1 : came[k])
    path.unshift([k % cols, Math.floor(k / cols)]);
  return path;
}
