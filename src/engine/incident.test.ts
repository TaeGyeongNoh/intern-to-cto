import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { actionChance, mttrMinutes, optionAvailable, pickIncidents } from './incident';
import { createRng } from './rng';
import { makeState } from './testing';

const action = { label: 'a', baseChance: 0.3, perClue: 0.2, effects: {}, failEffects: {} };

describe('actionChance', () => {
  it('단서가 많을수록, 디버깅이 높을수록 오른다', () => {
    expect(actionChance(action, 0, 50)).toBeCloseTo(0.3);
    expect(actionChance(action, 2, 50)).toBeCloseTo(0.7);
    expect(actionChance(action, 0, 70)).toBeCloseTo(0.4);
  });
  it('0.05~0.95로 자른다', () => {
    expect(actionChance(action, 10, 99)).toBe(0.95);
    expect(actionChance({ ...action, baseChance: -1 }, 0, 1)).toBe(0.05);
  });
});

describe('mttrMinutes', () => {
  it('성공은 단서가 많을수록 짧고, 실패는 360분 이상', () => {
    const r = createRng(1);
    for (let i = 0; i < 100; i++) {
      expect(mttrMinutes(true, 3, r)).toBeLessThanOrEqual(80);
      expect(mttrMinutes(true, 0, r)).toBeGreaterThanOrEqual(220);
      expect(mttrMinutes(false, 3, r)).toBeGreaterThanOrEqual(360);
    }
  });
});

describe('optionAvailable', () => {
  it('grep은 항상 가능, 나머지는 카드 필요', () => {
    expect(optionAvailable({ label: 'g', view: 'grep', correct: false }, [], CONTENT)).toBe(true);
    expect(optionAvailable({ label: 'h', view: 'hitmap', correct: true }, [], CONTENT)).toBe(false);
    expect(optionAvailable({ label: 'h', view: 'hitmap', correct: true }, ['apm'], CONTENT)).toBe(true);
  });
});

describe('pickIncidents', () => {
  it('조건에 맞는 장애만, 중복 없이, 최대 2건 + 재발', () => {
    const s = makeState({ route: 'finance', recur: ['db-lock'] });
    for (let seed = 1; seed < 100; seed++) {
      const ids = pickIncidents(s, createRng(seed), CONTENT);
      expect(ids[0]).toBe('db-lock');
      const rest = ids.slice(1);
      expect(rest.length).toBeLessThanOrEqual(2);
      expect(new Set(rest).size).toBe(rest.length);
      for (const id of rest) expect(['payment-latency', 'oom-kill', 'slow-query']).toContain(id);
    }
  });
});

describe('pickIncidents 재발', () => {
  it('현재 조건에 맞지 않는 재발 장애는 버린다', () => {
    const s = makeState({ route: 'finance', recur: ['token-bomb'] });
    for (let seed = 1; seed < 100; seed++) expect(pickIncidents(s, createRng(seed), CONTENT)).not.toContain('token-bomb');
  });
});

describe('장애 콘텐츠', () => {
  it('9종이 있고 모든 단계에 정답과 grep 선택지가 있다', () => {
    const list = Object.values(CONTENT.incidents);
    expect(list).toHaveLength(9);
    for (const inc of list)
      for (const st of inc.steps) {
        expect(st.options.some((o) => o.correct)).toBe(true);
        expect(st.options.some((o) => o.view === 'grep')).toBe(true);
      }
  });
});

describe('장애 구조', () => {
  it('모든 장애는 3단계, 행동 2개, 첫 행동은 단서형(0.25 + 0.22/단서), AI 힌트가 있다', () => {
    for (const inc of Object.values(CONTENT.incidents)) {
      expect(inc.steps, inc.id).toHaveLength(3);
      expect(inc.actions, inc.id).toHaveLength(2);
      expect(inc.actions[0].baseChance, inc.id).toBe(0.25);
      expect(inc.actions[0].perClue, inc.id).toBe(0.22);
      expect(inc.aiHint, inc.id).toBeTruthy();
    }
  });
});
