import { createRng } from '../../engine/rng';

/** FNV-1a 32bit */
export function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** 10분 창, 5초 칸 → 120칸, 0~10s */
export const HITMAP = { cols: 120, maxMs: 10000 } as const;
export type HitPoint = { col: number; ms: number; error: boolean };

export function hitmapPoints(key: string, anomaly: boolean): HitPoint[] {
  const r = createRng(hashKey(key));
  const pts: HitPoint[] = [];
  const start = Math.floor(HITMAP.cols * 0.7);
  for (let col = 0; col < HITMAP.cols; col++) {
    const bad = anomaly && col >= start;
    const n = 6 + r.int(0, 6) + (bad ? 6 : 0);
    for (let k = 0; k < n; k++) {
      const base = bad && r.chance(0.6) ? 2500 + r.int(0, 6500) : Math.round(80 + Math.pow(r.next(), 3) * 1200);
      pts.push({ col, ms: Math.min(HITMAP.maxMs, base), error: bad ? r.chance(0.25) : r.chance(0.01) });
    }
  }
  return pts;
}

/** 시계열 (0~100 스케일). anomaly면 끝 30%가 급등. */
export function series(key: string, anomaly: boolean, n = 60): number[] {
  const r = createRng(hashKey(key));
  const out: number[] = [];
  let v = 25 + r.int(0, 15);
  for (let i = 0; i < n; i++) {
    v = Math.max(5, Math.min(60, v + r.int(-4, 4)));
    const spike = anomaly && i >= n * 0.7 ? 35 + r.int(0, 10) : 0;
    out.push(Math.min(100, v + spike));
  }
  return out;
}
