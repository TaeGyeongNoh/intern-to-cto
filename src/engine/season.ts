import { effectiveCompany } from './company';
import { withJosa } from './josa';
import type { Rng } from './rng';
import { computeTitle, nextTitle, PROMOTION_MIN_RATING, ROLE_FACTOR, ROLE_LABELS, ROLE_LOAD, roleFor } from './roles';
import { reviewSalary } from './salary';
import { SAVINGS_RATE } from './shop';
import { ovr, POSITION_WEIGHTS } from './stats';
import { STAT_IDS, type Content, type GameState, type GrowthType } from './types';
import { clamp } from './util';

export const RETIRE_AGE = 48;
/** 순자산 몇 억 돌파 알림 단위 (만원) */
const ASSET_MILESTONE = 10000;
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
  const company = effectiveCompany(s.companyId, s, c);
  const before = ovr(s.stats, s.position);
  const role = roleFor(before, company.level);
  const stats = { ...s.stats };

  const potentialFactor = before >= s.potential ? 0.1 : 1;
  const points = Math.round((13 + rng.int(0, 6)) * ageFactor(s.age, s.growthType) * ROLE_FACTOR[role] * potentialFactor);
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

/**
 * 연말 평가 점수. 상대평가라 실력 차이(OVR − 회사 레벨)는 ±PERF_SKILL_CAP까지만 절반 무게로,
 * 그 해 장애 성적(yearScore)은 ±PERF_YEAR_CAP까지만 반영한다. noise는 rng.int(−6, 6).
 * 현실 기준(국내 대기업·IT 강제 배분 통념): S 10~15%, A 25~30%, B 약 40%, C 10~15%, D 3~5%.
 */
export const PERF_SKILL_CAP = 10;
export const PERF_YEAR_CAP = 6;
export function performance(o: number, level: number, yearScore: number, noise: number): number {
  return Math.round(clamp(o - level, -PERF_SKILL_CAP, PERF_SKILL_CAP) / 2) + clamp(yearScore, -PERF_YEAR_CAP, PERF_YEAR_CAP) + noise;
}

/**
 * 별점(1~5)별 평판 변화. 인덱스 0은 쓰지 않는다. B는 "기대 충족"이라 한 해를 무난히 해내면 평판이 조금 쌓인다
 * (평판은 사내 평가만이 아니라 같이 일한 사람들의 기억이다). 상대평가로 S가 드물어진 만큼 A·B 몫을 둔다.
 */
export const REPUTATION_BY_RATING = [0, -3, -1, 2, 4, 6];

export function ratingFromPerf(perf: number): number {
  if (perf <= -9) return 1;
  if (perf <= -5) return 2;
  if (perf <= 3) return 3;
  if (perf <= 8) return 4;
  return 5;
}

/** 연말 평가: 별점, 평판, 연봉, 직급, 히스토리, 은퇴 판정. */
export function review(s: GameState, rng: Rng, c: Content): { state: GameState; feed: string[]; rating: number } {
  const company = effectiveCompany(s.companyId, s, c);
  const o = ovr(s.stats, s.position);
  const rating = ratingFromPerf(performance(o, company.level, s.yearScore, rng.int(-6, 6)));
  const reputation = clamp(s.reputation + REPUTATION_BY_RATING[rating], 0, 100);
  const decided = nextTitle(s.title, computeTitle({ ...s, reputation }, o, company.tier));
  const held = decided.kind === 'promoted' && rating < PROMOTION_MIN_RATING;
  const { title, kind } = held ? { title: s.title, kind: undefined } : decided;
  const salary = reviewSalary({ ...s, title }, rating, company);
  const assets = s.assets + Math.round(s.salary * SAVINGS_RATE);
  const next: GameState = { ...s, reputation, salary, maxSalary: Math.max(s.maxSalary, salary), assets };
  const feed = [`연말 평가 ${rating}/5 · ${title} · 연봉 ${salary.toLocaleString('ko-KR')}만원`];
  const eok = (v: number) => Math.floor(v / ASSET_MILESTONE);
  if (eok(assets) > eok(s.assets) && assets > 0) feed.push(`순자산 ${eok(assets)}억 돌파`);
  const story = [...s.record.story];
  if (held) {
    feed.push(`승진 보류 · ${decided.title} 조건은 채웠지만 올해 평가가 ${rating}점이다.`);
    story.push(`${s.year}년 · ${decided.title} 승진이 한 해 보류됐다.`);
  } else if (kind === 'promoted') {
    feed.push(`${withJosa(title, '(으)로')} 승진!`);
    story.push(`${s.year}년 · ${company.name}에서 ${withJosa(title, '(으)로')} 승진했다.`);
  } else if (kind === 'assigned') {
    feed.push(`${withJosa(title, '(으)로')} 발령`);
    story.push(`${s.year}년 · ${company.name}에서 ${withJosa(title, '을/를')} 맡았다.`);
  }
  if (s.boundUntil > 0 && s.yearsInCareer === s.boundUntil) {
    feed.push('복무 완료 · 이제 이직 제안을 받을 수 있다');
    story.push(`${s.year}년 · ${company.name}에서 대체복무를 마쳤다.`);
  }
  let result: GameState = {
    ...next,
    title,
    record: { ...s.record, story, history: [...s.record.history, { year: s.year, age: s.age, companyId: s.companyId, title, rating, ovr: o, salary, assets }] },
  };
  if (s.burnout >= 100) {
    result = { ...result, retired: true, flags: result.flags.includes('burnout-out') ? result.flags : [...result.flags, 'burnout-out'] };
  } else if (s.age >= RETIRE_AGE) {
    result = { ...result, retired: true };
  }
  return { state: result, feed, rating };
}
