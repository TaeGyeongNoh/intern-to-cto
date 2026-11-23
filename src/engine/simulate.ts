import { apply, newGame, pending, validInputs, type Game, type Input } from './game';
import { IPO_MULT } from './company';
import { actionChance } from './incident';
import { serviceAllowed } from './origin';
import { createRng, type Rng } from './rng';
import { shopChoices, STAKE_TIERS } from './shop';
import { RETIRE_AGE } from './season';
import { ROUTE_IDS, type Content, type PositionId } from './types';

/**
 * 시뮬레이션 플레이어 정책.
 * - random: 유효한 입력을 무작위로 고른다.
 * - skilled: 장애에서 열려 있는 정답 뷰를 고르고, 성공 확률이 가장 높은 조치를 고른다. 나머지는 무작위.
 * - loyal: 이직 제안을 항상 거절한다(회사가 문을 닫아 남을 수 없으면 첫 제안). 나머지는 무작위.
 * - greedy: 상점에서 상승장이면 ETF(dev-stock)를 풀매수하고 그 밖의 해는 지갑을 닫는다. 투자 착취 전략의 상한. 나머지는 무작위.
 * 상점은 (greedy가 아니면) 물건 단위로 먼저 고르고, 투자 물건이면 금액 단계를 고른다. 단계가 펼쳐진 만큼 투자를 과하게 고르지 않게.
 */
export type SimPolicy = 'random' | 'skilled' | 'loyal' | 'greedy';
export const SIM_POLICIES: readonly SimPolicy[] = ['random', 'skilled', 'loyal', 'greedy'];
/** greedy 정책이 상승장에 풀매수하는 물건 */
export const GREEDY_ITEM = 'dev-stock';

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
  /** 만원. 은퇴 순자산 + 주거에 넣은 자기 자금(HOUSING_ITEMS 가격 합). 대출 없는 게임이라 집값 대신 자기 자금만 더한다 */
  assetsWithHousing: { median: number; p90: number };
  /** 내 집 마련(house)을 산 판의 비율 */
  houseRate: number;
  /** 전세(jeonse)를 산 판의 비율 (내 집 포함) */
  jeonseRate: number;
  /** 판당 평균 상점 구매 수 (투자 포함) */
  avgPurchases: number;
  /** 투자 */
  invest: {
    perGame: number;
    /** 금액 단계별 비율 (맛보기 · 진심 · 풀매수) */
    tierShare: number[];
    /** 투자를 한 번 이상 한 판 비율 */
    rate: number;
    /** 만원. 누적 투자 손익 (투자한 판만) */
    net: { p10: number; median: number; p90: number };
    /** 투자한 판 중 누적 손익이 음수로 끝난 비율 */
    negShare: number;
    /** 코인을 한 번 이상 산 판 중 코인 손익이 음수인 비율 */
    coinNegShare: number;
    /** ETF만 산 판 중 손익이 음수인 비율 */
    etfOnlyNegShare: number;
    /** 판당 풀매수 실패 직후 자산 1,000만원 미만 횟수 */
    allInBustPerGame: number;
  };
  /** 시작 유형별 판 수·평균 연차·엔딩 분포 */
  byArchetype: Record<string, { games: number; avgYears: number; endings: Record<string, number> }>;
  /** 출신 조합별 ('{education}/{service}') 판 수·평균 연차·첫 해 연말 연봉·최고연봉 중앙값·엔딩 분포 */
  byOrigin: Record<string, { games: number; avgYears: number; firstSalaryMedian: number; maxSalaryMedian: number; endings: Record<string, number> }>;
  /** 학력별 점검: 시작 나이, 첫 해 연말 연봉, 10년차 연봉, 최고연봉, 상위 엔딩(cto·vp·principal) 비율 */
  byEducation: Record<string, {
    games: number; avgYears: number; avgStartAge: number;
    firstSalaryMedian: number; year10Median: number; maxSalaryMedian: number; topEndingShare: number;
    endings: Record<string, number>;
  }>;
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
    /** 연말 별점(1~5) 비율, 모든 판의 모든 해 */
    ratingShare: Record<number, number>;
  };
  /** 창업 루트 */
  founder: {
    /** 창업한 판 비율 */
    rate: number;
    /** 창업자 중 엑싯 비율 */
    exitShare: number;
    /** 창업 5년 생존(엑싯 포함). 창업 뒤 5년 이상 일할 수 있었던 창업자만 */
    survive5: number;
    /** 창업 회사에서 보낸 평균 연수 */
    avgYears: number;
    /** 만원. 창업 중 연말 연봉 중앙값 */
    salaryMedian: number;
    /** 폐업 후 첫 연봉 / 창업 직전 연봉, 중앙값 */
    reentryRatio: number;
    /** 창업자 중 은퇴 때 아직 창업 중인 비율 */
    activeAtRetire: number;
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

/** 주거 자기 자금으로 보는 상점 물건 (사도 순자산이 사라지지 않고 집에 묶인다) */
export const HOUSING_ITEMS = ['jeonse', 'house'];

const POSITIONS: PositionId[] = ['backend', 'frontend', 'sre', 'ai'];
/** 학력별 점검에서 '상위 엔딩'으로 보는 것 */
export const TOP_ENDINGS = ['cto', 'vp', 'principal'];

function chooseInput(g: Game, c: Content, player: Rng, policy: SimPolicy): Input {
  const p = pending(g);
  const valid = validInputs(g, c);
  if (p.kind === 'shop') {
    const choices = shopChoices(p.items, g.state, c);
    if (policy === 'greedy') {
      const i = g.state.market === 'bull' ? choices.findIndex((x) => x.itemId === GREEDY_ITEM && x.tier === STAKE_TIERS.length - 1) : -1;
      return { t: 'pick', i: i >= 0 ? i : choices.length };
    }
    const which = player.pick([...p.items, null]);
    if (which === null) return { t: 'pick', i: choices.length };
    const idx = choices.flatMap((x, i) => (x.itemId === which ? [i] : []));
    return { t: 'pick', i: player.pick(idx) };
  }
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
  const inv = { count: 0, tiers: STAKE_TIERS.map(() => 0), games: 0, nets: [] as number[], coinGames: 0, coinNeg: 0, etfOnly: 0, etfOnlyNeg: 0, busts: 0 };
  let jeonses = 0;
  const withHousing: number[] = [];
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
  const ratings = [0, 0, 0, 0, 0, 0];
  const fd = { games: 0, exits: 0, eligible5: 0, survived5: 0, years: 0, active: 0, salaries: [] as number[], reentry: [] as number[] };
  const isFounderCo = (id: string) => !!c.companies[id]?.founder;
  const educationIds = Object.keys(c.educations);
  type OriginAgg = { games: number; years: number; startAge: number; first: number[]; y10: number[]; max: number[]; endings: Record<string, number> };
  const newAgg = (): OriginAgg => ({ games: 0, years: 0, startAge: 0, first: [], y10: [], max: [], endings: {} });
  const originAgg = new Map<string, OriginAgg>();
  const eduAgg = new Map<string, OriginAgg>(educationIds.map((e) => [e, newAgg()]));

  for (let k = 0; k < n; k++) {
    const seed = seed0 + k;
    const player = createRng((seed * 7919 + 13) >>> 0);
    const position = player.pick(POSITIONS);
    const route = player.pick(ROUTE_IDS);
    const candidate = player.int(0, 2);
    // 출신은 실제 비율 대신 고르게 뽑는다 (대체복무가 과대 표집되지만 밸런스 점검에는 이쪽이 낫다)
    const education = player.pick(educationIds);
    const service = player.pick(Object.values(c.services).filter((sv) => serviceAllowed(sv, education))).id;
    let g = newGame({ name: 'sim', position, route, candidate, education, service }, seed, c);
    const startAge = g.state.age;
    const seen = new Set<string>();
    let preFound = 0;
    const track = (before: Game, after: Game) => {
      const was = isFounderCo(before.state.companyId);
      const now = isFounderCo(after.state.companyId);
      if (!was && now) preFound = before.state.salary;
      if (was && !now && preFound > 0) fd.reentry.push(after.state.salary / preFound);
    };
    const net: Record<string, number> = {};
    for (let guard = 0; pending(g).kind !== 'ended'; guard++) {
      if (guard > 3000) throw new Error(`game seed=${seed} did not end`);
      const p = pending(g);
      if (p.kind === 'shop') {
        const input = chooseInput(g, c, player, policy);
        const ch = input.t === 'pick' ? shopChoices(p.items, g.state, c)[input.i] : undefined;
        const next = apply(g, input, c);
        if (ch?.tier !== undefined) {
          inv.count++;
          inv.tiers[ch.tier]++;
          net[ch.itemId] = (net[ch.itemId] ?? 0) + next.state.assets - g.state.assets;
          if (ch.tier === STAKE_TIERS.length - 1 && !next.outcome?.ok && next.state.assets < 1000) inv.busts++;
        }
        g = next;
        continue;
      }
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
          track(g, next);
          asks[0] += next.outcome?.ok ? 1 : 0;
          asks[1] += 1;
          g = next;
          continue;
        }
      }
      const stock = g.state.stock;
      if (p.kind === 'incident-action') {
        const before = g.state.record.incidentsResolved;
        const prev = g;
        g = apply(g, input, c);
        track(prev, g);
        const bucket = p.clues === 0 ? agg.noClue : agg.withClues;
        bucket[0] += g.state.record.incidentsResolved > before ? 1 : 0;
        bucket[1] += 1;
        held += g.feed.filter((l) => l.startsWith('승진 보류')).length;
        if (stock && !g.state.stock && isIpo(g.state, stock.companyId, c)) payouts.push(stock.value * IPO_MULT);
        continue;
      }
      const prev = g;
      g = apply(g, input, c);
      track(prev, g);
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
    for (const h of g.state.record.history) {
      byAge.get(h.age)?.push(h.salary);
      ratings[h.rating] += 1;
    }
    const fRows = g.state.record.history.filter((h) => isFounderCo(h.companyId));
    if (fRows.length > 0) {
      const exited = g.state.flags.includes('exit');
      fd.games += 1;
      fd.exits += exited ? 1 : 0;
      fd.years += fRows.length;
      fd.salaries.push(...fRows.map((h) => h.salary));
      if (isFounderCo(g.state.companyId) && !exited) fd.active += 1;
      if (RETIRE_AGE + 1 - fRows[0].age >= 5) {
        fd.eligible5 += 1;
        fd.survived5 += exited || fRows.length >= 5 ? 1 : 0;
      }
    }
    for (const [y, tally] of byYear) {
      const h = g.state.record.history[y - 1];
      if (h) tally[h.title] = (tally[h.title] ?? 0) + 1;
    }
    const row10 = g.state.record.history[9];
    if (row10) year10.push(row10.salary);
    maxSalaries.push(g.state.maxSalary);
    assets.push(g.state.assets);
    if (g.state.purchases.includes('house')) houses++;
    const investedIds = Object.keys(net);
    if (investedIds.length > 0) {
      inv.games++;
      inv.nets.push(g.state.investNet);
      if ('coin' in net) {
        inv.coinGames++;
        if (net.coin < 0) inv.coinNeg++;
      }
      if (investedIds.length === 1 && investedIds[0] === 'dev-stock') {
        inv.etfOnly++;
        if (net['dev-stock'] < 0) inv.etfOnlyNeg++;
      }
    }
    if (g.state.purchases.includes('jeonse')) jeonses++;
    withHousing.push(g.state.assets + HOUSING_ITEMS.reduce((sum, id) => sum + (g.state.purchases.includes(id) ? c.shop[id]?.price ?? 0 : 0), 0));
    purchases += g.state.purchases.length;
    const row = (byArchetype[g.state.archetypeId] ??= { games: 0, avgYears: 0, endings: {} });
    row.games += 1;
    row.avgYears += y;
    row.endings[id] = (row.endings[id] ?? 0) + 1;
    for (const [key, map] of [[`${education}/${service}`, originAgg], [education, eduAgg]] as const) {
      if (!map.has(key)) map.set(key, newAgg());
      const a = map.get(key)!;
      a.games += 1;
      a.years += y;
      a.startAge += startAge;
      a.endings[id] = (a.endings[id] ?? 0) + 1;
      a.max.push(g.state.maxSalary);
      if (g.state.record.history[0]) a.first.push(g.state.record.history[0].salary);
      if (row10) a.y10.push(row10.salary);
    }
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
    ratingShare: Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, rate([ratings[k], ratings.reduce((a, b) => a + b, 0)])])),
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
    assetsWithHousing: { median: quantile(withHousing, 0.5), p90: quantile(withHousing, 0.9) },
    houseRate: houses / n,
    jeonseRate: jeonses / n,
    avgPurchases: purchases / n,
    invest: {
      perGame: inv.count / n,
      tierShare: inv.tiers.map((k) => (inv.count ? k / inv.count : 0)),
      rate: inv.games / n,
      net: { p10: quantile(inv.nets, 0.1), median: quantile(inv.nets, 0.5), p90: quantile(inv.nets, 0.9) },
      negShare: rate([inv.nets.filter((x) => x < 0).length, inv.games]),
      coinNegShare: rate([inv.coinNeg, inv.coinGames]),
      etfOnlyNegShare: rate([inv.etfOnlyNeg, inv.etfOnly]),
      allInBustPerGame: inv.busts / n,
    },
    byArchetype,
    byOrigin: Object.fromEntries([...originAgg].map(([key, a]) => [key, { games: a.games, avgYears: a.years / a.games, firstSalaryMedian: quantile(a.first, 0.5), maxSalaryMedian: quantile(a.max, 0.5), endings: a.endings }])),
    byEducation: Object.fromEntries([...eduAgg].filter(([, a]) => a.games > 0).map(([key, a]) => [key, {
      games: a.games, avgYears: a.years / a.games, avgStartAge: a.startAge / a.games,
      firstSalaryMedian: quantile(a.first, 0.5), year10Median: quantile(a.y10, 0.5), maxSalaryMedian: quantile(a.max, 0.5),
      topEndingShare: TOP_ENDINGS.reduce((sum, e) => sum + (a.endings[e] ?? 0), 0) / a.games,
      endings: a.endings,
    }])),
    byPosition,
    avgEvents: events / n,
    repeatShare: events ? repeats / events : 0,
    realism,
    founder: {
      rate: fd.games / n,
      exitShare: rate([fd.exits, fd.games]),
      survive5: rate([fd.survived5, fd.eligible5]),
      avgYears: fd.games ? fd.years / fd.games : 0,
      salaryMedian: quantile(fd.salaries, 0.5),
      reentryRatio: quantile(fd.reentry, 0.5),
      activeAtRetire: rate([fd.active, fd.games]),
    },
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
