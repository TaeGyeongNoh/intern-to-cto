import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { pending, replay, type Input, type Setup } from './game';

/**
 * 호환성 고정: 출신(학력·병역) 필드가 생기기 전 HEAD(d647fae)에서 무작위 플레이로 기록한 판.
 * Setup에 새 필드가 없으면 기본 출신으로 해석되어 완전히 같은 결과가 나와야 한다(옛 저장·공유 링크).
 * 콘텐츠·밸런스를 바꾸면 이 기록이 깨질 수 있다. 그때는 새로 기록하되, 출신 기본값 때문에 깨지면 안 된다.
 * 흔한 끝 엔딩(스태프·팀장·시니어)이 생기면서 첫 판은 엔딩만 ordinary → team-lead로 바뀌었다(rng·연차·연봉은 그대로).
 * 주거 물건 값을 현실화(전세 8,000·내 집 11,000·전기차 4,000)하면서 새로 기록했다 (기본 출신 셋업 그대로).
 * stateHash는 출신 묶음에서 추가된 GameState 필드(boundUntil)를 뺀 JSON의 FNV-1a 해시다.
 */
const RECORDED: { setup: Setup; seed: number; log: string; endingId: string; rngState: number; years: number; maxSalary: number; stateHash: string }[] = [
  {
    setup: { name: '호환', position: 'backend', route: 'commerce', candidate: 0 },
    seed: 4242,
    log: '211022212210222002220030100000222012102221211022212100222102220233000211010020011100111101000100002101020211212112210020103101100001021001112010000210120121200000210101211101210101002201121',
    endingId: 'burnout', rngState: 755476803, years: 19, maxSalary: 9171, stateHash: 'ce76aab',
  },
  {
    setup: { name: '호환', position: 'sre', route: 'finance', candidate: 2 },
    seed: 4259,
    log: '2010010130022202222102310210222022102220022201310222102221022201021030011_21100_20131020012100012201200012101022120300031003010002000112101220212001_22103011102110122001110110022100110021202031021210100101201012202021021100011001010',
    endingId: 'staff', rngState: 2932808315, years: 26, maxSalary: 10778, stateHash: '59dcd384',
  },
  {
    setup: { name: '호환', position: 'ai', route: 'ai-startup', candidate: 1 },
    seed: 4276,
    log: '2100222021300222123210100022013202221102212000212100100220211220_2020220010012013000_010110103002121012001310021120130022212230110021220013021210120222111221000100222010002221102111211112031001000011031022212000010120021001120000011221001201210012212',
    endingId: 'keynote', rngState: 2868867135, years: 26, maxSalary: 9483, stateHash: '7641c3ed',
  },
];

const NEW_FIELDS = ['boundUntil'];
const fnv = (str: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
};
const parseLog = (log: string): Input[] => [...log].map((ch) => (ch === '_' ? { t: 'ask' } : { t: 'pick', i: parseInt(ch, 36) }));

describe('옛 기록 호환', () => {
  for (const r of RECORDED) {
    it(`${r.setup.position}/${r.setup.route} seed ${r.seed}: 같은 엔딩·rng·상태`, () => {
      const g = replay(r.setup, r.seed, parseLog(r.log), CONTENT);
      expect(pending(g).kind).toBe('ended');
      expect(g.state.endingId).toBe(r.endingId);
      expect(g.rngState).toBe(r.rngState);
      expect(g.state.record.history.length).toBe(r.years);
      expect(g.state.maxSalary).toBe(r.maxSalary);
      const rest = Object.fromEntries(Object.entries(g.state).filter(([k]) => !NEW_FIELDS.includes(k)));
      expect(fnv(JSON.stringify(rest))).toBe(r.stateHash);
    });
  }
});
