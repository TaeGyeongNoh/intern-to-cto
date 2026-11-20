import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import type { Content } from './types';
import { validateContent } from './validate';

describe('validateContent', () => {
  it('깨진 next 참조를 잡는다', () => {
    const c: Content = {
      ...CONTENT,
      events: { x: { id: 'x', when: {}, text: 'x', choices: [{ label: 'a', effects: { next: 'nope' } }] } },
    };
    expect(validateContent(c).join('\n')).toContain('unknown event nope');
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
});
