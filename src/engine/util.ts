export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export function toRecord<T extends { id: string }>(items: readonly T[]): Record<string, T> {
  return Object.fromEntries(items.map((x) => [x.id, x]));
}
