import { describe, expect, it } from 'vitest';
import { computeTitle, nextTitle, nextTitleProgress, roleFor } from './roles';
import { makeState } from './testing';

describe('roleFor', () => {
  it('회사 레벨 대비 OVR로 역할이 정해진다', () => {
    expect(roleFor(50, 44)).toBe('owner');
    expect(roleFor(45, 44)).toBe('main');
    expect(roleFor(39, 44)).toBe('main');
    expect(roleFor(38, 44)).toBe('support');
  });
});

describe('computeTitle', () => {
  it('IC 트랙', () => {
    expect(computeTitle(makeState({ yearsInCareer: 0 }), 45)).toBe('주니어');
    expect(computeTitle(makeState({ yearsInCareer: 2 }), 60)).toBe('주니어');
    expect(computeTitle(makeState({ yearsInCareer: 3 }), 55)).toBe('미드레벨');
    expect(computeTitle(makeState({ yearsInCareer: 7 }), 65)).toBe('시니어');
    expect(computeTitle(makeState({ yearsInCareer: 10 }), 78)).toBe('스태프');
    expect(computeTitle(makeState({ yearsInCareer: 15 }), 85)).toBe('프린시펄');
  });
  it('직급마다 최소 연차가 있다: 시니어 7년, 스태프 10년, 프린시펄 15년', () => {
    expect(computeTitle(makeState({ yearsInCareer: 6 }), 90)).toBe('미드레벨');
    expect(computeTitle(makeState({ yearsInCareer: 9 }), 90)).toBe('시니어');
    expect(computeTitle(makeState({ yearsInCareer: 14 }), 90)).toBe('스태프');
    expect(computeTitle(makeState({ yearsInCareer: 20 }), 77)).toBe('시니어');
  });
  it('매니지먼트 트랙', () => {
    const mgmt = (over: Parameters<typeof makeState>[0]) => makeState({ track: 'mgmt', yearsInCareer: 15, ...over });
    expect(computeTitle(mgmt({}), 60)).toBe('팀장');
    expect(computeTitle(mgmt({ reputation: 70 }), 80)).toBe('VP of Engineering');
    expect(computeTitle(mgmt({ reputation: 84 }), 90, 'bigtech')).toBe('VP of Engineering');
    expect(computeTitle(mgmt({ reputation: 85 }), 85, 'large')).toBe('CTO');
    expect(computeTitle(mgmt({ reputation: 85 }), 85, 'bigtech')).toBe('CTO');
  });
  it('VP는 OVR 80·평판 70·12년, CTO는 OVR 85·평판 85·15년에 대기업·빅테크여야 한다', () => {
    const mgmt = (over: Parameters<typeof makeState>[0]) => makeState({ track: 'mgmt', yearsInCareer: 15, ...over });
    expect(computeTitle(mgmt({ reputation: 69 }), 90, 'bigtech')).toBe('팀장');
    expect(computeTitle(mgmt({ reputation: 90 }), 79, 'bigtech')).toBe('팀장');
    expect(computeTitle(mgmt({ reputation: 90 }), 84, 'bigtech')).toBe('VP of Engineering');
    expect(computeTitle(mgmt({ reputation: 90 }), 90, 'startup')).toBe('VP of Engineering');
    expect(computeTitle(mgmt({ reputation: 90 }), 90, 'mid')).toBe('VP of Engineering');
    expect(computeTitle(mgmt({ reputation: 90 }), 90)).toBe('VP of Engineering');
    expect(computeTitle(mgmt({ reputation: 90, yearsInCareer: 11 }), 90, 'bigtech')).toBe('팀장');
    expect(computeTitle(mgmt({ reputation: 90, yearsInCareer: 14 }), 90, 'bigtech')).toBe('VP of Engineering');
  });
});

describe('nextTitle', () => {
  it('같은 트랙에서는 높은 쪽', () => {
    expect(nextTitle('스태프', '시니어')).toEqual({ title: '스태프' });
    expect(nextTitle('시니어', '스태프')).toEqual({ title: '스태프', kind: 'promoted' });
    expect(nextTitle('CTO', '팀장')).toEqual({ title: 'CTO' });
    expect(nextTitle('팀장', 'VP of Engineering')).toEqual({ title: 'VP of Engineering', kind: 'promoted' });
  });
  it('트랙이 바뀌면 발령', () => {
    expect(nextTitle('프린시펄', '팀장')).toEqual({ title: '팀장', kind: 'assigned' });
  });
});

const statsAt = (v: number) => ({ impl: v, design: v, debug: v, infra: v, ai: v, mental: v });

describe('nextTitleProgress', () => {
  it('시니어 OVR 71·8년차면 스태프까지 OVR 71/78, 연차 8/10', () => {
    expect(nextTitleProgress(makeState({ title: '시니어', yearsInCareer: 8, stats: statsAt(71) }), 'mid')).toEqual({
      title: '스태프', reqs: [{ label: 'OVR', current: '71', need: '78', ok: false }, { label: '연차', current: '8', need: '10', ok: false }],
    });
  });
  it('미드레벨은 연차 조건도 보여준다', () => {
    expect(nextTitleProgress(makeState({ title: '주니어', yearsInCareer: 2, stats: statsAt(60) }), 'mid')).toEqual({
      title: '미드레벨', reqs: [{ label: 'OVR', current: '60', need: '55', ok: true }, { label: '연차', current: '2', need: '3', ok: false }],
    });
  });
  it('프린시펄·CTO는 다음 직급이 없다', () => {
    expect(nextTitleProgress(makeState({ title: '프린시펄' }), 'large')).toBeUndefined();
    expect(nextTitleProgress(makeState({ title: 'CTO', track: 'mgmt' }), 'large')).toBeUndefined();
  });
  it('중견 회사 VP의 CTO 조건에 회사 규모 미충족', () => {
    const p = nextTitleProgress(makeState({ title: 'VP of Engineering', track: 'mgmt', yearsInCareer: 16, reputation: 90, stats: statsAt(90) }), 'mid');
    expect(p?.title).toBe('CTO');
    expect(p?.reqs).toContainEqual({ label: 'OVR', current: '90', need: '85', ok: true });
    expect(p?.reqs).toContainEqual({ label: '평판', current: '90', need: '85', ok: true });
    expect(p?.reqs).toContainEqual({ label: '회사 규모', current: '중견', need: '대기업·빅테크', ok: false });
  });
  it('트랙이 막 바뀌어 직급이 다른 트랙이면 표시하지 않는다', () => {
    expect(nextTitleProgress(makeState({ title: '시니어', track: 'mgmt' }), 'mid')).toBeUndefined();
  });
});
