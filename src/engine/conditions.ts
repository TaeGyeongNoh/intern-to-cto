import { ovr } from './stats';
import type { CardId, Condition, Content, GameState, RouteId, StatId, ViewId } from './types';

export function availableViews(deck: readonly CardId[], c: Content): Set<ViewId> {
  const views = new Set<ViewId>(['grep']);
  for (const id of deck) for (const v of c.cards[id].views) views.add(v);
  return views;
}

const statEntries = (o: Partial<Record<StatId, number>>) => Object.entries(o) as [StatId, number][];

export function matches(cond: Condition, s: GameState): boolean {
  if (cond.route && !cond.route.includes(s.route as RouteId)) return false;
  if (cond.position && !cond.position.includes(s.position)) return false;
  if (cond.minCareerYear !== undefined && s.yearsInCareer < cond.minCareerYear) return false;
  if (cond.maxCareerYear !== undefined && s.yearsInCareer > cond.maxCareerYear) return false;
  if (cond.minCalendarYear !== undefined && s.year < cond.minCalendarYear) return false;
  if (cond.minAge !== undefined && s.age < cond.minAge) return false;
  if (cond.maxAge !== undefined && s.age > cond.maxAge) return false;
  if (cond.minOvr !== undefined && ovr(s.stats, s.position) < cond.minOvr) return false;
  if (cond.minBurnout !== undefined && s.burnout < cond.minBurnout) return false;
  if (cond.minYearsAtCompany !== undefined && s.yearsAtCompany < cond.minYearsAtCompany) return false;
  if (cond.track && s.track !== cond.track) return false;
  if (cond.flags && !cond.flags.every((f) => s.flags.includes(f))) return false;
  if (cond.notFlags && cond.notFlags.some((f) => s.flags.includes(f))) return false;
  if (cond.cards && !cond.cards.every((x) => s.deck.includes(x))) return false;
  if (cond.missingCards && cond.missingCards.every((x) => s.deck.includes(x))) return false;
  if (cond.minStat && statEntries(cond.minStat).some(([k, v]) => s.stats[k] < v)) return false;
  if (cond.maxStat && statEntries(cond.maxStat).some(([k, v]) => s.stats[k] > v)) return false;
  if (cond.minTrait && Object.entries(cond.minTrait).some(([k, v]) => (s.traits[k] ?? 0) < v)) return false;
  return true;
}
