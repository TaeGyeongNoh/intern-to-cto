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
    weight: 0.5,
    when: { minOvr: 62, minCareerYear: 8, notFlags: ['founder'] },
    text: '전 동료가 같이 창업하자고 한다. 아이템은 "AI 에이전트용 무언가".',
    choices: [
      { label: '창업한다', effects: { flags: ['founder'], next: 'founder-outcome', burnout: 10, story: '회사를 나와 창업했다.' } },
      { label: '회사에 남는다', effects: {} },
    ],
  },
  {
    id: 'founder-outcome',
    scheduledOnly: true,
    when: {},
    text: '창업 1년. 통장 잔고와 투자사 미팅 일정을 번갈아 본다.',
    choices: [
      { label: '투자 유치에 올인한다', chance: { base: 0.35, stat: 'design' }, effects: { flags: ['exit'], retire: true, story: '회사를 매각하며 엑싯했다.' }, failEffects: { flags: ['founder-failed'], removeFlags: ['founder'], reputation: -5, burnout: 10, story: '회사를 접고 다시 개발자로 돌아왔다.' } },
      { label: '흑자를 목표로 버틴다', chance: { base: 0.25, stat: 'mental' }, effects: { flags: ['exit'], retire: true, story: '작지만 단단한 회사를 키워 넘겼다.' }, failEffects: { flags: ['founder-failed'], removeFlags: ['founder'], reputation: -5, burnout: 10, story: '버티다 회사를 접고 다시 개발자로 돌아왔다.' } },
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

export const EVENTS: GameEvent[] = [...GENERAL, ...AI_CHATBOT_ARC];
