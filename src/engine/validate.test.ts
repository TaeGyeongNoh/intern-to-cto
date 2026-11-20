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
});
