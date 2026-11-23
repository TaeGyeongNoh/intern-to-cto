import type { Company, Content, GameState, GrowthStage } from './types';

/** 회사의 지금 단계 번호 (단계 없는 회사·폐업은 0) */
export function stageIndex(s: GameState, id: string): number {
  const k = s.companyStage[id];
  return typeof k === 'number' ? k : 0;
}

export const isClosed = (s: GameState, id: string): boolean => s.companyStage[id] === 'closed';

/** 성장 단계를 반영한 회사 (level·baseSalary·tier는 단계 값, 카드는 기본 ∪ 지나온 단계의 addCards) */
export function effectiveCompany(id: string, s: GameState, c: Content): Company {
  const co = c.companies[id];
  const k = stageIndex(s, id);
  if (!co.stages || k === 0) return co;
  const passed: GrowthStage[] = co.stages.slice(1, k + 1);
  const stage = co.stages[k];
  return {
    ...co,
    level: stage.level,
    baseSalary: stage.baseSalary,
    tier: passed.reduce((t, st) => st.tier ?? t, co.tier),
    cards: [...new Set([...co.cards, ...passed.flatMap((st) => st.addCards ?? [])])],
  };
}

/** UI 표시용 단계 이름. 단계 없는 회사는 undefined */
export function companyStageName(s: GameState, id: string, c: Content): string | undefined {
  const co = c.companies[id];
  if (!co?.stages) return undefined;
  if (isClosed(s, id)) return '폐업';
  return co.stages[stageIndex(s, id)].name;
}
