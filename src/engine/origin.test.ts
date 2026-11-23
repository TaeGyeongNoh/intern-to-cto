import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { PROLOGUE_START } from './game';
import { applyOrigin, DEFAULT_EDUCATION, DEFAULT_SERVICE, originPrologue, originSalary, previewStats, resolveOrigin, serviceAllowed, startAge } from './origin';
import { makeState } from './testing';
import type { Setup } from './state';

const base: Setup = { name: '테스트', position: 'backend', route: 'commerce', candidate: 0 };
const o = (education?: string, service?: string) => resolveOrigin({ ...base, education, service }, CONTENT);

describe('resolveOrigin', () => {
  it('필드가 없으면 기본 출신 (4년제 · 해당 없음)', () => {
    const r = resolveOrigin(base, CONTENT);
    expect(r.education.id).toBe(DEFAULT_EDUCATION);
    expect(r.service.id).toBe(DEFAULT_SERVICE);
    expect(DEFAULT_EDUCATION).toBe('university');
    expect(DEFAULT_SERVICE).toBe('none');
  });
  it('모르는 id와 금지 조합은 throw', () => {
    expect(() => o('phd')).toThrow();
    expect(() => o(undefined, 'navy')).toThrow();
    expect(() => o('university', 'research')).toThrow();
    expect(() => o('grad', 'industrial')).toThrow();
    expect(o('grad', 'research').service.id).toBe('research');
  });
  it('serviceAllowed는 학력 제한을 따른다', () => {
    expect(serviceAllowed(CONTENT.services.research, 'grad')).toBe(true);
    expect(serviceAllowed(CONTENT.services.research, 'highschool')).toBe(false);
    for (const e of Object.keys(CONTENT.educations)) {
      expect(serviceAllowed(CONTENT.services.none, e)).toBe(true);
      expect(serviceAllowed(CONTENT.services.active, e)).toBe(true);
    }
  });
});

describe('출신 값', () => {
  it('startAge = 학력 나이 + 병역 햇수', () => {
    expect(startAge(o())).toBe(22);
    expect(startAge(o('highschool'))).toBe(20);
    expect(startAge(o('university', 'active'))).toBe(24);
    expect(startAge(o('switcher', 'active'))).toBe(28);
    expect(startAge(o('highschool', 'industrial'))).toBe(20);
  });
  it('originPrologue 우선순위: 병역 > 학력 > 기본', () => {
    expect(originPrologue(o())).toBe(PROLOGUE_START);
    expect(originPrologue(o('grad'))).toBe('prologue-grad');
    expect(originPrologue(o('grad', 'research'))).toBe('prologue-service-research');
    expect(originPrologue(o('university', 'active'))).toBe(PROLOGUE_START);
    expect(originPrologue(o('highschool', 'industrial'))).toBe('prologue-service-industrial');
  });
  it('originSalary는 학력 + 병역', () => {
    expect(originSalary(o())).toBe(0);
    expect(originSalary(o('highschool', 'industrial'))).toBe((CONTENT.educations.highschool.salary ?? 0) + (CONTENT.services.industrial.salary ?? 0));
  });
});

describe('applyOrigin', () => {
  it('기본 출신은 상태를 바꾸지 않는다', () => {
    const s = makeState();
    expect(applyOrigin(s, o())).toEqual(s);
  });
  it('나이를 정하고 학력 → 병역 효과를 적용한다', () => {
    const s = makeState();
    const r = applyOrigin(s, o('highschool', 'active'));
    expect(r.age).toBe(22);
    const hs = CONTENT.educations.highschool.effects!;
    const act = CONTENT.services.active.effects!;
    expect(r.stats.impl).toBe(s.stats.impl + (hs.stats?.impl ?? 0) + (act.stats?.impl ?? 0));
    expect(r.stats.mental).toBe(s.stats.mental + (hs.stats?.mental ?? 0) + (act.stats?.mental ?? 0));
    expect(r.reputation).toBe(s.reputation + (hs.reputation ?? 0) + (act.reputation ?? 0));
    expect(r.record.story.at(-1)).toContain(act.story!);
    expect(s.age).toBe(22);
  });
});

describe('previewStats', () => {
  it('보정을 더하고 1~99로 자른다', () => {
    const st = { impl: 98, design: 1, debug: 40, infra: 40, ai: 40, mental: 40 };
    const r = previewStats(st, o('highschool'));
    expect(r.impl).toBe(99);
    expect(r.design).toBe(1);
    expect(previewStats(st, o())).toEqual(st);
  });
});
