import type { GameState, Role, Tier, Track } from './types';

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

/** tier: 지금 회사 규모 (CTO는 대기업·빅테크에서만 나온다) */
export function computeTitle(s: GameState, o: number, tier?: Tier): string {
  if (s.track === 'mgmt') {
    if (o >= 85 && s.reputation >= 85 && tier && CTO_TIERS.includes(tier)) return 'CTO';
    if (o >= 80 && s.reputation >= 70) return 'VP of Engineering';
    return '팀장';
  }
  if (o >= 85) return '프린시펄';
  if (o >= 75) return '스태프';
  if (o >= 65) return '시니어';
  if (s.yearsInCareer >= 3 && o >= 55) return '미드레벨';
  return '주니어';
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
