import { matches } from './conditions';
import type { Rng } from './rng';
import type { Content, EventChoice, GameState, StatId } from './types';
import { clamp } from './util';

export const EVENT_RATE = 0.65;

export function choiceLocked(ch: EventChoice, s: GameState): boolean {
  const r = ch.requires;
  if (!r) return false;
  if (r.card && !s.deck.includes(r.card)) return true;
  if (r.minStat) for (const [k, v] of Object.entries(r.minStat) as [StatId, number][]) if (s.stats[k] < v) return true;
  return false;
}

export function choiceChance(ch: EventChoice, s: GameState): number | undefined {
  if (!ch.chance) return undefined;
  let p = ch.chance.base;
  if (ch.chance.stat) p += (s.stats[ch.chance.stat] - 50) / 100;
  if (ch.chance.card && s.deck.includes(ch.chance.card)) p += 0.25;
  return clamp(p, 0.05, 0.95);
}

export function pickEvent(s: GameState, rng: Rng, c: Content): string | undefined {
  const scheduled = s.scheduled.find((x) => x.companyId === s.companyId && c.events[x.id]);
  if (scheduled) return scheduled.id;
  if (!rng.chance(EVENT_RATE)) return undefined;
  const pool = Object.values(c.events).filter(
    (e) => !e.scheduledOnly && !(e.once !== false && s.seenEvents.includes(e.id)) && !(e.once === false && s.seenEvents.at(-1) === e.id) && matches(e.when, s),
  );
  if (pool.length === 0) return undefined;
  return rng.weighted(pool.map((e) => ({ item: e.id, weight: e.weight ?? 1 })));
}
