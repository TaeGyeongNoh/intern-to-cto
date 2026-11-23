import type { Education, Service } from '../engine/types';

/**
 * 출신(학력)과 병역. 생성 화면 4·5단계에서 고른다.
 * 기본값(university, none)은 효과가 없어야 옛 저장·공유 링크가 그대로 리플레이된다 (validate가 강제).
 * 숫자 근거: 시작 나이는 학제·병역 기간, 첫 연봉 가감은 2023 고등교육기관 졸업자 취업통계(전문대 초임 = 일반대의 83%),
 * 석사 경력 인정 관행(약 2년), 300인 미만 기업 초임 격차(경총 2023). 자세한 표는 AGENTS.md 현실 기준표.
 */
export const EDUCATIONS: Education[] = [
  {
    id: 'highschool',
    name: '고졸·전문대',
    tagline: '남들 수강신청할 때 운영 서버에 SSH 붙였다. 일찍 피고 오래 간다',
    age: 20,
    effects: { stats: { impl: 3, design: -2 }, reputation: -2 },
    salary: -600,
    prologue: 'prologue-highschool',
  },
  {
    id: 'university',
    name: '4년제',
    tagline: '전공 수업 4년, 실무는 0년. 가장 흔한 출발선',
    age: 22,
  },
  {
    id: 'grad',
    name: '대학원(석사)',
    tagline: '논문 1편, 주말 0일. 늦게 시작하지만 설계와 AI는 앞선다',
    age: 24,
    effects: { stats: { design: 3, ai: 3, impl: -2 } },
    salary: 500,
    prologue: 'prologue-grad',
  },
  {
    id: 'switcher',
    name: '비전공 전향',
    tagline: '엑셀 매크로가 시작이었다. 늦게 왔지만 사회생활 만렙',
    age: 26,
    effects: { stats: { mental: 4, design: 2, impl: -3 }, reputation: 2 },
    salary: -200,
    prologue: 'prologue-switch',
  },
];

export const SERVICES: Service[] = [
  {
    id: 'none',
    name: '해당 없음·면제',
    tagline: '이미 해결했거나 해당이 없다',
    years: 0,
  },
  {
    id: 'active',
    name: '현역',
    tagline: '전역 후 첫 커밋. 2년 공백은 체력으로 메운다',
    years: 2,
    effects: { stats: { mental: 3 }, story: '현역으로 복무를 마쳤다. 지금도 아침 6시면 눈이 떠진다.' },
  },
  {
    id: 'industrial',
    name: '산업기능요원',
    tagline: '일하면서 복무한다. 34개월 동안 이직 제안은 못 받는다',
    years: 0,
    salary: -300,
    prologue: 'prologue-service-industrial',
    educations: ['highschool', 'university'],
  },
  {
    id: 'research',
    name: '전문연구요원',
    tagline: '연구소에서 36개월 복무한다. 석사만 고를 수 있다',
    years: 0,
    prologue: 'prologue-service-research',
    educations: ['grad'],
  },
];
