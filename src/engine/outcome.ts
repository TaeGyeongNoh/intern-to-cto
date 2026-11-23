import { STAT_IDS, STAT_LABELS, type Content, type GameState } from './types';

export type Delta = { label: string; value: string; good: boolean };
/** 선택 하나의 결과 요약 (UI 결과 카드용, 입력 로그와 무관) */
export type Outcome = { title: string; ok?: boolean; detail?: string; deltas: Delta[] };

const signed = (v: number, unit = '') => `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('ko-KR')}${unit}`;

/** 두 상태의 차이 중 플레이어가 알아야 할 것만 */
export function diffState(a: GameState, b: GameState, c: Content): Delta[] {
  const out: Delta[] = [];
  const num = (label: string, d: number, lowerIsGood = false, unit = '') => {
    if (d !== 0) out.push({ label, value: signed(d, unit), good: lowerIsGood ? d < 0 : d > 0 });
  };
  for (const id of STAT_IDS) num(STAT_LABELS[id], b.stats[id] - a.stats[id]);
  num('평판', b.reputation - a.reputation);
  num('번아웃', b.burnout - a.burnout, true);
  num('연봉', b.salary - a.salary, false, '만원');
  num('자산', b.assets - a.assets, false, '만원');
  for (const card of b.deck) if (!a.deck.includes(card)) out.push({ label: c.cards[card].name, value: '획득', good: true });
  if (a.companyId !== b.companyId) out.push({ label: '회사', value: c.companies[b.companyId].name, good: true });
  return out;
}
