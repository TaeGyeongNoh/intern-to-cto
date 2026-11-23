import { applyEffects } from './effects';
import { withJosa, type Particle } from './josa';
import type { Rng } from './rng';
import type { Company, Content, GameState, GrowthStage } from './types';

/** 협상에서 포기한 인상분 × 이 배수만큼 스톡옵션 가치가 쌓인다 */
export const STOCK_GRANT_MULT = 4;
/** 상장 때 스톡옵션 가치 × 이 배수를 자산으로 받는다 */
export const IPO_MULT = 3;

const CLOSE_TEXT = '{company}이/가 문을 닫는다. 마지막 공지는 "그동안 감사했습니다" 한 줄. 서버는 다음 달까지 켜 둔다.';

/** `{company}` 자리표시자를 회사 이름으로 (바로 뒤 조사 표기는 받침에 맞춘다) */
export function fillCompany(text: string, name: string): string {
  return text.replace(/\{company\}(이\/가|을\/를|은\/는|와\/과|\(으\)로)?/g, (_, p?: Particle) => (p ? withJosa(name, p) : name));
}

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

/** 스톡옵션을 받을 수 있는 회사·단계인가 (상장 단계가 있고, 아직 상장·폐업 전) */
export function stockEligible(s: GameState, c: Content): boolean {
  const stages = c.companies[s.companyId].stages;
  if (!stages?.at(-1)?.ipo || isClosed(s, s.companyId)) return false;
  return stageIndex(s, s.companyId) < stages.length - 1;
}

/**
 * 연말 회사 성장 판정 (지금 다니는 회사만). 오르면 카드가 생기고, 상장하면 스톡옵션을 행사하고,
 * 폐업하면 closed가 되어 그 해 이직이 강제된다.
 */
export function growCompany(s: GameState, rng: Rng, c: Content): { state: GameState; feed: string[]; closed: boolean } {
  const id = s.companyId;
  const co = c.companies[id];
  const stages = co.stages;
  const k = s.companyStage[id] ?? 0;
  if (!stages || k === 'closed' || k >= stages.length - 1 || s.yearsInCareer < 1 || s.flags.includes('founder'))
    return { state: s, feed: [], closed: false };
  const { up, down } = stages[k];
  const roll = rng.weighted<'up' | 'down' | 'stay'>([
    { item: 'up', weight: up },
    { item: 'down', weight: down },
    { item: 'stay', weight: 1 - up - down },
  ]);
  if (roll === 'stay') return { state: s, feed: [], closed: false };
  const line = (text: string) => `${s.year}년 · ${text}`;
  if (roll === 'down') {
    const text = fillCompany(CLOSE_TEXT, co.name);
    const state: GameState = {
      ...s,
      companyStage: { ...s.companyStage, [id]: 'closed' },
      stock: undefined,
      record: { ...s.record, story: [...s.record.story, line(text)] },
    };
    return { state, feed: [text], closed: true };
  }
  const stage = stages[k + 1];
  const text = fillCompany(stage.text, co.name);
  const feed = [text];
  let state = applyEffects({ ...s, companyStage: { ...s.companyStage, [id]: k + 1 } }, { addCards: stage.addCards, story: text });
  if (stage.ipo && state.stock?.companyId === id) {
    const payout = state.stock.value * IPO_MULT;
    const paid = `스톡옵션 ${payout.toLocaleString('ko-KR')}만원을 행사했다. 종이가 진짜 돈이 됐다.`;
    feed.push(paid);
    state = { ...state, assets: state.assets + payout, stock: undefined, record: { ...state.record, story: [...state.record.story, line(paid)] } };
  }
  return { state, feed, closed: false };
}
