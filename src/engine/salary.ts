import { ovr } from './stats';
import type { Company, GameState } from './types';
import { clamp } from './util';

/**
 * 직급별 시장가 배수. 직급 자체가 이미 OVR을 반영하므로 중간 직급은 완만하게,
 * CTO만 크게 뛴다 (시뮬레이션 기준: 10년차 중앙값 ~9천, 최고연봉 p90 ~3억, 빅테크 CTO ~3.5억).
 */
export const TITLE_SALARY_MULT: Record<string, number> = {
  주니어: 1.0, 미드레벨: 1.05, 시니어: 1.12, 스태프: 1.25, 프린시펄: 1.5,
  팀장: 1.2, 'VP of Engineering': 1.35, CTO: 3.4,
};

/** 별점(1~5)별 연봉 인상률. 인덱스 0은 사용하지 않는다. */
export const RAISE_BY_RATING = [0, 0, 0, 0.02, 0.03, 0.04];
/** 연말 인상으로 도달할 수 있는 상한 (시장가 대비) */
export const REVIEW_CAP = 1.15;
/** 이직 제안 상한 (시장가 대비) */
export const OFFER_CAP = 1.3;

/** 이 회사에서 이 사람의 시장가 (만원). */
export function marketSalary(s: GameState, company: Company): number {
  const skill = clamp(1 + (ovr(s.stats, s.position) - company.level) / 100, 0.85, 1.15);
  return Math.round(company.baseSalary * skill * (TITLE_SALARY_MULT[s.title] ?? 1));
}

/** 연말 평가 후 연봉: 별점만큼 오르되 시장가 × REVIEW_CAP을 넘지 않는다. 깎이지는 않는다. */
export function reviewSalary(s: GameState, rating: number, company: Company): number {
  const raised = Math.round(s.salary * (1 + (RAISE_BY_RATING[rating] ?? 0)));
  return Math.max(s.salary, Math.min(raised, Math.round(marketSalary(s, company) * REVIEW_CAP)));
}

/** 이직 제안 연봉: 시장가와 현 연봉 +3% 중 큰 쪽, 시장가 × OFFER_CAP 상한. */
export function offerSalary(s: GameState, company: Company): number {
  const market = marketSalary(s, company);
  return Math.min(Math.round(market * OFFER_CAP), Math.max(market, Math.round(s.salary * 1.03)));
}

/** 연봉 협상 성공 시 별점 인상률에 더하는 몫 */
export const NEGOTIATE_BONUS = 0.04;
/** 협상으로 도달할 수 있는 상한 (시장가 대비, 연말 1.15와 이직 1.3 사이) */
export const NEGOTIATE_CAP = 1.2;
/** 협상 실패 시 인상률 (별점 2 수준) */
export const NEGOTIATE_FAIL_RAISE = RAISE_BY_RATING[2];

/** 연봉 협상 성공 확률. 별점이 높고 평판이 높을수록 잘 된다 */
export function negotiateChance(s: GameState, rating: number): number {
  return clamp(0.35 + (rating - 4) * 0.15 + s.reputation / 200, 0.1, 0.85);
}

/** 협상 결과 연봉. prev: 평가 전 연봉, base: 자동 인상 제시안 */
export function negotiatedSalary(s: GameState, company: Company, rating: number, prev: number, base: number): { win: number; lose: number } {
  const raised = Math.round(prev * (1 + (RAISE_BY_RATING[rating] ?? 0) + NEGOTIATE_BONUS));
  const win = Math.max(base, Math.min(raised, Math.round(marketSalary(s, company) * NEGOTIATE_CAP)));
  const lose = Math.min(base, Math.round(prev * (1 + NEGOTIATE_FAIL_RAISE)));
  return { win, lose };
}
