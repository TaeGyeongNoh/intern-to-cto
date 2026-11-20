import type { Rng } from './rng';
import { generateCandidates } from './stats';
import type { Content, GameState, GrowthType, PositionId, RouteId } from './types';

export type Setup = { name: string; position: PositionId; route: RouteId; candidate: number };

const POTENTIALS = [62, 68, 72, 76, 80, 85, 90, 95];
const POTENTIAL_WEIGHTS = [10, 16, 18, 18, 14, 10, 8, 6];

export function createInitialState(setup: Setup, seed: number, rng: Rng, c: Content): GameState {
  const start = Object.values(c.companies).find((co) => co.route === setup.route && co.start);
  if (!start) throw new Error(`no start company for route ${setup.route}`);
  const stats = generateCandidates(setup.position, seed)[setup.candidate];
  if (!stats) throw new Error(`invalid candidate ${setup.candidate}`);
  const potential = rng.weighted(POTENTIALS.map((item, i) => ({ item, weight: POTENTIAL_WEIGHTS[i] })));
  const growthType = rng.weighted<GrowthType>([
    { item: 'early', weight: 25 },
    { item: 'normal', weight: 55 },
    { item: 'late', weight: 20 },
  ]);
  const burnoutProne = (80 + rng.int(0, 40)) / 100;
  return {
    name: setup.name,
    position: setup.position,
    route: setup.route,
    year: 2025,
    age: 22,
    yearsInCareer: 0,
    stats: { ...stats },
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
    reputation: 20,
    burnout: 0,
    title: '주니어',
    track: 'ic',
    flags: [],
    traits: {},
    scheduled: [],
    seenEvents: [],
    recur: [],
    yearScore: 0,
    record: { incidentsTotal: 0, incidentsResolved: 0, mttrTotalMin: 0, history: [], story: [`${start.name}에 신입으로 입사했다.`] },
    retired: false,
    assets: 0,
    purchases: [],
  };
}
