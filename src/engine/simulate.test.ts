import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { simulate } from './simulate';

describe('simulate', () => {
  it('N판을 돌려 엔딩 분포를 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.games).toBe(100);
    expect(Object.values(r.endings).reduce((a, b) => a + b, 0)).toBe(100);
    expect(r.avgYears).toBeGreaterThan(5);
    expect(r.maxYears).toBeLessThanOrEqual(26);
  });
  it('연봉 분포를 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.salaryYear10Median).toBeGreaterThan(0);
    expect(r.maxSalary.p90).toBeGreaterThanOrEqual(r.maxSalary.median);
    expect(r.maxSalary.max).toBeGreaterThanOrEqual(r.maxSalary.p90);
  });
  it('결정론적이다', () => {
    expect(simulate(30, CONTENT, 7)).toEqual(simulate(30, CONTENT, 7));
  });
  it('단서가 있을 때 장애 해결률이 더 높다', () => {
    const r = simulate(300, CONTENT);
    expect(r.resolveRate.withClues).toBeGreaterThan(r.resolveRate.noClue);
  });
  it('유형별로 판 수·평균 연차·엔딩을 집계한다', () => {
    const r = simulate(100, CONTENT);
    const rows = Object.values(r.byArchetype);
    expect(rows.reduce((a, x) => a + x.games, 0)).toBe(100);
    for (const [id, x] of Object.entries(r.byArchetype)) {
      expect(CONTENT.archetypes[id]).toBeDefined();
      expect(Object.values(x.endings).reduce((a, b) => a + b, 0)).toBe(x.games);
    }
  });
});
