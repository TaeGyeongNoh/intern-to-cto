import { describe, expect, it } from 'vitest';
import { withJosa } from './josa';
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
  it('능력치가 떨어져도 직급은 내려가지 않고 승진 로그도 없다', () => {
    const s = makeState({ title: '스태프', yearsInCareer: 10 });
    const r = review(s, createRng(9), CONTENT);
    expect(r.state.title).toBe('스태프');
    expect(r.feed.join('\n')).not.toContain('승진');
    expect(r.state.record.story.join('\n')).not.toContain('승진');
  });
  it('실제로 직급이 오르면 승진으로 기록한다', () => {
    const s = makeState({ title: '주니어', stats: { impl: 80, design: 80, debug: 80, infra: 80, ai: 80, mental: 80 } });
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
