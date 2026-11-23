import type { GameEvent } from '../engine/types';

const GENERAL: GameEvent[] = [
  {
    id: 'adopt-commerce',
    when: { route: ['commerce'], missingCards: ['apm', 'browser'] },
    once: false,
    weight: 3,
    text: '장애 때마다 서버에 들어가 로그만 뒤지는 팀. 모니터링 도입을 건의해 볼까?',
    choices: [
      { label: 'APM 도입을 제안한다', chance: { base: 0.45, stat: 'design' }, effects: { addCards: ['apm'], traits: { 관측성전도사: 1 }, story: '팀에 APM을 도입했다.' }, failEffects: { reputation: -1 } },
      { label: '브라우저 모니터링 도입을 제안한다', chance: { base: 0.5, stat: 'design' }, effects: { addCards: ['browser'], traits: { 관측성전도사: 1 } }, failEffects: { reputation: -1 } },
      { label: '지금은 기능 개발이 먼저다', effects: {} },
    ],
  },
  {
    id: 'adopt-finance',
    when: { route: ['finance'], missingCards: ['db', 'apm'] },
    once: false,
    weight: 3,
    text: '감사 시즌마다 "그때 DB에서 무슨 일이 있었냐"는 질문에 아무도 답을 못 한다.',
    choices: [
      { label: 'DB 모니터링 도입을 제안한다', chance: { base: 0.45, stat: 'design' }, effects: { addCards: ['db'], traits: { 관측성전도사: 1 }, story: 'DB 모니터링을 도입했다.' }, failEffects: { reputation: -1 } },
      { label: 'APM 도입을 제안한다', chance: { base: 0.4, stat: 'design' }, effects: { addCards: ['apm'], traits: { 관측성전도사: 1 } }, failEffects: { reputation: -1 } },
      { label: '엑셀로 수기 보고한다', effects: { burnout: 5 } },
    ],
  },
  {
    id: 'adopt-ai',
    when: { route: ['ai-startup'], missingCards: ['ai-agent-obs', 'gpu', 'whatap-ai'] },
    once: false,
    weight: 3,
    text: '에이전트가 무슨 짓을 하는지 아무도 모른다. 청구서만 매달 늘어난다.',
    choices: [
      { label: 'AI Agent Observability 도입을 제안한다', chance: { base: 0.45, stat: 'design' }, effects: { addCards: ['ai-agent-obs'], traits: { 관측성전도사: 1 }, story: 'AI Agent Observability를 도입했다.' }, failEffects: { reputation: -1 } },
      { label: 'GPU 모니터링 도입을 제안한다', chance: { base: 0.5, stat: 'infra' }, effects: { addCards: ['gpu'], traits: { 관측성전도사: 1 } }, failEffects: { reputation: -1 } },
      { label: '와탭 AI 도입을 제안한다', chance: { base: 0.35, stat: 'ai' }, effects: { addCards: ['whatap-ai'], traits: { 관측성전도사: 1 } }, failEffects: { reputation: -1 } },
      { label: '감으로 버틴다', effects: {} },
    ],
  },
  {
    id: 'lead-offer',
    when: { minOvr: 60, minCareerYear: 5, track: 'ic' },
    text: '팀장 자리가 비었다. 위에서 네 이름이 나온다.',
    choices: [
      { label: '팀장을 맡는다', effects: { track: 'mgmt', burnout: 5, story: '팀장을 맡았다.' } },
      { label: '코드를 계속 짜고 싶다', effects: { stats: { impl: 2, design: 1 } } },
    ],
  },
  {
    id: 'keynote',
    when: { minOvr: 65 },
    once: false,
    weight: 2,
    text: '개발자 컨퍼런스에서 발표 제안이 왔다.',
    choices: [
      { label: '발표한다', chance: { base: 0.5, stat: 'mental' }, effects: { traits: { keynote: 1 }, reputation: 5, story: '컨퍼런스 무대에 섰다.' }, failEffects: { reputation: -2, burnout: 5 } },
      { label: '정중히 거절한다', effects: {} },
    ],
  },
  {
    id: 'founder-offer',
    weight: 0.4,
    when: { route: ['commerce', 'finance', 'ai-startup'], minOvr: 62, minCareerYear: 8, notFlags: ['founder'] },
    text: '전 동료가 같이 창업하자고 한다. 아이템은 "AI 에이전트용 무언가".',
    choices: [
      { label: '창업한다', effects: { flags: ['founder'], company: 'founder-{route}', burnout: 10, story: '회사를 나와 창업했다.' } },
      { label: '회사에 남는다', effects: {} },
    ],
  },
  {
    id: 'founder-runway',
    weight: 3,
    when: { flags: ['founder'], minYearsAtCompany: 1 },
    text: '통장 잔고를 월 고정비로 나눠 봤다. 런웨이 7개월. 엑셀이 계산을 두 번 해 줬는데 답이 같다.',
    choices: [
      { label: '대표 월급을 반납한다', effects: { salary: -600, burnout: 5, story: '대표 월급을 반납했다. 팀원들 월급날은 지켰다.' } },
      { label: '외주를 받아 버틴다', effects: { stats: { impl: 2 }, burnout: 8 } },
      { label: '투자사 문을 두드린다', chance: { base: 0.4, stat: 'design' }, effects: { reputation: 3 }, failEffects: { burnout: 6 } },
    ],
  },
  {
    id: 'ai-replacement',
    when: { minCalendarYear: 2034, maxStat: { ai: 50 } },
    text: 'AI 에이전트가 팀 업무의 절반을 맡기 시작했다. 다음 조직 개편 명단에 네 이름이 있다는 소문이 돈다.',
    choices: [
      { label: 'AI 활용을 미친 듯이 공부한다', effects: { stats: { ai: 8 }, burnout: 15 } },
      { label: '실력으로 버틴다', chance: { base: 0.4, stat: 'debug' }, effects: { reputation: -2 }, failEffects: { flags: ['replaced-by-ai'], retire: true, story: 'AI에 자리를 내줬다.' } },
    ],
  },
  {
    id: 'rest',
    when: { minBurnout: 60 },
    once: false,
    weight: 4,
    text: '알람 소리만 들어도 심장이 뛴다.',
    choices: [
      { label: '안식 휴가를 쓴다', effects: { burnout: -35, reputation: -2 } },
      { label: '참고 일한다', effects: { burnout: 5 } },
    ],
  },
];

const AI_CHATBOT_ARC: GameEvent[] = [
  {
    id: 'ai-chatbot-1',
    arc: 'ai-chatbot',
    when: { route: ['ai-startup', 'commerce'], minCareerYear: 1 },
    weight: 2,
    text: '대표가 "우리도 AI 상담봇 하자"고 한다. 출시는 다음 분기.',
    choices: [
      { label: '적극적으로 맡는다', effects: { stats: { ai: 2 }, flags: ['chatbot'], next: 'ai-chatbot-2' } },
      { label: '관측성부터 깔자고 제안한다', chance: { base: 0.5, stat: 'design' }, effects: { addCards: ['ai-agent-obs'], traits: { 관측성전도사: 1 }, flags: ['chatbot'], next: 'ai-chatbot-2' }, failEffects: { flags: ['chatbot'], next: 'ai-chatbot-2' } },
      { label: '회의적으로 빠진다', effects: {} },
    ],
  },
  {
    id: 'ai-chatbot-2',
    arc: 'ai-chatbot',
    scheduledOnly: true,
    when: {},
    text: '출시 2주 만에 챗봇이 없는 환불 정책을 안내했다. 커뮤니티에 캡처가 돈다.',
    choices: [
      { label: 'AI Agent Observability로 프롬프트를 추적한다', requires: { card: 'ai-agent-obs' }, effects: { reputation: 6, stats: { ai: 2, debug: 2 }, traits: { 관측성전도사: 1 }, next: 'ai-chatbot-3a', story: '챗봇 환각 사고의 원인을 하루 만에 찾아냈다.' } },
      { label: '일단 챗봇을 끈다', effects: { reputation: -4, next: 'ai-chatbot-3b' } },
      { label: '로그를 밤새 뒤진다', chance: { base: 0.3, stat: 'debug' }, effects: { reputation: 2, burnout: 10, next: 'ai-chatbot-3a' }, failEffects: { reputation: -6, burnout: 12, next: 'ai-chatbot-3b' } },
    ],
  },
  {
    id: 'ai-chatbot-3a',
    arc: 'ai-chatbot',
    scheduledOnly: true,
    when: {},
    text: '챗봇이 안정되자 회사가 AI 플랫폼 팀을 만든다. 리드를 맡아 달라고 한다.',
    choices: [
      { label: 'AI 플랫폼 리드를 맡는다', effects: { track: 'mgmt', reputation: 5, story: 'AI 플랫폼 팀 리드가 됐다.' } },
      { label: 'IC로 남아 깊게 판다', effects: { stats: { ai: 4, design: 2 } } },
    ],
  },
  {
    id: 'ai-chatbot-3b',
    arc: 'ai-chatbot',
    scheduledOnly: true,
    when: {},
    text: '챗봇 사고 이후 회사 분위기가 싸늘하다.',
    choices: [
      { label: '조용히 이직을 준비한다', effects: { reputation: -2, burnout: -10 } },
      { label: '사후 관측성 도입을 주도한다', chance: { base: 0.5, stat: 'design' }, effects: { addCards: ['ai-agent-obs'], traits: { 관측성전도사: 1 }, reputation: 3 }, failEffects: { burnout: 8 } },
    ],
  },
];

const BLACKFRIDAY_ARC: GameEvent[] = [
  {
    id: 'blackfriday-1',
    arc: 'blackfriday',
    when: { route: ['commerce'], minCareerYear: 2 },
    weight: 2,
    text: '블랙프라이데이 D-30. 대표가 전사 회의에서 선언했다. "올해 목표는 작년 트래픽의 다섯 배!" 작년엔 두 배에서 터졌다.',
    choices: [
      { label: '부하 테스트와 대시보드부터 준비한다', chance: { base: 0.45, stat: 'infra', card: 'apm' }, effects: { stats: { infra: 2 }, flags: ['bf-ready'], now: 'blackfriday-2', story: '블프 한 달 전부터 부하 테스트를 돌렸다.' }, failEffects: { burnout: 6, now: 'blackfriday-2' } },
      { label: '브라우저 모니터링을 미리 깔아 둔다', chance: { base: 0.5, stat: 'design' }, effects: { addCards: ['browser'], traits: { 관측성전도사: 1 }, now: 'blackfriday-2' }, failEffects: { reputation: -1, now: 'blackfriday-2' } },
      { label: '서버만 두 배로 늘려 둔다', effects: { now: 'blackfriday-2' } },
      { label: '블프는 마케팅팀 행사다', effects: { burnout: -3 } },
    ],
  },
  {
    id: 'blackfriday-2',
    arc: 'blackfriday',
    scheduledOnly: true,
    when: {},
    text: '블프 당일 0시 0분. 트래픽이 일곱 배로 치솟고, "결제 페이지가 하얘요" 제보가 쏟아진다. 마케팅팀은 이미 샴페인을 땄다.',
    choices: [
      { label: 'APM 히트맵으로 병목을 찾는다', requires: { card: 'apm' }, effects: { reputation: 6, stats: { debug: 2 }, traits: { 관측성전도사: 1 }, next: 'blackfriday-3a', story: '블프 자정, 히트맵에서 병목을 찾아 10분 만에 결제를 살렸다.' } },
      { label: '브라우저 에러로 프론트를 의심한다', requires: { card: 'browser' }, effects: { reputation: 5, stats: { debug: 1, impl: 1 }, traits: { 관측성전도사: 1 }, next: 'blackfriday-3a', story: '블프 자정, 브라우저 에러 화면에서 결제 스크립트 오류를 바로 잡았다.' } },
      { label: '감으로 서버를 계속 늘린다', chance: { base: 0.3, stat: 'infra' }, effects: { burnout: 8, next: 'blackfriday-3a' }, failEffects: { reputation: -5, burnout: 12, next: 'blackfriday-3b', story: '블프 당일 결제가 두 시간 멈췄다. 서버는 끝까지 한가했다.' } },
    ],
  },
  {
    id: 'blackfriday-3a',
    arc: 'blackfriday',
    scheduledOnly: true,
    when: {},
    text: '작년 블프가 매출 신기록으로 끝났다. 올해 블프 준비 TF의 리드 자리가 네 앞에 놓였다.',
    choices: [
      { label: '리드를 맡고 성과급도 챙긴다', effects: { salary: 400, reputation: 3, burnout: 6, story: '블프 성과로 성과급을 받고 블프 TF 리드가 됐다.' } },
      { label: '작년 대응을 문서로 남겨 공유한다', effects: { reputation: 4, traits: { 문화: 1 }, stats: { design: 1 } } },
    ],
  },
  {
    id: 'blackfriday-3b',
    arc: 'blackfriday',
    scheduledOnly: true,
    when: {},
    text: '작년 블프 장애는 "결제 대란"이라는 이름으로 아직도 회자된다. 올해도 블프는 온다.',
    choices: [
      { label: '관측성부터 제대로 갖추자고 설득한다', chance: { base: 0.5, stat: 'design' }, effects: { addCards: ['apm'], traits: { 관측성전도사: 1 }, reputation: 3, story: '결제 대란 이후 APM 도입을 밀어붙였다.' }, failEffects: { burnout: 6 } },
      { label: '올해 블프에는 휴가를 낸다', effects: { burnout: -10, reputation: -3 } },
    ],
  },
];

const MIGRATION_ARC: GameEvent[] = [
  {
    id: 'migration-1',
    arc: 'migration',
    when: { route: ['finance'], minCareerYear: 3 },
    weight: 2,
    text: '드디어 클라우드 이전이 결재됐다. 도장 열일곱 개, 반려 세 번, 기간 2년. 이관 TF를 꾸린다고 한다.',
    choices: [
      { label: '이관 TF에 자원한다', effects: { stats: { infra: 2 }, burnout: 4, next: 'migration-2', story: '클라우드 이전 TF에 들어갔다.' } },
      { label: '관측 도구부터 깔고 옮기자고 한다', chance: { base: 0.45, stat: 'design' }, effects: { addCards: ['apm'], traits: { 관측성전도사: 1 }, next: 'migration-2', story: '이관 전에 APM부터 깔자고 설득했다.' }, failEffects: { reputation: -1, next: 'migration-2' } },
      { label: '결재 라인에서 조용히 빠진다', effects: {} },
    ],
  },
  {
    id: 'migration-2',
    arc: 'migration',
    scheduledOnly: true,
    when: {},
    text: '이관 D-day, 일요일 새벽 4시. 전환은 끝났는데 계좌 조회가 열 번에 한 번씩 실패한다. 월요일 9시까지 다섯 시간.',
    choices: [
      { label: 'DB 락/세션부터 본다', requires: { card: 'db' }, effects: { reputation: 5, stats: { debug: 2 }, traits: { 관측성전도사: 1 }, next: 'migration-3a', story: '이관 당일 새벽, 커넥션 풀 설정 누락을 찾아 9시 전에 고쳤다.' } },
      { label: '트레이스로 구간을 쪼갠다', requires: { card: 'apm' }, effects: { reputation: 5, stats: { debug: 1, infra: 1 }, traits: { 관측성전도사: 1 }, next: 'migration-3a', story: '이관 당일 새벽, 트레이스로 느린 구간을 찾아 9시 전에 고쳤다.' } },
      { label: '전 서버 로그를 grep한다', chance: { base: 0.3, stat: 'debug' }, effects: { burnout: 10, next: 'migration-3a' }, failEffects: { burnout: 12, next: 'migration-3b' } },
      { label: '롤백을 외친다', effects: { reputation: -2, next: 'migration-3b', story: '이관 당일 롤백했다. 2년짜리 프로젝트가 1년 더 늘었다.' } },
    ],
  },
  {
    id: 'migration-3a',
    arc: 'migration',
    scheduledOnly: true,
    when: {},
    text: '감사 시즌. 감사관이 묻는다. "작년 이관 당일 새벽 4시에서 9시 사이, 정확히 무슨 일이 있었습니까?"',
    choices: [
      { label: '그날의 기록을 그대로 보여 준다', effects: { reputation: 6, story: '클라우드 이전 감사를 기록 한 장으로 통과했다.' } },
      { label: '보고서를 직접 다시 쓴다', effects: { stats: { design: 2 }, reputation: 3, burnout: 5 } },
    ],
  },
  {
    id: 'migration-3b',
    arc: 'migration',
    scheduledOnly: true,
    when: {},
    text: '감사 시즌. "이관 당일 무슨 일이 있었는지" 묻는데, 남은 건 단톡방 캡처와 흐릿한 기억뿐이다.',
    choices: [
      { label: '엑셀로 타임라인을 재구성한다', chance: { base: 0.4, stat: 'mental' }, effects: { reputation: 2, burnout: 8 }, failEffects: { reputation: -5, burnout: 10, story: '감사 지적 사항에 이름이 올랐다.' } },
      { label: '다음엔 기록부터 남기자고 제안한다', chance: { base: 0.5, stat: 'design' }, effects: { addCards: ['db'], traits: { 관측성전도사: 1 } }, failEffects: { reputation: -2 } },
    ],
  },
];

const MSA_ARC: GameEvent[] = [
  {
    id: 'msa-1',
    arc: 'msa',
    when: { minCareerYear: 6, minOvr: 55 },
    weight: 1.5,
    text: '새로 온 아키텍트가 화이트보드에 선언했다. "이 모놀리스, 마이크로서비스로 쪼갭시다." 화이트보드에는 이미 동그라미가 마흔 개다.',
    choices: [
      { label: '도메인 경계부터 같이 설계한다', chance: { base: 0.45, stat: 'design' }, effects: { stats: { design: 3 }, flags: ['msa-planned'], next: 'msa-2' }, failEffects: { burnout: 5, next: 'msa-2' } },
      { label: '일단 마흔 개로 쪼갠다', effects: { stats: { impl: 2 }, burnout: 4, next: 'msa-2', story: '모놀리스를 서비스 마흔 개로 쪼갰다.' } },
      { label: '잘 만든 모놀리스를 변호한다', chance: { base: 0.4, stat: 'design' }, effects: { reputation: 3, story: '모놀리스를 지켜 냈다. 배포는 여전히 한 번에 된다.' }, failEffects: { reputation: -2 } },
    ],
  },
  {
    id: 'msa-2',
    arc: 'msa',
    scheduledOnly: true,
    when: {},
    text: '쪼갠 지 1년. 추천 서비스 하나가 느려지자 장바구니, 주문, 알림까지 줄줄이 타임아웃이 난다. 누가 누구를 부르는지 아는 사람이 없다.',
    choices: [
      { label: '토폴로지로 호출 관계를 본다', requires: { card: 'apm' }, effects: { reputation: 6, stats: { debug: 2 }, traits: { 관측성전도사: 1 }, next: 'msa-3', story: '토폴로지 한 장으로 연쇄 장애의 시작점을 찾았다.' } },
      { label: '파드 상태부터 훑는다', requires: { card: 'k8s' }, effects: { reputation: 3, stats: { infra: 2 }, next: 'msa-3' } },
      { label: '서비스마다 들어가 grep한다', chance: { base: 0.3, stat: 'debug' }, effects: { reputation: 2, burnout: 8, next: 'msa-3' }, failEffects: { reputation: -4, burnout: 12, next: 'msa-3', story: '연쇄 장애를 grep으로 쫓다 아침을 맞았다.' } },
    ],
  },
  {
    id: 'msa-3',
    arc: 'msa',
    scheduledOnly: true,
    when: {},
    text: '연쇄 장애 회고. 화이트보드의 동그라미 마흔 개를 이제 정리할 때다.',
    choices: [
      { label: '토폴로지를 기준으로 서비스를 다시 묶는다', chance: { base: 0.45, stat: 'design', card: 'apm' }, effects: { stats: { design: 3 }, reputation: 4, story: '서비스 마흔 개를 열두 개로 다시 묶었다. 호출 그래프가 처음으로 한 화면에 들어왔다.' }, failEffects: { burnout: 8, reputation: -1 } },
      { label: '서킷 브레이커와 타임아웃 규칙을 만든다', effects: { stats: { infra: 2, design: 1 }, traits: { 문화: 1 } } },
    ],
  },
];

/** 한 회사에 오래 남는 플레이의 숨 돌릴 구멍 (이직 말고도 번아웃을 덜 수단) */
const TENURE: GameEvent[] = [
  {
    id: 'tenure-5',
    when: { minYearsAtCompany: 5 },
    weight: 3,
    text: '근속 5년. 회사가 리프레시 휴가 2주와 금 한 돈을 줬다. 사내 위키의 절반은 네가 쓴 문서다.',
    choices: [
      { label: '휴가를 꽉 채워 쓴다', effects: { burnout: -20, story: '근속 5년 리프레시 휴가를 다녀왔다. 슬랙은 한 번만 열었다.' } },
      { label: '휴가 대신 오래된 문서를 정리한다', effects: { burnout: -5, stats: { design: 2 }, traits: { 문화: 1 } } },
    ],
  },
  {
    id: 'tenure-transfer',
    when: { minYearsAtCompany: 3, minBurnout: 45 },
    once: false,
    weight: 2,
    text: '같은 회사, 다른 팀. 사내 이동 공고가 떴다. 옆 팀 리드가 커피를 사 주며 은근히 묻는다. "요즘 좀 지쳐 보이던데?"',
    choices: [
      { label: '새 팀으로 옮긴다', effects: { burnout: -25, reputation: -1, stats: { design: 1, impl: 1 }, story: '이직 대신 사내 이동을 택했다. 사원증은 그대로, 슬랙 채널은 전부 새로.' } },
      { label: '정든 팀에 남는다', effects: {} },
    ],
  },
  {
    id: 'tenure-10',
    when: { minYearsAtCompany: 10 },
    weight: 3,
    text: '근속 10년 감사패를 받았다. 신입 시절 네가 짠 코드가 아직 프로덕션에서 돈다. 주석은 "// 임시".',
    choices: [
      { label: '드디어 그 코드를 리팩터링한다', chance: { base: 0.5, stat: 'design' }, effects: { stats: { design: 3 }, reputation: 3, story: '10년 묵은 "임시" 코드를 지웠다. 배포 후 아무 일도 없었다. 그게 제일 무서웠다.' }, failEffects: { burnout: 6, reputation: -1 } },
      { label: '사내 전설로 남겨 둔다', effects: { burnout: -15, traits: { 문화: 1 } } },
    ],
  },
];

export const EVENTS: GameEvent[] = [...GENERAL, ...TENURE, ...AI_CHATBOT_ARC, ...BLACKFRIDAY_ARC, ...MIGRATION_ARC, ...MSA_ARC];
