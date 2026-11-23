import type { Ending, GameState } from '../engine/types';

/** 전설의 SRE에 필요한 빠른 복구(MTTR 120분 이하) 횟수 */
export const LEGEND_FAST = 10;
/** 든든한 팀장·터줏대감 시니어에 필요한 마지막 회사 근속 연수 */
export const LONG_TENURE = 3;
/**
 * 원컴퍼니맨에 필요한 경력 연차. 첫 회사에서 2~3년 만에 스스로 그만두고 받는 엔딩이 아니어야 한다.
 * 현실 기준: 국내 임금근로자 평균 근속은 6년 남짓, 대기업도 10년 남짓이라 15년이면 "한 회사에서 오래"라는 말을 듣는다.
 * 48세 정상 은퇴는 늦게 시작해도 경력 20년이 넘어서, 끝까지 한 회사에 있었던 판은 그대로 받는다.
 */
export const ONE_COMPANY_MIN_YEARS = 15;
/**
 * 파이어족에 필요한 순자산 (만원, 10억). 4% 룰로 해마다 4,000만원(월 약 333만원)을 꺼내 쓸 수 있는 돈이다.
 * 현실 기준: 2024 가계금융복지조사에서 가구주가 꼽은 은퇴 후 부부 적정 생활비가 월 336만원이다.
 */
export const FIRE_ASSETS = 100000;
const voluntary = (s: GameState) => s.flags.includes('retired-voluntary');
const resolveRate = (s: GameState) => (s.record.incidentsTotal ? s.record.incidentsResolved / s.record.incidentsTotal : 0);

export const ENDINGS: Ending[] = [
  { id: 'whatap', priority: 100, title: '관측성의 전설, 와탭에 가다', description: '이제 남의 회사 장애까지 잡아 주는 사람이 되었다.', check: (s) => s.flags.includes('whatap-joined') },
  { id: 'ai-replaced', priority: 95, title: 'AI에 대체된 개발자', description: '그래도 프롬프트는 여전히 네가 제일 잘 쓴다.', check: (s) => s.flags.includes('replaced-by-ai') },
  { id: 'burnout', priority: 90, title: '번아웃 퇴사', description: '모든 알람을 끄고 제주도로 떠났다.', check: (s) => s.flags.includes('burnout-out') },
  { id: 'founder-exit', priority: 85, title: '창업 엑싯', description: '작게 시작해서, 결국 넘겼다.', check: (s) => s.flags.includes('founder') && s.flags.includes('exit') },
  { id: 'cto', priority: 75, title: 'AI 네이티브 CTO', description: '사람과 에이전트가 함께 일하는 조직을 이끈다.', check: (s) => s.title === 'CTO' },
  { id: 'vp', priority: 70, title: 'VP of Engineering', description: '수백 명 엔지니어 조직의 방향을 정한다.', check: (s) => s.title === 'VP of Engineering' },
  { id: 'legend-sre', priority: 65, title: '전설의 SRE', description: '그가 온콜이면 다들 편히 잔다.', check: (s) => s.position === 'sre' && s.record.fastResolves >= LEGEND_FAST && resolveRate(s) >= 0.7 },
  { id: 'keynote', priority: 60, title: '업계 키노트 스타', description: '컨퍼런스마다 맨 앞줄 자리가 비어 있다.', check: (s) => (s.traits.keynote ?? 0) >= 2 },
  { id: 'principal', priority: 55, title: '프린시펄 엔지니어', description: '코드 한 줄로 회사의 방향을 바꾼다.', check: (s) => s.title === '프린시펄' },
  { id: 'one-company', priority: 50, title: '원컴퍼니맨', description: '첫 회사에서 마지막까지.', check: (s) => s.companiesWorked.length === 1 && s.yearsInCareer >= ONE_COMPANY_MIN_YEARS },
  { id: 'founder-fail', priority: 45, title: '창업, 그리고 폐업', description: '실패했지만 후회는 없다.', check: (s) => s.flags.includes('founder-failed') },
  // 스스로 일찍 내린 은퇴. 프레스티지 엔딩보다 아래, 흔한 끝 엔딩보다 위
  { id: 'fire', priority: 42, title: '파이어족', description: '알람은 이제 장애가 아니라 아침 산책을 알린다. 4% 룰을 믿고 사표를 냈다.', check: (s) => voluntary(s) && s.assets >= FIRE_ASSETS },
  // 현실의 흔한 끝. 대부분은 CTO가 아니라 스태프·팀장·시니어로 커리어를 마친다 (프레스티지 엔딩보다 아래, 평범한 행복보다 위)
  { id: 'staff', priority: 40, title: '스태프 엔지니어', description: '직함보다 "그건 그분한테 물어봐"가 더 정확한 설명이었다.', check: (s) => s.title === '스태프' },
  { id: 'team-lead', priority: 38, title: '든든한 팀장', description: '1on1과 코드 리뷰 사이에서, 팀이 오래 버티는 법을 찾았다.', check: (s) => s.title === '팀장' && s.yearsAtCompany >= LONG_TENURE },
  { id: 'veteran-senior', priority: 35, title: '터줏대감 시니어', description: '레거시가 왜 그렇게 생겼는지 아는 마지막 사람.', check: (s) => s.title === '시니어' && s.yearsAtCompany >= LONG_TENURE },
  // 자발적 은퇴인데 아무 엔딩에도 안 맞을 때 (평범한 행복의 "오래 일했다"는 짧은 커리어에 맞지 않는다)
  { id: 'new-path', priority: 1, title: '개발 말고 다른 길', description: '노트북을 덮고 다른 일을 시작했다. 그래도 가끔 남의 집 와이파이 속도는 재 본다.', check: voluntary },
  { id: 'ordinary', priority: 0, title: '평범한 행복', description: '큰 사고 없이, 좋은 동료들과 오래 일했다.', check: () => true },
];
