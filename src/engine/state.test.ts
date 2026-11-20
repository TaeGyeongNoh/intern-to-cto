import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { createRng } from './rng';
import { createInitialState } from './state';
import { generateCandidates } from './stats';

describe('createInitialState', () => {
  const setup = { name: '노개발', position: 'backend' as const, route: 'finance' as const, candidate: 1 };

  it('루트의 시작 회사, 고른 후보 능력치로 시작한다', () => {
    const s = createInitialState(setup, 10, createRng(10), CONTENT);
    expect(s.companyId).toBe('hansi');
    expect(s.deck).toEqual(['log']);
    expect(s.cardsSeen).toEqual(['log']);
    const cand = generateCandidates('backend', 10, CONTENT.archetypes)[1];
    expect(s.stats).toEqual(cand.stats);
    expect(s.archetypeId).toBe(cand.archetypeId);
    expect(s.age).toBe(22);
    expect(s.year).toBe(2025);
    expect(s.salary).toBe(3600);
    expect(s.title).toBe('주니어');
    expect(s.retired).toBe(false);
  });
  it('숨은 값은 범위 안', () => {
    for (let seed = 1; seed < 100; seed++) {
      const s = createInitialState(setup, seed, createRng(seed), CONTENT);
      expect(s.potential).toBeGreaterThanOrEqual(62);
      expect(s.potential).toBeLessThanOrEqual(95);
      // 기본 0.8~1.2에 유형 보정(최대 ±0.15)이 더해진다
      expect(s.burnoutProne).toBeGreaterThanOrEqual(0.65);
      expect(s.burnoutProne).toBeLessThanOrEqual(1.35);
    }
  });
  const noTwist = (twist?: { growth: 'early' }) => ({
    ...CONTENT,
    archetypes: Object.fromEntries(Object.entries(CONTENT.archetypes).map(([k, a]) => [k, { ...a, twist }])),
  });
  it('유형의 시작 보정이 반영된다', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = createInitialState(setup, seed, createRng(seed), CONTENT);
      const twist = CONTENT.archetypes[s.archetypeId].twist ?? {};
      const base = createInitialState(setup, seed, createRng(seed), noTwist());
      expect(base.archetypeId).toBe(s.archetypeId);
      expect(s.reputation).toBe(base.reputation + (twist.reputation ?? 0));
      expect(s.burnoutProne).toBeCloseTo(base.burnoutProne + (twist.burnoutProne ?? 0), 10);
    }
  });
  it('성장형 보정은 그 성장형을 더 자주 나오게 한다', () => {
    const count = (c: typeof CONTENT) => {
      let n = 0;
      for (let seed = 1; seed <= 400; seed++) if (createInitialState(setup, seed, createRng(seed), c).growthType === 'early') n++;
      return n;
    };
    expect(count(noTwist({ growth: 'early' }))).toBeGreaterThan(count(noTwist()) + 40);
  });
});
