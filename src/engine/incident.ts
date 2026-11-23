import { availableViews, matches } from './conditions';
import type { Rng } from './rng';
import type { CardId, Content, GameState, Incident, IncidentAction, IncidentOption, PositionId } from './types';
import { clamp } from './util';

export const POSTMORTEM_CHOICES = ['포스트모템을 공개한다', '조용히 덮는다', '다른 팀 탓을 한다'] as const;

/** 주 담당이 아닌 포지션에게 장애가 뽑힐 가중치 배수 */
export const OFF_ROLE_WEIGHT = 0.25;

export const isOffRole = (inc: Incident, position: PositionId): boolean =>
  !!inc.positions?.length && !inc.positions.includes(position);

export function actionChance(a: IncidentAction, clues: number, debug: number): number {
  return clamp(a.baseChance + a.perClue * clues + (debug - 50) / 200, 0.05, 0.95);
}

/** 장애 선택지 표시 순서 (Fisher–Yates). 정답이 늘 같은 자리에 있지 않게 한다. */
export function shuffledOrder(n: number, rng: Rng): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mttrMinutes(resolved: boolean, clues: number, rng: Rng): number {
  return resolved ? Math.max(5, 240 - clues * 60 + rng.int(-20, 20)) : 360 + rng.int(0, 240);
}

export function optionAvailable(opt: IncidentOption, deck: readonly CardId[], c: Content): boolean {
  return availableViews(deck, c).has(opt.view);
}

/** 올해 터질 장애: 재발(덮었던 장애)이 먼저, 그 다음 0~2건. */
export function pickIncidents(s: GameState, rng: Rng, c: Content): string[] {
  const forced = s.recur.filter((id) => c.incidents[id] && matches(c.incidents[id].when, s));
  const count = rng.weighted([
    { item: 0, weight: 30 },
    { item: 1, weight: 45 },
    { item: 2, weight: 25 },
  ]);
  const pool = Object.values(c.incidents).filter((i) => !forced.includes(i.id) && matches(i.when, s));
  const chosen = [...forced];
  for (let k = 0; k < count && pool.length > 0; k++) {
    const inc = rng.weighted(pool.map((i) => ({ item: i, weight: (i.weight ?? 1) * (isOffRole(i, s.position) ? OFF_ROLE_WEIGHT : 1) })));
    chosen.push(inc.id);
    pool.splice(pool.indexOf(inc), 1);
  }
  return chosen;
}

/** 포스트모템 공개: 문서 작업으로 지치지만, 복구했을 때만 평판이 오른다 */
export const POSTMORTEM_PUBLISH = { burnout: 2, reputation: 2 } as const;
