import type { Effects, GameState, StatId } from './types';
import { clamp } from './util';

export function applyEffects(s: GameState, e: Effects): GameState {
  const stats = { ...s.stats };
  for (const [k, v] of Object.entries(e.stats ?? {}) as [StatId, number][]) stats[k] = clamp(stats[k] + v, 1, 99);

  const traits = { ...s.traits };
  for (const [k, v] of Object.entries(e.traits ?? {})) traits[k] = (traits[k] ?? 0) + v;

  const added = [...s.flags];
  for (const f of e.flags ?? []) if (!added.includes(f)) added.push(f);
  const flags = added.filter((f) => !(e.removeFlags ?? []).includes(f));

  const deck = [...s.deck];
  const cardsSeen = [...s.cardsSeen];
  for (const card of e.addCards ?? []) {
    if (!deck.includes(card)) deck.push(card);
    if (!cardsSeen.includes(card)) cardsSeen.push(card);
  }

  const salary = Math.max(0, s.salary + (e.salary ?? 0));
  return {
    ...s,
    stats,
    traits,
    flags,
    deck,
    cardsSeen,
    salary,
    maxSalary: Math.max(s.maxSalary, salary),
    reputation: clamp(s.reputation + (e.reputation ?? 0), 0, 100),
    burnout: clamp(s.burnout + (e.burnout ?? 0), 0, 100),
    track: e.track ?? s.track,
    scheduled: e.next ? [...s.scheduled, { id: e.next, companyId: s.companyId }] : s.scheduled,
    retired: s.retired || !!e.retire,
    boundUntil: e.bound ? Math.max(s.boundUntil, s.yearsInCareer + e.bound) : s.boundUntil,
    record: e.story ? { ...s.record, story: [...s.record.story, `${s.year}년 · ${e.story}`] } : s.record,
  };
}
