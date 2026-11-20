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

describe('EndingScreen 공유 모드', () => {
  it('공유된 커리어 배너와 공유 버튼이 렌더된다', async () => {
    const { EndingScreen } = await import('./screens/EndingScreen');
    const r = createRng(99);
    let g = newGame({ name: '공유왕', position: 'backend', route: 'finance', candidate: 0 }, 9, CONTENT);
    while (pending(g).kind !== 'ended') g = apply(g, r.pick(validInputs(g, CONTENT)), CONTENT);
    const html = renderToString(<EndingScreen game={g} shared onRestart={() => {}} />);
    expect(html).toContain('공유왕님의 커리어');
    expect(html).toContain('나도 해보기');
    expect(html).toContain('카드 저장');
    expect(html).toContain('링크 복사');
  });
});
