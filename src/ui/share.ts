import { pending, replay, type Game, type Input, type Setup } from '../engine/game';
import { DEFAULT_EDUCATION, DEFAULT_SERVICE } from '../engine/origin';
import type { Content } from '../engine/types';

/**
 * 결과 공유 링크: `?r=1.<base64url(JSON [name, position, route, candidate, seed, education?, service?])>.<log>`
 * 출신(education, service)이 Setup에 있으면 7칸, 없으면(출신 이전 판) 5칸이다. 디코드는 둘 다 받는다.
 * log는 입력 하나당 한 글자 — pick i → base36 숫자(0-9a-z), ask → '_'.
 * ('a'는 base36의 10과 겹쳐서 ask에는 '_'를 쓴다.)
 */
export const SHARE_PARAM = 'r';
const VERSION = '1';
const ASK = '_';
/** 생성 화면 이름 입력(maxLength=10)과 같은 기준 — UTF-16 코드 유닛 수 */
const MAX_NAME = 10;

export type SharedRun = { setup: Setup; seed: number; log: Input[] };

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64url');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

export function encodeShare(g: Pick<Game, 'setup' | 'seed' | 'log'>): string {
  const { name, position, route, candidate, education, service } = g.setup;
  const base = [name, position, route, candidate, g.seed];
  const origin = education !== undefined || service !== undefined ? [education ?? DEFAULT_EDUCATION, service ?? DEFAULT_SERVICE] : [];
  const head = b64urlEncode(JSON.stringify([...base, ...origin]));
  const log = g.log
    .map((input) => {
      if (input.t === 'ask') return ASK;
      if (!Number.isInteger(input.i) || input.i < 0 || input.i >= 36) throw new Error(`pick index out of range: ${input.i}`);
      return input.i.toString(36);
    })
    .join('');
  return `${VERSION}.${head}.${log}`;
}

export function decodeShare(raw: string | null | undefined): SharedRun | null {
  if (!raw) return null;
  try {
    const parts = raw.split('.');
    if (parts.length !== 3 || parts[0] !== VERSION) return null;
    const [, head, logStr] = parts;
    if (!/^[0-9a-z_]*$/.test(logStr)) return null;
    const arr: unknown = JSON.parse(b64urlDecode(head));
    if (!Array.isArray(arr) || (arr.length !== 5 && arr.length !== 7)) return null;
    const [name, position, route, candidate, seed, education, service] = arr;
    if (arr.length === 7 && (typeof education !== 'string' || typeof service !== 'string')) return null;
    if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME) return null;
    if (typeof position !== 'string' || typeof route !== 'string') return null;
    if (!Number.isInteger(candidate) || !Number.isInteger(seed)) return null;
    const log: Input[] = [...logStr].map((ch) => (ch === ASK ? { t: 'ask' } : { t: 'pick', i: parseInt(ch, 36) }));
    const setup = { name, position, route, candidate, ...(arr.length === 7 ? { education, service } : {}) } as Setup;
    return { setup, seed: seed as number, log };
  } catch {
    return null;
  }
}

/** 공유 페이로드를 리플레이해서 끝난 게임이면 돌려준다. 하나라도 어긋나면 null. */
export function replayShare(raw: string | null | undefined, c: Content): Game | null {
  const run = decodeShare(raw);
  if (!run) return null;
  try {
    const g = replay(run.setup, run.seed, run.log, c);
    return pending(g).kind === 'ended' && g.state.endingId ? g : null;
  } catch {
    return null;
  }
}

/** 현재 페이지 주소 기준 공유 URL (해시·기존 쿼리는 버린다) */
export function shareUrl(g: Game, loc: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  return `${loc.origin}${loc.pathname}?${SHARE_PARAM}=${encodeShare(g)}`;
}
