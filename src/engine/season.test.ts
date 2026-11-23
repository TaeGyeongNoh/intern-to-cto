import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { withJosa } from './josa';
import { createRng } from './rng';
import { PROMOTION_MIN_RATING } from './roles';
import { ageFactor, PERF_SKILL_CAP, REPUTATION_BY_RATING, PERF_YEAR_CAP, performance, ratingFromPerf, RETIRE_AGE, review, runYear } from './season';
import { makeState } from './testing';

const total = (s: Record<string, number>) => Object.values(s).reduce((a, b) => a + b, 0);

describe('ageFactor', () => {
  it('성장형별 나이 계수', () => {
    expect(ageFactor(23, 'normal')).toBe(1);
    expect(ageFactor(40, 'normal')).toBe(0);
    expect(ageFactor(23, 'early')).toBe(1.3);
    expect(ageFactor(40, 'late')).toBe(0.2);
  });
});

describe('runYear', () => {
  it('나이·연도·연차가 1씩 늘고 yearScore가 초기화된다', () => {
    const s = makeState({ yearScore: 5 });
    const r = runYear(s, createRng(1), CONTENT).state;
    expect(r.age).toBe(s.age + 1);
    expect(r.year).toBe(s.year + 1);
    expect(r.yearsInCareer).toBe(1);
    expect(r.yearsAtCompany).toBe(1);
    expect(r.yearScore).toBe(0);
  });
  it('어릴 때는 능력치 합이 오른다', () => {
    const s = makeState({ potential: 95 });
    expect(total(runYear(s, createRng(2), CONTENT).state.stats)).toBeGreaterThan(total(s.stats));
  });
  it('젊은 메인 역할의 한 해 성장 포인트는 13~19 (시니어까지 7년 안팎)', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = makeState({ potential: 95, age: 24, growthType: 'normal' });
      const gain = total(runYear(s, createRng(seed), CONTENT).state.stats) - total(s.stats);
      expect(gain).toBeGreaterThanOrEqual(13);
      expect(gain).toBeLessThanOrEqual(19);
    }
  });
  it('쇠퇴 나이 이후엔 능력치 합이 줄어든다', () => {
    const s = makeState({ age: 45, growthType: 'normal' });
    expect(total(runYear(s, createRng(3), CONTENT).state.stats)).toBeLessThan(total(s.stats));
  });
  it('번아웃은 0~100', () => {
    const r = runYear(makeState({ burnout: 99 }), createRng(4), CONTENT).state;
    expect(r.burnout).toBeLessThanOrEqual(100);
  });
});

describe('review', () => {
  it('대체복무가 끝나는 해 연말에 feed와 story를 남긴다', () => {
    const name = CONTENT.companies[makeState().companyId].name;
    const done = review(makeState({ yearsInCareer: 3, boundUntil: 3, year: 2028 }), createRng(5), CONTENT);
    expect(done.feed).toContain('복무 완료 · 이제 이직 제안을 받을 수 있다');
    expect(done.state.record.story).toContain(`2028년 · ${name}에서 대체복무를 마쳤다.`);
    for (const [y, b] of [[2, 3], [4, 3], [0, 0]]) {
      const r = review(makeState({ yearsInCareer: y, boundUntil: b }), createRng(5), CONTENT);
      expect(r.feed.join('\n')).not.toContain('복무 완료');
    }
  });
  it('그 해 연봉의 25%를 저축하고 히스토리에 순자산을 남긴다', () => {
    const r = review(makeState({ salary: 8000, assets: 1000 }), createRng(5), CONTENT);
    expect(r.state.assets).toBe(3000);
    expect(r.state.record.history[0].assets).toBe(3000);
  });
  it('순자산이 억 단위를 넘을 때만 알린다', () => {
    expect(review(makeState({ salary: 8000, assets: 9000 }), createRng(5), CONTENT).feed).toContain('순자산 1억 돌파');
    expect(review(makeState({ salary: 8000, assets: 1000 }), createRng(5), CONTENT).feed.join('\n')).not.toContain('돌파');
  });
  it('히스토리를 한 줄 남기고 별점 1~5', () => {
    const r = review(makeState(), createRng(5), CONTENT).state;
    expect(r.record.history).toHaveLength(1);
    expect(r.record.history[0].rating).toBeGreaterThanOrEqual(1);
    expect(r.record.history[0].rating).toBeLessThanOrEqual(5);
  });
  it(`${RETIRE_AGE}세에 은퇴`, () => {
    expect(review(makeState({ age: RETIRE_AGE }), createRng(6), CONTENT).state.retired).toBe(true);
    expect(review(makeState({ age: RETIRE_AGE - 1 }), createRng(6), CONTENT).state.retired).toBe(false);
  });
  it('번아웃 100이면 번아웃 퇴사', () => {
    const r = review(makeState({ burnout: 100 }), createRng(7), CONTENT).state;
    expect(r.retired).toBe(true);
    expect(r.flags).toContain('burnout-out');
  });
  it('연봉은 깎이지 않는다', () => {
    const s = makeState({ yearScore: -50 });
    expect(review(s, createRng(8), CONTENT).state.salary).toBeGreaterThanOrEqual(s.salary);
  });
  it('능력치가 떨어져도 직급은 내려가지 않고 승진 로그도 없다', () => {
    const s = makeState({ title: '스태프', yearsInCareer: 10 });
    const r = review(s, createRng(9), CONTENT);
    expect(r.state.title).toBe('스태프');
    expect(r.feed.join('\n')).not.toContain('승진');
    expect(r.state.record.story.join('\n')).not.toContain('승진');
  });
  it('실제로 직급이 오르면 승진으로 기록한다', () => {
    const s = makeState({ title: '주니어', yearsInCareer: 8, stats: { impl: 80, design: 80, debug: 80, infra: 80, ai: 80, mental: 80 } });
    const r = review(s, createRng(9), CONTENT);
    expect(r.state.title).not.toBe('주니어');
    expect(r.feed.join('\n')).toContain(`${withJosa(r.state.title, '(으)로')} 승진!`);
  });
  it('IC에서 매니지먼트로 바뀌면 발령으로 기록한다', () => {
    const s = makeState({ title: '프린시펄', track: 'mgmt' });
    const r = review(s, createRng(9), CONTENT);
    expect(r.state.title).toBe('팀장');
    expect(r.feed.join('\n')).toContain('팀장으로 발령');
    expect(r.feed.join('\n')).not.toContain('승진');
    expect(r.state.record.story.at(-1)).toContain('팀장을 맡았다');
  });
  it('매니지먼트 트랙에서도 직급은 내려가지 않는다', () => {
    const s = makeState({ title: 'VP of Engineering', track: 'mgmt' });
    expect(review(s, createRng(9), CONTENT).state.title).toBe('VP of Engineering');
  });
});

describe('review 연봉', () => {
  it('시장가를 크게 넘는 연봉은 더 오르지 않는다', () => {
    const s = makeState({ salary: 50000, yearScore: 50 });
    expect(review(s, createRng(8), CONTENT).state.salary).toBe(50000);
  });
  it('히스토리에 연봉을 남긴다', () => {
    const r = review(makeState(), createRng(5), CONTENT).state;
    expect(r.record.history[0].salary).toBe(r.salary);
  });
});

describe('승진 보류', () => {
  const strong = { impl: 80, design: 80, debug: 80, infra: 80, ai: 80, mental: 80 };
  /** 원하는 별점이 나오는 시드를 찾아 review를 돌린다 */
  const reviewWithRating = (s: ReturnType<typeof makeState>, want: (r: number) => boolean) => {
    for (let seed = 1; seed < 500; seed++) {
      const r = review(s, createRng(seed), CONTENT);
      if (want(r.rating)) return r;
    }
    throw new Error('no seed');
  };
  it('조건을 채웠어도 별점 2 이하면 직급을 올리지 않고 승진 보류를 알린다', () => {
    const s = makeState({ title: '주니어', yearsInCareer: 15, stats: strong, yearScore: -50 });
    const r = reviewWithRating(s, (x) => x <= 2);
    expect(r.state.title).toBe('주니어');
    expect(r.state.record.history.at(-1)?.title).toBe('주니어');
    expect(r.feed.join('\n')).toContain('승진 보류');
    expect(r.feed.join('\n')).not.toContain('승진!');
  });
  it('별점 3 이상이면 승진한다', () => {
    const s = makeState({ title: '주니어', yearsInCareer: 15, stats: strong });
    const r = reviewWithRating(s, (x) => x >= PROMOTION_MIN_RATING);
    expect(r.state.title).not.toBe('주니어');
    expect(r.feed.join('\n')).toContain('승진!');
  });
  it('팀장 발령은 별점과 무관하다', () => {
    const s = makeState({ title: '프린시펄', track: 'mgmt', yearScore: -12 });
    const r = reviewWithRating(s, (x) => x <= 2);
    expect(r.state.title).toBe('팀장');
  });
});

describe('연말 평가 (상대평가)', () => {
  it('실력 차이는 ±PERF_SKILL_CAP까지만, 절반 무게로 반영한다', () => {
    expect(performance(90, 40, 0, 0)).toBe(performance(40 + PERF_SKILL_CAP, 40, 0, 0));
    expect(performance(40 + PERF_SKILL_CAP, 40, 0, 0)).toBe(PERF_SKILL_CAP / 2);
    expect(performance(20, 60, 0, 0)).toBe(-PERF_SKILL_CAP / 2);
    expect(performance(44, 40, 0, 0)).toBe(2);
  });
  it('그 해 장애 성적은 ±PERF_YEAR_CAP까지만', () => {
    expect(performance(40, 40, -20, 0)).toBe(-PERF_YEAR_CAP);
    expect(performance(40, 40, 30, 0)).toBe(PERF_YEAR_CAP);
    expect(performance(40, 40, 3, 2)).toBe(5);
  });
  it('별점 문턱', () => {
    expect([-9, -8, -5, -4, 3, 4, 8, 9].map(ratingFromPerf)).toEqual([1, 2, 2, 3, 3, 4, 4, 5]);
  });
  it('평판은 별점표대로: B(3점)도 조금 쌓이고 C·D는 깎인다', () => {
    expect(REPUTATION_BY_RATING[3]).toBeGreaterThan(0);
    expect(REPUTATION_BY_RATING[2]).toBeLessThan(0);
    for (let k = 1; k < 5; k++) expect(REPUTATION_BY_RATING[k + 1]).toBeGreaterThan(REPUTATION_BY_RATING[k]);
    for (let seed = 1; seed <= 20; seed++) {
      const r = review(makeState({ reputation: 40 }), createRng(seed), CONTENT);
      expect(r.state.reputation).toBe(40 + REPUTATION_BY_RATING[r.rating]);
    }
  });
  it('회사보다 훨씬 잘해도 S는 절반이 안 되고, 평범한 해에는 B가 가장 많다', () => {
    const tally = (s: ReturnType<typeof makeState>) => {
      const n = [0, 0, 0, 0, 0, 0];
      for (let seed = 1; seed <= 400; seed++) n[review(s, createRng(seed), CONTENT).rating] += 1;
      return n.map((x) => x / 400);
    };
    const strong = { impl: 90, design: 90, debug: 90, infra: 90, ai: 90, mental: 90 };
    expect(tally(makeState({ stats: strong }))[5]).toBeLessThan(0.5);
    const even = tally(makeState());
    expect(even[3]).toBeGreaterThan(Math.max(even[1], even[2], even[4], even[5]));
  });
});
