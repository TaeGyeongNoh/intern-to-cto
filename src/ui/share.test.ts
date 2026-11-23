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

  it('출신이 있으면 7칸으로 왕복하고 같은 결과로 리플레이된다', () => {
    const r = createRng(77);
    let g = newGame({ name: '고졸', position: 'sre', route: 'finance', candidate: 2, education: 'highschool', service: 'industrial' }, 77, CONTENT);
    for (let guard = 0; pending(g).kind !== 'ended' && guard < 5000; guard++) g = apply(g, r.pick(validInputs(g, CONTENT)), CONTENT);
    const payload = encodeShare(g);
    const head = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0))));
    expect(head).toHaveLength(7);
    expect(decodeShare(payload)?.setup).toEqual(g.setup);
    expect(replayShare(payload, CONTENT)?.state).toEqual(g.state);
  });

  it('출신 없는 옛 5칸 링크는 기본 출신으로 디코드되어 이전과 같은 엔딩이 된다', () => {
    const g = playRandom(4);
    const payload = encodeShare(g);
    const run = decodeShare(payload)!;
    expect(run.setup.education).toBeUndefined();
    expect(run.setup.service).toBeUndefined();
    const explicit = replay({ ...run.setup, education: 'university', service: 'none' }, run.seed, run.log, CONTENT);
    expect(replayShare(payload, CONTENT)?.state.endingId).toBe(explicit.state.endingId);
    expect(replayShare(payload, CONTENT)?.state).toEqual(explicit.state);
  });

  it('7칸의 출신 칸 타입이 틀리거나 모르는 출신이면 null', () => {
    const enc = (arr: unknown[]) => `1.${btoa(JSON.stringify(arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.`;
    expect(decodeShare(enc(['a', 'sre', 'finance', 1, 5, 3, 'none']))).toBeNull();
    expect(decodeShare(enc(['a', 'sre', 'finance', 1, 5, 'grad', null]))).toBeNull();
    expect(decodeShare(enc(['a', 'sre', 'finance', 1, 5, 'grad']))).toBeNull();
    expect(decodeShare(enc(['a', 'sre', 'finance', 1, 5, 'grad', 'research']))?.setup).toMatchObject({ education: 'grad', service: 'research' });
    // 모르는 id는 디코드는 되지만 리플레이에서 실패해 새 게임으로 넘어간다
    expect(replayShare(enc(['a', 'sre', 'finance', 1, 5, 'phd', 'none']), CONTENT)).toBeNull();
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
