import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import type { CardId, Company, Content, GrowthStage } from './types';
import { validateContent } from './validate';

describe('validateContent', () => {
  it('깨진 next 참조를 잡는다', () => {
    const c: Content = {
      ...CONTENT,
      events: { x: { id: 'x', when: {}, text: 'x', choices: [{ label: 'a', effects: { next: 'nope' } }] } },
    };
    expect(validateContent(c).join('\n')).toContain('unknown event nope');
  });
  it('minYearsAtCompany는 1 이상이어야 한다 (이벤트·상점)', () => {
    const c: Content = {
      ...CONTENT,
      events: { x: { id: 'x', when: { minYearsAtCompany: 0 }, text: 'x', choices: [{ label: 'a', effects: {} }] } },
      shop: { s: { id: 's', name: 's', category: 'rest', price: 10, text: 's', when: { minYearsAtCompany: 0.5 }, effects: {} } },
    };
    const errs = validateContent(c).join('\n');
    expect(errs).toContain('event x: minYearsAtCompany must be an integer >= 1');
    expect(errs).toContain('shop s: minYearsAtCompany must be an integer >= 1');
    const ok: Content = { ...CONTENT, events: { x: { id: 'x', when: { minYearsAtCompany: 1 }, text: 'x', choices: [{ label: 'a', effects: {} }] } } };
    expect(validateContent(ok)).toEqual([]);
  });
  it('requires 없는 선택지가 하나도 없으면 잡는다', () => {
    const c: Content = {
      ...CONTENT,
      events: { x: { id: 'x', when: {}, text: 'x', choices: [{ label: 'a', requires: { card: 'apm' }, effects: {} }] } },
    };
    expect(validateContent(c).join('\n')).toContain('without requires');
  });
  it('grep 없는 장애 단계를 잡는다', () => {
    const inc = CONTENT.incidents['oom-kill'];
    const broken = { ...inc, steps: [{ prompt: 'p', options: [{ label: 'x', view: 'pods' as const, correct: true }] }] };
    expect(validateContent({ ...CONTENT, incidents: { 'oom-kill': broken } }).join('\n')).toContain('grep');
  });
  it('깨진 now·company 참조를 잡는다', () => {
    const c: Content = {
      ...CONTENT,
      events: { x: { id: 'x', when: {}, text: 'x', choices: [{ label: 'a', effects: { now: 'nope', company: 'nowhere' } }] } },
    };
    const errs = validateContent(c).join('\n');
    expect(errs).toContain('now → unknown event nope');
    expect(errs).toContain('unknown company nowhere');
  });
  it('{route} 회사는 모든 루트에 있어야 한다', () => {
    const { 'tiny-finance': _omit, ...companies } = CONTENT.companies;
    expect(validateContent({ ...CONTENT, companies }).join('\n')).toContain('unknown company tiny-finance');
  });
  it('now로만 닿는 scheduledOnly 이벤트는 괜찮다', () => {
    const c: Content = {
      ...CONTENT,
      events: {
        x: { id: 'x', when: {}, text: 'x', choices: [{ label: 'a', effects: { now: 'y' } }] },
        y: { id: 'y', when: {}, scheduledOnly: true, text: 'y', choices: [{ label: 'b', effects: {} }] },
      },
    };
    expect(validateContent(c)).toEqual([]);
  });
  it('상점 물건: 가격, 효과, 없는 물건을 가리키는 조건, 잘못된 투자를 잡는다', () => {
    const c: Content = {
      ...CONTENT,
      shop: {
        a: { id: 'a', name: 'a', category: 'gear', price: 0, text: 'a', effects: { now: 'x' } },
        b: { id: 'b', name: 'b', category: 'life', price: 10, text: 'b', when: { flags: ['shop:nope'] }, effects: {} },
        c: { id: 'c', name: 'c', category: 'invest', price: 10, text: 'c', effects: {}, gamble: { chance: 1.5, win: 2, lose: 0 } },
      },
    };
    const errs = validateContent(c).join('\n');
    expect(errs).toContain('shop a: price must be positive');
    expect(errs).toContain('shop a: now/company are only supported in event choices');
    expect(errs).toContain('shop b: unknown shop flag shop:nope');
    expect(errs).toContain('shop c: invalid gamble');
  });
  it('유형: 강점·약점 스탯, 겹침, 포지션당 3개 미만을 잡는다', () => {
    const c: Content = {
      ...CONTENT,
      archetypes: {
        a: { id: 'a', name: 'a', tagline: 'a', positions: ['backend'], spikes: ['impl', 'nope' as never], dumps: ['impl'] },
        b: { id: 'x', name: 'b', tagline: 'b', positions: ['nowhere' as never], spikes: [], dumps: ['ai', 'infra', 'mental'] },
      },
    };
    const errs = validateContent(c).join('\n');
    expect(errs).toContain('archetype a: unknown stat nope');
    expect(errs).toContain('archetype a: impl is both spike and dump');
    expect(errs).toContain('archetype key b != id x');
    expect(errs).toContain('archetype x: unknown position nowhere');
    expect(errs).toContain('archetype x: needs 1-2 spikes');
    expect(errs).toContain('archetype x: needs 1-2 dumps');
    expect(errs).toContain('position sre: needs at least 3 archetypes');
  });
});

describe('장애 포지션', () => {
  it('모르는 포지션은 오류', () => {
    const inc = { ...CONTENT.incidents['db-lock'], positions: ['designer' as never] };
    const errs = validateContent({ ...CONTENT, incidents: { ...CONTENT.incidents, 'db-lock': inc } });
    expect(errs.some((e) => e.includes('unknown position designer'))).toBe(true);
  });
  it('포지션마다 주 담당 장애가 3종 이상이어야 한다', () => {
    const incidents = Object.fromEntries(Object.entries(CONTENT.incidents).filter(([, i]) => !i.positions?.includes('sre') || i.id === 'oom-kill'));
    expect(validateContent({ ...CONTENT, incidents }).some((e) => e.includes('position sre: needs at least 3 incidents'))).toBe(true);
  });
});

describe('반복 구매', () => {
  it('once:false는 투자 카테고리만', () => {
    const bad = { ...CONTENT.shop.keyboard, once: false };
    const errs = validateContent({ ...CONTENT, shop: { ...CONTENT.shop, keyboard: bad } });
    expect(errs.some((e) => e.includes('shop keyboard: only invest items can be repeatable'))).toBe(true);
  });
  describe('회사 성장 단계', () => {
    const base = CONTENT.companies['tiny-commerce'];
    const st = (over: Partial<GrowthStage> = {}): GrowthStage => ({ name: 's', level: base.level, baseSalary: base.baseSalary, up: 0.1, down: 0.1, text: 't', ...over });
    const last = (over: Partial<GrowthStage> = {}) => st({ level: base.level + 5, baseSalary: base.baseSalary + 400, up: 0, down: 0, ...over });
    const errsFor = (stages: GrowthStage[], over: Partial<Company> = {}) =>
      validateContent({ ...CONTENT, companies: { ...CONTENT.companies, 'tiny-commerce': { ...base, ...over, stages } } }).join('\n');

    it('정상 단계는 통과', () => {
      expect(errsFor([st(), last({ ipo: true })])).toBe('');
    });
    it('2단계 이상', () => expect(errsFor([st({ up: 0, down: 0 })])).toContain('at least 2 stages'));
    it('첫 단계는 회사 값과 같다', () => expect(errsFor([st({ level: 1 }), last()])).toContain('first stage must match'));
    it('level·baseSalary는 단조 증가', () => expect(errsFor([st(), last({ baseSalary: base.baseSalary - 1 })])).toContain('must increase'));
    it('마지막 단계는 up = down = 0', () => expect(errsFor([st(), last({ up: 0.1 })])).toContain('last stage must have up = down = 0'));
    it('나머지 단계는 0 <= up, down, up + down < 1', () => {
      expect(errsFor([st({ up: 0.6, down: 0.4 }), last()])).toContain('invalid up/down');
      expect(errsFor([st({ up: -0.1 }), last()])).toContain('invalid up/down');
    });
    it('addCards는 있는 카드', () => expect(errsFor([st(), last({ addCards: ['nope' as CardId] })])).toContain('unknown card nope'));
    it('ipo는 마지막 단계에만', () => expect(errsFor([st({ ipo: true }), last()])).toContain('ipo only on the last stage'));
    it('숨은 회사, 시작 회사가 아닌 대기업 이상에는 단계 금지', () => {
      expect(errsFor([st(), last()], { hidden: true })).toContain('stages not allowed');
      expect(errsFor([st(), last()], { tier: 'large' })).toContain('stages not allowed');
    });
  });
  describe('창업 회사', () => {
    const fc = CONTENT.companies['founder-commerce'];
    const close = { removeFlags: ['founder'], flags: ['founder-failed'] };
    const errsWith = (over: Partial<Company>) =>
      validateContent({ ...CONTENT, companies: { ...CONTENT.companies, 'founder-commerce': { ...fc, ...over } } }).join('\n');
    const stages = (edit: (st: GrowthStage[]) => GrowthStage[]) => errsWith({ stages: edit(fc.stages!.map((x) => ({ ...x }))) });

    it('지금 콘텐츠는 통과', () => expect(errsWith({})).toBe(''));
    it('창업 회사는 숨은 회사이고 단계가 있어야 한다', () => {
      expect(errsWith({ hidden: undefined })).toContain('company founder-commerce: founder company must be hidden with stages');
      expect(errsWith({ stages: undefined })).toContain('founder company must be hidden with stages');
    });
    it('루트마다 창업 회사가 하나씩', () => {
      const { ['founder-finance']: _, ...rest } = CONTENT.companies;
      expect(validateContent({ ...CONTENT, companies: rest }).join('\n')).toContain('route finance: expected 1 founder company, got 0');
    });
    it('단계 효과에는 허용된 필드만', () => {
      expect(stages((st) => { st[0].closeEffects = { ...close, salary: 100 }; return st; })).toContain('stage 0: closeEffects.salary not allowed');
      expect(stages((st) => { st[1].effects = { company: 'x' }; return st; })).toContain('stage 1: effects.company not allowed');
    });
    it('retire는 마지막 단계 effects에서만', () => {
      expect(stages((st) => { st[1].effects = { retire: true }; return st; })).toContain('stage 1: retire only in the last stage effects');
      expect(stages((st) => { st[0].closeEffects = { ...close, retire: true }; return st; })).toContain('stage 0: closeEffects.retire not allowed');
    });
    it('마지막 단계에는 closeEffects가 없다', () => {
      expect(stages((st) => { st[st.length - 1].closeEffects = close; return st; })).toContain('last stage cannot have closeEffects');
    });
    it('창업 회사 closeEffects는 founder 플래그를 지워야 한다', () => {
      expect(stages((st) => { st[0].closeEffects = { flags: ['founder-failed'] }; return st; })).toContain('stage 0: closeEffects must remove founder flag');
    });
    it('founder 플래그와 창업 회사 이동은 함께', () => {
      const ev = (effects: object) => ({ ...CONTENT, events: { ...CONTENT.events, x: { id: 'x', when: {}, text: 'x', choices: [{ label: 'a', effects }] } } });
      expect(validateContent(ev({ flags: ['founder'] })).join('\n')).toContain('event x#0: founder flag needs company founder-{route}');
      expect(validateContent(ev({ company: 'founder-{route}' })).join('\n')).toContain('event x#0: founder company needs founder flag');
      const routed = (effects: object) => ({ ...CONTENT, events: { ...CONTENT.events, x: { id: 'x', when: { route: ['commerce' as const] }, text: 'x', choices: [{ label: 'a', effects }] } } });
      expect(validateContent(routed({ flags: ['founder'], company: 'founder-{route}' }))).toEqual([]);
    });
    it('{route} 회사로 옮기는 이벤트는 일반 루트에서만 (와탭 루트면 회사가 없다)', () => {
      const ev = (when: object, extra: Record<string, unknown> = {}) => ({
        ...CONTENT,
        events: { ...CONTENT.events, x: { id: 'x', when, text: 'x', choices: [{ label: 'a', effects: { company: 'tiny-{route}' } }] }, ...extra },
      });
      expect(validateContent(ev({})).join('\n')).toContain('event x: {route} company needs when.route');
      expect(validateContent(ev({ route: [] })).join('\n')).toContain('event x: {route} company needs when.route');
      expect(validateContent(ev({ route: ['commerce', 'finance'] }))).toEqual([]);
      // 실패 효과도 본다
      const fail = { ...CONTENT, events: { ...CONTENT.events, x: { id: 'x', when: {}, text: 'x', choices: [{ label: 'a', chance: { base: 0.5 }, effects: {}, failEffects: { company: 'tiny-{route}' } }] } } };
      expect(validateContent(fail).join('\n')).toContain('event x: {route} company needs when.route');
      // next로 예약되어 나중에 뜨는 이벤트도 막는다 (프롤로그 밖)
      const later = {
        ...CONTENT,
        events: {
          ...CONTENT.events,
          y: { id: 'y', when: {}, text: 'y', choices: [{ label: 'a', effects: { next: 'x' } }] },
          x: { id: 'x', scheduledOnly: true, when: {}, text: 'x', choices: [{ label: 'a', effects: { company: 'tiny-{route}' } }] },
        },
      };
      expect(validateContent(later).join('\n')).toContain('event x: {route} company needs when.route');
    });
    it('프롤로그에서 now로만 이어지는 이벤트는 루트 제한 없이 {route} 회사를 쓸 수 있다', () => {
      expect(CONTENT.events['prologue-result'].when.route).toBeUndefined();
      expect(validateContent(CONTENT)).toEqual([]);
    });
  });
});
