import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { marketSalary, RAISE_BY_RATING, reviewSalary, TITLE_SALARY_MULT } from './salary';
import { ovr } from './stats';
import { makeState } from './testing';

const co = CONTENT.companies.dangeun;

describe('marketSalary', () => {
  it('회사 기본급 × OVR 보정 × 직급 배수', () => {
    const s = makeState();
    const o = ovr(s.stats, s.position);
    const f = Math.min(1.6, Math.max(0.8, 1 + (o - co.level) / 60));
    expect(marketSalary(s, co)).toBe(Math.round(co.baseSalary * f * TITLE_SALARY_MULT['주니어']));
    expect(marketSalary({ ...s, title: '시니어' }, co)).toBe(Math.round(co.baseSalary * f * TITLE_SALARY_MULT['시니어']));
  });
  it('OVR 보정은 0.8~1.6으로 자른다', () => {
    const weak = makeState({ stats: { impl: 1, design: 1, debug: 1, infra: 1, ai: 1, mental: 1 } });
    const strong = makeState({ stats: { impl: 99, design: 99, debug: 99, infra: 99, ai: 99, mental: 99 } });
    expect(marketSalary(weak, co)).toBe(Math.round(co.baseSalary * 0.8));
    expect(marketSalary({ ...strong, title: 'CTO' }, co)).toBe(Math.round(co.baseSalary * 1.6 * TITLE_SALARY_MULT.CTO));
  });
  it('직급 배수는 트랙 안에서 단조 증가하고 주니어는 1', () => {
    const ic = ['주니어', '미드레벨', '시니어', '스태프', '프린시펄'].map((t) => TITLE_SALARY_MULT[t]);
    const mgmt = ['팀장', 'VP of Engineering', 'CTO'].map((t) => TITLE_SALARY_MULT[t]);
    expect(ic[0]).toBe(1);
    for (const xs of [ic, mgmt]) for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  });
});

describe('reviewSalary', () => {
  it('별점별 인상률', () => {
    expect(RAISE_BY_RATING).toEqual([0, 0, 0.01, 0.03, 0.05, 0.08]);
    const s = makeState({ salary: 3000 });
    expect(reviewSalary(s, 1, co)).toBe(3000);
    expect(reviewSalary(s, 3, co)).toBe(3090);
    expect(reviewSalary(s, 5, co)).toBe(3240);
  });
  it('시장가 × 1.15를 넘지 않고, 깎이지도 않는다', () => {
    const s = makeState();
    const cap = Math.round(marketSalary(s, co) * 1.15);
    expect(reviewSalary({ ...s, salary: cap - 10 }, 5, co)).toBe(cap);
    expect(reviewSalary({ ...s, salary: cap + 1000 }, 5, co)).toBe(cap + 1000);
  });
});
