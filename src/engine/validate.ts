import { resolveCompanyId } from './career';
import { DEFAULT_EDUCATION, DEFAULT_SERVICE, PROLOGUE_START, serviceAllowed } from './origin';
import { MIN_STAKE, shopFlag, STAKE_TIERS } from './shop';
import { MARKET_MOODS, POSITION_IDS, ROUTE_IDS, STAT_IDS, type Condition, type Content, type Effects } from './types';

/** 이벤트에서 창업할 때 옮기는 회사 (루트별 창업 회사) */
const FOUNDER_COMPANY = 'founder-{route}';
/** 성장 단계 effects·closeEffects에 쓸 수 있는 필드 (retire는 따로 검사) */
const STAGE_EFFECT_KEYS = new Set(['stats', 'reputation', 'burnout', 'flags', 'removeFlags', 'traits', 'story', 'retire']);
/** 출신(학력·병역) effects에 쓸 수 있는 필드. 연봉은 salary 필드로 준다 */
const ORIGIN_EFFECT_KEYS = new Set(['stats', 'reputation', 'flags', 'story']);

/**
 * 프롤로그에서만 뜨는 이벤트: 시작 이벤트들에서 now로 닿고, scheduledOnly이며,
 * 프롤로그 밖 이벤트가 next/now로 부르지 않고, 누구도 next로 예약하지 않는다.
 */
function prologueChain(c: Content, starts: string[]): Set<string> {
  const reach = new Set<string>();
  const stack = starts.filter((id) => c.events[id]);
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (reach.has(id)) continue;
    reach.add(id);
    for (const ch of c.events[id].choices)
      for (const e of [ch.effects, ch.failEffects]) if (e?.now && c.events[e.now]) stack.push(e.now);
  }
  const ok = new Set<string>();
  for (const id of reach) {
    if (!c.events[id].scheduledOnly) continue;
    const calledFromOutside = Object.values(c.events).some((ev) =>
      ev.choices.some((ch) => [ch.effects, ch.failEffects].some((e) => e?.next === id || (e?.now === id && !reach.has(ev.id)))),
    );
    if (!calledFromOutside) ok.add(id);
  }
  return ok;
}

export function validateContent(c: Content): string[] {
  const errs: string[] = [];
  const cardIds = new Set<string>(Object.keys(c.cards));
  const views = new Set<string>(['grep']);
  for (const card of Object.values(c.cards)) for (const v of card.views) views.add(v);

  const originPrologues = [...Object.values(c.educations), ...Object.values(c.services)].flatMap((o) => (o.prologue ? [o.prologue] : []));
  const targeted = new Set<string>([PROLOGUE_START, ...originPrologues]);
  const checkEffects = (where: string, e?: Effects, inEvent = false) => {
    if (!e) return;
    for (const card of e.addCards ?? []) if (!cardIds.has(card)) errs.push(`${where}: unknown card ${card}`);
    for (const [key, id] of [['next', e.next], ['now', e.now]] as const) {
      if (!id) continue;
      targeted.add(id);
      if (!c.events[id]) errs.push(`${where}: ${key} → unknown event ${id}`);
    }
    if (!inEvent && (e.now || e.company)) errs.push(`${where}: now/company are only supported in event choices`);
    if (e.bound !== undefined) {
      if (!inEvent) errs.push(`${where}: bound is only supported in event choices`);
      else if (!(Number.isInteger(e.bound) && e.bound >= 1 && e.bound <= 5)) errs.push(`${where}: bound must be an integer 1-5`);
    }
    const toFounder = e.company === FOUNDER_COMPANY;
    if (inEvent && (e.flags ?? []).includes('founder') && !toFounder) errs.push(`${where}: founder flag needs company ${FOUNDER_COMPANY}`);
    if (inEvent && toFounder && !(e.flags ?? []).includes('founder')) errs.push(`${where}: founder company needs founder flag`);
    if (e.company) {
      const ids = e.company.includes('{route}') ? ROUTE_IDS.map((r) => resolveCompanyId(e.company!, r)) : [e.company];
      for (const id of ids) if (!c.companies[id]) errs.push(`${where}: unknown company ${id}`);
    }
  };

  const checkCondition = (where: string, cond?: Condition) => {
    const y = cond?.minYearsAtCompany;
    if (y !== undefined && !(Number.isInteger(y) && y >= 1)) errs.push(`${where}: minYearsAtCompany must be an integer >= 1`);
  };

  for (const [key, ev] of Object.entries(c.events)) {
    if (key !== ev.id) errs.push(`event key ${key} != id ${ev.id}`);
    checkCondition(`event ${ev.id}`, ev.when);
    if (!ev.choices.some((ch) => !ch.requires)) errs.push(`event ${ev.id}: needs at least one choice without requires`);
    ev.choices.forEach((ch, i) => {
      const where = `event ${ev.id}#${i}`;
      if (ch.requires?.card && !cardIds.has(ch.requires.card)) errs.push(`${where}: unknown card ${ch.requires.card}`);
      checkEffects(where, ch.effects, true);
      checkEffects(where, ch.failEffects, true);
    });
  }

  const positions = new Set<string>(POSITION_IDS);
  for (const inc of Object.values(c.incidents)) {
    for (const p of inc.positions ?? []) if (!positions.has(p)) errs.push(`incident ${inc.id}: unknown position ${p}`);
    checkCondition(`incident ${inc.id}`, inc.when);
    if (inc.actions.length === 0) errs.push(`incident ${inc.id}: no actions`);
    inc.steps.forEach((st, i) => {
      if (!st.options.some((o) => o.correct)) errs.push(`incident ${inc.id} step ${i}: no correct option`);
      if (!st.options.some((o) => o.view === 'grep')) errs.push(`incident ${inc.id} step ${i}: no grep fallback`);
      for (const o of st.options) if (!views.has(o.view)) errs.push(`incident ${inc.id} step ${i}: unknown view ${o.view}`);
    });
    inc.actions.forEach((a, i) => {
      checkEffects(`incident ${inc.id} action ${i}`, a.effects);
      checkEffects(`incident ${inc.id} action ${i}`, a.failEffects);
    });
  }

  for (const ev of Object.values(c.events)) {
    if (ev.scheduledOnly && !targeted.has(ev.id)) errs.push(`event ${ev.id}: scheduledOnly but never targeted by next/now`);
  }

  // `{route}` 회사는 일반 루트에만 있다. 와탭 루트에서 뜨면 회사를 찾지 못하므로 when.route로 막는다.
  // 프롤로그(첫 해 전)는 루트가 항상 일반 루트라 예외: 시작 이벤트에서 now로만 이어지고 next로는 불리지 않는 scheduledOnly 이벤트.
  const prologueOnly = prologueChain(c, [PROLOGUE_START, ...originPrologues]);
  for (const ev of Object.values(c.events)) {
    const usesRoute = ev.choices.some((ch) => [ch.effects, ch.failEffects].some((e) => e?.company?.includes('{route}')));
    if (usesRoute && !(ev.when.route?.length) && !prologueOnly.has(ev.id)) errs.push(`event ${ev.id}: {route} company needs when.route`);
  }

  for (const r of ROUTE_IDS) {
    const n = Object.values(c.companies).filter((co) => co.route === r && co.start).length;
    if (n !== 1) errs.push(`route ${r}: expected 1 start company, got ${n}`);
  }
  for (const co of Object.values(c.companies))
    for (const card of co.cards) if (!cardIds.has(card)) errs.push(`company ${co.id}: unknown card ${card}`);
  if (!c.companies.whatap) errs.push('missing whatap company');
  for (const r of ROUTE_IDS) {
    const n = Object.values(c.companies).filter((co) => co.route === r && co.founder).length;
    if (n !== 1) errs.push(`route ${r}: expected 1 founder company, got ${n}`);
  }
  for (const co of Object.values(c.companies)) {
    if (co.founder && (!co.hidden || !co.stages)) errs.push(`company ${co.id}: founder company must be hidden with stages`);
    const stages = co.stages;
    if (!stages) continue;
    const where = `company ${co.id}`;
    if ((co.hidden && !co.founder) || (!co.start && co.tier !== 'startup' && co.tier !== 'mid')) errs.push(`${where}: stages not allowed (hidden or large+ non-start company)`);
    if (stages.length < 2) {
      errs.push(`${where}: needs at least 2 stages`);
      continue;
    }
    if (stages[0].level !== co.level || stages[0].baseSalary !== co.baseSalary) errs.push(`${where}: first stage must match company level/baseSalary`);
    stages.forEach((st, i) => {
      const at = `${where} stage ${i}`;
      if (i > 0 && (st.level <= stages[i - 1].level || st.baseSalary <= stages[i - 1].baseSalary)) errs.push(`${at}: level/baseSalary must increase`);
      for (const card of st.addCards ?? []) if (!cardIds.has(card)) errs.push(`${at}: unknown card ${card}`);
      const isLast = i === stages.length - 1;
      for (const [key, eff] of [['effects', st.effects], ['closeEffects', st.closeEffects]] as const) {
        if (!eff) continue;
        for (const f of Object.keys(eff)) if (!STAGE_EFFECT_KEYS.has(f)) errs.push(`${at}: ${key}.${f} not allowed`);
      }
      if (st.effects?.retire && !isLast) errs.push(`${at}: retire only in the last stage effects`);
      if (st.closeEffects?.retire) errs.push(`${at}: closeEffects.retire not allowed`);
      if (isLast && st.closeEffects) errs.push(`${at}: last stage cannot have closeEffects`);
      if (co.founder && !isLast && !(st.closeEffects?.removeFlags ?? []).includes('founder'))
        errs.push(`${at}: closeEffects must remove founder flag`);
      if (isLast) {
        if (st.up !== 0 || st.down !== 0) errs.push(`${at}: last stage must have up = down = 0`);
      } else {
        if (st.ipo) errs.push(`${at}: ipo only on the last stage`);
        if (!(st.up >= 0 && st.down >= 0 && st.up + st.down < 1)) errs.push(`${at}: invalid up/down`);
      }
    });
  }

  const shopFlags = new Set(Object.keys(c.shop).map(shopFlag));
  for (const [key, item] of Object.entries(c.shop)) {
    const where = `shop ${item.id}`;
    if (key !== item.id) errs.push(`shop key ${key} != id ${item.id}`);
    checkCondition(where, item.when);
    if (!(item.price > 0)) errs.push(`${where}: price must be positive`);
    checkEffects(where, item.effects);
    if (item.once === false && item.category !== 'invest') errs.push(`${where}: only invest items can be repeatable`);
    if (item.effects.next || item.effects.retire) errs.push(`${where}: next/retire are not supported in shop items`);
    for (const f of item.when?.flags ?? []) if (f.startsWith('shop:') && !shopFlags.has(f)) errs.push(`${where}: unknown shop flag ${f}`);
    const g = item.gamble;
    if (item.category === 'invest' && !g) errs.push(`${where}: invest items need gamble`);
    if (item.category !== 'invest' && g) errs.push(`${where}: only invest items can gamble`);
    if (g && (!MARKET_MOODS.every((m) => g.chance[m] > 0 && g.chance[m] < 1) || !(g.win > 1 && g.lose < 1 && g.lose >= 0)))
      errs.push(`${where}: invalid gamble`);
    if (item.category === 'invest') {
      if (item.price < MIN_STAKE) errs.push(`${where}: invest price must be >= ${MIN_STAKE}`);
      if (item.once !== false) errs.push(`${where}: invest items must be repeatable (once: false)`);
      const lines = c.market.lines[item.id];
      if (!lines) errs.push(`${where}: missing market lines`);
      else if (lines.win.length === 0 || lines.lose.length === 0) errs.push(`${where}: market lines need win and lose`);
    }
  }
  for (const from of MARKET_MOODS) {
    const row = c.market.transitions[from];
    const ws = MARKET_MOODS.map((m) => row?.[m] ?? -1);
    if (ws.some((w) => w < 0) || Math.abs(ws.reduce((a, b) => a + b, 0) - 1) > 1e-9) errs.push(`market transitions ${from}: weights must be >= 0 and sum to 1`);
    if (!(c.market.headlines[from]?.length > 0)) errs.push(`market headlines ${from}: needs at least one`);
  }
  if (c.market.stakeLabels.length !== STAKE_TIERS.length || c.market.stakeLabels.some((x) => !x)) errs.push('market stakeLabels: needs one non-empty label per stake tier');
  if (c.market.allInLose.length === 0) errs.push('market allInLose: needs at least one');

  const ids = new Set<string>();
  for (const e of c.endings) {
    if (ids.has(e.id)) errs.push(`duplicate ending ${e.id}`);
    ids.add(e.id);
  }
  const statIds = new Set<string>(STAT_IDS);
  for (const [key, a] of Object.entries(c.archetypes)) {
    const where = `archetype ${a.id}`;
    if (key !== a.id) errs.push(`archetype key ${key} != id ${a.id}`);
    for (const p of a.positions) if (!positions.has(p)) errs.push(`${where}: unknown position ${p}`);
    if (a.spikes.length < 1 || a.spikes.length > 2) errs.push(`${where}: needs 1-2 spikes`);
    if (a.dumps.length < 1 || a.dumps.length > 2) errs.push(`${where}: needs 1-2 dumps`);
    for (const id of [...a.spikes, ...a.dumps]) if (!statIds.has(id)) errs.push(`${where}: unknown stat ${id}`);
    for (const id of a.spikes) if (a.dumps.includes(id)) errs.push(`${where}: ${id} is both spike and dump`);
  }
  for (const p of POSITION_IDS) {
    const n = Object.values(c.archetypes).filter((a) => a.positions.includes(p)).length;
    if (n < 3) errs.push(`position ${p}: needs at least 3 archetypes`);
  }
  for (const p of POSITION_IDS) {
    const n = Object.values(c.incidents).filter((i) => !i.positions?.length || i.positions.includes(p)).length;
    if (n < 3) errs.push(`position ${p}: needs at least 3 incidents`);
  }
  if (!c.endings.some((e) => e.priority === 0)) errs.push('missing fallback ending (priority 0)');

  // 출신: 기본값은 효과가 없어야 옛 저장·공유 링크가 같은 결과로 리플레이된다
  const checkOrigin = (where: string, e: Effects | undefined, prologue: string | undefined) => {
    for (const f of Object.keys(e ?? {})) if (!ORIGIN_EFFECT_KEYS.has(f)) errs.push(`${where}: effects.${f} not allowed`);
    if (prologue === undefined) return;
    if (!c.events[prologue]) errs.push(`${where}: unknown prologue ${prologue}`);
    else if (!c.events[prologue].scheduledOnly) errs.push(`${where}: prologue ${prologue} must be scheduledOnly`);
  };
  for (const [key, ed] of Object.entries(c.educations)) {
    const where = `education ${ed.id}`;
    if (key !== ed.id) errs.push(`education key ${key} != id ${ed.id}`);
    if (!(Number.isInteger(ed.age) && ed.age >= 18 && ed.age <= 30)) errs.push(`${where}: age must be an integer 18-30`);
    checkOrigin(where, ed.effects, ed.prologue);
  }
  for (const [key, sv] of Object.entries(c.services)) {
    const where = `service ${sv.id}`;
    if (key !== sv.id) errs.push(`service key ${key} != id ${sv.id}`);
    if (!(Number.isInteger(sv.years) && sv.years >= 0 && sv.years <= 3)) errs.push(`${where}: years must be an integer 0-3`);
    checkOrigin(where, sv.effects, sv.prologue);
    for (const id of sv.educations ?? []) if (!c.educations[id]) errs.push(`${where}: unknown education ${id}`);
  }
  const de = c.educations[DEFAULT_EDUCATION];
  if (!de) errs.push(`missing default education ${DEFAULT_EDUCATION}`);
  else if (de.age !== 22 || de.effects || de.salary || de.prologue) errs.push(`education ${de.id}: default must be age 22 with no effects/salary/prologue`);
  const ds = c.services[DEFAULT_SERVICE];
  if (!ds) errs.push(`missing default service ${DEFAULT_SERVICE}`);
  else if (ds.years !== 0 || ds.effects || ds.salary || ds.prologue || ds.educations) errs.push(`service ${ds.id}: default must be 0 years with no effects/salary/prologue/educations`);
  for (const ed of Object.values(c.educations))
    if (!Object.values(c.services).some((sv) => serviceAllowed(sv, ed.id))) errs.push(`education ${ed.id}: no service allowed`);
  return errs;
}
