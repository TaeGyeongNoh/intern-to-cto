import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { apply, newGame, pending, replay, validInputs, type Game } from '../engine/game';
import { createRng } from '../engine/rng';
import { decodeShare, encodeShare, replayShare, shareUrl } from './share';

function playRandom(seed: number, name = '김개발'): Game {
  const r = createRng(seed * 17 + 3);
  const routes = ['commerce', 'finance', 'ai-startup'] as const;
  const positions = ['backend', 'frontend', 'sre', 'ai'] as const;
  let g = newGame({ name, position: positions[seed % 4], route: routes[seed % 3], candidate: seed % 3 }, seed, CONTENT);
  for (let guard = 0; pending(g).kind !== 'ended' && guard < 5000; guard++) g = apply(g, r.pick(validInputs(g, CONTENT)), CONTENT);
  return g;
}

describe('share link', () => {
  it('끝난 게임을 인코딩 → 디코딩 → 리플레이하면 같은 결과', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const g = playRandom(seed, seed % 2 ? '김개발 🚀' : 'Ada');
      expect(pending(g).kind).toBe('ended');
      const payload = encodeShare(g);
      expect(payload).toMatch(/^1\.[A-Za-z0-9_-]+\.[0-9a-z_]*$/);
      const run = decodeShare(payload)!;
      expect(run.setup).toEqual(g.setup);
      expect(run.seed).toBe(g.seed);
      expect(run.log).toEqual(g.log);
      const again = replay(run.setup, run.seed, run.log, CONTENT);
      expect(again.state.endingId).toBe(g.state.endingId);
      expect(again.state).toEqual(g.state);
      expect(replayShare(payload, CONTENT)?.state).toEqual(g.state);
    }
  });

  it('ask 입력도 왕복한다', () => {
    const run = decodeShare(encodeShare({ setup: { name: 'a', position: 'sre', route: 'finance', candidate: 1 }, seed: 5, log: [{ t: 'pick', i: 0 }, { t: 'ask' }, { t: 'pick', i: 35 }] }));
    expect(run?.log).toEqual([{ t: 'pick', i: 0 }, { t: 'ask' }, { t: 'pick', i: 35 }]);
  });

  it('pick 인덱스가 36 이상이면 인코딩하지 않는다', () => {
    expect(() => encodeShare({ setup: { name: 'a', position: 'sre', route: 'finance', candidate: 1 }, seed: 5, log: [{ t: 'pick', i: 36 }] })).toThrow();
  });

  it('이름은 생성 화면 입력과 같은 10자(UTF-16) 제한', () => {
    const run = (name: string) => decodeShare(encodeShare({ setup: { name, position: 'sre', route: 'finance', candidate: 1 }, seed: 5, log: [] }));
    expect(run('가나다라마바사아자차')?.setup.name).toBe('가나다라마바사아자차');
    expect(run('🚀🚀🚀🚀🚀')?.setup.name).toBe('🚀🚀🚀🚀🚀'); // 이모지 하나 = 2 유닛
    expect(run('가나다라마바사아자차카')).toBeNull();
    expect(run('🚀🚀🚀🚀🚀a')).toBeNull();
  });

  it('깨진 입력은 null', () => {
    const good = encodeShare(playRandom(3));
    const [, head, log] = good.split('.');
    for (const bad of [
      null, '', 'nope', '1', '1..', `2.${head}.${log}`, `1.${head}`, `1.${head}.${log}.x`,
      `1.${head}.${log}A`, `1.${head}.${log}!`, `1.%%%.${log}`, `1.${head.slice(0, -3)}.${log}`,
      `1.${btoa('{"a":1}')}.0`, `1.${btoa('[1,2,3,4,5]')}.0`,
    ]) expect(decodeShare(bad)).toBeNull();
  });

  it('디코딩은 되지만 리플레이가 깨지거나 끝나지 않으면 replayShare는 null', () => {
    const g = playRandom(4);
    const [v, head, log] = encodeShare(g).split('.');
    expect(replayShare(`${v}.${head}.${log.slice(0, -5)}`, CONTENT)).toBeNull(); // 끝나지 않음
    expect(replayShare(`${v}.${head}.${log}zzzz`, CONTENT)).toBeNull(); // 잘못된 입력
  });

  it('공유 URL 예시', () => {
    const url = shareUrl(playRandom(7), { origin: 'https://taegyeongnoh.github.io', pathname: '/intern-to-cto/' });
    console.log(`share url (${url.length} chars): ${url}`);
    expect(url.length).toBeLessThan(2000);
  });
});
