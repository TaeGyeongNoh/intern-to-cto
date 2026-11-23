import type { Rng } from './rng';
import { generateCandidates } from './stats';
import type { Content, GameState, GrowthType, PositionId, RouteId } from './types';

/** education·service가 없으면 기본 출신(4년제·해당 없음)이다. 옛 저장·공유 링크에는 없다 */
export type Setup = { name: string; position: PositionId; route: RouteId; candidate: number; education?: string; service?: string };

const POTENTIALS = [62, 68, 72, 76, 80, 85, 90, 95];
const POTENTIAL_WEIGHTS = [10, 16, 18, 18, 14, 10, 8, 6];
/** 유형의 성장형 쏠림: 해당 성장형 가중치에 더한다 (기본 25/55/20) */
const GROWTH_BIAS = 35;

export function createInitialState(setup: Setup, seed: number, rng: Rng, c: Content): GameState {
  const start = Object.values(c.companies).find((co) => co.route === setup.route && co.start);
  if (!start) throw new Error(`no start company for route ${setup.route}`);
  const cand = generateCandidates(setup.position, seed, c.archetypes)[setup.candidate];
  if (!cand) throw new Error(`invalid candidate ${setup.candidate}`);
  const twist = c.archetypes[cand.archetypeId].twist ?? {};
  const growthBias = (t: GrowthType) => (twist.growth === t ? GROWTH_BIAS : 0);
  const potential = rng.weighted(POTENTIALS.map((item, i) => ({ item, weight: POTENTIAL_WEIGHTS[i] })));
  const growthType = rng.weighted<GrowthType>([
    { item: 'early', weight: 25 + growthBias('early') },
    { item: 'normal', weight: 55 },
    { item: 'late', weight: 20 + growthBias('late') },
  ]);
  const burnoutProne = Math.round(80 + rng.int(0, 40) + (twist.burnoutProne ?? 0) * 100) / 100;
  return {
    name: setup.name,
    position: setup.position,
    archetypeId: cand.archetypeId,
    route: setup.route,
    year: 2025,
    age: 22,
    yearsInCareer: 0,
    stats: { ...cand.stats },
    potential,
    growthType,
    burnoutProne,
    companyId: start.id,
    deck: [...start.cards],
    cardsSeen: [...start.cards],
    companiesWorked: [start.id],
    yearsAtCompany: 0,
    salary: start.baseSalary,
    maxSalary: start.baseSalary,
    reputation: 20 + (twist.reputation ?? 0),
    burnout: 0,
    title: '주니어',
    track: 'ic',
    flags: [],
    traits: {},
    scheduled: [],
    seenEvents: [],
    recur: [],
    yearScore: 0,
    record: { incidentsTotal: 0, incidentsResolved: 0, mttrTotalMin: 0, fastResolves: 0, history: [], story: [`${start.name}에 신입으로 입사했다.`] },
    retired: false,
    assets: 0,
    purchases: [],
    companyStage: {},
    market: 'flat',
    investNet: 0,
    boundUntil: 0,
  };
}
