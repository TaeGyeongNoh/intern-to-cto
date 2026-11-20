import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { choiceChance, choiceLocked, pickEvent } from './events';
import { createRng } from './rng';
import { makeState } from './testing';
import type { Content, EventChoice, GameEvent } from './types';
import { toRecord } from './util';

const ev = (id: string, extra: Partial<GameEvent> = {}): GameEvent => ({
  id, when: {}, text: id, choices: [{ label: 'ok', effects: {} }], ...extra,
});
const withEvents = (events: GameEvent[]): Content => ({ ...CONTENT, events: toRecord(events) });

describe('choiceLocked', () => {
  const ch: EventChoice = { label: 'x', requires: { card: 'ai-agent-obs', minStat: { debug: 60 } }, effects: {} };
  it('카드나 능력치가 없으면 잠김', () => {
    expect(choiceLocked(ch, makeState({ deck: [] }))).toBe(true);
    const s = makeState({ deck: ['ai-agent-obs'] });
    expect(choiceLocked(ch, { ...s, stats: { ...s.stats, debug: 59 } })).toBe(true);
    expect(choiceLocked(ch, { ...s, stats: { ...s.stats, debug: 60 } })).toBe(false);
  });
});

describe('choiceChance', () => {
  it('chance가 없으면 undefined', () => {
    expect(choiceChance({ label: 'x', effects: {} }, makeState())).toBeUndefined();
  });
  it('능력치와 카드가 확률을 올리고 0.05~0.95로 자른다', () => {
    const s = makeState({ deck: ['apm'] });
    const base = { ...s, stats: { ...s.stats, design: 50 } };
    expect(choiceChance({ label: 'x', chance: { base: 0.4, stat: 'design' }, effects: {} }, base)).toBeCloseTo(0.4);
    expect(choiceChance({ label: 'x', chance: { base: 0.4, card: 'apm' }, effects: {} }, base)).toBeCloseTo(0.65);
    expect(choiceChance({ label: 'x', chance: { base: 2 }, effects: {} }, base)).toBe(0.95);
  });
});

describe('pickEvent', () => {
  it('현재 회사에 예약된 이벤트가 최우선', () => {
    const c = withEvents([ev('a'), ev('b', { scheduledOnly: true })]);
    const s = makeState({ scheduled: [{ id: 'b', companyId: 'dangeun' }] });
    expect(pickEvent(s, createRng(1), c)).toBe('b');
  });
  it('다른 회사에 묶인 예약은 무시', () => {
    const c = withEvents([ev('b', { scheduledOnly: true })]);
    const s = makeState({ scheduled: [{ id: 'b', companyId: 'other' }] });
    for (let seed = 1; seed < 30; seed++) expect(pickEvent(s, createRng(seed), c)).toBeUndefined();
  });
  it('once 이벤트는 한 번만, 조건 불일치는 제외', () => {
    const c = withEvents([ev('seen'), ev('fin', { when: { route: ['finance'] } }), ev('rep', { once: false })]);
    const s = makeState({ seenEvents: ['seen', 'rep'] });
    for (let seed = 1; seed < 50; seed++) {
      const id = pickEvent(s, createRng(seed), c);
      expect(id === undefined || id === 'rep').toBe(true);
    }
  });
});
