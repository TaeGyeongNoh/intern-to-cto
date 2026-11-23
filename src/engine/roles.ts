import { ovr } from './stats';
import { TIER_LABELS, type GameState, type Role, type Tier, type Track } from './types';

export const ROLE_LABELS: Record<Role, string> = { owner: '오너', main: '메인', support: '서포트' };
export const ROLE_FACTOR: Record<Role, number> = { owner: 1.3, main: 1.0, support: 0.6 };
export const ROLE_LOAD: Record<Role, number> = { owner: 8, main: 5, support: 2 };

export function roleFor(ovrValue: number, companyLevel: number): Role {
  const d = ovrValue - companyLevel;
  if (d >= 5) return 'owner';
  if (d >= -5) return 'main';
  return 'support';
}

/** CTO 자리가 있는 회사 규모 */
export const CTO_TIERS: readonly Tier[] = ['large', 'bigtech'];

/** 직급 조건. 표는 위에서부터 첫 매치가 그 직급이다 */
export type TitleRule = { title: string; minOvr: number; minReputation?: number; minCareerYear?: number; tiers?: readonly Tier[] };
export const IC_RULES: readonly TitleRule[] = [
  { title: '프린시펄', minOvr: 85 },
  { title: '스태프', minOvr: 75 },
  { title: '시니어', minOvr: 65 },
  { title: '미드레벨', minOvr: 55, minCareerYear: 3 },
  { title: '주니어', minOvr: 0 },
];
export const MGMT_RULES: readonly TitleRule[] = [
  { title: 'CTO', minOvr: 85, minReputation: 85, tiers: CTO_TIERS },
  { title: 'VP of Engineering', minOvr: 80, minReputation: 70 },
  { title: '팀장', minOvr: 0 },
];
/** 조건을 채워도 그 해 별점이 이보다 낮으면 승진이 보류된다 */
export const PROMOTION_MIN_RATING = 3;

const rulesFor = (track: Track) => (track === 'mgmt' ? MGMT_RULES : IC_RULES);

function ruleReqs(r: TitleRule, s: GameState, o: number, tier?: Tier): TitleReq[] {
  const reqs: TitleReq[] = [{ label: 'OVR', current: String(o), need: String(r.minOvr), ok: o >= r.minOvr }];
  if (r.minReputation !== undefined)
    reqs.push({ label: '평판', current: String(s.reputation), need: String(r.minReputation), ok: s.reputation >= r.minReputation });
  if (r.minCareerYear !== undefined)
    reqs.push({ label: '연차', current: String(s.yearsInCareer), need: String(r.minCareerYear), ok: s.yearsInCareer >= r.minCareerYear });
  if (r.tiers)
    reqs.push({
      label: '회사 규모',
      current: tier ? TIER_LABELS[tier] : '-',
      need: r.tiers.map((t) => TIER_LABELS[t]).join('·'),
      ok: !!tier && r.tiers.includes(tier),
    });
  return reqs;
}

/** tier: 지금 회사 규모 (CTO는 대기업·빅테크에서만 나온다) */
export function computeTitle(s: GameState, o: number, tier?: Tier): string {
  const rules = rulesFor(s.track);
  return (rules.find((r) => ruleReqs(r, s, o, tier).every((q) => q.ok)) ?? rules[rules.length - 1]).title;
}

export type TitleReq = { label: string; current: string; need: string; ok: boolean };

/** 지금 트랙에서 한 칸 위 직급과 조건별 충족 여부 (UI 표시용). 최고 직급이거나 트랙이 막 바뀌었으면 undefined */
export function nextTitleProgress(s: GameState, tier: Tier): { title: string; reqs: TitleReq[] } | undefined {
  const rules = rulesFor(s.track);
  const i = rules.findIndex((r) => r.title === s.title);
  if (i <= 0) return undefined;
  const next = rules[i - 1];
  return { title: next.title, reqs: ruleReqs(next, s, ovr(s.stats, s.position), tier) };
}

export const IC_TITLES = ['주니어', '미드레벨', '시니어', '스태프', '프린시펄'] as const;
export const MGMT_TITLES = ['팀장', 'VP of Engineering', 'CTO'] as const;

export function titleTrack(title: string): Track | undefined {
  if ((IC_TITLES as readonly string[]).includes(title)) return 'ic';
  if ((MGMT_TITLES as readonly string[]).includes(title)) return 'mgmt';
  return undefined;
}

function titleRank(title: string): number {
  const ic = (IC_TITLES as readonly string[]).indexOf(title);
  return ic >= 0 ? ic : (MGMT_TITLES as readonly string[]).indexOf(title);
}

/**
 * 연말 직급 결정. 같은 트랙 안에서는 직급이 내려가지 않는다.
 * kind: 'promoted' 실제 승진, 'assigned' 트랙 전환(발령), undefined 변화 없음.
 */
export function nextTitle(current: string, computed: string): { title: string; kind?: 'promoted' | 'assigned' } {
  const from = titleTrack(current);
  const to = titleTrack(computed);
  if (from !== to) return computed === current ? { title: current } : { title: computed, kind: 'assigned' };
  if (titleRank(computed) > titleRank(current)) return { title: computed, kind: 'promoted' };
  return { title: current };
}
