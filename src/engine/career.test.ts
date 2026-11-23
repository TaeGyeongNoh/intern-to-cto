import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { LEGEND_FAST } from '../content/endings';
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
  it('작은 회사(tiny)는 OVR이 레벨 + 10을 넘으면 제안하지 않는다', () => {
    const tiny = CONTENT.companies['tiny-commerce'];
    const statsAt = (v: number) => ({ impl: v, design: v, debug: v, infra: v, ai: v, mental: v });
    const seen = (v: number) => {
      const s = makeState({ stats: statsAt(v), reputation: 0 });
      const ids = new Set<string>();
      for (let seed = 1; seed < 300; seed++) for (const o of generateOffers(s, createRng(seed), CONTENT)) ids.add(o.companyId);
      return ids;
    };
    expect(seen(tiny.level + 5).has(tiny.id)).toBe(true);
    expect(seen(tiny.level + 11).has(tiny.id)).toBe(false);
  });
  it('창업 중에는 제안이 없다', () => {
    for (let seed = 1; seed < 50; seed++) expect(generateOffers(makeState({ flags: ['founder'] }), createRng(seed), CONTENT)).toEqual([]);
  });
  it('대체복무로 묶여 있으면 제안도 와탭 스카우트도 없다, 복무가 끝나는 해부터 다시 온다', () => {
    const strong = makeState().stats;
    const s = makeState({
      reputation: 80,
      stats: { ...strong, impl: 70, design: 70, debug: 70, infra: 70, ai: 70, mental: 70 },
      traits: { 관측성전도사: 4 },
      cardsSeen: ['apm', 'db', 'log', 'server', 'gpu', 'k8s', 'browser'],
    });
    let free = 0;
    for (let seed = 1; seed < 60; seed++) {
      expect(generateOffers({ ...s, yearsInCareer: 2, boundUntil: 3 }, createRng(seed), CONTENT)).toEqual([]);
      free += generateOffers({ ...s, yearsInCareer: 3, boundUntil: 3 }, createRng(seed), CONTENT).length;
    }
    expect(free).toBeGreaterThan(0);
  });
  it('묶이지 않은 판은 rng 소비가 그대로다', () => {
    const r1 = createRng(7);
    const r2 = createRng(7);
    generateOffers(makeState({ yearsInCareer: 4 }), r1, CONTENT);
    generateOffers(makeState({ yearsInCareer: 4, boundUntil: 3 }), r2, CONTENT);
    expect(r1.getState()).toBe(r2.getState());
  });
  it('묶여 있어도 회사가 문을 닫으면(forced) 다른 곳으로 옮겨 복무를 잇는다', () => {
    const offers = generateOffers(makeState({ yearsInCareer: 1, boundUntil: 3 }), createRng(3), CONTENT, { forced: true });
    expect(offers.length).toBeGreaterThan(0);
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
  describe('흔한 커리어 끝: 스태프·팀장·오래 다닌 시니어', () => {
    const at = (title: string, yearsAtCompany: number, extra: Partial<Parameters<typeof makeState>[0]> = {}) =>
      determineEnding(makeState({ companiesWorked: ['a', 'b'], title, yearsAtCompany, ...extra }), CONTENT).id;
    it('스태프로 끝나면 스태프 엔지니어 (근속과 무관)', () => {
      expect(at('스태프', 1)).toBe('staff');
    });
    it('팀장은 지금 회사 3년 이상이면 든든한 팀장, 갓 옮긴 팀장은 평범한 행복', () => {
      expect(at('팀장', 3)).toBe('team-lead');
      expect(at('팀장', 2)).toBe('ordinary');
    });
    it('시니어는 지금 회사 3년 이상이면 터줏대감, 아니면 평범한 행복', () => {
      expect(at('시니어', 3)).toBe('veteran-senior');
      expect(at('시니어', 2)).toBe('ordinary');
      expect(at('미드레벨', 10)).toBe('ordinary');
    });
    it('창업 실패·원컴퍼니맨·키노트가 더 우선한다', () => {
      expect(at('스태프', 5, { flags: ['founder-failed'] })).toBe('founder-fail');
      expect(at('팀장', 5, { companiesWorked: ['a'] })).toBe('one-company');
      expect(at('시니어', 5, { traits: { keynote: 2 } })).toBe('keynote');
    });
  });
  describe('전설의 SRE: 빠른 복구 횟수와 해결률', () => {
    const base = makeState({ companiesWorked: ['a', 'b'] });
    const withRecord = (position: 'sre' | 'backend', fastResolves: number, resolved: number, total: number) =>
      makeState({ position, companiesWorked: ['a', 'b'], record: { ...base.record, fastResolves, incidentsResolved: resolved, incidentsTotal: total } });
    it('SRE, 빠른 복구 LEGEND_FAST건, 해결률 0.7이면 전설의 SRE', () => {
      expect(determineEnding(withRecord('sre', LEGEND_FAST, 70, 100), CONTENT).id).toBe('legend-sre');
    });
    it('빠른 복구가 하나 모자라면 아니다', () => {
      expect(determineEnding(withRecord('sre', LEGEND_FAST - 1, 70, 100), CONTENT).id).toBe('ordinary');
    });
    it('backend는 같은 기록이어도 아니다', () => {
      expect(determineEnding(withRecord('backend', LEGEND_FAST, 70, 100), CONTENT).id).toBe('ordinary');
    });
    it('해결률 0.69면 아니다', () => {
      expect(determineEnding(withRecord('sre', LEGEND_FAST, 69, 100), CONTENT).id).toBe('ordinary');
    });
    it('평균 MTTR은 조건이 아니다 (초반 기록이 벌이 되지 않는다)', () => {
      const s = withRecord('sre', LEGEND_FAST, 70, 100);
      expect(determineEnding({ ...s, record: { ...s.record, mttrTotalMin: 600 * 100 } }, CONTENT).id).toBe('legend-sre');
    });
  });
});

describe('폐업과 강제 이직', () => {
  it('폐업한 회사는 제안 풀에서 빠진다', () => {
    const s = makeState({ reputation: 60, companyStage: { musinsarang: 'closed' } });
    for (let seed = 1; seed < 200; seed++)
      for (const o of generateOffers(s, createRng(seed), CONTENT)) expect(o.companyId).not.toBe('musinsarang');
  });
  it('forced면 제안이 최소 1건, 같은 루트에서 레벨이 OVR에 가장 가까운 곳으로 채운다', () => {
    const s = makeState({ companyId: 'tiny-commerce', reputation: 0, companyStage: { 'tiny-commerce': 'closed' } });
    const o = ovr(s.stats, s.position);
    let filled = 0;
    for (let seed = 1; seed < 200; seed++) {
      const offers = generateOffers(s, createRng(seed), CONTENT, { forced: true });
      expect(offers.length).toBeGreaterThanOrEqual(1);
      for (const x of offers) expect(x.companyId).not.toBe('tiny-commerce');
      const plain = generateOffers(s, createRng(seed), CONTENT);
      if (plain.length === 0) {
        filled++;
        const near = Object.values(CONTENT.companies)
          .filter((co) => co.route === 'commerce' && !co.hidden && co.id !== 'tiny-commerce')
          .sort((a, b) => Math.abs(a.level - o) - Math.abs(b.level - o))[0];
        expect(offers[0].companyId).toBe(near.id);
      }
    }
    expect(filled).toBeGreaterThan(0);
  });
  it('이직하면 스톡옵션이 사라진다', () => {
    const s = makeState({ stock: { companyId: 'dangeun', value: 1200 } });
    const offer = generateOffers(makeState({ reputation: 80 }), createRng(3), CONTENT, { forced: true })[0];
    expect(joinCompany(s, offer, CONTENT).stock).toBeUndefined();
  });
});
