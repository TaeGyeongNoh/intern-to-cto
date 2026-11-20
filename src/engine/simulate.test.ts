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
  it('결정론적이다', () => {
    expect(simulate(30, CONTENT, 7)).toEqual(simulate(30, CONTENT, 7));
  });
  it('단서가 있을 때 장애 해결률이 더 높다', () => {
    const r = simulate(300, CONTENT);
    expect(r.resolveRate.withClues).toBeGreaterThan(r.resolveRate.noClue);
  });
});
