import { createRng, type Rng } from '../../../engine/rng';
import { hashKey } from '../data';

/** 위젯 전용 결정적 난수. 같은 (k, salt)면 항상 같은 수열이다. */
export function rngFor(k: string, salt: string): Rng {
  return createRng(hashKey(`${k}:${salt}`));
}

/** 키로 정해지는 "지금" 시각(초 단위, 하루 안). 09:00~20:59 사이, 분 단위로 맞춘다. */
export function nowSec(k: string): number {
  const r = rngFor(k, 'clock');
  return (9 + r.int(0, 11)) * 3600 + r.int(0, 59) * 60;
}

const p2 = (n: number) => String(n).padStart(2, '0');
const p3 = (n: number) => String(n).padStart(3, '0');
const wrap = (sec: number) => ((sec % 86400) + 86400) % 86400;

export function hhmm(sec: number): string {
  const s = wrap(Math.floor(sec));
  return `${p2(Math.floor(s / 3600))}:${p2(Math.floor((s % 3600) / 60))}`;
}

export function hhmmss(sec: number): string {
  const s = wrap(Math.floor(sec));
  return `${hhmm(s)}:${p2(s % 60)}`;
}

/** ms 단위 시각 → HH:mm:ss.SSS */
export function clockMs(ms: number): string {
  const total = Math.floor(ms);
  return `${hhmmss(Math.floor(total / 1000))}.${p3(((total % 1000) + 1000) % 1000)}`;
}

/** 1,234 형태 */
export const num = (n: number) => Math.round(n).toLocaleString('en-US');

/** 소문자+숫자 랜덤 접미사 (파드 이름 등) */
export function suffix(r: Rng, len: number): string {
  const chars = 'bcdfghjklmnpqrstvwxz2456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[r.int(0, chars.length - 1)];
  return out;
}

/** Fisher-Yates. 엔진마다 sort 구현이 달라도 같은 결과가 나온다. */
export function shuffle<T>(r: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
