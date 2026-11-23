import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { apply, type Game, type Setup } from './game';
import { diffState } from './outcome';
import { makeState } from './testing';

const setup: Setup = { name: '테스트', position: 'backend', route: 'commerce', candidate: 0 };
const game = (over: Partial<Game>): Game => ({ setup, seed: 1, rngState: 1, state: makeState(), queue: [{ kind: 'year' }], log: [], feed: [], ...over });

describe('diffState', () => {
  it('바뀐 값만 부호와 함께, 번아웃은 줄어야 좋다', () => {
    const a = makeState({ reputation: 40, burnout: 20, salary: 4000, assets: 1000 });
    const b = { ...a, stats: { ...a.stats, debug: a.stats.debug + 2 }, reputation: 37, burnout: 15, salary: 5000, assets: 1000 };
    expect(diffState(a, b, CONTENT)).toEqual([
      { label: '디버깅', value: '+2', good: true },
      { label: '평판', value: '−3', good: false },
      { label: '번아웃', value: '−5', good: true },
      { label: '연봉', value: '+1,000만원', good: true },
    ]);
  });
  it('새 카드와 회사 변경', () => {
    const a = makeState({ deck: [] });
    const b = { ...a, deck: ['apm' as const], companyId: 'musinsarang' };
    expect(diffState(a, b, CONTENT)).toEqual([
      { label: CONTENT.cards.apm.name, value: '획득', good: true },
      { label: '회사', value: CONTENT.companies.musinsarang.name, good: true },
    ]);
  });
});

describe('Game.outcome', () => {
  it('포스트모템: 연말 평가 변화는 섞지 않는다', () => {
    const g = apply(game({ state: makeState({ reputation: 40 }), queue: [{ kind: 'postmortem', incidentId: 'payment-latency', resolved: true }, { kind: 'review' }] }), { t: 'pick', i: 0 }, CONTENT);
    expect(g.outcome?.title).toBe('포스트모템을 공개한다');
    expect(g.outcome?.deltas).toContainEqual({ label: '평판', value: '+2', good: true });
    expect(g.outcome?.deltas).toContainEqual({ label: '번아웃', value: '+2', good: false });
  });
  it('장애 조치: ok와 MTTR', () => {
    const g = apply(game({ state: makeState({ deck: ['apm'] }), queue: [{ kind: 'incident-action', incidentId: 'payment-latency', clues: 3 }, { kind: 'year' }] }), { t: 'pick', i: 0 }, CONTENT);
    expect(g.outcome?.title).toBe(CONTENT.incidents['payment-latency'].actions[0].label);
    expect(typeof g.outcome?.ok).toBe('boolean');
    expect(g.outcome?.detail).toMatch(/^MTTR \d+분$/);
  });
  it('이벤트: 선택지 라벨이 제목', () => {
    const g = apply(game({ state: makeState({ deck: ['ai-agent-obs'], scheduled: [{ id: 'ai-chatbot-2', companyId: 'dangeun' }] }), queue: [{ kind: 'event', eventId: 'ai-chatbot-2' }, { kind: 'year' }] }), { t: 'pick', i: 0 }, CONTENT);
    expect(g.outcome?.title).toBe(CONTENT.events['ai-chatbot-2'].choices[0].label);
  });
  it('상점: 구매는 outcome, 건너뛰기는 없음', () => {
    const base = game({ state: makeState({ assets: 100 }), queue: [{ kind: 'shop', items: ['keyboard'] }, { kind: 'year' }] });
    const bought = apply(base, { t: 'pick', i: 0 }, CONTENT);
    expect(bought.outcome?.title).toBe(CONTENT.shop.keyboard.name);
    expect(bought.outcome?.deltas).toContainEqual({ label: '자산', value: '−30만원', good: false });
    expect(apply(base, { t: 'pick', i: 1 }, CONTENT).outcome).toBeUndefined();
  });
  it('해 넘기기는 outcome 없음', () => {
    expect(apply(game({}), { t: 'pick', i: 0 }, CONTENT).outcome).toBeUndefined();
  });
});
