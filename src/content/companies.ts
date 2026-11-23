import type { Company, GrowthStage } from '../engine/types';

/*
 * 스타트업 성장 단계. 확률은 연말마다 한 번 굴린다.
 * 현실 기준: 창업 5년 생존율 약 34%(중기부), 상장·매각 같은 엑싯은 많아야 몇 %.
 * 시드 1년 생존 0.8 → 5년 생존 0.8^5 ≈ 33%. 끝까지 남아도 상장까지 갈 확률은 약 4~5%.
 */
const SERIES_A = '{company}이/가 시리즈 A 투자를 받았다. 법카 한도가 늘었고, 드디어 로그 수집기가 생겼다.';
const SERIES_C = '{company}이/가 시리즈 C를 마쳤다. 회의실 이름이 행성에서 은하로 바뀌었다.';
const IPO = '{company}이/가 상장했다. 종 치는 날 대표님이 울었고, 단톡방은 주가 캡처로 도배됐다.';

/** 막차 스타트업: 시드 → 시리즈 A까지만 (상장 없음, 스톡옵션 없음) */
const tinyStages = (level: number, baseSalary: number): GrowthStage[] => [
  { name: '시드', level, baseSalary, up: 0.07, down: 0.15, text: '' },
  { name: '시리즈 A', level: level + 5, baseSalary: baseSalary + 400, addCards: ['log'], up: 0, down: 0, text: SERIES_A },
];


export const COMPANIES: Company[] = [
  // 커머스
  { id: 'dangeun', name: '당근당근', route: 'commerce', tier: 'mid', level: 44, baseSalary: 3800, cards: [], start: true },
  { id: 'musinsarang', name: '무신사랑', route: 'commerce', tier: 'mid', level: 58, baseSalary: 4600, cards: ['log', 'server'] },
  { id: 'coupangpang', name: '쿠팡팡', route: 'commerce', tier: 'large', level: 70, baseSalary: 5600, cards: ['apm', 'server', 'browser', 'log', 'k8s'] },
  { id: 'amazongang', name: '아마존강', route: 'commerce', tier: 'bigtech', level: 80, baseSalary: 6800, cards: ['apm', 'server', 'k8s', 'log', 'browser', 'db'] },
  // 금융·공공
  { id: 'hansi', name: '한국SI정보', route: 'finance', tier: 'mid', level: 43, baseSalary: 3600, cards: ['log'], start: true },
  { id: 'gukbap', name: '국밥은행', route: 'finance', tier: 'large', level: 60, baseSalary: 5200, cards: ['db', 'server', 'log'] },
  { id: 'toastbank', name: '토스트뱅크', route: 'finance', tier: 'large', level: 66, baseSalary: 5800, cards: ['apm', 'db', 'server', 'log', 'k8s'] },
  { id: 'goldensacks', name: '골든삭스', route: 'finance', tier: 'large', level: 72, baseSalary: 6400, cards: ['apm', 'db', 'server', 'log'] },
  // AI
  {
    id: 'rwttn', name: '뤼튼튼', route: 'ai-startup', tier: 'startup', level: 45, baseSalary: 4000, cards: [], start: true,
    stages: [
      { name: '시드', level: 45, baseSalary: 4000, up: 0.07, down: 0.13, text: '' },
      { name: '시리즈 A', level: 51, baseSalary: 4500, addCards: ['gpu'], up: 0.06, down: 0.11, text: '{company}이/가 시리즈 A 투자를 받았다. 법카 한도가 늘었고, 드디어 GPU 대시보드가 생겼다.' },
      { name: '시리즈 C', level: 57, baseSalary: 5100, tier: 'mid', addCards: ['ai-agent-obs', 'log'], up: 0.05, down: 0.08, text: SERIES_C },
      { name: '상장', level: 63, baseSalary: 5800, addCards: ['apm', 'server'], up: 0, down: 0, text: IPO, ipo: true },
    ],
  },
  { id: 'downstage', name: '다운스테이지', route: 'ai-startup', tier: 'mid', level: 58, baseSalary: 5000, cards: ['gpu', 'ai-agent-obs', 'log'] },
  { id: 'neibu', name: '네이부', route: 'ai-startup', tier: 'bigtech', level: 78, baseSalary: 7200, cards: ['apm', 'server', 'k8s', 'db', 'log', 'browser', 'gpu', 'ai-agent-obs', 'whatap-ai'] },
  // 프롤로그 막차 스타트업 (루트별 하나, 시작 회사 아님)
  { id: 'tiny-commerce', name: '오늘의떡집', route: 'commerce', tier: 'startup', level: 38, baseSalary: 3100, cards: [], tiny: true, stages: tinyStages(38, 3100) },
  { id: 'tiny-finance', name: '뱅크샐러드바', route: 'finance', tier: 'startup', level: 37, baseSalary: 3000, cards: [], tiny: true, stages: tinyStages(37, 3000) },
  { id: 'tiny-ai-startup', name: '프롬프트공방', route: 'ai-startup', tier: 'startup', level: 39, baseSalary: 3300, cards: [], tiny: true, stages: tinyStages(39, 3300) },
  // 히든
  { id: 'whatap', name: '와탭랩스', route: 'whatap', tier: 'whatap', level: 55, baseSalary: 5500, cards: ['apm', 'server', 'k8s', 'db', 'log', 'browser', 'gpu', 'ai-agent-obs', 'whatap-ai'], hidden: true },
];
