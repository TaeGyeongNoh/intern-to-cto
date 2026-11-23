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

/*
 * 창업 회사: 창업 → 시드 → 시리즈 A → 엑싯. 5년 생존(엑싯 포함) 약 37%, 창업자 중 엑싯 약 10~12%.
 * 현실 기준: 창업기업 5년 생존율 약 34%(중기부), 신생기업 1년 생존 약 65%(경력자 창업이라 78%로),
 * 엑싯은 전체 창업의 수%. 연봉 2,600은 2026년 최저임금 연환산(약 2,588만원).
 * 엑싯 단계 baseSalary는 단조 증가 검사 때문에 4,300 (은퇴와 동시라 쓰이지 않는다).
 */
const FOUNDER_FAIL = { removeFlags: ['founder'], flags: ['founder-failed'] };
const founderStages = (): GrowthStage[] => [
  {
    name: '창업', level: 40, baseSalary: 2600, up: 0.25, down: 0.22, text: '',
    closeEffects: { ...FOUNDER_FAIL, stats: { design: 2, mental: 2 }, reputation: 1, story: '회사를 접었다. 사업자등록 말소 절차만큼은 확실히 배웠다.' },
  },
  {
    name: '시드', level: 44, baseSalary: 3200, addCards: ['log'], up: 0.18, down: 0.15,
    text: '{company}이/가 시드 투자를 받았다. 대표 월급이 처음으로 최저임금을 넘었다.',
    closeEffects: { ...FOUNDER_FAIL, stats: { design: 3, mental: 2, infra: 2 }, reputation: 2, story: '투자금을 다 쓰고 회사를 접었다. 투자사에 보낸 마지막 메일이 제일 잘 쓴 메일이었다.' },
  },
  {
    name: '시리즈 A', level: 50, baseSalary: 4200, addCards: ['server'], up: 0.2, down: 0.1,
    text: '{company}이/가 시리즈 A를 마쳤다. 채용 공고에서 "대표와 가까운 거리에서 일합니다"를 지웠다.',
    closeEffects: { ...FOUNDER_FAIL, stats: { design: 4, mental: 3, infra: 2 }, reputation: 4, story: '직원들 이직처를 다 챙기고 마지막으로 불을 껐다.' },
  },
  {
    name: '엑싯', level: 55, baseSalary: 4300, up: 0, down: 0,
    text: '{company}이/가 인수됐다. 계약서 서명은 3분, 실사는 3개월이었다.',
    effects: { flags: ['exit'], retire: true, story: '내가 만든 회사를 넘기고 일선에서 물러났다.' },
  },
];
const founder = (id: string, name: string, route: Company['route']): Company => ({
  id, name, route, tier: 'startup', level: 40, baseSalary: 2600, cards: [], hidden: true, founder: true, stages: founderStages(),
});

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
  // 창업 회사 (루트별 하나, founder-offer로만 들어간다)
  founder('founder-commerce', '장바구니랩', 'commerce'),
  founder('founder-finance', '푼돈테크', 'finance'),
  founder('founder-ai-startup', '에이전트하우스', 'ai-startup'),
  // 히든
  { id: 'whatap', name: '와탭랩스', route: 'whatap', tier: 'whatap', level: 55, baseSalary: 5500, cards: ['apm', 'server', 'k8s', 'db', 'log', 'browser', 'gpu', 'ai-agent-obs', 'whatap-ai'], hidden: true },
];
