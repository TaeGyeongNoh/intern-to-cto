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
  // 출신별 첫 장면. 모두 prologue-result·prologue-fail로 합류하거나 첫 회사를 정하고 끝난다.
  {
    id: 'prologue-highschool',
    scheduledOnly: true,
    when: {},
    text: '현장실습 3개월 차. 친구들은 수능 기출을 풀고, 너는 운영 서버 로그를 푼다.',
    choices: [
      { label: '실습 회사에 그대로 남는다', effects: { company: 'tiny-{route}', stats: { infra: 2, debug: 1 }, story: '실습 마지막 날, 대표님이 사원증을 새로 뽑아 줬다.' } },
      { label: '공채 고졸 전형에 도전한다', chance: { base: 0.45, stat: 'impl' }, effects: { reputation: 3, story: '고졸 전형 공채에 붙었다. 입사 동기 중 막내다.' }, failEffects: { now: 'prologue-fail' } },
      { label: '코딩테스트부터 판다', effects: { stats: { impl: 2, debug: 2 }, now: 'prologue-result', story: '실습 일지 쓰는 틈틈이 백준 티어를 올렸다.' } },
    ],
  },
  {
    id: 'prologue-grad',
    scheduledOnly: true,
    when: {},
    text: '논문 심사 D-14. 교수님이 박사 과정 얘기를 슬쩍 꺼낸다. 이번이 세 번째 슬쩍이다.',
    choices: [
      { label: '석사 우대 공채에 지원한다', chance: { base: 0.6, stat: 'design' }, effects: { reputation: 3, story: '석사 우대 전형으로 입사했다. 논문은 아무도 안 물어봤다.' }, failEffects: { now: 'prologue-fail' } },
      { label: '연구실 선배 스타트업에 합류한다', effects: { company: 'tiny-{route}', stats: { ai: 2 }, story: '선배가 "딱 1년만"이라며 불렀다. 그 1년은 아직 안 끝났다.' } },
      { label: '박사는 정중히 거절하고 코테를 판다', effects: { stats: { impl: 2 }, now: 'prologue-result', story: '교수님께 박사 대신 감사 인사를 드렸다. 그날부터 코테를 팠다.' } },
    ],
  },
  {
    id: 'prologue-switch',
    scheduledOnly: true,
    when: {},
    text: '부트캠프 수료 D-30. 전 직장 동기들은 대리를 달았고, 너는 오늘 처음으로 rebase 충돌을 혼자 풀었다.',
    choices: [
      { label: '수료 프로젝트에 올인한다', effects: { stats: { design: 2, ai: 2 }, now: 'prologue-result', story: '수료 프로젝트로 데모데이 1등을 했다. 상품은 키보드.' } },
      { label: '전 직장 도메인을 무기로 지원한다', chance: { base: 0.5, stat: 'mental' }, effects: { reputation: 3, story: '면접관이 내 전 직장 이야기에서 눈을 반짝였다.' }, failEffects: { now: 'prologue-result' } },
    ],
  },
  {
    id: 'prologue-service-industrial',
    scheduledOnly: true,
    when: {},
    text: '병역지정업체 목록을 펼쳤다. 3년을 다닐 회사라 점심 메뉴 고를 때보다 진지해진다.',
    choices: [
      { label: '규모 있는 지정업체에 지원한다', chance: { base: 0.5, stat: 'impl' }, effects: { bound: 3, story: '산업기능요원으로 일하게 됐다. 앞으로 34개월은 이 회사가 곧 병역이다.' }, failEffects: { company: 'tiny-{route}', bound: 3, story: '결국 작은 지정업체에 자리를 얻었다.' } },
      { label: '작은 지정업체에 바로 들어간다', effects: { company: 'tiny-{route}', bound: 3, stats: { impl: 1, infra: 1 }, story: '직원 일곱 명 회사에서 서버, 프론트, 프린터 수리까지 맡았다.' } },
    ],
  },
  {
    id: 'prologue-service-research',
    scheduledOnly: true,
    when: {},
    text: '전문연구요원 TO가 난 곳은 세 군데. 경쟁률이 내 논문 인용 수보다 높다.',
    choices: [
      { label: '기업 부설 연구소에 지원한다', chance: { base: 0.55, stat: 'ai' }, effects: { bound: 3, stats: { ai: 2 }, story: '기업 부설 연구소에서 전문연구요원으로 복무를 시작했다.' }, failEffects: { company: 'tiny-{route}', bound: 3, story: '연구실 스핀오프로 복무지를 옮겼다.' } },
      { label: '연구실 스핀오프에 합류한다', effects: { company: 'tiny-{route}', bound: 3, stats: { ai: 3 }, story: '교수님 회사에서 복무를 시작했다. 출근 첫날 회의 주제는 논문이었다.' } },
    ],
  },
];
