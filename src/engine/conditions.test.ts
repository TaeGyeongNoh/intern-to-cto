import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { availableViews, matches } from './conditions';
import { makeState } from './testing';

describe('availableViews', () => {
  it('grep은 항상 열려 있고 카드가 뷰를 연다', () => {
    expect([...availableViews([], CONTENT)]).toEqual(['grep']);
    const v = availableViews(['apm'], CONTENT);
    expect(v.has('hitmap')).toBe(true);
    expect(v.has('trace')).toBe(true);
    expect(v.has('db-locks')).toBe(false);
  });
});

describe('matches', () => {
  const s = makeState({ yearsInCareer: 3, year: 2030, flags: ['a'], deck: ['apm'], traits: { x: 2 } });
  it('빈 조건은 통과', () => expect(matches({}, s)).toBe(true));
  it('루트', () => {
    expect(matches({ route: ['commerce'] }, s)).toBe(true);
    expect(matches({ route: ['finance'] }, s)).toBe(false);
  });
  it('연차와 연도', () => {
    expect(matches({ minCareerYear: 3 }, s)).toBe(true);
    expect(matches({ minCareerYear: 4 }, s)).toBe(false);
    expect(matches({ minCalendarYear: 2031 }, s)).toBe(false);
  });
  it('플래그', () => {
    expect(matches({ flags: ['a'] }, s)).toBe(true);
    expect(matches({ notFlags: ['a'] }, s)).toBe(false);
  });
  it('카드: cards는 모두 보유, missingCards는 하나라도 없으면 통과', () => {
    expect(matches({ cards: ['apm'] }, s)).toBe(true);
    expect(matches({ cards: ['apm', 'db'] }, s)).toBe(false);
    expect(matches({ missingCards: ['apm', 'db'] }, s)).toBe(true);
    expect(matches({ missingCards: ['apm'] }, s)).toBe(false);
  });
  it('능력치와 성향', () => {
    expect(matches({ minStat: { impl: 99 } }, s)).toBe(false);
    expect(matches({ maxStat: { impl: 99 } }, s)).toBe(true);
    expect(matches({ minTrait: { x: 2 } }, s)).toBe(true);
    expect(matches({ minTrait: { y: 1 } }, s)).toBe(false);
  });
});
