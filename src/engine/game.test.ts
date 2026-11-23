import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { apply, newGame, pending, replay, validInputs, type Game, type Setup } from './game';
import { createRng } from './rng';
import { RETIRE_AGE } from './season';
import { makeState } from './testing';
import type { Content, GameEvent } from './types';

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

/** 프롤로그(취준·인턴)를 첫 번째 선택지로 끝까지 진행한다 */
function skipPrologue(g: Game): Game {
  let game = g;
  for (let guard = 0; pending(game).kind === 'event'; guard++) {
    if (guard > 10) throw new Error('prologue did not end');
    game = apply(game, validInputs(game, CONTENT)[0], CONTENT);
  }
  return game;
}

describe('newGame', () => {
  it('첫 입력은 프롤로그(취준), 끝나면 해 넘기기', () => {
    const g = newGame(setup, 1, CONTENT);
    expect(pending(g)).toEqual({ kind: 'event', eventId: 'prologue-start' });
    const g1 = skipPrologue(g);
    expect(pending(g1)).toEqual({ kind: 'year' });
    expect(g1.state.year).toBe(2025);
    expect(g1.state.seenEvents[0]).toBe('prologue-start');
    const g2 = apply(g1, { t: 'pick', i: 0 }, CONTENT);
    expect(g2.state.year).toBe(2026);
    expect(g2.state.age).toBe(23);
    expect(g2.feed.length).toBeGreaterThan(0);
    expect(g2.state.record.story.join('\n')).toContain(`${CONTENT.companies[g2.state.companyId].name}에 신입으로 입사했다.`);
  });
  it('프롤로그 이벤트가 없는 콘텐츠면 바로 해 넘기기', () => {
    const { 'prologue-start': _omit, ...events } = CONTENT.events;
    const g = newGame(setup, 1, { ...CONTENT, events });
    expect(pending(g)).toEqual({ kind: 'year' });
    expect(g.state.record.story[0]).toContain('신입으로 입사했다');
  });
  it('유효하지 않은 입력은 거부', () => {
    const g = newGame(setup, 1, CONTENT);
    expect(() => apply(g, { t: 'pick', i: 9 }, CONTENT)).toThrow();
    expect(() => apply(g, { t: 'ask' }, CONTENT)).toThrow();
  });
  it('어떤 프롤로그 선택이든 결국 해 넘기기에 도달한다', () => {
    for (let seed = 1; seed <= 60; seed++) {
      let g = newGame(setup, seed, CONTENT);
      const r = createRng(seed);
      for (let guard = 0; pending(g).kind === 'event'; guard++) {
        if (guard > 10) throw new Error('prologue did not end');
        g = apply(g, r.pick(validInputs(g, CONTENT)), CONTENT);
      }
      expect(pending(g)).toEqual({ kind: 'year' });
      expect(g.state.companiesWorked).toEqual([g.state.companyId]);
      expect(g.state.yearsInCareer).toBe(0);
      const g1 = apply(g, { t: 'pick', i: 0 }, CONTENT);
      expect(g1.state.maxSalary).toBeGreaterThanOrEqual(g1.state.salary);
      expect(g1.state.maxSalary).toBe(Math.max(g.state.salary, g1.state.salary));
    }
  });
});

describe('now · company 효과', () => {
  const ev = (id: string, effects: GameEvent['choices'][number]['effects']): GameEvent => ({ id, when: {}, scheduledOnly: true, text: id, choices: [{ label: id, effects }] });
  const game = (eventId: string, over: Partial<Game['state']> = {}): Game => ({
    setup, seed: 1, rngState: 1, state: makeState(over),
    queue: [{ kind: 'event', eventId }, { kind: 'year' }], log: [], feed: [],
  });

  it('now는 같은 해에 바로 다음 이벤트를 끼워 넣는다', () => {
    const c: Content = { ...CONTENT, events: { a: ev('a', { now: 'b' }), b: ev('b', {}) } };
    const g = apply(game('a'), { t: 'pick', i: 0 }, c);
    expect(g.queue).toEqual([{ kind: 'event', eventId: 'b' }, { kind: 'year' }]);
    expect(g.state.year).toBe(makeState().year);
    expect(g.state.scheduled).toEqual([]);
  });
  it('company는 회사·덱을 바꾸고 이직 대신 주어진 이야기를 남긴다', () => {
    const c: Content = { ...CONTENT, events: { a: ev('a', { company: 'musinsarang', story: '친구 따라 옮겼다.' }) } };
    const g = apply(game('a', { yearsInCareer: 3 }), { t: 'pick', i: 0 }, c);
    expect(g.state.companyId).toBe('musinsarang');
    expect(g.state.deck).toEqual(CONTENT.companies.musinsarang.cards);
    expect(g.state.companiesWorked).toEqual(['dangeun', 'musinsarang']);
    const story = g.state.record.story.join('\n');
    expect(story).toContain('친구 따라 옮겼다.');
    expect(story).not.toContain('이직');
  });
  it('커리어 시작 전 company는 첫 회사를 바꿔치기하고 {route}를 루트로 바꾼다', () => {
    const c: Content = { ...CONTENT, events: { a: ev('a', { company: 'tiny-{route}' }) } };
    const g = apply(game('a'), { t: 'pick', i: 0 }, c);
    const tiny = CONTENT.companies['tiny-commerce'];
    expect(g.state.companyId).toBe(tiny.id);
    expect(g.state.companiesWorked).toEqual([tiny.id]);
    expect(g.state.salary).toBe(tiny.baseSalary);
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
    queue: [{ kind: 'incident-step', incidentId: 'payment-latency', step: 0, clues: 0, hintUsed: false, order: [0, 1, 2] }, { kind: 'review' }],
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
  it('다음 단계에 순열 order가 붙고, ask 후에도 order가 유지된다', () => {
    const g = apply(base(['apm']), { t: 'pick', i: 0 }, CONTENT);
    const p = pending(g);
    if (p.kind !== 'incident-step') throw new Error('expected incident-step');
    expect([...p.order].sort()).toEqual([0, 1, 2]);
    const g2 = apply(base(['whatap-ai']), { t: 'ask' }, CONTENT);
    expect(pending(g2)).toMatchObject({ order: [0, 1, 2] });
  });
  it('해를 넘기면 첫 단계에도 order가 붙는다', () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = apply(skipPrologue(newGame(setup, seed, CONTENT)), { t: 'pick', i: 0 }, CONTENT);
      const p = pending(g);
      if (p.kind === 'incident-step') expect([...p.order].sort()).toEqual([0, 1, 2]);
    }
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

describe('상점', () => {
  const atReview = (assets: number): Game => {
    const state = makeState({ assets });
    return { setup, seed: 1, rngState: 1, state, queue: [{ kind: 'event', eventId: 'x' }, { kind: 'review' }], log: [], feed: [] };
  };
  const evX: GameEvent = { id: 'x', when: {}, scheduledOnly: true, text: 'x', choices: [{ label: 'x', effects: {} }] };
  const c: Content = { ...CONTENT, events: { ...CONTENT.events, x: evX } };

  it('연말 평가 뒤, 살 수 있는 물건이 있으면 상점이 열린다 (이직 제안보다 먼저)', () => {
    const g = apply(atReview(100_000), { t: 'pick', i: 0 }, c);
    const p = pending(g);
    expect(p.kind).toBe('shop');
    if (p.kind !== 'shop') return;
    expect(p.items.length).toBeGreaterThan(0);
    expect(p.items.length).toBeLessThanOrEqual(3);
    expect(validInputs(g, c)).toHaveLength(p.items.length + 1);
  });
  it('아무것도 못 사면 상점은 건너뛴다', () => {
    const g = apply({ ...atReview(0), state: makeState({ assets: 0, salary: 0 }) }, { t: 'pick', i: 0 }, c);
    expect(pending(g).kind).not.toBe('shop');
  });
  it('사면 돈이 빠지고 기록되며, 건너뛰면 그대로다', () => {
    const g = apply(atReview(100_000), { t: 'pick', i: 0 }, c);
    const p = pending(g);
    if (p.kind !== 'shop') throw new Error('expected shop');
    const item = c.shop[p.items[0]];
    const bought = apply(g, { t: 'pick', i: 0 }, c);
    expect(bought.state.purchases).toEqual([item.id]);
    if (!item.gamble) expect(bought.state.assets).toBe(g.state.assets - item.price);
    expect(bought.feed[0]).toContain(item.name);
    const skipped = apply(g, { t: 'pick', i: p.items.length }, c);
    expect(skipped.state.assets).toBe(g.state.assets);
    expect(skipped.state.purchases).toEqual([]);
    expect(pending(skipped).kind).not.toBe('shop');
  });
});

describe('포스트모템 득실', () => {
  const pm = (resolved: boolean): Game => ({
    setup, seed: 1, rngState: 1,
    state: makeState({ reputation: 40, burnout: 10 }),
    queue: [{ kind: 'postmortem', incidentId: 'payment-latency', resolved }, { kind: 'year' }],
    log: [], feed: [],
  });
  it('공개: 번아웃 +3, 복구했으면 평판 +2', () => {
    const g = apply(pm(true), { t: 'pick', i: 0 }, CONTENT);
    expect(g.state.reputation).toBe(42);
    expect(g.state.burnout).toBe(13);
    expect(g.state.traits['문화']).toBe(1);
  });
  it('공개: 복구 실패면 평판은 그대로, 번아웃 +3', () => {
    const g = apply(pm(false), { t: 'pick', i: 0 }, CONTENT);
    expect(g.state.reputation).toBe(40);
    expect(g.state.burnout).toBe(13);
  });
  it('남 탓은 평판 -4', () => {
    expect(apply(pm(true), { t: 'pick', i: 2 }, CONTENT).state.reputation).toBe(36);
  });
});
