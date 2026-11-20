import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { apply, newGame, pending, validInputs } from '../engine/game';
import { createRng } from '../engine/rng';
import { GameView } from './GameView';

describe('GameView 스모크', () => {
  it('랜덤 플레이 10판의 모든 단계가 렌더된다', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = createRng(seed * 31);
      let g = newGame({ name: '스모크', position: 'sre', route: (['commerce', 'finance', 'ai-startup'] as const)[seed % 3], candidate: seed % 3 }, seed, CONTENT);
      for (let guard = 0; ; guard++) {
        expect(() => renderToString(<GameView game={g} log={[]} onInput={() => {}} onRestart={() => {}} />)).not.toThrow();
        if (pending(g).kind === 'ended' || guard > 3000) break;
        g = apply(g, r.pick(validInputs(g, CONTENT)), CONTENT);
      }
      expect(pending(g).kind).toBe('ended');
    }
  });
});
