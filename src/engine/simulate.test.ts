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
  it('비프롤로그 이벤트 수와 반복 비율을 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.avgEvents).toBeGreaterThan(3);
    expect(r.repeatShare).toBeGreaterThan(0);
    expect(r.repeatShare).toBeLessThan(1);
  });
  it('포지션별 판 수와 엔딩을 집계한다', () => {
    const r = simulate(100, CONTENT);
    expect(Object.values(r.byPosition).reduce((a, x) => a + x.games, 0)).toBe(100);
  });
  it('기본 정책은 random이고, 정책마다 결정론적이다', () => {
    expect(simulate(20, CONTENT, 3, 'random')).toEqual(simulate(20, CONTENT, 3));
    for (const policy of ['skilled', 'loyal'] as const) expect(simulate(20, CONTENT, 3, policy)).toEqual(simulate(20, CONTENT, 3, policy));
    expect(simulate(20, CONTENT, 3, 'skilled')).not.toEqual(simulate(20, CONTENT, 3, 'random'));
  });
  it('skilled: 단서를 더 많이 찾아 해결률이 높고, SRE 판에서 전설의 SRE가 나온다', () => {
    const skilled = simulate(200, CONTENT, 1, 'skilled');
    const random = simulate(200, CONTENT, 1);
    expect(skilled.incidentResolveRate).toBeGreaterThan(random.incidentResolveRate);
    expect(skilled.byPosition.sre.endings['legend-sre'] ?? 0).toBeGreaterThanOrEqual(1);
  });
  it('loyal: 이직하지 않아서 원컴퍼니맨이 나온다', () => {
    const r = simulate(100, CONTENT, 1, 'loyal');
    expect(r.endings['one-company'] ?? 0).toBeGreaterThanOrEqual(1);
  });
  it('현실성: 나이별 연봉과 연차별 직급 분포를 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.realism.salaryByAge[30].n).toBeGreaterThan(0);
    expect(r.realism.salaryByAge[30].p90).toBeGreaterThanOrEqual(r.realism.salaryByAge[30].median);
    const y5 = Object.values(r.realism.titleByYear[5]).reduce((a, b) => a + b, 0);
    expect(y5).toBeCloseTo(1);
  });
});
