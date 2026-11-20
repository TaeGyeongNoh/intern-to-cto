import type { Company } from '../engine/types';

export const COMPANIES: Company[] = [
  // 커머스
  { id: 'dangeun', name: '당근당근', route: 'commerce', tier: 'startup', level: 44, baseSalary: 3800, cards: [], start: true },
  { id: 'musinsarang', name: '무신사랑', route: 'commerce', tier: 'mid', level: 58, baseSalary: 5200, cards: ['log', 'server'] },
  { id: 'coupangpang', name: '쿠팡팡', route: 'commerce', tier: 'large', level: 70, baseSalary: 7000, cards: ['apm', 'server', 'browser', 'log', 'k8s'] },
  // 금융·공공
  { id: 'hansi', name: '한국SI정보', route: 'finance', tier: 'mid', level: 43, baseSalary: 3600, cards: ['log'], start: true },
  { id: 'gukbap', name: '국밥은행', route: 'finance', tier: 'large', level: 60, baseSalary: 6500, cards: ['db', 'server', 'log'] },
  { id: 'toastbank', name: '토스트뱅크', route: 'finance', tier: 'large', level: 66, baseSalary: 7200, cards: ['apm', 'db', 'server', 'log', 'k8s'] },
  // AI 스타트업
  { id: 'rwttn', name: '뤼튼튼', route: 'ai-startup', tier: 'startup', level: 45, baseSalary: 4000, cards: [], start: true },
  { id: 'downstage', name: '다운스테이지', route: 'ai-startup', tier: 'mid', level: 58, baseSalary: 6000, cards: ['gpu', 'ai-agent-obs', 'log'] },
  { id: 'neibu', name: '네이부', route: 'ai-startup', tier: 'bigtech', level: 78, baseSalary: 9000, cards: ['apm', 'server', 'k8s', 'db', 'log', 'browser', 'gpu', 'ai-agent-obs', 'whatap-ai'] },
  // 히든
  { id: 'whatap', name: '와탭랩스', route: 'whatap', tier: 'whatap', level: 55, baseSalary: 6500, cards: ['apm', 'server', 'k8s', 'db', 'log', 'browser', 'gpu', 'ai-agent-obs', 'whatap-ai'], hidden: true },
];
