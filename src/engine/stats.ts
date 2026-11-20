import { createRng, type Rng } from './rng';
import { STAT_IDS, type PositionId, type Stats } from './types';

export const START_OVR = 45;
export const START_SUM = 240;

export const POSITION_WEIGHTS: Record<PositionId, Stats> = {
  backend: { impl: 0.3, design: 0.25, debug: 0.2, infra: 0.1, ai: 0.1, mental: 0.05 },
  frontend: { impl: 0.35, design: 0.2, debug: 0.2, infra: 0.05, ai: 0.1, mental: 0.1 },
  sre: { impl: 0.1, design: 0.15, debug: 0.3, infra: 0.3, ai: 0.05, mental: 0.1 },
  ai: { impl: 0.2, design: 0.15, debug: 0.15, infra: 0.1, ai: 0.3, mental: 0.1 },
};

export const POSITION_LABELS: Record<PositionId, string> = {
  backend: '백엔드', frontend: '프론트엔드', sre: 'SRE/플랫폼', ai: 'AI 엔지니어',
};

export function ovr(stats: Stats, position: PositionId): number {
  const w = POSITION_WEIGHTS[position];
  return Math.round(STAT_IDS.reduce((s, id) => s + stats[id] * w[id], 0));
}

/** 합 240을 유지하며 포인트를 옮겨 OVR이 정확히 45가 될 때까지 조정한다. */
function makeCandidate(position: PositionId, rng: Rng): Stats {
  const s = Object.fromEntries(STAT_IDS.map((id) => [id, START_SUM / STAT_IDS.length])) as Stats;
  const w = POSITION_WEIGHTS[position];
  const heavy = STAT_IDS.map((id) => ({ item: id, weight: w[id] }));
  for (let i = 0; i < 5000 && ovr(s, position) !== START_OVR; i++) {
    const up = ovr(s, position) < START_OVR;
    const to = up ? rng.weighted(heavy) : rng.pick(STAT_IDS);
    const from = up ? rng.pick(STAT_IDS) : rng.weighted(heavy);
    if (to === from) continue;
    const amt = rng.int(1, 3);
    if (s[from] - amt < 20 || s[to] + amt > 70) continue;
    s[from] -= amt;
    s[to] += amt;
  }
  return s;
}

export function generateCandidates(position: PositionId, seed: number): Stats[] {
  const rng = createRng((seed ^ 0x5bd1e995) >>> 0);
  return [0, 1, 2].map(() => makeCandidate(position, rng));
}
