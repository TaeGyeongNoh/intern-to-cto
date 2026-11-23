import { apply, newGame, pending, validInputs, type Game, type Input } from './game';
import { IPO_MULT } from './company';
import { actionChance } from './incident';
import { createRng, type Rng } from './rng';
import { ROUTE_IDS, type Content, type PositionId } from './types';

/**
 * 시뮬레이션 플레이어 정책.
 * - random: 유효한 입력을 무작위로 고른다.
 * - skilled: 장애에서 열려 있는 정답 뷰를 고르고, 성공 확률이 가장 높은 조치를 고른다. 나머지는 무작위.
 * - loyal: 이직 제안을 항상 거절한다(회사가 문을 닫아 남을 수 없으면 첫 제안). 나머지는 무작위.
 */
export type SimPolicy = 'random' | 'skilled' | 'loyal';

export type SimReport = {
  games: number;
  endings: Record<string, number>;
  avgYears: number;
  maxYears: number;
  avgIncidents: number;
  /** 전체 장애 해결률 */
  incidentResolveRate: number;
  resolveRate: { noClue: number; withClues: number };
  /** 만원. 커리어 10년차 연말 연봉 중앙값 (10년 이상 플레이한 판만) */
  salaryYear10Median: number;
  maxSalary: { median: number; p90: number; max: number };
  /** 만원. 은퇴 시점 순자산 */
  assets: { median: number; p90: number };
  /** 내 집 마련(house)을 산 판의 비율 */
  houseRate: number;
  /** 판당 평균 상점 구매 수 */
  avgPurchases: number;
  /** 시작 유형별 판 수·평균 연차·엔딩 분포 */
  byArchetype: Record<string, { games: number; avgYears: number; endings: Record<string, number> }>;
  /** 포지션별 판 수·엔딩 분포 */
  byPosition: Record<PositionId, { games: number; endings: Record<string, number> }>;
  /** 판당 비프롤로그 이벤트 수 */
  avgEvents: number;
  /** 비프롤로그 이벤트 중 같은 판에서 이미 본 id가 다시 뜬 비율 */
  repeatShare: number;
  /** 회사 생활: 협상·승진 보류·성장 */
  companyLife: {
    negotiationsPerGame: number;
    /** '더 요구' 선택의 성공률 */
    negotiateWinRate: number;
    promotionHeldPerGame: number;
    /** 다니던 회사가 상장한 판 비율 */
    ipoRate: number;
    /** 다니던 회사가 폐업한 판 비율 */
    shutdownRate: number;
    /** 만원. 스톡옵션 행사액 중앙값 (받은 판만) */
    stockPayoutMedian: number;
    /** 스톡옵션을 행사한 판 비율 */
    stockPayoutRate: number;
  };
  /** 현실성 점검: 나이별 연말 연봉, 연차별 직급 분포 */
  realism: {
    /** 만원. 그 나이 연말 연봉 (그 나이까지 일한 판만) */
    salaryByAge: Record<number, { n: number; median: number; p90: number; over1eok: number; over2eok: number }>;
    /** 커리어 N년차 연말 직급 비율 */
    titleByYear: Record<number, Record<string, number>>;
  };
};

export const REALISM_AGES = [30, 35, 40, 45] as const;
export const REALISM_YEARS = [3, 5, 8, 10, 15] as const;

const quantile = (xs: number[], q: number): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

/** 그 회사가 상장 단계에 있나 */
const isIpo = (s: Game['state'], id: string, c: Content): boolean => {
  const k = s.companyStage[id];
  return typeof k === 'number' && !!c.companies[id].stages?.[k]?.ipo;
};

const POSITIONS: PositionId[] = ['backend', 'frontend', 'sre', 'ai'];

function chooseInput(g: Game, c: Content, player: Rng, policy: SimPolicy): Input {
  const p = pending(g);
  const valid = validInputs(g, c);
  if (policy === 'loyal' && p.kind === 'offers') return { t: 'pick', i: p.forced ? 0 : p.offers.length };
  if (policy === 'skilled' && p.kind === 'incident-step') {
    const opts = c.incidents[p.incidentId].steps[p.step].options;
    const right = valid.find((v) => v.t === 'pick' && opts[v.i].correct);
    if (right) return right;
  }
  if (policy === 'skilled' && p.kind === 'incident-action') {
    const chance = (i: number) => actionChance(c.incidents[p.incidentId].actions[i], p.clues, g.state.stats.debug);
    const picks = valid.filter((v): v is Extract<Input, { t: 'pick' }> => v.t === 'pick');
    return picks.reduce((best, v) => (chance(v.i) > chance(best.i) ? v : best));
  }
  return player.pick(valid);
}

/** 정책(policy)에 따라 입력을 고르는 플레이어로 n판을 돌린다. 기본은 무작위 플레이어. */
export function simulate(n: number, c: Content, seed0 = 1, policy: SimPolicy = 'random'): SimReport {
  const endings: Record<string, number> = {};
  let years = 0;
  let maxYears = 0;
  let incidents = 0;
  const agg = { noClue: [0, 0], withClues: [0, 0] };
  const year10: number[] = [];
  const maxSalaries: number[] = [];
  const assets: number[] = [];
  let houses = 0;
  let purchases = 0;
  const byArchetype: SimReport['byArchetype'] = {};
  const byPosition = Object.fromEntries(POSITIONS.map((p) => [p, { games: 0, endings: {} }])) as SimReport['byPosition'];
  let events = 0;
  let repeats = 0;
  let negotiations = 0;
  const asks = [0, 0];
  let held = 0;
  let ipoGames = 0;
  let shutdownGames = 0;
  const payouts: number[] = [];
  const byAge = new Map<number, number[]>(REALISM_AGES.map((a) => [a, []]));
  const byYear = new Map<number, Record<string, number>>(REALISM_YEARS.map((y) => [y, {}]));

  for (let k = 0; k < n; k++) {
    const seed = seed0 + k;
    const player = createRng((seed * 7919 + 13) >>> 0);
    let g = newGame({ name: 'sim', position: player.pick(POSITIONS), route: player.pick(ROUTE_IDS), candidate: player.int(0, 2) }, seed, c);
    const seen = new Set<string>();
    for (let guard = 0; pending(g).kind !== 'ended'; guard++) {
      if (guard > 3000) throw new Error(`game seed=${seed} did not end`);
      const p = pending(g);
      if (p.kind === 'event' && g.state.yearsInCareer > 0) {
        events++;
        if (seen.has(p.eventId)) repeats++;
        seen.add(p.eventId);
      }
      const input = chooseInput(g, c, player, policy);
      if (p.kind === 'negotiate') {
        negotiations++;
        if (input.t === 'pick' && input.i === 1) {
          const next = apply(g, input, c);
          asks[0] += next.outcome?.ok ? 1 : 0;
          asks[1] += 1;
          g = next;
          continue;
        }
      }
      const stock = g.state.stock;
      if (p.kind === 'incident-action') {
        const before = g.state.record.incidentsResolved;
        g = apply(g, input, c);
        const bucket = p.clues === 0 ? agg.noClue : agg.withClues;
        bucket[0] += g.state.record.incidentsResolved > before ? 1 : 0;
        bucket[1] += 1;
        held += g.feed.filter((l) => l.startsWith('승진 보류')).length;
        if (stock && !g.state.stock && isIpo(g.state, stock.companyId, c)) payouts.push(stock.value * IPO_MULT);
        continue;
      }
      g = apply(g, input, c);
      held += g.feed.filter((l) => l.startsWith('승진 보류')).length;
      if (stock && !g.state.stock && isIpo(g.state, stock.companyId, c)) payouts.push(stock.value * IPO_MULT);
    }
    if (Object.keys(g.state.companyStage).some((cid) => isIpo(g.state, cid, c))) ipoGames++;
    if (Object.values(g.state.companyStage).includes('closed')) shutdownGames++;
    const id = g.state.endingId ?? 'none';
    endings[id] = (endings[id] ?? 0) + 1;
    const y = g.state.record.history.length;
    years += y;
    maxYears = Math.max(maxYears, y);
    incidents += g.state.record.incidentsTotal;
    for (const h of g.state.record.history) byAge.get(h.age)?.push(h.salary);
    for (const [y, tally] of byYear) {
      const h = g.state.record.history[y - 1];
      if (h) tally[h.title] = (tally[h.title] ?? 0) + 1;
    }
    const row10 = g.state.record.history[9];
    if (row10) year10.push(row10.salary);
    maxSalaries.push(g.state.maxSalary);
    assets.push(g.state.assets);
    if (g.state.purchases.includes('house')) houses++;
    purchases += g.state.purchases.length;
    const row = (byArchetype[g.state.archetypeId] ??= { games: 0, avgYears: 0, endings: {} });
    row.games += 1;
    row.avgYears += y;
    row.endings[id] = (row.endings[id] ?? 0) + 1;
    const pos = byPosition[g.state.position];
    pos.games += 1;
    pos.endings[id] = (pos.endings[id] ?? 0) + 1;
  }
  for (const row of Object.values(byArchetype)) row.avgYears /= row.games;

  const rate = ([ok, total]: number[]) => (total ? ok / total : 0);
  const share = (xs: number[], f: (x: number) => boolean) => (xs.length ? xs.filter(f).length / xs.length : 0);
  const realism: SimReport['realism'] = {
    salaryByAge: Object.fromEntries([...byAge].map(([age, xs]) => [age, {
      n: xs.length, median: quantile(xs, 0.5), p90: quantile(xs, 0.9), over1eok: share(xs, (x) => x >= 10000), over2eok: share(xs, (x) => x >= 20000),
    }])),
    titleByYear: Object.fromEntries([...byYear].map(([y, tally]) => {
      const total = Object.values(tally).reduce((a, b) => a + b, 0);
      return [y, Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, v / total]))];
    })),
  };
  return {
    games: n,
    endings,
    avgYears: years / n,
    maxYears,
    avgIncidents: incidents / n,
    incidentResolveRate: rate([agg.noClue[0] + agg.withClues[0], agg.noClue[1] + agg.withClues[1]]),
    resolveRate: { noClue: rate(agg.noClue), withClues: rate(agg.withClues) },
    salaryYear10Median: quantile(year10, 0.5),
    maxSalary: { median: quantile(maxSalaries, 0.5), p90: quantile(maxSalaries, 0.9), max: quantile(maxSalaries, 1) },
    assets: { median: quantile(assets, 0.5), p90: quantile(assets, 0.9) },
    houseRate: houses / n,
    avgPurchases: purchases / n,
    byArchetype,
    byPosition,
    avgEvents: events / n,
    repeatShare: events ? repeats / events : 0,
    realism,
    companyLife: {
      negotiationsPerGame: negotiations / n,
      negotiateWinRate: rate(asks),
      promotionHeldPerGame: held / n,
      ipoRate: ipoGames / n,
      shutdownRate: shutdownGames / n,
      stockPayoutMedian: quantile(payouts, 0.5),
      stockPayoutRate: payouts.length / n,
    },
  };
}
