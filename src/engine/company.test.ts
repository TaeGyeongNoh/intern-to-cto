import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { companyStageName, effectiveCompany } from './company';
import { makeState } from './testing';
import type { Company, Content } from './types';

export const growing: Company = {
  id: 'grow', name: '자라나', route: 'commerce', tier: 'startup', level: 40, baseSalary: 3500, cards: ['log'],
  stages: [
    { name: '시드', level: 40, baseSalary: 3500, up: 0.5, down: 0.2, text: '' },
    { name: '시리즈 A', level: 46, baseSalary: 4000, addCards: ['apm'], up: 0.5, down: 0.2, text: '{company}이/가 시리즈 A 투자를 받았다.' },
    { name: '시리즈 C', level: 52, baseSalary: 4500, tier: 'mid', addCards: ['server', 'log'], up: 0.5, down: 0.1, text: '{company}이/가 시리즈 C를 마쳤다.' },
    { name: '상장', level: 58, baseSalary: 5000, addCards: ['k8s'], up: 0, down: 0, text: '{company}이/가 상장했다.', ipo: true },
  ],
};
export const withGrowing: Content = { ...CONTENT, companies: { ...CONTENT.companies, grow: growing } };

describe('effectiveCompany', () => {
  it('단계가 없으면 회사 그대로', () => {
    expect(effectiveCompany('grow', makeState(), withGrowing)).toEqual(growing);
    expect(effectiveCompany('coupangpang', makeState(), withGrowing)).toEqual(CONTENT.companies.coupangpang);
  });
  it('단계 값으로 level·baseSalary·tier를 덮고 카드는 누적한다', () => {
    const a = effectiveCompany('grow', makeState({ companyStage: { grow: 1 } }), withGrowing);
    expect(a).toMatchObject({ level: 46, baseSalary: 4000, tier: 'startup', cards: ['log', 'apm'] });
    const ipo = effectiveCompany('grow', makeState({ companyStage: { grow: 3 } }), withGrowing);
    expect(ipo).toMatchObject({ level: 58, baseSalary: 5000, tier: 'mid', cards: ['log', 'apm', 'server', 'k8s'] });
  });
  it('폐업한 회사는 마지막으로 도달한 단계가 아니라 시작 값을 쓴다 (다닐 수 없으므로 표시용)', () => {
    expect(effectiveCompany('grow', makeState({ companyStage: { grow: 'closed' } }), withGrowing).level).toBe(40);
  });
});

describe('companyStageName', () => {
  it('단계 있는 회사만 이름, 폐업은 폐업', () => {
    expect(companyStageName(makeState(), 'grow', withGrowing)).toBe('시드');
    expect(companyStageName(makeState({ companyStage: { grow: 2 } }), 'grow', withGrowing)).toBe('시리즈 C');
    expect(companyStageName(makeState({ companyStage: { grow: 'closed' } }), 'grow', withGrowing)).toBe('폐업');
    expect(companyStageName(makeState(), 'coupangpang', withGrowing)).toBeUndefined();
  });
});

describe('엔진의 회사 조회는 단계를 반영한다', () => {
  it('이벤트로 옮기면 단계 카드와 단계 기본 연봉', async () => {
    const { moveToCompany } = await import('./career');
    const s = moveToCompany(makeState({ yearsInCareer: 3, companyStage: { grow: 1 } }), 'grow', withGrowing);
    expect(s.deck).toEqual(['log', 'apm']);
    expect(s.salary).toBe(4000);
  });
  it('이직 제안 연봉은 단계 시장가 기준', async () => {
    const { generateOffers } = await import('./career');
    const { createRng } = await import('./rng');
    const { marketSalary } = await import('./salary');
    const s = makeState({ reputation: 60, companyStage: { grow: 2 } });
    let seen = false;
    for (let seed = 1; seed < 300; seed++)
      for (const o of generateOffers(s, createRng(seed), withGrowing))
        if (o.companyId === 'grow') {
          seen = true;
          expect(o.salary).toBeGreaterThanOrEqual(marketSalary(s, effectiveCompany('grow', s, withGrowing)));
          expect(marketSalary(s, effectiveCompany('grow', s, withGrowing))).toBeGreaterThan(marketSalary(s, growing));
        }
    expect(seen).toBe(true);
  });
  it('연말 평가 기록의 역할 판정은 단계 레벨로', async () => {
    const { runYear } = await import('./season');
    const { createRng } = await import('./rng');
    const s = makeState({ companyId: 'grow', companyStage: { grow: 3 } });
    expect(runYear(s, createRng(1), withGrowing).feed[0]).toContain('서포트');
  });
});
