import { applyEffects } from './effects';
import type { Setup } from './state';
import { STAT_IDS, type Content, type Education, type GameState, type Service, type Stats } from './types';
import { clamp } from './util';

/** 첫 해 전에 거치는 취준·인턴 프롤로그의 기본 시작 이벤트 (콘텐츠에 있을 때만) */
export const PROLOGUE_START = 'prologue-start';
/** 옛 저장·공유 링크처럼 Setup에 출신이 없을 때. 둘 다 효과가 없어야 한다 (validate가 강제) */
export const DEFAULT_EDUCATION = 'university';
export const DEFAULT_SERVICE = 'none';
/** 첫 연봉 하한 (만원). 출신 가감으로 이보다 내려가지 않는다. 2026년 최저임금 월 215.7만원 × 12 ≈ 2,590 → 2,500 */
export const MIN_FIRST_SALARY = 2500;

export type Origin = { education: Education; service: Service };

export const serviceAllowed = (sv: Service, educationId: string): boolean => !sv.educations || sv.educations.includes(educationId);

/** 기본값을 채우고 존재·조합을 검사한다. 잘못되면 throw (공유 링크면 새 게임으로 넘어간다) */
export function resolveOrigin(setup: Setup, c: Content): Origin {
  const eid = setup.education ?? DEFAULT_EDUCATION;
  const sid = setup.service ?? DEFAULT_SERVICE;
  // 공유 링크에서 온 값이라 'toString' 같은 프로토타입 키를 걸러낸다
  const education = Object.hasOwn(c.educations, eid) ? c.educations[eid] : undefined;
  const service = Object.hasOwn(c.services, sid) ? c.services[sid] : undefined;
  if (!education) throw new Error(`unknown education ${setup.education}`);
  if (!service) throw new Error(`unknown service ${setup.service}`);
  if (!serviceAllowed(service, education.id)) throw new Error(`service ${service.id} not allowed for ${education.id}`);
  return { education, service };
}

/** 엔딩·공유 카드에 보일 학력 이름. 기본 학력이거나 모르는 id면 없다 (병역은 보이지 않는다) */
export function educationLabel(setup: Setup, c: Content): string | undefined {
  const id = setup.education;
  return id && id !== DEFAULT_EDUCATION && Object.hasOwn(c.educations, id) ? c.educations[id].name : undefined;
}

export const startAge = (o: Origin): number => o.education.age + o.service.years;

/** 프롤로그 첫 이벤트: 병역 > 학력 > 기본 */
export const originPrologue = (o: Origin): string => o.service.prologue ?? o.education.prologue ?? PROLOGUE_START;

/** 첫 연봉 가감 (만원) */
export const originSalary = (o: Origin): number => (o.education.salary ?? 0) + (o.service.salary ?? 0);

/** 첫 연봉에 출신 가감을 더한다. 깎을 때는 MIN_FIRST_SALARY 아래로 내려가지 않는다 (이미 그 아래면 그대로) */
export function firstSalary(salary: number, o: Origin): number {
  const d = originSalary(o);
  return d >= 0 ? salary + d : Math.max(Math.min(salary, MIN_FIRST_SALARY), salary + d);
}

/** 시작 나이를 정하고 학력 → 병역 순으로 효과를 적용한다. 효과가 없으면 상태를 그대로 돌려준다 (rng를 쓰지 않는다) */
export function applyOrigin(s: GameState, o: Origin): GameState {
  let r = s.age === startAge(o) ? s : { ...s, age: startAge(o) };
  for (const e of [o.education.effects, o.service.effects]) if (e) r = applyEffects(r, e);
  return r;
}

/** 생성 화면 미리보기: 후보 능력치에 출신 보정을 더한 값 */
export function previewStats(stats: Stats, o: Origin): Stats {
  const r = { ...stats };
  for (const e of [o.education.effects, o.service.effects])
    for (const id of STAT_IDS) if (e?.stats?.[id]) r[id] = clamp(r[id] + e.stats[id]!, 1, 99);
  return r;
}
