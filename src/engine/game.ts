import { determineEnding, generateOffers, joinCompany, moveToCompany, type Offer } from './career';
import { effectiveCompany, growCompany, STOCK_GRANT_MULT, stockEligible } from './company';
import { applyEffects } from './effects';
import { withJosa } from './josa';
import { choiceChance, choiceLocked, pickEvent } from './events';
import { actionChance, FAST_MTTR, mttrMinutes, optionAvailable, pickIncidents, POSTMORTEM_CHOICES, POSTMORTEM_PUBLISH, shuffledOrder } from './incident';
import { diffState, type Outcome } from './outcome';
import { applyOrigin, firstSalary, originPrologue, PROLOGUE_START, resolveOrigin } from './origin';
import { createRng } from './rng';
import { negotiateChance, negotiatedSalary } from './salary';
import { review, runYear } from './season';
import { buyItem, nextMarket, pickShopItems, shopChoices } from './shop';
import { byYear } from './util';
import { createInitialState, type Setup } from './state';
import type { Content, GameState } from './types';

export type { Setup } from './state';
export type { Offer } from './career';
export type { Outcome, Delta } from './outcome';

export type Pending =
  | { kind: 'year' }
  | { kind: 'event'; eventId: string }
  /** order: 선택지 표시 순서(원래 인덱스의 순열). 입력 i는 항상 원래 인덱스다 */
  | { kind: 'incident-step'; incidentId: string; step: number; clues: number; hintUsed: boolean; order: number[] }
  | { kind: 'incident-action'; incidentId: string; clues: number }
  | { kind: 'postmortem'; incidentId: string; resolved: boolean }
  | { kind: 'review' }
  /** 별점 4 이상인 해의 연봉 협상. base: 자동 인상 제시안(이미 반영됨), prev·prevMax: 평가 전 연봉·최고연봉 */
  | { kind: 'negotiate'; rating: number; base: number; prev: number; prevMax: number }
  /** 연말 상점: pick i는 shopChoices(items)[i]를 사고(투자는 금액 단계까지), pick choices.length는 건너뛴다 */
  | { kind: 'shop'; items: string[] }
  /** forced: 지금 회사가 문을 닫아 남을 수 없다 ("남는다" 입력이 없다) */
  | { kind: 'offers'; offers: Offer[]; forced?: true }
  | { kind: 'ended' };

export type Input = { t: 'pick'; i: number } | { t: 'ask' };

/** 해 넘기기 단계의 입력: pick(0) 다음 해로, pick(1) 지금 은퇴한다 (경력 1년차부터) */
export const RETIRE_INPUT: Input = { t: 'pick', i: 1 };
/** 은퇴는 프롤로그가 끝나고 한 해라도 일한 뒤에만 고를 수 있다 */
export const canRetire = (g: Game): boolean => pending(g).kind === 'year' && g.state.yearsInCareer >= 1;
/** 은퇴를 뺀 유효 입력. 끝까지 커리어를 이어 가는 플레이어(시뮬레이터·무작위 테스트)용 */
export function careerInputs(g: Game, c: Content): Input[] {
  return validInputs(g, c).filter((v) => !(pending(g).kind === 'year' && sameInput(v, RETIRE_INPUT)));
}

export type Game = {
  setup: Setup;
  seed: number;
  rngState: number;
  state: GameState;
  queue: Pending[];
  log: Input[];
  /** 마지막 apply에서 일어난 일 (UI 표시용) */
  feed: string[];
  /** 마지막 apply에서 플레이어가 고른 것의 결과 (UI 결과 카드용, 없으면 undefined) */
  outcome?: Outcome;
};

const pick = (i: number): Input => ({ t: 'pick', i });

/** 연봉 협상 선택지 (입력 인덱스 순서) */
export const NEGOTIATE_CHOICES = ['제시안에 사인한다', '조금만 더 올려 달라고 한다', '인상 대신 스톡옵션을 받는다'] as const;
/** 협상이 열리는 최소 별점 */
export const NEGOTIATE_MIN_RATING = 4;
/** 협상이 열리는 최소 근속 (입사 첫해 연말은 입사 때 연봉을 정했으니 조정 대상에서 빠진다) */
export const NEGOTIATE_MIN_YEARS_AT_COMPANY = 2;

export { PROLOGUE_START };

const openingLine = (s: GameState, c: Content) => `${c.companies[s.companyId].name}에 신입으로 입사했다.`;

export function newGame(setup: Setup, seed: number, c: Content): Game {
  const origin = resolveOrigin(setup, c);
  const rng = createRng(seed);
  let state = createInitialState(setup, seed, rng, c);
  const queue: Pending[] = [{ kind: 'year' }];
  const first = originPrologue(origin);
  if (c.events[first]) {
    // 입사 문장은 프롤로그로 첫 회사가 정해진 뒤 첫 해를 넘길 때 남긴다
    state = { ...state, record: { ...state.record, story: [] } };
    queue.unshift({ kind: 'event', eventId: first });
  }
  // 출신 문장("현역 복무")은 story를 비운 뒤에 남긴다. 출신 처리는 rng를 쓰지 않는다
  state = applyOrigin(state, origin);
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
      return canRetire(g) ? [pick(0), RETIRE_INPUT] : [pick(0)];
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
    case 'negotiate':
      return [pick(0), pick(1), ...(p.base > p.prev && stockEligible(s, c) ? [pick(2)] : [])];
    case 'shop':
      return Array.from({ length: shopChoices(p.items, s, c).length + 1 }, (_, i) => pick(i));
    case 'offers':
      return Array.from({ length: p.offers.length + (p.forced ? 0 : 1) }, (_, i) => pick(i));
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
  const before = g.state;
  let result: Omit<Outcome, 'deltas'> | undefined;
  let front: Pending[] = [];

  switch (p.kind) {
    case 'year': {
      if (indexOf(input) === 1) {
        // 새 해를 돌리지 않는다 (rng도 쓰지 않는다). 엔딩은 drain이 지금 상태로 정한다
        const co = c.companies[s.companyId].name;
        s = applyEffects(s, { retire: true, flags: ['retired-voluntary'], story: `${withJosa(co, '을/를')} 끝으로 스스로 은퇴했다.` });
        feed.push('은퇴를 결심했다. 사원증을 반납한다.');
        result = { title: '은퇴한다', detail: `${s.age}세, ${s.yearsInCareer}년 차에 스스로 내려놓았다.` };
        break;
      }
      if (s.yearsInCareer === 0) {
        // 첫 회사가 프롤로그로 정해진 뒤 출신 가감을 더한다. 프롤로그 중 연봉 변화는 경력 전이므로 최고 연봉 기록은 첫 연봉부터 센다
        const salary = firstSalary(s.salary, resolveOrigin(g.setup, c));
        s = { ...s, salary, maxSalary: salary };
        if (!s.record.story.some((line) => line.endsWith(openingLine(s, c))))
          s = { ...s, record: { ...s.record, story: [...s.record.story, `${s.year}년 · ${openingLine(s, c)}`] } };
      }
      const r = runYear(s, rng, c);
      s = r.state;
      feed.push(...r.feed);
      const incidents = pickIncidents(s, rng, c);
      s = { ...s, recur: [] };
      front = incidents.map((id): Pending => ({
        kind: 'incident-step', incidentId: id, step: 0, clues: 0, hintUsed: false,
        order: shuffledOrder(c.incidents[id].steps[0].options.length, rng),
      }));
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
      result = chance === undefined ? { title: ch.label } : { title: ch.label, ok };
      if (eff.story) result = { ...result, detail: eff.story };
      feed.push(chance === undefined ? ch.label : `${ch.label} — ${ok ? '성공' : '실패'}`);
      // "실패"만 보이면 무슨 일이 났는지 모른다: 결과 문장도 피드에 남긴다
      if (eff.story) feed.push(eff.story);
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
          ? { ...p, step: p.step + 1, clues, order: shuffledOrder(inc.steps[p.step + 1].options.length, rng) }
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
          fastResolves: s.record.fastResolves + (ok && mttr <= FAST_MTTR ? 1 : 0),
        },
      };
      result = { title: a.label, ok, detail: `MTTR ${mttr}분` };
      feed.push(`${ok ? '복구' : '복구 실패'} — ${a.label} (MTTR ${mttr}분)`);
      front = [{ kind: 'postmortem', incidentId: inc.id, resolved: ok }];
      break;
    }
    case 'postmortem': {
      const i = indexOf(input);
      if (i === 0) {
        s = applyEffects(s, {
          burnout: POSTMORTEM_PUBLISH.burnout,
          reputation: p.resolved ? POSTMORTEM_PUBLISH.reputation : 0,
          traits: { 문화: 1 },
        });
      }
      else if (i === 1) {
        if (rng.chance(0.5)) s = { ...s, recur: [...s.recur, p.incidentId] };
      } else s = applyEffects(s, { reputation: -4, traits: { 정치력: 1 } });
      result = { title: POSTMORTEM_CHOICES[i] };
      feed.push(POSTMORTEM_CHOICES[i]);
      break;
    }
    case 'negotiate': {
      const i = indexOf(input);
      let salary = p.base;
      let ok: boolean | undefined;
      let detail: string;
      if (i === 0) {
        detail = '서명 한 번에 올해 협상이 끝났다. 볼펜은 돌려줬다.';
      } else if (i === 1) {
        ok = rng.chance(negotiateChance(s, p.rating));
        const r = negotiatedSalary(s, effectiveCompany(s.companyId, s, c), p.rating, p.prev, p.base);
        salary = ok ? r.win : r.lose;
        detail = ok ? '인사팀이 한숨을 쉬더니 숫자를 고쳐 적었다.' : '"예산이 정해져 있어서요." 분위기가 싸해지고, 인상률이 오히려 깎였다.';
      } else {
        salary = p.prev;
        const grant = (p.base - p.prev) * STOCK_GRANT_MULT;
        const held = s.stock?.companyId === s.companyId ? s.stock.value : 0;
        s = { ...s, stock: { companyId: s.companyId, value: held + grant } };
        detail = '숫자 대신 종이 한 장을 받았다. 상장하면 이 종이가 돈이 된다고 한다. 아마도.';
      }
      if (salary !== s.salary) {
        const history = s.record.history.map((row, k, all) => (k === all.length - 1 ? { ...row, salary } : row));
        s = { ...s, salary, maxSalary: Math.max(p.prevMax, salary), record: { ...s.record, history } };
      }
      result = ok === undefined ? { title: NEGOTIATE_CHOICES[i], detail } : { title: NEGOTIATE_CHOICES[i], ok, detail };
      feed.push(ok === undefined ? `연봉 협상 · ${NEGOTIATE_CHOICES[i]}` : `연봉 협상 · ${NEGOTIATE_CHOICES[i]} — ${ok ? '성공' : '실패'}`);
      break;
    }
    case 'shop': {
      const i = indexOf(input);
      const choices = shopChoices(p.items, s, c);
      if (i < choices.length) {
        const ch = choices[i];
        const item = c.shop[ch.itemId];
        const label = ch.tier === undefined ? undefined : c.market.stakeLabels[ch.tier];
        const r = buyItem(s, item, rng, ch.stake, label);
        if (r.gamble) {
          const lines = c.market.lines[item.id];
          const line = lines ? byYear(r.gamble.ok ? lines.win : lines.lose, s.year) : '';
          const allInLost = !r.gamble.ok && r.gamble.stake === s.assets;
          const money = `${r.gamble.stake.toLocaleString('ko-KR')}만원 → ${r.gamble.back.toLocaleString('ko-KR')}만원`;
          const detail = [line, allInLost ? byYear(c.market.allInLose, s.year) : '', money].filter(Boolean).join(' ');
          result = { title: label ? `${item.name} · ${label}` : item.name, ok: r.gamble.ok, detail };
        } else result = { title: item.name };
        s = r.state;
        feed.push(...r.feed);
      } else feed.push('이번엔 지갑을 닫는다');
      break;
    }
    case 'offers': {
      const i = indexOf(input);
      if (i < p.offers.length) {
        const offer = p.offers[i];
        s = joinCompany(s, offer, c);
        feed.push(`${withJosa(c.companies[offer.companyId].name, '(으)로')} 이직!`);
      } else {
        if (p.offers.some((o) => o.special)) s = applyEffects(s, { flags: ['scout-declined'] });
        feed.push('지금 회사에 남는다');
      }
      break;
    }
    default:
      throw new Error(`no input expected for ${p.kind}`);
  }

  const outcome = result && { ...result, deltas: diffState(before, s, c) };
  return drain(
    { ...g, rngState: rng.getState(), state: s, queue: [...front, ...g.queue.slice(1)], log: [...g.log, input], feed, outcome },
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
      let state = r.state;
      const feed = [...r.feed];
      const q: Pending[] = [];
      let closed = false;
      if (!state.retired) {
        const grown = growCompany(state, rng, c);
        closed = grown.closed;
        state = grown.state;
        feed.push(...grown.feed);
      }
      // 엑싯처럼 성장 판정으로 은퇴했으면 협상·상점·제안 없이 엔딩으로 간다
      if (!state.retired) {
        // 올해 연말 상점의 시장 분위기 (은퇴한 해에는 굴리지 않는다)
        state = { ...state, market: nextMarket(state.market, rng, c) };
        if (r.rating >= NEGOTIATE_MIN_RATING && state.yearsAtCompany >= NEGOTIATE_MIN_YEARS_AT_COMPANY && !closed && !state.flags.includes('founder'))
          q.push({ kind: 'negotiate', rating: r.rating, base: state.salary, prev: game.state.salary, prevMax: game.state.maxSalary });
        const items = pickShopItems(state, rng, c);
        if (items.length > 0) q.push({ kind: 'shop', items });
        const offers = generateOffers(state, rng, c, { forced: closed });
        if (closed) q.push({ kind: 'offers', offers, forced: true });
        else if (offers.length > 0) q.push({ kind: 'offers', offers });
        q.push({ kind: 'year' });
      }
      game = { ...game, rngState: rng.getState(), state, queue: [...q, ...game.queue.slice(1)], feed: [...game.feed, ...feed] };
      continue;
    }
    return game;
  }
}

export function replay(setup: Setup, seed: number, log: readonly Input[], c: Content): Game {
  return log.reduce((g, input) => apply(g, input, c), newGame(setup, seed, c));
}
