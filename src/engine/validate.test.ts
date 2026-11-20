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
});
