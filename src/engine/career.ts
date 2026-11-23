import { effectiveCompany, isClosed } from './company';
import { applyEffects } from './effects';
import { withJosa } from './josa';
import type { Rng } from './rng';
import { roleFor } from './roles';
import { offerSalary } from './salary';
import { ovr } from './stats';
import type { Company, Content, Ending, GameState, Role } from './types';
import { clamp } from './util';

export type Offer = { companyId: string; role: Role; salary: number; special?: 'whatap-scout' };

export const WHATAP_ID = 'whatap';

/** 히든 루트라 드물게: 조건을 채운 해에도 이 확률로만 제안이 온다. */
export const SCOUT_CHANCE = 0.2;

/** 작은 회사(tiny)를 졸업했다고 보는 OVR 차이 */
export const TINY_OUTGROW = 10;

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
    salary: offerSalary(s, co),
  };
}

/** forced: 지금 회사가 문을 닫아 남을 수 없다. 제안이 0건이면 같은 루트에서 한 곳을 채운다 */
export function generateOffers(s: GameState, rng: Rng, c: Content, opts: { forced?: boolean } = {}): Offer[] {
  if (s.flags.includes('founder')) return [];
  const o = ovr(s.stats, s.position);
  const n = rng.weighted([
    { item: 0, weight: 40 - s.reputation / 4 },
    { item: 1, weight: 35 },
    { item: 2, weight: 20 + s.reputation / 5 },
    { item: 3, weight: 5 + s.reputation / 10 },
  ]);
  const maxLevel = o + 3 + Math.floor(s.reputation / 10);
  const pool = Object.keys(c.companies).filter((id) => !isClosed(s, id)).map((id) => effectiveCompany(id, s, c)).filter(
    (co) => !co.hidden && co.id !== s.companyId && co.level >= o - 20 && co.level <= maxLevel && !(co.tiny && o > co.level + TINY_OUTGROW),
  );
  const offers: Offer[] = [];
  for (let k = 0; k < n && pool.length > 0; k++) {
    const co = rng.pick(pool);
    pool.splice(pool.indexOf(co), 1);
    offers.push(makeOffer(co, s, o));
  }
  if (opts.forced && offers.length === 0) {
    const fallback = Object.keys(c.companies)
      .filter((id) => id !== s.companyId && !isClosed(s, id))
      .map((id) => effectiveCompany(id, s, c))
      .filter((co) => !co.hidden && co.route === s.route)
      .sort((a, b) => Math.abs(a.level - o) - Math.abs(b.level - o))[0];
    if (fallback) offers.push(makeOffer(fallback, s, o));
  }
  const whatap = c.companies[WHATAP_ID] && effectiveCompany(WHATAP_ID, s, c);
  if (whatap && s.companyId !== WHATAP_ID && scoutEligible(s) && rng.chance(SCOUT_CHANCE)) offers.push({ ...makeOffer(whatap, s, o), special: 'whatap-scout' });
  return offers;
}

function enterCompany(s: GameState, co: Company, salary: number): GameState {
  return {
    ...s,
    companyId: co.id,
    route: co.route,
    deck: [...co.cards],
    cardsSeen: [...new Set([...s.cardsSeen, ...co.cards])],
    companiesWorked: s.companiesWorked.includes(co.id) ? s.companiesWorked : [...s.companiesWorked, co.id],
    yearsAtCompany: 0,
    salary,
    maxSalary: Math.max(s.maxSalary, salary),
    burnout: clamp(s.burnout - 15, 0, 100),
    scheduled: [],
    stock: undefined,
  };
}

/** `{route}` 자리표시자를 현재 루트로 바꾼 회사 id */
export const resolveCompanyId = (id: string, route: string): string => id.replace('{route}', route);

/**
 * 이벤트 효과로 회사를 옮긴다 (이직 이야기 없음, 그 회사 기본 연봉).
 * 커리어 시작 전(프롤로그)이라면 첫 회사를 바꿔치기한다: 시작 회사에서 일한 적이 없으니 경력 목록을 새로 쓴다.
 */
export function moveToCompany(s: GameState, companyId: string, c: Content): GameState {
  const id = resolveCompanyId(companyId, s.route);
  if (!c.companies[id]) throw new Error(`unknown company ${companyId}`);
  const co = effectiveCompany(id, s, c);
  const moved = enterCompany(s, co, co.baseSalary);
  return s.yearsInCareer === 0 ? { ...moved, companiesWorked: [co.id] } : moved;
}

export function joinCompany(s: GameState, offer: Offer, c: Content): GameState {
  const co = effectiveCompany(offer.companyId, s, c);
  const next = enterCompany(s, co, offer.salary);
  if (offer.special === 'whatap-scout') {
    return applyEffects(next, { flags: ['whatap-joined'], traits: { 관측성전도사: 2 }, story: '와탭랩스의 스카우트 제안을 받아들였다.' });
  }
  return applyEffects(next, { story: `${withJosa(co.name, '(으)로')} 이직했다.` });
}

export function determineEnding(s: GameState, c: Content): Ending {
  const sorted = [...c.endings].sort((a, b) => b.priority - a.priority);
  const found = sorted.find((e) => e.check(s));
  if (!found) throw new Error('no ending matched (missing fallback?)');
  return found;
}
