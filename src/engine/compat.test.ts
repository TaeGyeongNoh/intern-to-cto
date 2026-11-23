import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { pending, replay, type Input, type Setup } from './game';

/**
 * 호환성 고정: 출신(학력·병역) 필드가 생기기 전 HEAD(d647fae)에서 무작위 플레이로 기록한 판.
 * Setup에 새 필드가 없으면 기본 출신으로 해석되어 완전히 같은 결과가 나와야 한다(옛 저장·공유 링크).
 * 콘텐츠·밸런스를 바꾸면 이 기록이 깨질 수 있다. 그때는 새로 기록하되, 출신 기본값 때문에 깨지면 안 된다.
 * stateHash는 출신 묶음에서 추가된 GameState 필드(boundUntil)를 뺀 JSON의 FNV-1a 해시다.
 */
const RECORDED: { setup: Setup; seed: number; log: string; endingId: string; rngState: number; years: number; maxSalary: number; stateHash: string }[] = [
  {
    setup: { name: '호환', position: 'backend', route: 'commerce', candidate: 0 },
    seed: 4242,
    log: '20002220222021100220112100210021201120212022221022002020020210110102101120112102101212201_211001100_0011110020100_1202000020212120221212201001211202020121011001120022011100222010200013020001222120010112020000200202102220202021000',
    endingId: 'ordinary', rngState: 2684619810, years: 26, maxSalary: 9516, stateHash: 'f9dc9fd3',
  },
  {
    setup: { name: '호환', position: 'sre', route: 'finance', candidate: 2 },
    seed: 4259,
    log: '211022211200222110001220002002120113002220212202311022200210203002021211022201020020000000120001001212001020000001001200102221002000010022000011010200110112110220011212012110200100_022020001_01100120102010110001002_0011010000002221202201310021122021110100200010100100',
    endingId: 'ordinary', rngState: 3180996803, years: 26, maxSalary: 9638, stateHash: 'e152d555',
  },
  {
    setup: { name: '호환', position: 'ai', route: 'ai-startup', candidate: 1 },
    seed: 4276,
    log: '21002221110100300010222102220020111010020001301021110021000101221003011201300001201221100012002130022001202200201110212110202010001000200100000000202210110012002111021210120010002120202013100222001',
    endingId: 'keynote', rngState: 413041952, years: 26, maxSalary: 9269, stateHash: '28128f04',
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
