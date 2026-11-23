import type { Company } from '../engine/types';

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
  { id: 'rwttn', name: '뤼튼튼', route: 'ai-startup', tier: 'startup', level: 45, baseSalary: 4000, cards: [], start: true },
  { id: 'downstage', name: '다운스테이지', route: 'ai-startup', tier: 'mid', level: 58, baseSalary: 5000, cards: ['gpu', 'ai-agent-obs', 'log'] },
  { id: 'neibu', name: '네이부', route: 'ai-startup', tier: 'bigtech', level: 78, baseSalary: 7200, cards: ['apm', 'server', 'k8s', 'db', 'log', 'browser', 'gpu', 'ai-agent-obs', 'whatap-ai'] },
  // 프롤로그 막차 스타트업 (루트별 하나, 시작 회사 아님)
  { id: 'tiny-commerce', name: '오늘의떡집', route: 'commerce', tier: 'startup', level: 38, baseSalary: 3100, cards: [], tiny: true },
  { id: 'tiny-finance', name: '뱅크샐러드바', route: 'finance', tier: 'startup', level: 37, baseSalary: 3000, cards: [], tiny: true },
  { id: 'tiny-ai-startup', name: '프롬프트공방', route: 'ai-startup', tier: 'startup', level: 39, baseSalary: 3300, cards: [], tiny: true },
  // 히든
  { id: 'whatap', name: '와탭랩스', route: 'whatap', tier: 'whatap', level: 55, baseSalary: 5500, cards: ['apm', 'server', 'k8s', 'db', 'log', 'browser', 'gpu', 'ai-agent-obs', 'whatap-ai'], hidden: true },
];
