import { createRng, type Rng } from './rng';
import { STAT_IDS, type Archetype, type PositionId, type StatId, type Stats } from './types';

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

export const STAT_MIN = 20;
export const STAT_MAX = 75;
/** 강점은 이 아래로, 약점은 이 위로 내려가거나 올라가지 않는다 */
export const SPIKE_FLOOR = 60;
export const DUMP_CEIL = 28;

export type Candidate = { archetypeId: string; stats: Stats };
type Role = 'spike' | 'mid' | 'dump';

/** 정확한(반올림 전) 가중 평균 */
const rawOvr = (s: Stats, w: Stats): number => STAT_IDS.reduce((a, id) => a + s[id] * w[id], 0);

/**
 * 유형 모양대로 능력치를 만든다: 강점 60~70, 약점 20~28, 나머지는 중간.
 * 그다음 합 240·OVR 45를 맞추는데, 중간 스탯끼리 먼저 1점씩 옮기고
 * 그걸로 안 될 때만 강점·약점을 모양(강점이 최상위, 약점이 최하위)을 지키는 선에서 건드린다.
 */
function makeCandidate(a: Archetype, position: PositionId, rng: Rng): Stats {
  const w = POSITION_WEIGHTS[position];
  const role = (id: StatId): Role => (a.spikes.includes(id) ? 'spike' : a.dumps.includes(id) ? 'dump' : 'mid');
  const mids = STAT_IDS.filter((id) => role(id) === 'mid');
  const s = {} as Stats;
  for (const id of a.spikes) s[id] = a.spikes.length > 1 ? rng.int(61, 67) : rng.int(63, 70);
  for (const id of a.dumps) s[id] = rng.int(21, 26);
  const rest = START_SUM - [...a.spikes, ...a.dumps].reduce((t, id) => t + s[id], 0);
  mids.forEach((id, i) => { s[id] = Math.floor(rest / mids.length) + (i < rest % mids.length ? 1 : 0); });

  const bounds = (id: StatId): [number, number] => {
    const others = (r: Role) => STAT_IDS.filter((x) => x !== id && role(x) === r).map((x) => s[x]);
    const notSpike = STAT_IDS.filter((x) => x !== id && role(x) !== 'spike').map((x) => s[x]);
    const notDump = STAT_IDS.filter((x) => x !== id && role(x) !== 'dump').map((x) => s[x]);
    switch (role(id)) {
      case 'spike': return [Math.max(SPIKE_FLOOR, Math.max(...notSpike) + 1), STAT_MAX];
      case 'dump': return [STAT_MIN, Math.min(DUMP_CEIL, Math.min(...notDump) - 1)];
      default: return [Math.max(STAT_MIN, Math.max(...others('dump')) + 1), Math.min(STAT_MAX, Math.min(...others('spike')) - 1)];
    }
  };
  const move = (from: StatId, to: StatId) => { s[from] -= 1; s[to] += 1; };
  /** 옮긴 뒤에도 두 스탯이 각자 범위 안에 있어야 한다 */
  const canMove = (from: StatId, to: StatId) => {
    if (from === to) return false;
    move(from, to);
    const ok = [from, to].every((id) => { const [lo, hi] = bounds(id); return s[id] >= lo && s[id] <= hi; });
    move(to, from);
    return ok;
  };

  // 강점 둘이 높게 뽑히면 중간이 약점까지 내려올 수 있다: 강점(아니면 약점)에서 덜어 중간을 띄운다
  const lowestMid = () => mids.reduce((m, id) => (s[id] < s[m] ? id : m));
  const top = (ids: StatId[]) => ids.reduce((m, id) => (s[id] > s[m] ? id : m));
  while (s[lowestMid()] <= Math.max(...a.dumps.map((id) => s[id]))) {
    const spike = top(a.spikes);
    move(s[spike] > SPIKE_FLOOR ? spike : top(a.dumps), lowestMid());
  }

  // 중간 스탯끼리 흔들어 다시 뽑을 때마다 조금씩 다르게
  for (let k = 0; k < 12; k++) {
    const from = rng.pick(mids);
    const to = rng.pick(mids);
    for (let n = rng.int(1, 3); n > 0 && canMove(from, to); n--) move(from, to);
  }

  for (let guard = 0; ovr(s, position) !== START_OVR; guard++) {
    if (guard > 2000) throw new Error(`cannot fit archetype ${a.id} to ${position}`);
    const up = rawOvr(s, w) < START_OVR;
    const gain = (from: StatId, to: StatId) => (up ? w[to] - w[from] : w[from] - w[to]);
    const pairs = (pool: StatId[]) =>
      pool.flatMap((from) => pool.filter((to) => gain(from, to) > 0 && canMove(from, to)).map((to) => ({ item: [from, to] as const, weight: gain(from, to) })));
    const options = pairs(mids).length ? pairs(mids) : pairs([...STAT_IDS]);
    if (!options.length) throw new Error(`cannot fit archetype ${a.id} to ${position}`);
    const [from, to] = rng.weighted(options);
    move(from, to);
  }
  return s;
}

/** 포지션에 맞는 유형 3개를 시드로 고르고, 유형마다 후보 능력치를 만든다. */
export function generateCandidates(position: PositionId, seed: number, archetypes: Record<string, Archetype>): Candidate[] {
  const rng = createRng((seed ^ 0x5bd1e995) >>> 0);
  const pool = Object.values(archetypes).filter((a) => a.positions.includes(position));
  if (pool.length < 3) throw new Error(`position ${position}: needs at least 3 archetypes`);
  const picked: Archetype[] = [];
  while (picked.length < 3) {
    const a = rng.pick(pool.filter((x) => !picked.includes(x)));
    picked.push(a);
  }
  return picked.map((a) => ({ archetypeId: a.id, stats: makeCandidate(a, position, rng) }));
}
