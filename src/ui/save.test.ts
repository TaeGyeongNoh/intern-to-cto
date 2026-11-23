import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { apply, newGame } from '../engine/game';
import { decodeSave, encodeSave, restore } from './save';

describe('save', () => {
  const setup = { name: '김개발', position: 'ai' as const, route: 'ai-startup' as const, candidate: 2 };
  it('저장 → 복원하면 같은 게임', () => {
    let g = newGame(setup, 77, CONTENT);
    g = apply(g, { t: 'pick', i: 0 }, CONTENT);
    const restored = restore(decodeSave(encodeSave(g))!, CONTENT);
    expect(restored.state).toEqual(g.state);
    expect(restored.queue).toEqual(g.queue);
  });
  it('출신 필드 없는 옛 저장은 기본 출신으로 복원된다', () => {
    const raw = JSON.stringify({ v: 1, setup, seed: 77, log: [{ t: 'pick', i: 0 }] });
    const restored = restore(decodeSave(raw)!, CONTENT);
    const explicit = apply(newGame({ ...setup, education: 'university', service: 'none' }, 77, CONTENT), { t: 'pick', i: 0 }, CONTENT);
    expect(restored.state).toEqual(explicit.state);
    expect(restored.state.age).toBe(22);
  });
  it('출신을 고른 판도 저장 → 복원된다', () => {
    let g = newGame({ ...setup, education: 'grad', service: 'research' }, 77, CONTENT);
    g = apply(g, { t: 'pick', i: 0 }, CONTENT);
    const restored = restore(decodeSave(encodeSave(g))!, CONTENT);
    expect(restored.setup).toEqual(g.setup);
    expect(restored.state).toEqual(g.state);
  });
  it('깨진 문자열이나 다른 버전은 null', () => {
    expect(decodeSave('nope')).toBeNull();
    expect(decodeSave(JSON.stringify({ v: 999 }))).toBeNull();
  });
});
