import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { createRng } from './rng';
import { ageFactor, RETIRE_AGE, review, runYear } from './season';
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
});
