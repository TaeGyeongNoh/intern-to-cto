import { apply, newGame, pending, validInputs } from './game';
import { createRng } from './rng';
import { ROUTE_IDS, type Content, type PositionId } from './types';

export type SimReport = {
  games: number;
  endings: Record<string, number>;
  avgYears: number;
  maxYears: number;
  avgIncidents: number;
  resolveRate: { noClue: number; withClues: number };
  /** 만원. 커리어 10년차 연말 연봉 중앙값 (10년 이상 플레이한 판만) */
  salaryYear10Median: number;
  maxSalary: { median: number; p90: number; max: number };
};

const quantile = (xs: number[], q: number): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

const POSITIONS: PositionId[] = ['backend', 'frontend', 'sre', 'ai'];

/** 무작위로 유효한 입력을 고르는 플레이어로 n판을 돌린다. */
export function simulate(n: number, c: Content, seed0 = 1): SimReport {
  const endings: Record<string, number> = {};
  let years = 0;
  let maxYears = 0;
  let incidents = 0;
  const agg = { noClue: [0, 0], withClues: [0, 0] };
  const year10: number[] = [];
  const maxSalaries: number[] = [];

  for (let k = 0; k < n; k++) {
    const seed = seed0 + k;
    const player = createRng((seed * 7919 + 13) >>> 0);
    let g = newGame({ name: 'sim', position: player.pick(POSITIONS), route: player.pick(ROUTE_IDS), candidate: player.int(0, 2) }, seed, c);
    for (let guard = 0; pending(g).kind !== 'ended'; guard++) {
      if (guard > 3000) throw new Error(`game seed=${seed} did not end`);
      const p = pending(g);
      const input = player.pick(validInputs(g, c));
      if (p.kind === 'incident-action') {
        const before = g.state.record.incidentsResolved;
        g = apply(g, input, c);
        const bucket = p.clues === 0 ? agg.noClue : agg.withClues;
        bucket[0] += g.state.record.incidentsResolved > before ? 1 : 0;
        bucket[1] += 1;
        continue;
      }
      g = apply(g, input, c);
    }
    const id = g.state.endingId ?? 'none';
    endings[id] = (endings[id] ?? 0) + 1;
    const y = g.state.record.history.length;
    years += y;
    maxYears = Math.max(maxYears, y);
    incidents += g.state.record.incidentsTotal;
    const row10 = g.state.record.history[9];
    if (row10) year10.push(row10.salary);
    maxSalaries.push(g.state.maxSalary);
  }

  const rate = ([ok, total]: number[]) => (total ? ok / total : 0);
  return {
    games: n,
    endings,
    avgYears: years / n,
    maxYears,
    avgIncidents: incidents / n,
    resolveRate: { noClue: rate(agg.noClue), withClues: rate(agg.withClues) },
    salaryYear10Median: quantile(year10, 0.5),
    maxSalary: { median: quantile(maxSalaries, 0.5), p90: quantile(maxSalaries, 0.9), max: quantile(maxSalaries, 1) },
  };
}
