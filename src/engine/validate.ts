import { ROUTE_IDS, type Content, type Effects } from './types';

export function validateContent(c: Content): string[] {
  const errs: string[] = [];
  const cardIds = new Set<string>(Object.keys(c.cards));
  const views = new Set<string>(['grep']);
  for (const card of Object.values(c.cards)) for (const v of card.views) views.add(v);

  const targeted = new Set<string>();
  const checkEffects = (where: string, e?: Effects) => {
    if (!e) return;
    for (const card of e.addCards ?? []) if (!cardIds.has(card)) errs.push(`${where}: unknown card ${card}`);
    if (e.next) {
      targeted.add(e.next);
      if (!c.events[e.next]) errs.push(`${where}: next → unknown event ${e.next}`);
    }
  };

  for (const [key, ev] of Object.entries(c.events)) {
    if (key !== ev.id) errs.push(`event key ${key} != id ${ev.id}`);
    if (!ev.choices.some((ch) => !ch.requires)) errs.push(`event ${ev.id}: needs at least one choice without requires`);
    ev.choices.forEach((ch, i) => {
      const where = `event ${ev.id}#${i}`;
      if (ch.requires?.card && !cardIds.has(ch.requires.card)) errs.push(`${where}: unknown card ${ch.requires.card}`);
      checkEffects(where, ch.effects);
      checkEffects(where, ch.failEffects);
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
    if (ev.scheduledOnly && !targeted.has(ev.id)) errs.push(`event ${ev.id}: scheduledOnly but never targeted by next`);
  }

  for (const r of ROUTE_IDS) {
    const n = Object.values(c.companies).filter((co) => co.route === r && co.start).length;
    if (n !== 1) errs.push(`route ${r}: expected 1 start company, got ${n}`);
  }
  for (const co of Object.values(c.companies))
    for (const card of co.cards) if (!cardIds.has(card)) errs.push(`company ${co.id}: unknown card ${card}`);
  if (!c.companies.whatap) errs.push('missing whatap company');

  const ids = new Set<string>();
  for (const e of c.endings) {
    if (ids.has(e.id)) errs.push(`duplicate ending ${e.id}`);
    ids.add(e.id);
  }
  if (!c.endings.some((e) => e.priority === 0)) errs.push('missing fallback ending (priority 0)');
  return errs;
}
