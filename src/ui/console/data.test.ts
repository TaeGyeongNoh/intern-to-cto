import { describe, expect, it } from 'vitest';
import { hashKey, hitmapPoints, series, HITMAP } from './data';

describe('console data', () => {
  it('hashKey는 결정적이고 키마다 다르다', () => {
    expect(hashKey('a')).toBe(hashKey('a'));
    expect(hashKey('a')).not.toBe(hashKey('b'));
  });
  it('히트맵 점은 범위 안이고 결정적이다', () => {
    const a = hitmapPoints('x', false);
    expect(a).toEqual(hitmapPoints('x', false));
    for (const p of a) {
      expect(p.col).toBeGreaterThanOrEqual(0); expect(p.col).toBeLessThan(HITMAP.cols);
      expect(p.ms).toBeGreaterThanOrEqual(0); expect(p.ms).toBeLessThanOrEqual(HITMAP.maxMs);
    }
  });
  it('anomaly면 뒤쪽 구간에 느린 점과 에러 점이 늘어난다', () => {
    const late = (ps: ReturnType<typeof hitmapPoints>) => ps.filter((p) => p.col >= HITMAP.cols * 0.7);
    const slow = (ps: ReturnType<typeof hitmapPoints>) => late(ps).filter((p) => p.ms > 3000).length;
    const err = (ps: ReturnType<typeof hitmapPoints>) => late(ps).filter((p) => p.error).length;
    expect(slow(hitmapPoints('k', true))).toBeGreaterThan(slow(hitmapPoints('k', false)) * 3);
    expect(err(hitmapPoints('k', true))).toBeGreaterThan(err(hitmapPoints('k', false)));
  });
  it('series는 길이 n, anomaly면 끝부분 평균이 크게 오른다', () => {
    const n = series('s', false, 60); const a = series('s', true, 60);
    expect(n).toHaveLength(60);
    const tail = (xs: number[]) => xs.slice(-10).reduce((s, x) => s + x, 0) / 10;
    expect(tail(a)).toBeGreaterThan(tail(n) * 1.5);
  });
});
