import { describe, expect, it } from 'vitest';
import { clamp, toRecord } from './util';

describe('util', () => {
  it('clamp는 범위 안으로 자른다', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it('toRecord는 id로 묶는다', () => {
    expect(toRecord([{ id: 'a', v: 1 }])).toEqual({ a: { id: 'a', v: 1 } });
  });
});
