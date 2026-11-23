import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { pending, replay, type Input, type Setup } from './game';

/**
 * 호환성 고정: 출신(학력·병역) 필드가 생기기 전 HEAD(d647fae)에서 무작위 플레이로 기록한 판.
 * Setup에 새 필드가 없으면 기본 출신으로 해석되어 완전히 같은 결과가 나와야 한다(옛 저장·공유 링크).
 * 콘텐츠·밸런스를 바꾸면 이 기록이 깨질 수 있다. 그때는 새로 기록하되, 출신 기본값 때문에 깨지면 안 된다.
 * 흔한 끝 엔딩(스태프·팀장·시니어)이 생기면서 첫 판은 엔딩만 ordinary → team-lead로 바뀌었다(rng·연차·연봉은 그대로).
 * 주거 물건 값을 현실화(전세 8,000·내 집 11,000·전기차 4,000)하면서 새로 기록했다 (기본 출신 셋업 그대로).
 * 투자 묶음(시장 분위기 rng, 투자 금액 단계로 상점 입력 인덱스가 바뀜)에서 다시 기록했다.
 * stateHash는 출신 묶음에서 추가된 GameState 필드(boundUntil)를 뺀 JSON의 FNV-1a 해시다.
 */
const RECORDED: { setup: Setup; seed: number; log: string; endingId: string; rngState: number; years: number; maxSalary: number; stateHash: string }[] = [
  {
    setup: { name: '호환', position: 'backend', route: 'commerce', candidate: 0 },
    seed: 4242,
    log: '21102221251022200222002200000222002900222120202221210810160010018100021101000112020010120002120002020302121120211620_02010_1110011011201030_20201002101_011110001120012320016101110100210620102120150021201102100500230122121',
    endingId: 'ai-replaced', rngState: 164853430, years: 24, maxSalary: 9198, stateHash: '29079b28',
  },
  {
    setup: { name: '호환', position: 'sre', route: 'finance', candidate: 2 },
    seed: 4259,
    log: '20100302221170222002210500222102221024100910012101001020010111010202114012211002111216100121001012112005001410_2220204014042090002001111100022211021122111012002110011400040012002120130020102022000610100020702011260022020',
    endingId: 'team-lead', rngState: 4068597261, years: 26, maxSalary: 10015, stateHash: 'cd8efdf1',
  },
  {
    setup: { name: '호환', position: 'ai', route: 'ai-startup', candidate: 1 },
    seed: 4276,
    log: '2100222021900081061030022012222120100400222001600202101220215010500222100910122121200200201122002402121012211016101220222212370004001220082011210050222110610001000800010022121100111112111092011010112121080222000010222016001220012211',
    endingId: 'founder-fail', rngState: 21818470, years: 26, maxSalary: 8503, stateHash: '8d3a371e',
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
