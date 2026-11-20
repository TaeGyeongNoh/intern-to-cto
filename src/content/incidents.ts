import type { Incident } from '../engine/types';

export const INCIDENTS: Incident[] = [
  {
    id: 'payment-latency',
    title: '결제 API 응답 지연',
    when: { route: ['commerce', 'finance'] },
    summary: '알람: 결제 API p95 4.2초. 고객센터 전화가 울리기 시작했다.',
    aiHint: '응답시간 분포부터 확인하세요.',
    steps: [
      {
        prompt: '어디부터 볼까?',
        options: [
          { label: '트랜잭션 히트맵을 연다', view: 'hitmap', correct: true, clue: '14:02부터 응답시간 점이 위로 치솟고 노란 에러 점이 몰려 있다' },
          { label: '서버 CPU를 본다', view: 'server-metrics', correct: false },
          { label: '서버에 ssh로 들어가 grep', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '느린 구간을 찾았다. 다음은?',
        options: [
          { label: '트레이스 스텝을 연다', view: 'trace', correct: true, clue: '외부 PG사 HTTP 호출(httpc)에서 3.8초를 쓰고 있다' },
          { label: '로그를 검색한다', view: 'log-search', correct: false },
          { label: 'grep으로 timeout 검색', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '원인을 좁히자.',
        options: [
          { label: '토폴로지로 호출 관계를 본다', view: 'topology', correct: true, clue: 'PG 연동 구간만 빨갛다. 우리 서비스가 아니라 외부 구간 문제다' },
          { label: '브라우저 에러를 본다', view: 'rum', correct: false },
          { label: '일단 서버를 재시작해 본다', view: 'grep', correct: false },
        ],
      },
    ],
    actions: [
      { label: 'PG 타임아웃 단축 + 대체 PG로 우회', baseChance: 0.25, perClue: 0.22, effects: { reputation: 3, stats: { debug: 1 } }, failEffects: { reputation: -3, burnout: 5 } },
      { label: '서버를 증설한다', baseChance: 0.2, perClue: 0.05, effects: { reputation: 1 }, failEffects: { reputation: -2, burnout: 5 } },
    ],
  },
  {
    id: 'db-lock',
    title: '정산 배치 중 DB 락 대기',
    when: { route: ['finance'] },
    summary: '오전 9시, 주문 조회가 전부 멈췄다. 정산 배치가 돌고 있다.',
    aiHint: 'DB 세션과 락부터 확인하세요.',
    steps: [
      {
        prompt: '어디부터 볼까?',
        options: [
          { label: 'DB 락/세션을 연다', view: 'db-locks', correct: true, clue: '정산 배치 세션이 주문 테이블에 락을 잡고 있다' },
          { label: '서버 메트릭을 본다', view: 'server-metrics', correct: false },
          { label: 'DB 서버에 ssh로 들어간다', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '어떤 쿼리가 막고 있지?',
        options: [
          { label: '트레이스에서 SQL을 본다', view: 'trace', correct: true, clue: 'UPDATE 쿼리 하나가 28초째 대기 중이다' },
          { label: '로그를 검색한다', view: 'log-search', correct: false },
          { label: 'grep으로 lock 검색', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '왜 하필 지금 터졌지?',
        options: [
          { label: '로그에서 배치 변경 이력을 찾는다', view: 'log-search', correct: true, clue: '배치 시작 시각이 오전 피크와 겹치게 바뀐 기록이 있다' },
          { label: '히트맵을 본다', view: 'hitmap', correct: false },
          { label: '크론탭을 grep', view: 'grep', correct: false },
        ],
      },
    ],
    actions: [
      { label: '배치 세션 정리 + 배치 시간 재조정', baseChance: 0.25, perClue: 0.22, effects: { reputation: 3, stats: { infra: 1 } }, failEffects: { reputation: -3, burnout: 5 } },
      { label: 'DB를 재시작한다', baseChance: 0.3, perClue: 0.04, effects: { reputation: -1 }, failEffects: { reputation: -4, burnout: 6 } },
    ],
  },
  {
    id: 'oom-kill',
    title: '파드가 계속 재시작된다 (OOMKilled)',
    when: {},
    summary: 'API 파드가 5분마다 죽고 살아난다. 배포는 어제 저녁에 나갔다.',
    aiHint: '파드 상태와 재시작 사유부터 보세요.',
    steps: [
      {
        prompt: '어디부터 볼까?',
        options: [
          { label: '파드 상태를 연다', view: 'pods', correct: true, clue: 'API 파드가 메모리 limit 512Mi를 넘어 OOMKilled 됐다' },
          { label: '노드 CPU를 본다', view: 'server-metrics', correct: false },
          { label: 'kubectl logs | grep', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '무엇이 메모리를 먹지?',
        options: [
          { label: '트레이스를 연다', view: 'trace', correct: true, clue: '대용량 엑셀 다운로드 트랜잭션이 메모리를 폭증시킨다' },
          { label: '로그를 검색한다', view: 'log-search', correct: false },
          { label: '힙 덤프를 grep', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '언제부터였지?',
        options: [
          { label: '히트맵에서 시점을 본다', view: 'hitmap', correct: true, clue: '배포 직후부터 느린 점이 생겼다. 이번 배포가 원인이다' },
          { label: '파드 재시작 횟수를 센다', view: 'pods', correct: false },
          { label: '배포 로그를 grep', view: 'grep', correct: false },
        ],
      },
    ],
    actions: [
      { label: '이전 버전 롤백 + 다운로드를 스트리밍으로', baseChance: 0.25, perClue: 0.22, effects: { reputation: 3, stats: { infra: 1 } }, failEffects: { reputation: -3, burnout: 5 } },
      { label: '메모리 limit만 두 배로', baseChance: 0.45, perClue: 0.03, effects: {}, failEffects: { reputation: -2, burnout: 4 } },
    ],
  },
  {
    id: 'token-bomb',
    title: '이번 달 LLM 비용이 3배',
    when: { route: ['ai-startup'] },
    summary: 'CFO가 청구서를 들고 왔다. 지난달의 세 배다.',
    aiHint: '토큰·비용을 에이전트별로 나눠 보세요.',
    steps: [
      {
        prompt: '어디서 새고 있지?',
        options: [
          { label: '토큰·비용을 에이전트별로 본다', view: 'token-cost', correct: true, clue: '검색 에이전트의 입력 토큰이 평소의 9배다' },
          { label: '로그를 검색한다', view: 'log-search', correct: false },
          { label: 'API 사용량 CSV를 grep', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '그 에이전트가 뭘 하고 있지?',
        options: [
          { label: '에이전트 트래젝토리를 연다', view: 'agent-trajectory', correct: true, clue: '같은 검색 도구를 40번 반복 호출하고 있다' },
          { label: 'GPU 메트릭을 본다', view: 'gpu-metrics', correct: false },
          { label: '프롬프트 파일을 grep', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '왜 반복하지?',
        options: [
          { label: '응답 품질에서 도구 응답을 본다', view: 'llm-quality', correct: true, clue: '도구 응답이 비면 무조건 재시도하라는 프롬프트가 원인이다' },
          { label: '트레이스를 본다', view: 'trace', correct: false },
          { label: '대화 로그를 grep', view: 'grep', correct: false },
        ],
      },
    ],
    actions: [
      { label: '재시도 상한 + 프롬프트 수정', baseChance: 0.25, perClue: 0.22, effects: { reputation: 4, stats: { ai: 2 }, traits: { 관측성전도사: 1 } }, failEffects: { reputation: -4, burnout: 6 } },
      { label: '더 싼 모델로 교체', baseChance: 0.3, perClue: 0.05, effects: {}, failEffects: { reputation: -3 } },
    ],
  },
  {
    id: 'hallucination',
    title: '챗봇이 없는 환불 정책을 안내했다',
    when: { route: ['ai-startup', 'commerce'] },
    summary: '커뮤니티에 챗봇 답변 캡처가 돈다. "전 상품 무조건 200% 환불".',
    aiHint: '응답 품질 지표에서 hallucination부터 확인하세요.',
    steps: [
      {
        prompt: '어디부터 볼까?',
        options: [
          { label: '응답 품질을 연다', view: 'llm-quality', correct: true, clue: 'hallucination 점수가 높은 응답이 어제부터 급증했다' },
          { label: '로그를 검색한다', view: 'log-search', correct: false },
          { label: '대화 DB를 grep', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '어느 단계가 문제지?',
        options: [
          { label: '에이전트 트래젝토리를 연다', view: 'agent-trajectory', correct: true, clue: 'RAG 검색 단계가 빈 결과를 돌려주고 있다' },
          { label: '토큰·비용을 본다', view: 'token-cost', correct: false },
          { label: '프롬프트를 grep', view: 'grep', correct: false },
        ],
      },
      {
        prompt: '검색은 왜 비었지?',
        options: [
          { label: '트레이스를 연다', view: 'trace', correct: true, clue: '벡터 DB 호출이 타임아웃 난 뒤 빈 컨텍스트로 답변을 만든다' },
          { label: 'GPU 메트릭을 본다', view: 'gpu-metrics', correct: false },
          { label: '벡터 DB 로그를 grep', view: 'grep', correct: false },
        ],
      },
    ],
    actions: [
      { label: '벡터 DB 타임아웃 처리 + 빈 컨텍스트면 답변 거절', baseChance: 0.25, perClue: 0.22, effects: { reputation: 4, stats: { ai: 1, debug: 1 } }, failEffects: { reputation: -5, burnout: 6 } },
      { label: '챗봇을 일단 내린다', baseChance: 0.7, perClue: 0, effects: { reputation: -1 }, failEffects: { reputation: -3 } },
    ],
  },
];
