export type Rng = {
  next(): number;
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly { item: T; weight: number }[]): T;
  getState(): number;
};

/** mulberry32. 상태는 32비트 정수 하나라서 Game에 그대로 저장할 수 있다. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick from empty array');
      return items[Math.floor(next() * items.length)];
    },
    weighted<T>(items: readonly { item: T; weight: number }[]): T {
      const total = items.reduce((s, x) => s + Math.max(0, x.weight), 0);
      if (total <= 0) throw new Error('weighted: no positive weight');
      let r = next() * total;
      for (const x of items) {
        r -= Math.max(0, x.weight);
        if (r < 0) return x.item;
      }
      return items[items.length - 1].item;
    },
    getState: () => a,
  };
}
