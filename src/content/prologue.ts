import type { GameEvent } from '../engine/types';

/**
 * 첫 해 전에 거치는 취준·인턴 프롤로그. newGame이 prologue-start를 큐에 넣고,
 * 나머지는 now로 같은 해에 이어진다. 모두 scheduledOnly라 무작위로 뜨지 않는다.
 * 'tiny-{route}'는 루트별 막차 스타트업으로 바뀐다.
 */
export const PROLOGUE_EVENTS: GameEvent[] = [
  {
    id: 'prologue-start',
    scheduledOnly: true,
    when: {},
    text: '졸업반 가을. 동기들 단톡방은 코테 후기와 자소서 첨삭 요청으로 1분마다 울린다. 너도 뭐라도 해야 한다.',
    choices: [
      { label: '코딩테스트를 판다', effects: { stats: { impl: 3, debug: 2 }, now: 'prologue-result', story: '석 달 동안 알고리즘 문제만 풀었다. 꿈에서도 DP 테이블을 채웠다.' } },
      { label: '포트폴리오 프로젝트를 만든다', effects: { stats: { design: 3, ai: 2 }, now: 'prologue-result', story: '사이드 프로젝트를 배포했다. 사용자는 나와 엄마, 두 명.' } },
      { label: '인턴부터 지원한다', effects: { now: 'prologue-intern' } },
    ],
  },
  {
    id: 'prologue-result',
    scheduledOnly: true,
    when: {},
    text: '채용 시즌이 열렸다. 지원서 제출 버튼 앞에서 커서가 깜빡인다.',
    choices: [
      { label: '공채에 지원한다', chance: { base: 0.55, stat: 'impl' }, effects: { reputation: 2, story: '서류, 코테, 면접 세 관문을 넘어 공채에 합격했다.' }, failEffects: { now: 'prologue-fail' } },
      { label: '스타트업에 바로 지원한다', effects: { company: 'tiny-{route}', stats: { impl: 1, infra: 1 }, story: '면접 다음 날부터 출근하라는 스타트업에 합류했다. 직함은 "풀스택(사실상 전부)".' } },
    ],
  },
  {
    id: 'prologue-intern',
    scheduledOnly: true,
    when: {},
    text: '인턴 8주차. 사수는 친절하지만 바쁘고, 전환 심사는 다음 주다. 회의실 예약 담당만큼은 이미 정규직급이다.',
    choices: [
      { label: '정규직 전환을 노린다', chance: { base: 0.5, stat: 'mental' }, effects: { reputation: 4, flags: ['intern-converted'], story: '인턴 끝에 정규직 전환에 성공했다.' }, failEffects: { now: 'prologue-fail', story: '전환 심사에서 "아쉽지만"으로 시작하는 메일을 받았다.' } },
      { label: '인턴 경험만 챙긴다', effects: { stats: { impl: 2, debug: 2, infra: 1 }, now: 'prologue-result', story: '인턴 경력 한 줄과 사수의 추천사를 챙겨 나왔다.' } },
    ],
  },
  {
    id: 'prologue-fail',
    scheduledOnly: true,
    when: {},
    text: '"귀하의 뛰어난 역량에도 불구하고". 이번 시즌에만 같은 문장을 몇 번째 읽는지 모르겠다.',
    choices: [
      { label: '부트캠프에 들어간다', effects: { stats: { impl: 3, design: 1, mental: 1 }, salary: -380, burnout: 5, story: '부트캠프 6개월을 버텨 겨우 신입 자리를 얻었다. 연봉 협상은 건너뛰었다.' } },
      { label: '스타트업 막차를 탄다', effects: { company: 'tiny-{route}', story: '채용 공고 마감 10분 전, 작은 스타트업에 막차로 합류했다.' } },
      { label: '프리랜서로 버틴다', effects: { stats: { mental: 4 }, burnout: 10, flags: ['freelancer-start'], story: '외주 세 건을 쳐내며 버티다 신입 자리에 들어갔다. 세금 신고는 이제 혼자서도 한다.' } },
    ],
  },
];
