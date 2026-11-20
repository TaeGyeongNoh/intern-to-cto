import type { GameState, Role } from './types';

export const ROLE_LABELS: Record<Role, string> = { owner: '오너', main: '메인', support: '서포트' };
export const ROLE_FACTOR: Record<Role, number> = { owner: 1.3, main: 1.0, support: 0.6 };
export const ROLE_LOAD: Record<Role, number> = { owner: 8, main: 5, support: 2 };

export function roleFor(ovrValue: number, companyLevel: number): Role {
  const d = ovrValue - companyLevel;
  if (d >= 5) return 'owner';
  if (d >= -5) return 'main';
  return 'support';
}

export function computeTitle(s: GameState, o: number): string {
  if (s.track === 'mgmt') {
    if (o >= 78 && s.reputation >= 60) return 'CTO';
    if (o >= 70) return 'VP of Engineering';
    return '팀장';
  }
  if (o >= 85) return '프린시펄';
  if (o >= 75) return '스태프';
  if (o >= 65) return '시니어';
  if (s.yearsInCareer >= 3 && o >= 55) return '미드레벨';
  return '주니어';
}
