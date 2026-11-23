import { describe, expect, it } from 'vitest';
import { applyEffects } from './effects';
import { makeState } from './testing';

describe('applyEffects', () => {
  const s = makeState({ reputation: 98, burnout: 5, deck: [], cardsSeen: [] });

  it('평판과 번아웃은 0~100으로 자른다', () => {
    const r = applyEffects(s, { reputation: 10, burnout: -20 });
    expect(r.reputation).toBe(100);
    expect(r.burnout).toBe(0);
  });
  it('능력치는 1~99', () => {
    expect(applyEffects(s, { stats: { impl: 500 } }).stats.impl).toBe(99);
  });
  it('플래그 중복 없음, removeFlags 동작', () => {
    const r = applyEffects(applyEffects(s, { flags: ['a', 'a'] }), { flags: ['a', 'b'], removeFlags: ['a'] });
    expect(r.flags).toEqual(['b']);
  });
  it('카드는 덱과 경험 목록에 추가', () => {
    const r = applyEffects(s, { addCards: ['apm', 'apm'] });
    expect(r.deck).toEqual(['apm']);
    expect(r.cardsSeen).toEqual(['apm']);
  });
  it('next는 현재 회사로 예약', () => {
    expect(applyEffects(s, { next: 'e2' }).scheduled).toEqual([{ id: 'e2', companyId: s.companyId }]);
  });
  it('story는 연도와 함께 기록, retire와 track 반영', () => {
    const r = applyEffects(s, { story: '사건', retire: true, track: 'mgmt' });
    expect(r.record.story.at(-1)).toBe(`${s.year}년 · 사건`);
    expect(r.retired).toBe(true);
    expect(r.track).toBe('mgmt');
  });
  it('성향은 누적', () => {
    expect(applyEffects(applyEffects(s, { traits: { k: 1 } }), { traits: { k: 2 } }).traits.k).toBe(3);
  });
  it('bound는 지금 연차 + n과 기존 묶임 중 큰 값', () => {
    expect(makeState().boundUntil).toBe(0);
    expect(applyEffects(makeState({ yearsInCareer: 0 }), { bound: 3 }).boundUntil).toBe(3);
    expect(applyEffects(makeState({ yearsInCareer: 2, boundUntil: 3 }), { bound: 2 }).boundUntil).toBe(4);
    expect(applyEffects(makeState({ yearsInCareer: 0, boundUntil: 5 }), { bound: 3 }).boundUntil).toBe(5);
    expect(applyEffects(makeState({ boundUntil: 3 }), {}).boundUntil).toBe(3);
  });
  it('원본을 변경하지 않는다', () => {
    applyEffects(s, { flags: ['z'], addCards: ['db'] });
    expect(s.flags).toEqual([]);
    expect(s.deck).toEqual([]);
  });
});
