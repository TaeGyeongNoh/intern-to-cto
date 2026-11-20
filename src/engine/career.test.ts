import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { determineEnding, generateOffers, joinCompany, scoutEligible } from './career';
import { createRng } from './rng';
import { marketSalary } from './salary';
import { ovr } from './stats';
import { makeState } from './testing';

describe('generateOffers', () => {
  it('현재 회사·숨은 회사 제외, 레벨 범위 안', () => {
    for (let seed = 1; seed < 200; seed++) {
      const s = makeState({ reputation: 40 });
      const o = ovr(s.stats, s.position);
      for (const offer of generateOffers(s, createRng(seed), CONTENT)) {
        const co = CONTENT.companies[offer.companyId];
        expect(co.id).not.toBe(s.companyId);
        expect(co.hidden).toBeFalsy();
        expect(co.level).toBeGreaterThanOrEqual(o - 20);
        expect(co.level).toBeLessThanOrEqual(o + 3 + 4);
        const market = marketSalary(s, co);
        expect(offer.salary).toBe(Math.min(Math.round(market * 1.3), Math.max(market, Math.round(s.salary * 1.03))));
      }
    }
  });
  it('제안 연봉은 시장가 기준이라 고연봉자는 시장가 × 1.3에서 막힌다', () => {
    const s = makeState({ reputation: 40, salary: 90000 });
    for (let seed = 1; seed < 50; seed++)
      for (const offer of generateOffers(s, createRng(seed), CONTENT))
        expect(offer.salary).toBe(Math.round(marketSalary(s, CONTENT.companies[offer.companyId]) * 1.3));
  });
  it('창업 중에는 제안이 없다', () => {
    for (let seed = 1; seed < 50; seed++) expect(generateOffers(makeState({ flags: ['founder'] }), createRng(seed), CONTENT)).toEqual([]);
  });
  it('스카우트는 까다로운 조건 + 확률로만 온다', () => {
    const strong = makeState().stats;
    const s = makeState({
      stats: { ...strong, impl: 70, design: 70, debug: 70, infra: 70, ai: 70, mental: 70 },
      traits: { 관측성전도사: 4 },
      cardsSeen: ['apm', 'db', 'log', 'server', 'gpu', 'k8s', 'browser'],
    });
    expect(scoutEligible(s)).toBe(true);
    expect(scoutEligible({ ...s, traits: { 관측성전도사: 3 } })).toBe(false);
    expect(scoutEligible({ ...s, cardsSeen: s.cardsSeen.slice(0, 6) })).toBe(false);
    expect(scoutEligible({ ...s, stats: strong })).toBe(false);
    expect(scoutEligible({ ...s, flags: ['scout-declined'] })).toBe(false);

    let scouted = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const offers = generateOffers(s, createRng(seed), CONTENT);
      if (offers.some((o) => o.special === 'whatap-scout')) {
        scouted++;
        expect(offers.at(-1)).toMatchObject({ companyId: 'whatap', special: 'whatap-scout' });
      }
    }
    expect(scouted / 400).toBeGreaterThan(0.1);
    expect(scouted / 400).toBeLessThan(0.3);
  });
});

describe('joinCompany', () => {
  it('회사·루트·덱이 바뀌고 예약은 비워지며 번아웃이 줄어든다', () => {
    const s = makeState({ burnout: 40, scheduled: [{ id: 'x', companyId: 'dangeun' }] });
    const r = joinCompany(s, { companyId: 'toastbank', role: 'support', salary: 7000 }, CONTENT);
    expect(r.companyId).toBe('toastbank');
    expect(r.route).toBe('finance');
    expect(r.deck).toEqual(CONTENT.companies.toastbank.cards);
    expect(r.cardsSeen).toEqual(expect.arrayContaining(CONTENT.companies.toastbank.cards));
    expect(r.companiesWorked).toEqual(['dangeun', 'toastbank']);
    expect(r.scheduled).toEqual([]);
    expect(r.burnout).toBe(25);
    expect(r.yearsAtCompany).toBe(0);
    expect(r.salary).toBe(7000);
  });
  it('이직 이야기는 조사를 맞춘다', () => {
    expect(joinCompany(makeState(), { companyId: 'coupangpang', role: 'main', salary: 7000 }, CONTENT).record.story.at(-1)).toContain('쿠팡팡으로 이직했다.');
    expect(joinCompany(makeState(), { companyId: 'toastbank', role: 'main', salary: 7000 }, CONTENT).record.story.at(-1)).toContain('토스트뱅크로 이직했다.');
  });
  it('와탭 스카우트 수락은 플래그를 남긴다', () => {
    const r = joinCompany(makeState(), { companyId: 'whatap', role: 'main', salary: 7000, special: 'whatap-scout' }, CONTENT);
    expect(r.flags).toContain('whatap-joined');
  });
});

describe('determineEnding', () => {
  it('우선순위가 높은 엔딩이 이긴다', () => {
    expect(determineEnding(makeState({ flags: ['founder', 'whatap-joined'] }), CONTENT).id).toBe('whatap');
    expect(determineEnding(makeState({ flags: ['founder', 'exit'] }), CONTENT).id).toBe('founder-exit');
  });
  it('기본값: 한 회사면 원컴퍼니맨, 아니면 평범한 행복', () => {
    expect(determineEnding(makeState(), CONTENT).id).toBe('one-company');
    expect(determineEnding(makeState({ companiesWorked: ['a', 'b'] }), CONTENT).id).toBe('ordinary');
  });
});
