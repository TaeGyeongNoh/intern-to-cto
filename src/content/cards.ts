import type { CardDef, CardId, ViewId } from '../engine/types';

export const CARDS: Record<CardId, CardDef> = {
  apm: { id: 'apm', name: 'APM', color: '#73DFFE', views: ['hitmap', 'trace', 'topology'] },
  server: { id: 'server', name: '서버', color: '#2FEBD8', views: ['server-metrics'] },
  k8s: { id: 'k8s', name: '쿠버네티스', color: '#83AEFF', views: ['pods'] },
  db: { id: 'db', name: '데이터베이스', color: '#AA83FF', views: ['db-locks'] },
  log: { id: 'log', name: '로그', color: '#F0B5FF', views: ['log-search'] },
  browser: { id: 'browser', name: '브라우저', color: '#57EC8C', views: ['rum'] },
  gpu: { id: 'gpu', name: 'GPU', color: '#1D73FF', views: ['gpu-metrics'] },
  'ai-agent-obs': {
    id: 'ai-agent-obs', name: 'AI Agent Observability', color: '#4470FF',
    views: ['agent-trajectory', 'token-cost', 'llm-quality'],
  },
  'whatap-ai': { id: 'whatap-ai', name: '와탭 AI', color: '#8B52FF', views: [] },
};

export const VIEW_LABELS: Record<ViewId, string> = {
  grep: 'ssh 접속해서 grep',
  hitmap: '트랜잭션 히트맵',
  trace: '트레이스(스텝)',
  topology: '토폴로지',
  'server-metrics': '서버 메트릭',
  pods: '파드 상태',
  'db-locks': 'DB 락/세션',
  'log-search': '로그 검색',
  rum: '브라우저 에러',
  'gpu-metrics': 'GPU 메트릭',
  'agent-trajectory': '에이전트 트래젝토리',
  'token-cost': '토큰·비용',
  'llm-quality': '응답 품질',
};
