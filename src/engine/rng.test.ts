import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('같은 시드는 같은 수열을 만든다', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });
  it('getState로 이어서 재현할 수 있다', () => {
    const a = createRng(7);
    a.next();
    const b = createRng(a.getState());
    expect(b.next()).toBe(a.next());
  });
  it('next는 [0,1) 범위다', () => {
    const r = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('int는 양 끝을 포함한다', () => {
    const r = createRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(r.int(3, 5));
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });
  it('weighted는 가중치 0을 고르지 않는다', () => {
    const r = createRng(3);
    for (let i = 0; i < 500; i++) expect(r.weighted([{ item: 'a', weight: 0 }, { item: 'b', weight: 1 }])).toBe('b');
  });
  it('빈 배열 pick은 에러', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});
