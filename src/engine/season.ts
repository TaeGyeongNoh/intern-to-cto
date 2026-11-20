import { withJosa } from './josa';
import type { Rng } from './rng';
import { computeTitle, nextTitle, ROLE_FACTOR, ROLE_LABELS, ROLE_LOAD, roleFor } from './roles';
import { reviewSalary } from './salary';
import { ovr, POSITION_WEIGHTS } from './stats';
import { STAT_IDS, type Content, type GameState, type GrowthType } from './types';
import { clamp } from './util';

export const RETIRE_AGE = 48;
const DECLINE_AGE: Record<GrowthType, number> = { early: 35, normal: 38, late: 42 };
const AGE_TABLE: Record<GrowthType, [number, number][]> = {
  early: [[25, 1.3], [29, 0.6], [33, 0.25]],
  normal: [[25, 1.0], [29, 0.75], [33, 0.45], [37, 0.2]],
  late: [[25, 0.6], [29, 0.85], [33, 0.75], [37, 0.5]],
};
const AGE_TAIL: Record<GrowthType, number> = { early: 0, normal: 0, late: 0.2 };

export function ageFactor(age: number, type: GrowthType): number {
  for (const [maxAge, f] of AGE_TABLE[type]) if (age <= maxAge) return f;
  return AGE_TAIL[type];
}

/** 해를 넘기며 성장·쇠퇴·번아웃을 계산한다. 평가는 review에서 한다. */
export function runYear(s: GameState, rng: Rng, c: Content): { state: GameState; feed: string[] } {
  const company = c.companies[s.companyId];
  const before = ovr(s.stats, s.position);
  const role = roleFor(before, company.level);
  const stats = { ...s.stats };

  const potentialFactor = before >= s.potential ? 0.1 : 1;
  const points = Math.round((18 + rng.int(0, 8)) * ageFactor(s.age, s.growthType) * ROLE_FACTOR[role] * potentialFactor);
  const w = POSITION_WEIGHTS[s.position];
  const items = STAT_IDS.map((id) => ({ item: id, weight: w[id] + 0.05 }));
  for (let k = 0; k < points; k++) {
    const id = rng.weighted(items);
    stats[id] = Math.min(99, stats[id] + 1);
  }

  const declineAge = DECLINE_AGE[s.growthType];
  if (s.age >= declineAge) {
    const loss = rng.int(4, 8) + (s.age - declineAge) * 2;
    for (let k = 0; k < loss; k++) {
      const id = rng.pick(STAT_IDS);
      stats[id] = Math.max(20, stats[id] - 1);
    }
  }

  const burnout = clamp(
    s.burnout + Math.round((ROLE_LOAD[role] + rng.int(0, 4)) * s.burnoutProne - stats.mental / 12),
    0,
    100,
  );
  const after = ovr(stats, s.position);
  const feed = [
    `${s.year + 1}년 · ${s.age + 1}세 · ${company.name} (${ROLE_LABELS[role]})`,
    `OVR ${before} → ${after}`,
  ];
  return {
    state: {
      ...s,
      year: s.year + 1,
      age: s.age + 1,
      yearsInCareer: s.yearsInCareer + 1,
      yearsAtCompany: s.yearsAtCompany + 1,
      stats,
      burnout,
      yearScore: 0,
    },
    feed,
  };
}

export function ratingFromPerf(perf: number): number {
  if (perf <= -8) return 1;
  if (perf <= -3) return 2;
  if (perf <= 3) return 3;
  if (perf <= 8) return 4;
  return 5;
}

/** 연말 평가: 별점, 평판, 연봉, 직급, 히스토리, 은퇴 판정. */
export function review(s: GameState, rng: Rng, c: Content): { state: GameState; feed: string[] } {
  const company = c.companies[s.companyId];
  const o = ovr(s.stats, s.position);
  const role = roleFor(o, company.level);
  const perf = o - company.level + (role === 'owner' ? 3 : 0) + s.yearScore + rng.int(-6, 6);
  const rating = ratingFromPerf(perf);
  const reputation = clamp(s.reputation + (rating - 3) * 3, 0, 100);
  const { title, kind } = nextTitle(s.title, computeTitle({ ...s, reputation }, o, company.tier));
  const salary = reviewSalary({ ...s, title }, rating, company);
  const next: GameState = { ...s, reputation, salary, maxSalary: Math.max(s.maxSalary, salary) };
  const feed = [`연말 평가 ${rating}/5 · ${title} · 연봉 ${salary.toLocaleString('ko-KR')}만원`];
  const story = [...s.record.story];
  if (kind === 'promoted') {
    feed.push(`${withJosa(title, '(으)로')} 승진!`);
    story.push(`${s.year}년 · ${company.name}에서 ${withJosa(title, '(으)로')} 승진했다.`);
  } else if (kind === 'assigned') {
    feed.push(`${withJosa(title, '(으)로')} 발령`);
    story.push(`${s.year}년 · ${company.name}에서 ${withJosa(title, '을/를')} 맡았다.`);
  }
  let result: GameState = {
    ...next,
    title,
    record: { ...s.record, story, history: [...s.record.history, { year: s.year, age: s.age, companyId: s.companyId, title, rating, ovr: o, salary }] },
  };
  if (s.burnout >= 100) {
    result = { ...result, retired: true, flags: result.flags.includes('burnout-out') ? result.flags : [...result.flags, 'burnout-out'] };
  } else if (s.age >= RETIRE_AGE) {
    result = { ...result, retired: true };
  }
  return { state: result, feed };
}
