import { resolveCompanyId } from './career';
import { PROLOGUE_START } from './game';
import { shopFlag } from './shop';
import { ROUTE_IDS, type Content, type Effects } from './types';

export function validateContent(c: Content): string[] {
  const errs: string[] = [];
  const cardIds = new Set<string>(Object.keys(c.cards));
  const views = new Set<string>(['grep']);
  for (const card of Object.values(c.cards)) for (const v of card.views) views.add(v);

  const targeted = new Set<string>([PROLOGUE_START]);
  const checkEffects = (where: string, e?: Effects, inEvent = false) => {
    if (!e) return;
    for (const card of e.addCards ?? []) if (!cardIds.has(card)) errs.push(`${where}: unknown card ${card}`);
    for (const [key, id] of [['next', e.next], ['now', e.now]] as const) {
      if (!id) continue;
      targeted.add(id);
      if (!c.events[id]) errs.push(`${where}: ${key} → unknown event ${id}`);
    }
    if (!inEvent && (e.now || e.company)) errs.push(`${where}: now/company are only supported in event choices`);
    if (e.company) {
      const ids = e.company.includes('{route}') ? ROUTE_IDS.map((r) => resolveCompanyId(e.company!, r)) : [e.company];
      for (const id of ids) if (!c.companies[id]) errs.push(`${where}: unknown company ${id}`);
    }
  };

  for (const [key, ev] of Object.entries(c.events)) {
    if (key !== ev.id) errs.push(`event key ${key} != id ${ev.id}`);
    if (!ev.choices.some((ch) => !ch.requires)) errs.push(`event ${ev.id}: needs at least one choice without requires`);
    ev.choices.forEach((ch, i) => {
      const where = `event ${ev.id}#${i}`;
      if (ch.requires?.card && !cardIds.has(ch.requires.card)) errs.push(`${where}: unknown card ${ch.requires.card}`);
      checkEffects(where, ch.effects, true);
      checkEffects(where, ch.failEffects, true);
    });
  }

  for (const inc of Object.values(c.incidents)) {
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

  for (const r of ROUTE_IDS) {
    const n = Object.values(c.companies).filter((co) => co.route === r && co.start).length;
    if (n !== 1) errs.push(`route ${r}: expected 1 start company, got ${n}`);
  }
  for (const co of Object.values(c.companies))
    for (const card of co.cards) if (!cardIds.has(card)) errs.push(`company ${co.id}: unknown card ${card}`);
  if (!c.companies.whatap) errs.push('missing whatap company');

  const shopFlags = new Set(Object.keys(c.shop).map(shopFlag));
  for (const [key, item] of Object.entries(c.shop)) {
    const where = `shop ${item.id}`;
    if (key !== item.id) errs.push(`shop key ${key} != id ${item.id}`);
    if (!(item.price > 0)) errs.push(`${where}: price must be positive`);
    checkEffects(where, item.effects);
    if (item.effects.next || item.effects.retire) errs.push(`${where}: next/retire are not supported in shop items`);
    for (const f of item.when?.flags ?? []) if (f.startsWith('shop:') && !shopFlags.has(f)) errs.push(`${where}: unknown shop flag ${f}`);
    const g = item.gamble;
    if (g && (g.chance <= 0 || g.chance >= 1 || g.win < 0 || g.lose < 0)) errs.push(`${where}: invalid gamble`);
  }

  const ids = new Set<string>();
  for (const e of c.endings) {
    if (ids.has(e.id)) errs.push(`duplicate ending ${e.id}`);
    ids.add(e.id);
  }
  if (!c.endings.some((e) => e.priority === 0)) errs.push('missing fallback ending (priority 0)');
  return errs;
}
