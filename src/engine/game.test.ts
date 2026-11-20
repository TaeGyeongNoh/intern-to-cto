import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { apply, newGame, pending, replay, validInputs, type Game, type Setup } from './game';
import { createRng } from './rng';
import { RETIRE_AGE } from './season';
import { makeState } from './testing';

const setup: Setup = { name: '테스트', position: 'backend', route: 'commerce', candidate: 0 };

function playRandom(seed: number, s: Setup = setup): Game {
  let g = newGame(s, seed, CONTENT);
  const r = createRng(seed + 999);
  for (let guard = 0; pending(g).kind !== 'ended'; guard++) {
    if (guard > 3000) throw new Error('game did not end');
    g = apply(g, r.pick(validInputs(g, CONTENT)), CONTENT);
  }
  return g;
}

describe('newGame', () => {
  it('첫 입력은 해 넘기기', () => {
    const g = newGame(setup, 1, CONTENT);
    expect(pending(g)).toEqual({ kind: 'year' });
    const g2 = apply(g, { t: 'pick', i: 0 }, CONTENT);
    expect(g2.state.year).toBe(2026);
    expect(g2.state.age).toBe(23);
    expect(g2.feed.length).toBeGreaterThan(0);
  });
  it('유효하지 않은 입력은 거부', () => {
    const g = newGame(setup, 1, CONTENT);
    expect(() => apply(g, { t: 'pick', i: 3 }, CONTENT)).toThrow();
    expect(() => apply(g, { t: 'ask' }, CONTENT)).toThrow();
  });
});

describe('전체 플레이', () => {
  it('모든 루트·포지션에서 랜덤 플레이가 은퇴로 끝난다', () => {
    const positions = ['backend', 'frontend', 'sre', 'ai'] as const;
    const routes = ['commerce', 'finance', 'ai-startup'] as const;
    let seed = 1;
    for (const position of positions)
      for (const route of routes) {
        const g = playRandom(seed++, { ...setup, position, route });
        expect(g.state.retired).toBe(true);
        expect(g.state.endingId).toBeDefined();
        expect(g.state.age).toBeLessThanOrEqual(RETIRE_AGE);
      }
  });
  it('replay는 같은 상태를 만든다', () => {
    const g = playRandom(5);
    expect(replay(setup, 5, g.log, CONTENT)).toEqual(g);
  });
});

describe('장애 흐름', () => {
  const base = (deck: Game['state']['deck']): Game => ({
    setup, seed: 1, rngState: 1,
    state: makeState({ deck }),
    queue: [{ kind: 'incident-step', incidentId: 'payment-latency', step: 0, clues: 0, hintUsed: false }, { kind: 'review' }],
    log: [], feed: [],
  });

  it('카드가 없으면 그 뷰는 고를 수 없다', () => {
    expect(() => apply(base([]), { t: 'pick', i: 0 }, CONTENT)).toThrow();
    expect(validInputs(base([]), CONTENT)).toEqual([{ t: 'pick', i: 2 }]);
  });
  it('정답 뷰를 고르면 단서가 쌓이고 다음 단계로', () => {
    const g = apply(base(['apm']), { t: 'pick', i: 0 }, CONTENT);
    expect(pending(g)).toMatchObject({ kind: 'incident-step', step: 1, clues: 1 });
  });
  it('와탭 AI가 있으면 한 번 물어볼 수 있다', () => {
    const g = base(['apm', 'whatap-ai']);
    expect(validInputs(g, CONTENT)).toContainEqual({ t: 'ask' });
    const g2 = apply(g, { t: 'ask' }, CONTENT);
    expect(g2.feed[0]).toContain('와탭 AI');
    expect(validInputs(g2, CONTENT)).not.toContainEqual({ t: 'ask' });
  });
  it('와탭 AI 힌트: 정답 뷰가 잠겨 있으면 카드가 없다고 알려준다', () => {
    const g2 = apply(base(['whatap-ai']), { t: 'ask' }, CONTENT);
    const correct = CONTENT.incidents['payment-latency'].steps[0].options.find((o) => o.correct)!;
    const card = Object.values(CONTENT.cards).find((cd) => cd.views.includes(correct.view))!;
    expect(g2.feed[0]).toContain(`"${correct.label}"인데`);
    expect(g2.feed[0]).toContain(`${card.name} 카드가 없어 열 수 없어요`);
    expect(g2.feed[0]).not.toContain('부터 보세요');
  });
  it('3단계 후 조치 → 포스트모템 → 기록 반영', () => {
    let g = base(['apm']);
    for (let k = 0; k < 3; k++) g = apply(g, { t: 'pick', i: 0 }, CONTENT);
    expect(pending(g)).toMatchObject({ kind: 'incident-action', clues: 3 });
    g = apply(g, { t: 'pick', i: 0 }, CONTENT);
    expect(pending(g).kind).toBe('postmortem');
    expect(g.state.record.incidentsTotal).toBe(1);
    g = apply(g, { t: 'pick', i: 0 }, CONTENT);
    expect(g.state.traits['문화']).toBe(1);
  });
  it('장애 해결은 yearScore +3, 실패는 -5', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed < 60; seed++) {
      const g: Game = { ...base(['apm']), rngState: seed, queue: [{ kind: 'incident-action', incidentId: 'payment-latency', clues: 1 }, { kind: 'review' }] };
      const r = apply(g, { t: 'pick', i: 0 }, CONTENT);
      const ok = r.state.record.incidentsResolved === 1;
      expect(r.state.yearScore).toBe(ok ? 3 : -5);
      seen.add(r.state.yearScore);
    }
    expect(seen).toEqual(new Set([3, -5]));
  });
});

describe('이벤트 흐름', () => {
  const base = (deck: Game['state']['deck']): Game => ({
    setup, seed: 1, rngState: 1,
    state: makeState({ deck, scheduled: [{ id: 'ai-chatbot-2', companyId: 'dangeun' }] }),
    queue: [{ kind: 'event', eventId: 'ai-chatbot-2' }, { kind: 'review' }],
    log: [], feed: [],
  });
  it('requires 카드가 없으면 잠긴 선택지', () => {
    expect(() => apply(base([]), { t: 'pick', i: 0 }, CONTENT)).toThrow();
  });
  it('선택하면 효과가 적용되고 다음 아크가 예약된다', () => {
    const g = apply(base(['ai-agent-obs']), { t: 'pick', i: 0 }, CONTENT);
    expect(g.state.seenEvents).toContain('ai-chatbot-2');
    expect(g.state.scheduled.map((x) => x.id)).toEqual(['ai-chatbot-3a']);
    expect(g.state.traits['관측성전도사']).toBe(1);
  });
});

describe('이벤트로 은퇴', () => {
  it('창업 결과로 은퇴해도 그 해 평가 기록이 남는다', () => {
    const state = makeState({ flags: ['founder'], scheduled: [{ id: 'founder-outcome', companyId: makeState().companyId }] });
    const g: Game = {
      setup, seed: 1, rngState: 1, state,
      queue: [{ kind: 'event', eventId: 'founder-outcome' }, { kind: 'review' }],
      log: [], feed: [],
    };
    // 성공/실패와 무관하게 결과를 강제: 성공하는 시드를 찾는다
    let out: Game | undefined;
    for (let seed = 1; seed < 200 && !out?.state.retired; seed++) out = apply({ ...g, rngState: seed }, { t: 'pick', i: 0 }, CONTENT);
    expect(out!.state.retired).toBe(true);
    expect(pending(out!).kind).toBe('ended');
    expect(out!.state.endingId).toBeDefined();
    expect(out!.state.record.history.length).toBe(state.record.history.length + 1);
  });
});
