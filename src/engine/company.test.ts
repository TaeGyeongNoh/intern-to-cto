import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { companyStageName, effectiveCompany, growCompany, IPO_MULT } from './company';
import { createRng } from './rng';
import { makeState } from './testing';
import type { Company, Content, GameState } from './types';

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

/** 모든 단계의 up/down을 덮어쓴 콘텐츠 (마지막 단계는 0/0 유지) */
const forcing = (up: number, down: number): Content => ({
  ...withGrowing,
  companies: {
    ...withGrowing.companies,
    grow: { ...growing, stages: growing.stages!.map((st, i, all) => (i === all.length - 1 ? st : { ...st, up, down })) },
  },
});

describe('growCompany', () => {
  const at = (over: Partial<GameState> = {}) => makeState({ companyId: 'grow', yearsInCareer: 2, deck: ['log'], cardsSeen: ['log'], ...over });

  it('다음 단계로 오르면 카드가 생기고 문장을 남긴다 (조사 처리)', () => {
    const r = growCompany(at(), createRng(1), forcing(1, 0));
    expect(r.state.companyStage.grow).toBe(1);
    expect(r.state.deck).toEqual(['log', 'apm']);
    expect(r.state.cardsSeen).toContain('apm');
    expect(r.feed).toEqual(['자라나가 시리즈 A 투자를 받았다.']);
    expect(r.state.record.story.at(-1)).toContain('자라나가 시리즈 A 투자를 받았다.');
    expect(r.closed).toBe(false);
  });
  it('상장하면 이 회사 스톡옵션을 IPO_MULT배로 자산에 넣고 비운다', () => {
    const r = growCompany(at({ companyStage: { grow: 2 }, assets: 1000, stock: { companyId: 'grow', value: 1200 } }), createRng(1), forcing(1, 0));
    expect(r.state.companyStage.grow).toBe(3);
    expect(r.state.assets).toBe(1000 + 1200 * IPO_MULT);
    expect(r.state.stock).toBeUndefined();
    expect(r.feed.join('\n')).toContain(`스톡옵션 ${(1200 * IPO_MULT).toLocaleString('ko-KR')}만원`);
  });
  it('폐업하면 closed, 스톡옵션 소멸', () => {
    const r = growCompany(at({ stock: { companyId: 'grow', value: 500 } }), createRng(1), forcing(0, 1));
    expect(r.state.companyStage.grow).toBe('closed');
    expect(r.state.stock).toBeUndefined();
    expect(r.closed).toBe(true);
    expect(r.feed[0]).toContain('자라나가 문을 닫는다');
  });
  it('머무르면 아무것도 바뀌지 않는다', () => {
    const s = at();
    const r = growCompany(s, createRng(1), forcing(0, 0));
    expect(r.state).toEqual(s);
    expect(r.feed).toEqual([]);
  });
  it('1년차 이전, founder, 마지막 단계, 폐업, 단계 없는 회사는 판정하지 않는다 (rng도 쓰지 않는다)', () => {
    const c = forcing(1, 0);
    const cases = [
      at({ yearsInCareer: 0 }),
      at({ flags: ['founder'] }),
      at({ companyStage: { grow: 3 } }),
      at({ companyStage: { grow: 'closed' } }),
      makeState({ companyId: 'coupangpang', yearsInCareer: 2 }),
    ];
    for (const s of cases) {
      const rng = createRng(1);
      const r = growCompany(s, rng, c);
      expect(r.state).toBe(s);
      expect(rng.getState()).toBe(createRng(1).getState());
    }
  });
  it('다니지 않는 회사의 단계는 그대로고 입력 상태를 바꾸지 않는다', () => {
    const s = Object.freeze(at({ companyStage: { other: 1 } }));
    const r = growCompany(s, createRng(1), forcing(1, 0));
    expect(r.state.companyStage).toEqual({ other: 1, grow: 1 });
    expect(s.companyStage).toEqual({ other: 1 });
  });
});

describe('창업 회사 성장', () => {
  const founderCo: Company = {
    id: 'mine', name: '내회사', route: 'commerce', tier: 'startup', level: 40, baseSalary: 2600, cards: [], hidden: true, founder: true,
    stages: [
      { name: '창업', level: 40, baseSalary: 2600, up: 0.5, down: 0.2, text: '', closeEffects: { removeFlags: ['founder'], flags: ['founder-failed'], reputation: 1, stats: { design: 2 }, story: '접었다.' } },
      { name: '시드', level: 44, baseSalary: 3200, up: 0.5, down: 0.2, text: '{company}이/가 시드를 받았다.', effects: { reputation: 2 }, closeEffects: { removeFlags: ['founder'], flags: ['founder-failed'], reputation: 3 } },
      { name: '엑싯', level: 55, baseSalary: 4300, up: 0, down: 0, text: '{company}이/가 인수됐다.', effects: { flags: ['exit'], retire: true, story: '넘겼다.' } },
    ],
  };
  const force = (up: number, down: number): Content => ({
    ...CONTENT,
    companies: { ...CONTENT.companies, mine: { ...founderCo, stages: founderCo.stages!.map((st, i, all) => (i === all.length - 1 ? st : { ...st, up, down })) } },
  });
  const at = (over: Partial<GameState> = {}) => makeState({ companyId: 'mine', yearsInCareer: 9, flags: ['founder'], reputation: 30, ...over });

  it('founder 플래그가 있어도 창업 회사에서는 성장 판정을 굴린다', () => {
    const r = growCompany(at(), createRng(1), force(1, 0));
    expect(r.state.companyStage.mine).toBe(1);
  });
  it('단계에 오르면 그 단계 effects를 적용한다', () => {
    const r = growCompany(at(), createRng(1), force(1, 0));
    expect(r.state.reputation).toBe(32);
    expect(r.feed[0]).toBe('내회사가 시드를 받았다.');
  });
  it('엑싯 단계에 도달하면 exit 플래그와 은퇴', () => {
    const r = growCompany(at({ companyStage: { mine: 1 } }), createRng(1), force(1, 0));
    expect(r.state.companyStage.mine).toBe(2);
    expect(r.state.flags).toEqual(expect.arrayContaining(['founder', 'exit']));
    expect(r.state.retired).toBe(true);
    expect(r.state.record.story.at(-1)).toContain('넘겼다.');
  });
  it('폐업하면 그 단계 closeEffects를 적용하고 founder를 지운다', () => {
    const s = at({ companyStage: { mine: 1 } });
    const r = growCompany(s, createRng(1), force(0, 1));
    expect(r.closed).toBe(true);
    expect(r.state.companyStage.mine).toBe('closed');
    expect(r.state.flags).not.toContain('founder');
    expect(r.state.flags).toContain('founder-failed');
    expect(r.state.reputation).toBe(33);
  });
  it('창업 단계 폐업은 스탯과 문장이 남는다', () => {
    const s = at();
    const r = growCompany(s, createRng(1), force(0, 1));
    expect(r.state.stats.design).toBe(s.stats.design + 2);
    expect(r.state.record.story.at(-1)).toContain('접었다.');
    expect(r.feed[0]).toContain('내회사가 문을 닫는다');
  });
  it('입력 상태를 바꾸지 않는다', () => {
    const s = Object.freeze(at({ companyStage: Object.freeze({ mine: 1 }) as GameState['companyStage'] }));
    const flags = [...s.flags];
    growCompany(s, createRng(1), force(0, 1));
    growCompany(s, createRng(1), force(1, 0));
    expect(s.flags).toEqual(flags);
    expect(s.companyStage).toEqual({ mine: 1 });
  });
});
