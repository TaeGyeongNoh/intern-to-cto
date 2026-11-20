import { determineEnding, generateOffers, joinCompany, moveToCompany, type Offer } from './career';
import { applyEffects } from './effects';
import { choiceChance, choiceLocked, pickEvent } from './events';
import { actionChance, mttrMinutes, optionAvailable, pickIncidents, POSTMORTEM_CHOICES } from './incident';
import { createRng } from './rng';
import { review, runYear } from './season';
import { createInitialState, type Setup } from './state';
import type { Content, GameState } from './types';

export type { Setup } from './state';
export type { Offer } from './career';

export type Pending =
  | { kind: 'year' }
  | { kind: 'event'; eventId: string }
  | { kind: 'incident-step'; incidentId: string; step: number; clues: number; hintUsed: boolean }
  | { kind: 'incident-action'; incidentId: string; clues: number }
  | { kind: 'postmortem'; incidentId: string; resolved: boolean }
  | { kind: 'review' }
  | { kind: 'offers'; offers: Offer[] }
  | { kind: 'ended' };

export type Input = { t: 'pick'; i: number } | { t: 'ask' };

export type Game = {
  setup: Setup;
  seed: number;
  rngState: number;
  state: GameState;
  queue: Pending[];
  log: Input[];
  /** 마지막 apply에서 일어난 일 (UI 표시용) */
  feed: string[];
};

const pick = (i: number): Input => ({ t: 'pick', i });

/** 첫 해 전에 거치는 취준·인턴 프롤로그의 시작 이벤트 (콘텐츠에 있을 때만) */
export const PROLOGUE_START = 'prologue-start';

const openingLine = (s: GameState, c: Content) => `${c.companies[s.companyId].name}에 신입으로 입사했다.`;

export function newGame(setup: Setup, seed: number, c: Content): Game {
  const rng = createRng(seed);
  let state = createInitialState(setup, seed, rng, c);
  const queue: Pending[] = [{ kind: 'year' }];
  if (c.events[PROLOGUE_START]) {
    // 입사 문장은 프롤로그로 첫 회사가 정해진 뒤 첫 해를 넘길 때 남긴다
    state = { ...state, record: { ...state.record, story: [] } };
    queue.unshift({ kind: 'event', eventId: PROLOGUE_START });
  }
  return drain({ setup, seed, rngState: rng.getState(), state, queue, log: [], feed: [] }, c);
}

export function pending(g: Game): Pending {
  return g.queue[0] ?? { kind: 'ended' };
}

export function validInputs(g: Game, c: Content): Input[] {
  const p = pending(g);
  const s = g.state;
  switch (p.kind) {
    case 'year':
      return [pick(0)];
    case 'event':
      return c.events[p.eventId].choices.flatMap((ch, i) => (choiceLocked(ch, s) ? [] : [pick(i)]));
    case 'incident-step': {
      const opts = c.incidents[p.incidentId].steps[p.step].options;
      const r = opts.flatMap((o, i) => (optionAvailable(o, s.deck, c) ? [pick(i)] : []));
      if (s.deck.includes('whatap-ai') && !p.hintUsed) r.push({ t: 'ask' });
      return r;
    }
    case 'incident-action':
      return c.incidents[p.incidentId].actions.map((_, i) => pick(i));
    case 'postmortem':
      return POSTMORTEM_CHOICES.map((_, i) => pick(i));
    case 'offers':
      return Array.from({ length: p.offers.length + 1 }, (_, i) => pick(i));
    default:
      return [];
  }
}

const sameInput = (a: Input, b: Input) => a.t === b.t && (a.t === 'ask' || (b.t === 'pick' && a.i === b.i));
const indexOf = (input: Input): number => {
  if (input.t !== 'pick') throw new Error('expected pick');
  return input.i;
};

export function apply(g: Game, input: Input, c: Content): Game {
  const p = pending(g);
  if (!validInputs(g, c).some((v) => sameInput(v, input))) throw new Error(`invalid input ${JSON.stringify(input)} for ${p.kind}`);

  const rng = createRng(g.rngState);
  let s = g.state;
  const feed: string[] = [];
  let front: Pending[] = [];

  switch (p.kind) {
    case 'year': {
      if (s.yearsInCareer === 0 && !s.record.story.some((line) => line.endsWith(openingLine(s, c)))) {
        // 프롤로그 중 연봉 변화는 경력 전이므로 최고 연봉 기록은 첫 연봉부터 센다
        s = { ...s, maxSalary: s.salary, record: { ...s.record, story: [...s.record.story, `${s.year}년 · ${openingLine(s, c)}`] } };
      }
      const r = runYear(s, rng, c);
      s = r.state;
      feed.push(...r.feed);
      const incidents = pickIncidents(s, rng, c);
      s = { ...s, recur: [] };
      front = incidents.map((id): Pending => ({ kind: 'incident-step', incidentId: id, step: 0, clues: 0, hintUsed: false }));
      const ev = pickEvent(s, rng, c);
      if (ev) front.push({ kind: 'event', eventId: ev });
      front.push({ kind: 'review' });
      break;
    }
    case 'event': {
      const ev = c.events[p.eventId];
      const ch = ev.choices[indexOf(input)];
      const chance = choiceChance(ch, s);
      const ok = chance === undefined ? true : rng.chance(chance);
      s = { ...s, seenEvents: [...s.seenEvents, ev.id], scheduled: s.scheduled.filter((x) => x.id !== ev.id) };
      const eff = ok ? ch.effects : (ch.failEffects ?? {});
      if (eff.company) s = moveToCompany(s, eff.company, c);
      s = applyEffects(s, eff);
      if (eff.now) front = [{ kind: 'event', eventId: eff.now }];
      feed.push(chance === undefined ? ch.label : `${ch.label} — ${ok ? '성공' : '실패'}`);
      break;
    }
    case 'incident-step': {
      const inc = c.incidents[p.incidentId];
      const step = inc.steps[p.step];
      if (input.t === 'ask') {
        const correct = step.options.find((o) => o.correct);
        if (!correct || optionAvailable(correct, s.deck, c)) {
          feed.push(`와탭 AI: ${inc.aiHint ?? ''} "${correct?.label ?? ''}"부터 보세요.`);
        } else {
          const card = Object.values(c.cards).find((cd) => cd.views.includes(correct.view));
          feed.push(`와탭 AI: 정답은 "${correct.label}"인데, ${card?.name ?? '필요한'} 카드가 없어 열 수 없어요. 다른 단서를 찾아보세요.`);
        }
        front = [{ ...p, hintUsed: true }];
        break;
      }
      const opt = step.options[input.i];
      const clues = p.clues + (opt.correct ? 1 : 0);
      feed.push(opt.correct ? `단서 · ${opt.clue ?? '실마리를 찾았다'}` : `${opt.label}: 별다른 단서가 없다`);
      front = [
        p.step + 1 < inc.steps.length
          ? { ...p, step: p.step + 1, clues }
          : { kind: 'incident-action', incidentId: inc.id, clues },
      ];
      break;
    }
    case 'incident-action': {
      const inc = c.incidents[p.incidentId];
      const a = inc.actions[indexOf(input)];
      const ok = rng.chance(actionChance(a, p.clues, s.stats.debug));
      const mttr = mttrMinutes(ok, p.clues, rng);
      s = applyEffects(s, ok ? { ...a.effects, traits: { ...a.effects.traits, 불끄는영웅: (a.effects.traits?.['불끄는영웅'] ?? 0) + 1 } } : a.failEffects);
      s = {
        ...s,
        yearScore: s.yearScore + (ok ? 3 : -5),
        record: {
          ...s.record,
          incidentsTotal: s.record.incidentsTotal + 1,
          incidentsResolved: s.record.incidentsResolved + (ok ? 1 : 0),
          mttrTotalMin: s.record.mttrTotalMin + mttr,
        },
      };
      feed.push(`${ok ? '복구' : '복구 실패'} — ${a.label} (MTTR ${mttr}분)`);
      front = [{ kind: 'postmortem', incidentId: inc.id, resolved: ok }];
      break;
    }
    case 'postmortem': {
      const i = indexOf(input);
      if (i === 0) s = applyEffects(s, { reputation: 2, traits: { 문화: 1 } });
      else if (i === 1) {
        if (rng.chance(0.5)) s = { ...s, recur: [...s.recur, p.incidentId] };
      } else s = applyEffects(s, { reputation: -4, traits: { 정치력: 1 } });
      feed.push(POSTMORTEM_CHOICES[i]);
      break;
    }
    case 'offers': {
      const i = indexOf(input);
      if (i < p.offers.length) {
        const offer = p.offers[i];
        s = joinCompany(s, offer, c);
        feed.push(`${c.companies[offer.companyId].name}(으)로 이직!`);
      } else {
        if (p.offers.some((o) => o.special)) s = applyEffects(s, { flags: ['scout-declined'] });
        feed.push('지금 회사에 남는다');
      }
      break;
    }
    default:
      throw new Error(`no input expected for ${p.kind}`);
  }

  return drain(
    { ...g, rngState: rng.getState(), state: s, queue: [...front, ...g.queue.slice(1)], log: [...g.log, input], feed },
    c,
  );
}

/** 입력이 필요 없는 단계(연말 평가, 은퇴 처리)를 자동으로 진행한다. */
function drain(g: Game, c: Content): Game {
  let game = g;
  for (;;) {
    const p = pending(game);
    if (game.state.retired && p.kind !== 'review' && game.queue.some((x) => x.kind === 'review')) {
      game = { ...game, queue: [{ kind: 'review' }] };
      continue;
    }
    if (game.state.retired && p.kind !== 'review' && (p.kind !== 'ended' || game.state.endingId === undefined)) {
      const ending = determineEnding(game.state, c);
      game = {
        ...game,
        state: { ...game.state, endingId: ending.id },
        queue: [{ kind: 'ended' }],
        feed: [...game.feed, `엔딩 · ${ending.title}`],
      };
      continue;
    }
    if (p.kind === 'review') {
      const rng = createRng(game.rngState);
      const r = review(game.state, rng, c);
      const q: Pending[] = [];
      if (!r.state.retired) {
        const offers = generateOffers(r.state, rng, c);
        if (offers.length > 0) q.push({ kind: 'offers', offers });
        q.push({ kind: 'year' });
      }
      game = { ...game, rngState: rng.getState(), state: r.state, queue: [...q, ...game.queue.slice(1)], feed: [...game.feed, ...r.feed] };
      continue;
    }
    return game;
  }
}

export function replay(setup: Setup, seed: number, log: readonly Input[], c: Content): Game {
  return log.reduce((g, input) => apply(g, input, c), newGame(setup, seed, c));
}
