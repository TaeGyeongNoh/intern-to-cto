import type { Ending, GameState } from '../engine/types';

/** 전설의 SRE에 필요한 빠른 복구(MTTR 120분 이하) 횟수 */
export const LEGEND_FAST = 10;
const resolveRate = (s: GameState) => (s.record.incidentsTotal ? s.record.incidentsResolved / s.record.incidentsTotal : 0);

export const ENDINGS: Ending[] = [
  { id: 'whatap', priority: 100, title: '관측성의 전설, 와탭에 가다', description: '이제 남의 회사 장애까지 잡아 주는 사람이 되었다.', check: (s) => s.flags.includes('whatap-joined') },
  { id: 'ai-replaced', priority: 95, title: 'AI에 대체된 개발자', description: '그래도 프롬프트는 여전히 네가 제일 잘 쓴다.', check: (s) => s.flags.includes('replaced-by-ai') },
  { id: 'burnout', priority: 90, title: '번아웃 퇴사', description: '모든 알람을 끄고 제주도로 떠났다.', check: (s) => s.flags.includes('burnout-out') },
  { id: 'founder-exit', priority: 85, title: '창업 엑싯', description: '내가 만든 회사를 좋은 값에 넘겼다.', check: (s) => s.flags.includes('founder') && s.flags.includes('exit') },
  { id: 'cto', priority: 75, title: 'AI 네이티브 CTO', description: '사람과 에이전트가 함께 일하는 조직을 이끈다.', check: (s) => s.title === 'CTO' },
  { id: 'vp', priority: 70, title: 'VP of Engineering', description: '수백 명 엔지니어 조직의 방향을 정한다.', check: (s) => s.title === 'VP of Engineering' },
  { id: 'legend-sre', priority: 65, title: '전설의 SRE', description: '그가 온콜이면 다들 편히 잔다.', check: (s) => s.position === 'sre' && s.record.fastResolves >= LEGEND_FAST && resolveRate(s) >= 0.7 },
  { id: 'keynote', priority: 60, title: '업계 키노트 스타', description: '컨퍼런스마다 맨 앞줄 자리가 비어 있다.', check: (s) => (s.traits.keynote ?? 0) >= 2 },
  { id: 'principal', priority: 55, title: '프린시펄 엔지니어', description: '코드 한 줄로 회사의 방향을 바꾼다.', check: (s) => s.title === '프린시펄' },
  { id: 'one-company', priority: 50, title: '원컴퍼니맨', description: '첫 회사에서 마지막까지.', check: (s) => s.companiesWorked.length === 1 },
  { id: 'founder-fail', priority: 45, title: '창업, 그리고 폐업', description: '실패했지만 후회는 없다.', check: (s) => s.flags.includes('founder-failed') },
  { id: 'ordinary', priority: 0, title: '평범한 행복', description: '큰 사고 없이, 좋은 동료들과 오래 일했다.', check: () => true },
];
