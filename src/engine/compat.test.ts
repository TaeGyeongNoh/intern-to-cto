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
 * 신입은 핵심 담당(owner)을 못 맡게 하면서(OWNER_MIN_YEARS) 다시 기록했다.
 * stateHash는 출신 묶음에서 추가된 GameState 필드(boundUntil)를 뺀 JSON의 FNV-1a 해시다.
 */
const RECORDED: { setup: Setup; seed: number; log: string; endingId: string; rngState: number; years: number; maxSalary: number; stateHash: string }[] = [
  {
    setup: { name: '호환', position: 'backend', route: 'commerce', candidate: 0 },
    seed: 4242,
    log: '21102010222023200213002020004001121242022211220122802220110000121202001601001009000020220000001000210302011112201221209001_111108001120101112200100211020111900010102011211150210101001206105022201100101010002000',
    endingId: 'keynote', rngState: 3316455480, years: 26, maxSalary: 9170, stateHash: '8ad54b4e',
  },
  {
    setup: { name: '호환', position: 'sre', route: 'finance', candidate: 2 },
    seed: 4259,
    log: '20100302221121212200222102220210027002200221202500001001010140010202250022211200800281000112010022202001021210902221011200190010210030212002900810131021111003001210114000101120221001000001110710001101001202',
    endingId: 'keynote', rngState: 789112817, years: 26, maxSalary: 9520, stateHash: '4ec7072f',
  },
  {
    setup: { name: '호환', position: 'ai', route: 'ai-startup', candidate: 1 },
    seed: 4276,
    log: '2100222021900110222120500122122910202002217001200202100150021210111002100900122121201080012202212021201011024021210110302221222001013201021111210310022110022001120106000021180102016202111022001030040222021180100222022210102120',
    endingId: 'ordinary', rngState: 3308879214, years: 26, maxSalary: 8527, stateHash: '8ee92b43',
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
