/**
 * A coarse spatial index of wild-forest trunks, so someone walking through
 * the forest goes around trees instead of through them.
 */

const CELL = 16;

interface Trunk {
  x: number;
  z: number;
  r: number;
}

let grid = new Map<string, Trunk[]>();

const key = (ix: number, iz: number) => `${ix},${iz}`;

export function setWildTrunks(trunks: Trunk[]) {
  const g = new Map<string, Trunk[]>();
  for (const t of trunks) {
    const k = key(Math.floor(t.x / CELL), Math.floor(t.z / CELL));
    const list = g.get(k);
    if (list) list.push(t);
    else g.set(k, [t]);
  }
  grid = g;
}

/** Trunks whose circle comes within `radius` of (x, z). */
export function trunksNear(x: number, z: number, radius: number, out: Trunk[] = []): Trunk[] {
  out.length = 0;
  const r = Math.ceil(radius / CELL) + 1;
  const ix = Math.floor(x / CELL);
  const iz = Math.floor(z / CELL);
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const list = grid.get(key(ix + dx, iz + dz));
      if (!list) continue;
      for (const t of list) {
        const d = Math.hypot(t.x - x, t.z - z);
        if (d < radius + t.r) out.push(t);
      }
    }
  }
  return out;
}
