export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export function toRecord<T extends { id: string }>(items: readonly T[]): Record<string, T> {
  return Object.fromEntries(items.map((x) => [x.id, x]));
}

/** 연도로 고르는 표시용 문구 (Rng를 쓰지 않아 결정론에 영향이 없다) */
export const byYear = <T>(xs: readonly T[], year: number): T => xs[((year % xs.length) + xs.length) % xs.length];
