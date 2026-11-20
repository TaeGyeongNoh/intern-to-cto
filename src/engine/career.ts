import { applyEffects } from './effects';
import type { Rng } from './rng';
import { roleFor } from './roles';
import { ovr } from './stats';
import type { Company, Content, Ending, GameState, Role } from './types';
import { clamp } from './util';

export type Offer = { companyId: string; role: Role; salary: number; special?: 'whatap-scout' };

export const WHATAP_ID = 'whatap';

/** 히든 루트라 드물게: 조건을 채운 해에도 이 확률로만 제안이 온다. */
export const SCOUT_CHANCE = 0.2;

export function scoutEligible(s: GameState): boolean {
  return (
    (s.traits['관측성전도사'] ?? 0) >= 4 &&
    s.cardsSeen.length >= 7 &&
    ovr(s.stats, s.position) >= 65 &&
    !s.flags.includes('whatap-joined') &&
    !s.flags.includes('scout-declined')
  );
}

function makeOffer(co: Company, s: GameState, o: number): Offer {
  return {
    companyId: co.id,
    role: roleFor(o, co.level),
    salary: Math.max(Math.round(co.baseSalary * (1 + (o - co.level) / 100)), Math.round(s.salary * 1.08)),
  };
}

export function generateOffers(s: GameState, rng: Rng, c: Content): Offer[] {
  if (s.flags.includes('founder')) return [];
  const o = ovr(s.stats, s.position);
  const n = rng.weighted([
    { item: 0, weight: 40 - s.reputation / 4 },
    { item: 1, weight: 35 },
    { item: 2, weight: 20 + s.reputation / 5 },
    { item: 3, weight: 5 + s.reputation / 10 },
  ]);
  const maxLevel = o + 3 + Math.floor(s.reputation / 10);
  const pool = Object.values(c.companies).filter(
    (co) => !co.hidden && co.id !== s.companyId && co.level >= o - 20 && co.level <= maxLevel,
  );
  const offers: Offer[] = [];
  for (let k = 0; k < n && pool.length > 0; k++) {
    const co = rng.pick(pool);
    pool.splice(pool.indexOf(co), 1);
    offers.push(makeOffer(co, s, o));
  }
  const whatap = c.companies[WHATAP_ID];
  if (whatap && s.companyId !== WHATAP_ID && scoutEligible(s) && rng.chance(SCOUT_CHANCE)) offers.push({ ...makeOffer(whatap, s, o), special: 'whatap-scout' });
  return offers;
}

export function joinCompany(s: GameState, offer: Offer, c: Content): GameState {
  const co = c.companies[offer.companyId];
  const next: GameState = {
    ...s,
    companyId: co.id,
    route: co.route,
    deck: [...co.cards],
    cardsSeen: [...new Set([...s.cardsSeen, ...co.cards])],
    companiesWorked: s.companiesWorked.includes(co.id) ? s.companiesWorked : [...s.companiesWorked, co.id],
    yearsAtCompany: 0,
    salary: offer.salary,
    maxSalary: Math.max(s.maxSalary, offer.salary),
    burnout: clamp(s.burnout - 15, 0, 100),
    scheduled: [],
  };
  if (offer.special === 'whatap-scout') {
    return applyEffects(next, { flags: ['whatap-joined'], traits: { 관측성전도사: 2 }, story: '와탭랩스의 스카우트 제안을 받아들였다.' });
  }
  return applyEffects(next, { story: `${co.name}(으)로 이직했다.` });
}

export function determineEnding(s: GameState, c: Content): Ending {
  const sorted = [...c.endings].sort((a, b) => b.priority - a.priority);
  const found = sorted.find((e) => e.check(s));
  if (!found) throw new Error('no ending matched (missing fallback?)');
  return found;
}
