import { describe, expect, it } from 'vitest';
import { computeTitle, roleFor } from './roles';
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
    expect(computeTitle(makeState(), 65)).toBe('시니어');
    expect(computeTitle(makeState(), 75)).toBe('스태프');
    expect(computeTitle(makeState(), 85)).toBe('프린시펄');
  });
  it('매니지먼트 트랙', () => {
    expect(computeTitle(makeState({ track: 'mgmt' }), 60)).toBe('팀장');
    expect(computeTitle(makeState({ track: 'mgmt' }), 70)).toBe('VP of Engineering');
    expect(computeTitle(makeState({ track: 'mgmt', reputation: 59 }), 80)).toBe('VP of Engineering');
    expect(computeTitle(makeState({ track: 'mgmt', reputation: 60 }), 78)).toBe('CTO');
  });
});
