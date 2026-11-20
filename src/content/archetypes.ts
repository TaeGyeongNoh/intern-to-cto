import type { Archetype } from '../engine/types';

/**
 * 시작 후보 유형. 포지션마다 3개 이상이어야 한다(validate).
 * 강점(spikes)은 60~70, 약점(dumps)은 20~28 근처로 뽑히고 OVR 45·합 240은 나머지로 맞춘다.
 * twist는 작게: 평판 +3~5, 번아웃 민감도 ±0.1~0.15, 성장형 쏠림.
 */
export const ARCHETYPES: Archetype[] = [
  {
    id: 'impl-monster',
    name: '구현 괴물',
    tagline: 'PR은 하루 열 개, 설계 문서는 0개. 일찍 피는 타입',
    positions: ['backend', 'frontend', 'ai'],
    spikes: ['impl'],
    dumps: ['design', 'mental'],
    twist: { growth: 'early' },
  },
  {
    id: 'architect',
    name: '설계 장인',
    tagline: '코드보다 다이어그램이 먼저. 늦게 피지만 오래 간다',
    positions: ['backend', 'frontend'],
    spikes: ['design'],
    dumps: ['ai'],
    twist: { growth: 'late' },
  },
  {
    id: 'debug-hound',
    name: '디버깅 집착러',
    tagline: '로그 한 줄로 범인을 잡는다. 장애방 단골이라 이름은 났는데 잠은 못 잔다',
    positions: ['backend', 'sre'],
    spikes: ['debug'],
    dumps: ['ai', 'mental'],
    twist: { reputation: 5, burnoutProne: 0.1 },
  },
  {
    id: 'night-hacker',
    name: '밤샘 해커',
    tagline: '새벽 4시에 제일 잘 짠다. 빨리 크고, 빨리 탄다',
    positions: ['backend', 'frontend'],
    spikes: ['impl', 'debug'],
    dumps: ['mental'],
    twist: { growth: 'early', burnoutProne: 0.1 },
  },
  {
    id: 'ai-native',
    name: 'AI 네이티브',
    tagline: '프롬프트로 짜고 손으로 고친다. 이력서 키워드는 이미 완벽',
    positions: ['ai', 'frontend'],
    spikes: ['ai', 'impl'],
    dumps: ['infra'],
    twist: { reputation: 3 },
  },
  {
    id: 'iron-mental',
    name: '강철 멘탈',
    tagline: '새벽 3시 온콜에도 심박수 60. 번아웃이 잘 안 온다',
    positions: ['sre'],
    spikes: ['mental'],
    dumps: ['ai', 'impl'],
    twist: { burnoutProne: -0.15 },
  },
  {
    id: 'infra-nerd',
    name: '인프라 덕후',
    tagline: '집에 서버랙이 있다. 팬 소리가 자장가라 잘 안 지친다',
    positions: ['sre'],
    spikes: ['infra'],
    dumps: ['design'],
    twist: { burnoutProne: -0.1 },
  },
  {
    id: 'doc-master',
    name: '문서화 장인',
    tagline: '위키 조회수 1위. 퇴사해도 문서는 남고, 이름도 남는다',
    positions: ['sre'],
    spikes: ['design'],
    dumps: ['impl'],
    twist: { reputation: 3 },
  },
  {
    id: 'paper-nerd',
    name: '논문 덕후',
    tagline: 'arXiv 알림이 아침 알람. 늦게 피지만 깊게 판다',
    positions: ['ai'],
    spikes: ['ai', 'design'],
    dumps: ['infra'],
    twist: { growth: 'late' },
  },
  {
    id: 'vibe-coder',
    name: '바이브 코더',
    tagline: '디버깅은 "다시 생성" 버튼으로 한다. 운 좋게 일찍 핀다',
    positions: ['ai'],
    spikes: ['ai'],
    dumps: ['debug'],
    twist: { growth: 'early' },
  },
];
