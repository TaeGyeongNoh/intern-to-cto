import { describe, expect, it } from 'vitest';
import { generateCandidates, ovr, POSITION_WEIGHTS, START_OVR, START_SUM } from './stats';
import { STAT_IDS, type PositionId } from './types';

const positions: PositionId[] = ['backend', 'frontend', 'sre', 'ai'];
const sum = (s: Record<string, number>) => Object.values(s).reduce((a, b) => a + b, 0);

describe('stats', () => {
  it('포지션 가중치 합은 1', () => {
    for (const p of positions) expect(sum(POSITION_WEIGHTS[p])).toBeCloseTo(1, 10);
  });
  it('ovr은 가중평균 반올림', () => {
    const flat = Object.fromEntries(STAT_IDS.map((id) => [id, 50])) as never;
    expect(ovr(flat, 'backend')).toBe(50);
  });
  it('후보 3명은 모두 OVR 45, 합 240', () => {
    for (const p of positions) {
      for (let seed = 1; seed <= 50; seed++) {
        const cs = generateCandidates(p, seed);
        expect(cs).toHaveLength(3);
        for (const c of cs) {
          expect(sum(c)).toBe(START_SUM);
          expect(ovr(c, p)).toBe(START_OVR);
        }
      }
    }
  });
  it('같은 시드면 같은 후보', () => {
    expect(generateCandidates('sre', 11)).toEqual(generateCandidates('sre', 11));
  });
  it('후보끼리는 배분이 다르다', () => {
    const [a, b] = generateCandidates('backend', 3);
    expect(a).not.toEqual(b);
  });
});
