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
    expect(s.stats).toEqual(generateCandidates('backend', 10)[1]);
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
      expect(s.burnoutProne).toBeGreaterThanOrEqual(0.8);
      expect(s.burnoutProne).toBeLessThanOrEqual(1.2);
    }
  });
});
