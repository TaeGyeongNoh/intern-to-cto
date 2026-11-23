import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { apply, NEGOTIATE_CHOICES, NEGOTIATE_MIN_YEARS_AT_COMPANY, newGame, pending, replay, validInputs, type Game, type Setup } from './game';
import { STOCK_GRANT_MULT } from './company';
import { marketSalary, NEGOTIATE_BONUS, NEGOTIATE_CAP, NEGOTIATE_FAIL_RAISE, negotiateChance, RAISE_BY_RATING } from './salary';
import { createRng } from './rng';
import { FAST_MTTR } from './incident';
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
  it('복구하면서 MTTR이 FAST_MTTR분 이하일 때만 fastResolves가 +1', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 200; seed++) {
      const clues = seed % 4;
      const g: Game = { ...base(['apm']), rngState: seed, queue: [{ kind: 'incident-action', incidentId: 'payment-latency', clues }, { kind: 'review' }] };
      const r = apply(g, { t: 'pick', i: 0 }, CONTENT);
      const ok = r.state.record.incidentsResolved === 1;
      const mttr = r.state.record.mttrTotalMin - g.state.record.mttrTotalMin;
      const fast = ok && mttr <= FAST_MTTR;
      expect(r.state.record.fastResolves, `seed ${seed}`).toBe(g.state.record.fastResolves + (fast ? 1 : 0));
      seen.add(ok ? (fast ? 'fast' : 'slow') : 'fail');
    }
    expect(seen).toEqual(new Set(['fast', 'slow', 'fail']));
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
  it('이벤트 결과로 은퇴해도 그 해 평가 기록이 남는다', () => {
    const quit: GameEvent = { id: 'quit', when: {}, scheduledOnly: true, text: 'q', choices: [{ label: '떠난다', effects: { retire: true, story: '떠났다.' } }] };
    const c: Content = { ...CONTENT, events: { ...CONTENT.events, quit } };
    const state = makeState();
    const g: Game = { setup, seed: 1, rngState: 1, state, queue: [{ kind: 'event', eventId: 'quit' }, { kind: 'review' }], log: [], feed: [] };
    const out = apply(g, { t: 'pick', i: 0 }, c);
    expect(out.state.retired).toBe(true);
    expect(pending(out).kind).toBe('ended');
    expect(out.state.endingId).toBeDefined();
    expect(out.state.record.history.length).toBe(state.record.history.length + 1);
  });
});

describe('상점', () => {
  const atReview = (assets: number): Game => {
    const state = makeState({ assets });
    return { setup, seed: 1, rngState: 1, state, queue: [{ kind: 'event', eventId: 'x' }, { kind: 'review' }], log: [], feed: [] };
  };
  const evX: GameEvent = { id: 'x', when: {}, scheduledOnly: true, text: 'x', choices: [{ label: 'x', effects: {} }] };
  const c: Content = { ...CONTENT, events: { ...CONTENT.events, x: evX } };
  /** 별점이 높아 협상이 열렸으면 제시안에 사인하고 넘어간다 */
  const pastNegotiation = (g: Game) => (pending(g).kind === 'negotiate' ? apply(g, { t: 'pick', i: 0 }, c) : g);

  it('연말 평가 뒤, 살 수 있는 물건이 있으면 상점이 열린다 (이직 제안보다 먼저)', () => {
    const g = pastNegotiation(apply(atReview(100_000), { t: 'pick', i: 0 }, c));
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
    const g = pastNegotiation(apply(atReview(100_000), { t: 'pick', i: 0 }, c));
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
  it('공개: 번아웃 +2, 복구했으면 평판 +2', () => {
    const g = apply(pm(true), { t: 'pick', i: 0 }, CONTENT);
    expect(g.state.reputation).toBe(42);
    expect(g.state.burnout).toBe(12);
    expect(g.state.traits['문화']).toBe(1);
  });
  it('공개: 복구 실패면 평판은 그대로, 번아웃 +2', () => {
    const g = apply(pm(false), { t: 'pick', i: 0 }, CONTENT);
    expect(g.state.reputation).toBe(40);
    expect(g.state.burnout).toBe(12);
  });
  it('남 탓은 평판 -4', () => {
    expect(apply(pm(true), { t: 'pick', i: 2 }, CONTENT).state.reputation).toBe(36);
  });
});

describe('회사 성장 · 폐업', () => {
  const grow = (up: number, down: number): Content => {
    const base = CONTENT.companies['tiny-commerce'];
    const evX: GameEvent = { id: 'x', when: {}, scheduledOnly: true, text: 'x', choices: [{ label: 'x', effects: {} }] };
    return {
      ...CONTENT,
      events: { ...CONTENT.events, x: evX },
      companies: {
        ...CONTENT.companies,
        'tiny-commerce': {
          ...base,
          stages: [
            { name: '시드', level: base.level, baseSalary: base.baseSalary, up, down, text: '' },
            { name: '시리즈 A', level: base.level + 5, baseSalary: base.baseSalary + 400, addCards: ['log'], up: 0, down: 0, text: '{company}이/가 시리즈 A 투자를 받았다.' },
          ],
        },
      },
    };
  };
  const atReview = (_c: Content): Game => ({
    setup, seed: 1, rngState: 1,
    state: makeState({ companyId: 'tiny-commerce', companiesWorked: ['tiny-commerce'], yearsInCareer: 2, deck: [], cardsSeen: [], burnout: 0, age: 30 }),
    queue: [{ kind: 'event', eventId: 'x' }, { kind: 'review' }], log: [], feed: [],
  });

  it('연말 평가 뒤 다니는 회사가 다음 단계로 오르면 카드가 생기고 feed에 남는다', () => {
    const c = grow(1, 0);
    const g = apply(atReview(c), { t: 'pick', i: 0 }, c);
    expect(g.state.companyStage['tiny-commerce']).toBe(1);
    expect(g.state.deck).toContain('log');
    expect(g.feed).toContain('오늘의떡집이 시리즈 A 투자를 받았다.');
  });
  it('폐업하면 강제 이직: 남는다가 없고, 제안이 최소 1건이다', () => {
    const c = grow(0, 1);
    for (let seed = 1; seed < 40; seed++) {
      const g = apply({ ...atReview(c), rngState: seed }, { t: 'pick', i: 0 }, c);
      expect(g.state.companyStage['tiny-commerce']).toBe('closed');
      const offersAt = g.queue.findIndex((p) => p.kind === 'offers');
      expect(offersAt).toBeGreaterThanOrEqual(0);
      let h = g;
      while (pending(h).kind !== 'offers') h = apply(h, validInputs(h, c).at(-1)!, c);
      const p = pending(h);
      if (p.kind !== 'offers') throw new Error('expected offers');
      expect(p.forced).toBe(true);
      expect(p.offers.length).toBeGreaterThanOrEqual(1);
      expect(validInputs(h, c)).toHaveLength(p.offers.length);
      expect(() => apply(h, { t: 'pick', i: p.offers.length }, c)).toThrow();
      const moved = apply(h, { t: 'pick', i: 0 }, c);
      expect(moved.state.companyId).not.toBe('tiny-commerce');
    }
  });
});

describe('연봉 협상', () => {
  const evX: GameEvent = { id: 'x', when: {}, scheduledOnly: true, text: 'x', choices: [{ label: 'x', effects: {} }] };
  const cx: Content = { ...CONTENT, events: { ...CONTENT.events, x: evX } };
  const atReview = (over: Partial<Game['state']> = {}): Game => ({
    setup, seed: 1, rngState: 1,
    state: makeState({ yearsInCareer: 2, yearsAtCompany: 2, age: 30, ...over }),
    queue: [{ kind: 'event', eventId: 'x' }, { kind: 'review' }], log: [], feed: [],
  });

  it('입사 첫해 연말에는 협상이 없다 (입사 때 이미 연봉을 정했다)', () => {
    const kinds = (g: Game) => g.queue.map((p) => p.kind);
    expect(kinds(apply(atReview({ yearScore: 50, yearsAtCompany: 1 }), { t: 'pick', i: 0 }, cx))).not.toContain('negotiate');
    expect(kinds(apply(atReview({ yearScore: 50, yearsAtCompany: NEGOTIATE_MIN_YEARS_AT_COMPANY }), { t: 'pick', i: 0 }, cx))).toContain('negotiate');
  });
  it('별점 4 이상이면 상점보다 먼저 협상이 열린다', () => {
    const g = apply(atReview({ yearScore: 50 }), { t: 'pick', i: 0 }, cx);
    const p = pending(g);
    expect(p.kind).toBe('negotiate');
    if (p.kind !== 'negotiate') return;
    expect(p.rating).toBe(5);
    expect(p.prev).toBe(makeState().salary);
    expect(p.base).toBe(g.state.salary);
    expect(validInputs(g, cx)).toEqual([{ t: 'pick', i: 0 }, { t: 'pick', i: 1 }]);
  });
  it('별점 3 이하, founder, 은퇴면 열리지 않는다', () => {
    const kinds = (g: Game) => g.queue.map((p) => p.kind);
    expect(kinds(apply(atReview({ yearScore: -50 }), { t: 'pick', i: 0 }, cx))).not.toContain('negotiate');
    expect(kinds(apply(atReview({ yearScore: 50, flags: ['founder'] }), { t: 'pick', i: 0 }, cx))).not.toContain('negotiate');
    expect(kinds(apply(atReview({ yearScore: 50, age: RETIRE_AGE }), { t: 'pick', i: 0 }, cx))).not.toContain('negotiate');
  });

  const negotiating = (over: Partial<Game['state']> = {}, prev = 5000, base = 5250, rating = 4): Game => {
    const state = makeState({ salary: base, maxSalary: base, reputation: 30, ...over });
    const row = { year: state.year, age: state.age, companyId: state.companyId, title: state.title, rating, ovr: 50, salary: base };
    return {
      setup, seed: 1, rngState: 1,
      state: { ...state, record: { ...state.record, history: [row] } },
      queue: [{ kind: 'negotiate', rating, base, prev, prevMax: prev }, { kind: 'year' }], log: [], feed: [],
    };
  };
  it('사인하면 제시안 그대로', () => {
    const g = apply(negotiating(), { t: 'pick', i: 0 }, CONTENT);
    expect(g.state.salary).toBe(5250);
    expect(g.outcome?.title).toBe(NEGOTIATE_CHOICES[0]);
    expect(pending(g).kind).not.toBe('negotiate');
  });
  it('더 달라고 하면: 성공은 prev × (1 + 인상률 + 보너스, 상한), 실패는 별점 2 수준 인상. 히스토리·최고연봉도 고친다', () => {
    const seen = new Set<boolean>();
    for (let seed = 1; seed < 80; seed++) {
      const g = apply({ ...negotiating(), rngState: seed }, { t: 'pick', i: 1 }, CONTENT);
      const ok = g.outcome!.ok!;
      seen.add(ok);
      const market = marketSalary(g.state, CONTENT.companies[g.state.companyId]);
      const win = Math.min(Math.round(5000 * (1 + RAISE_BY_RATING[4] + NEGOTIATE_BONUS)), Math.round(market * NEGOTIATE_CAP));
      expect(g.state.salary).toBe(ok ? Math.max(5250, win) : Math.round(5000 * (1 + NEGOTIATE_FAIL_RAISE)));
      expect(g.state.record.history.at(-1)!.salary).toBe(g.state.salary);
      expect(g.state.maxSalary).toBe(Math.max(5000, g.state.salary));
      expect(g.outcome!.deltas.some((d) => d.label === '연봉')).toBe(g.state.salary !== 5250);
    }
    expect(seen).toEqual(new Set([true, false]));
  });
  it('실패해도 제시안보다 많이 받지는 않는다 (상한에 걸려 동결된 해)', () => {
    const g = apply({ ...negotiating({}, 5000, 5000), rngState: 3 }, { t: 'pick', i: 1 }, CONTENT);
    if (!g.outcome!.ok) expect(g.state.salary).toBe(5000);
  });
  it('협상 확률은 별점과 평판에 따라 0.1~0.85', () => {
    expect(negotiateChance(makeState({ reputation: 30 }), 4)).toBeCloseTo(0.5);
    expect(negotiateChance(makeState({ reputation: 100 }), 5)).toBe(0.85);
    expect(negotiateChance(makeState({ reputation: 0 }), 4)).toBeCloseTo(0.35);
  });
  it('스톡옵션은 상장할 수 있는 단계 회사에서만, 연봉 동결 + 포기한 인상분 × 배수', () => {
    const c: Content = {
      ...CONTENT,
      companies: {
        ...CONTENT.companies,
        dangeun: {
          ...CONTENT.companies.dangeun,
          stages: [
            { name: '시드', level: 44, baseSalary: 3800, up: 0.1, down: 0.1, text: '' },
            { name: '상장', level: 50, baseSalary: 4400, up: 0, down: 0, text: '', ipo: true },
          ],
        },
      },
    };
    expect(validInputs(negotiating(), CONTENT)).toHaveLength(2);
    expect(validInputs(negotiating(), c)).toHaveLength(3);
    expect(validInputs(negotiating({ companyStage: { dangeun: 1 } }), c)).toHaveLength(2);
    expect(validInputs(negotiating({}, 5000, 5000), c)).toHaveLength(2);
    const g = apply(negotiating({ stock: { companyId: 'dangeun', value: 100 } }), { t: 'pick', i: 2 }, c);
    expect(g.state.salary).toBe(5000);
    expect(g.state.maxSalary).toBe(5000);
    expect(g.state.record.history.at(-1)!.salary).toBe(5000);
    expect(g.state.stock).toEqual({ companyId: 'dangeun', value: 100 + 250 * STOCK_GRANT_MULT });
    expect(g.outcome!.deltas).toContainEqual({ label: '스톡옵션', value: `+${(250 * STOCK_GRANT_MULT).toLocaleString('ko-KR')}만원`, good: true });
  });
  it('같은 시드·로그면 같은 협상 결과 (입력 상태 불변)', () => {
    const g = negotiating();
    const frozen = Object.freeze({ ...g, state: Object.freeze(g.state) });
    expect(apply(frozen, { t: 'pick', i: 1 }, CONTENT)).toEqual(apply(g, { t: 'pick', i: 1 }, CONTENT));
  });
});

describe('창업 회사', () => {
  const founderContent = (up: number, down: number): Content => {
    const go: GameEvent = {
      id: 'go', when: {}, scheduledOnly: true, text: 'go',
      choices: [{ label: '창업한다', effects: { flags: ['founder'], company: 'founder-{route}', burnout: 10 } }],
    };
    return {
      ...CONTENT,
      events: { ...CONTENT.events, go },
      companies: {
        ...CONTENT.companies,
        'founder-commerce': {
          id: 'founder-commerce', name: '장바구니랩', route: 'commerce', tier: 'startup', level: 40, baseSalary: 2600, cards: [], hidden: true, founder: true,
          stages: [
            { name: '창업', level: 40, baseSalary: 2600, up, down, text: '', closeEffects: { removeFlags: ['founder'], flags: ['founder-failed'], reputation: 1 } },
            { name: '엑싯', level: 55, baseSalary: 4300, up: 0, down: 0, text: '{company}이/가 인수됐다.', effects: { flags: ['exit'], retire: true } },
          ],
        },
      },
    };
  };
  const atFounding = (seed = 1): Game => ({
    setup, seed: 1, rngState: seed,
    state: makeState({ yearsInCareer: 9, age: 33, salary: 7000, maxSalary: 7500, burnout: 0, reputation: 40 }),
    queue: [{ kind: 'event', eventId: 'go' }, { kind: 'review' }], log: [], feed: [],
  });

  it('창업하면 창업 회사로 옮기고 연봉은 그 회사 기본값, 최고연봉은 그대로', () => {
    const c = founderContent(0, 0);
    const g = apply(atFounding(), { t: 'pick', i: 0 }, c);
    expect(g.state.companyId).toBe('founder-commerce');
    expect(g.state.flags).toContain('founder');
    expect(g.state.maxSalary).toBe(7500);
    expect(g.state.record.history.at(-1)?.salary).toBeLessThan(4000);
  });
  it('창업 회사가 폐업한 해에는 강제 이직 제안이 1건 이상 나온다', () => {
    const c = founderContent(0, 1);
    for (let seed = 1; seed < 30; seed++) {
      let g = apply(atFounding(seed), { t: 'pick', i: 0 }, c);
      expect(g.state.companyStage['founder-commerce']).toBe('closed');
      expect(g.state.flags).toContain('founder-failed');
      while (pending(g).kind !== 'offers') g = apply(g, validInputs(g, c).at(-1)!, c);
      const p = pending(g);
      if (p.kind !== 'offers') throw new Error('expected offers');
      expect(p.forced).toBe(true);
      expect(p.offers.length).toBeGreaterThanOrEqual(1);
    }
  });
  it('엑싯한 해에는 상점·제안 없이 바로 founder-exit 엔딩', () => {
    const c = founderContent(1, 0);
    const g = apply(atFounding(), { t: 'pick', i: 0 }, c);
    expect(g.queue).toEqual([{ kind: 'ended' }]);
    expect(g.state.endingId).toBe('founder-exit');
  });
  it('같은 입력이면 같은 결과 (결정론)', () => {
    const c = founderContent(0.3, 0.3);
    expect(apply(atFounding(5), { t: 'pick', i: 0 }, c)).toEqual(apply(atFounding(5), { t: 'pick', i: 0 }, c));
  });
});
