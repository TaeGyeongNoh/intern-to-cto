import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { simulate } from './simulate';
import { RETIRE_AGE } from './season';

describe('simulate', () => {
  it('N판을 돌려 엔딩 분포를 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.games).toBe(100);
    expect(Object.values(r.endings).reduce((a, b) => a + b, 0)).toBe(100);
    expect(r.avgYears).toBeGreaterThan(5);
    // 가장 이른 시작(고졸 20세)부터 은퇴 나이까지
    expect(r.maxYears).toBeLessThanOrEqual(RETIRE_AGE - Math.min(...Object.values(CONTENT.educations).map((e) => e.age)));
  });
  it('연봉 분포를 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.salaryYear10Median).toBeGreaterThan(0);
    expect(r.maxSalary.p90).toBeGreaterThanOrEqual(r.maxSalary.median);
    expect(r.maxSalary.max).toBeGreaterThanOrEqual(r.maxSalary.p90);
  });
  it('주거 자기 자금(전세·내 집에 넣은 현금)을 더한 순자산을 따로 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.assetsWithHousing.median).toBeGreaterThanOrEqual(r.assets.median);
    expect(r.assetsWithHousing.p90).toBeGreaterThanOrEqual(r.assets.p90);
    expect(r.jeonseRate).toBeGreaterThanOrEqual(r.houseRate);
  });
  it('투자 지표: 단계 비율 합 1, 투자한 판의 손익 분위', () => {
    const r = simulate(100, CONTENT);
    expect(r.invest.perGame).toBeGreaterThan(0);
    expect(r.invest.tierShare.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(r.invest.net.p10).toBeLessThanOrEqual(r.invest.net.median);
    expect(r.invest.net.median).toBeLessThanOrEqual(r.invest.net.p90);
  });
  it('greedy: ETF 풀매수만 하고 다른 물건은 사지 않는다', () => {
    const r = simulate(50, CONTENT, 1, 'greedy');
    expect(r.invest.tierShare[2]).toBe(1);
    expect(r.invest.coinNegShare).toBe(0);
    expect(r.avgPurchases).toBeCloseTo(r.invest.perGame);
  });
  it('결정론적이다', () => {
    expect(simulate(30, CONTENT, 7)).toEqual(simulate(30, CONTENT, 7));
  });
  it('단서가 있을 때 장애 해결률이 더 높다', () => {
    const r = simulate(300, CONTENT);
    expect(r.resolveRate.withClues).toBeGreaterThan(r.resolveRate.noClue);
  });
  it('유형별로 판 수·평균 연차·엔딩을 집계한다', () => {
    const r = simulate(100, CONTENT);
    const rows = Object.values(r.byArchetype);
    expect(rows.reduce((a, x) => a + x.games, 0)).toBe(100);
    for (const [id, x] of Object.entries(r.byArchetype)) {
      expect(CONTENT.archetypes[id]).toBeDefined();
      expect(Object.values(x.endings).reduce((a, b) => a + b, 0)).toBe(x.games);
    }
  });
  it('비프롤로그 이벤트 수와 반복 비율을 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.avgEvents).toBeGreaterThan(3);
    expect(r.repeatShare).toBeGreaterThan(0);
    expect(r.repeatShare).toBeLessThan(1);
  });
  it('포지션별 판 수와 엔딩을 집계한다', () => {
    const r = simulate(100, CONTENT);
    expect(Object.values(r.byPosition).reduce((a, x) => a + x.games, 0)).toBe(100);
  });
  it('기본 정책은 random이고, 정책마다 결정론적이다', () => {
    expect(simulate(20, CONTENT, 3, 'random')).toEqual(simulate(20, CONTENT, 3));
    for (const policy of ['skilled', 'loyal'] as const) expect(simulate(20, CONTENT, 3, policy)).toEqual(simulate(20, CONTENT, 3, policy));
    expect(simulate(20, CONTENT, 3, 'skilled')).not.toEqual(simulate(20, CONTENT, 3, 'random'));
  });
  it('skilled: 단서를 더 많이 찾아 해결률이 높고, SRE 판에서 전설의 SRE가 나온다', () => {
    const skilled = simulate(200, CONTENT, 1, 'skilled');
    const random = simulate(200, CONTENT, 1);
    expect(skilled.incidentResolveRate).toBeGreaterThan(random.incidentResolveRate);
    expect(skilled.byPosition.sre.endings['legend-sre'] ?? 0).toBeGreaterThanOrEqual(1);
  });
  it('loyal: 이직하지 않아서 원컴퍼니맨이 나온다', () => {
    const r = simulate(400, CONTENT, 1, 'loyal');
    expect(r.endings['one-company'] ?? 0).toBeGreaterThanOrEqual(1);
  });
  it('현실성: 나이별 연봉과 연차별 직급 분포를 낸다', () => {
    const r = simulate(100, CONTENT);
    expect(r.realism.salaryByAge[30].n).toBeGreaterThan(0);
    expect(r.realism.salaryByAge[30].p90).toBeGreaterThanOrEqual(r.realism.salaryByAge[30].median);
    const y5 = Object.values(r.realism.titleByYear[5]).reduce((a, b) => a + b, 0);
    expect(y5).toBeCloseTo(1);
  });
  it('회사 생활 지표를 낸다', () => {
    const r = simulate(200, CONTENT);
    expect(r.companyLife.negotiationsPerGame).toBeGreaterThan(0);
    expect(r.companyLife.negotiateWinRate).toBeGreaterThan(0);
    expect(r.companyLife.negotiateWinRate).toBeLessThan(1);
    expect(r.companyLife.promotionHeldPerGame).toBeGreaterThan(0);
    expect(r.companyLife.shutdownRate).toBeGreaterThan(0);
  });
  it('현실성: 연말 별점 분포를 낸다', () => {
    const r = simulate(100, CONTENT);
    const shares = [1, 2, 3, 4, 5].map((k) => r.realism.ratingShare[k]);
    expect(shares.every((x) => x >= 0 && x <= 1)).toBe(true);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it('창업 지표를 낸다', () => {
    const r = simulate(400, CONTENT);
    const f = r.founder;
    expect(f.rate).toBeGreaterThan(0);
    expect(f.rate).toBeLessThan(1);
    expect(f.exitShare).toBeGreaterThanOrEqual(0);
    expect(f.exitShare).toBeLessThanOrEqual(1);
    expect(f.survive5).toBeGreaterThan(0);
    expect(f.avgYears).toBeGreaterThanOrEqual(1);
    expect(f.salaryMedian).toBeGreaterThan(0);
    expect(f.reentryRatio).toBeGreaterThan(0);
    expect(f.activeAtRetire).toBeGreaterThanOrEqual(0);
  });
  it('출신을 고루 뽑아 학력·병역 조합별, 학력별로 집계한다', () => {
    const r = simulate(200, CONTENT);
    const combos = Object.entries(r.byOrigin);
    expect(combos.reduce((a, [, x]) => a + x.games, 0)).toBe(200);
    for (const [key, x] of combos) {
      const [ed, sv] = key.split('/');
      expect(CONTENT.educations[ed]).toBeDefined();
      expect(CONTENT.services[sv].educations ?? [ed]).toContain(ed);
      expect(Object.values(x.endings).reduce((a, b) => a + b, 0)).toBe(x.games);
      expect(x.maxSalaryMedian).toBeGreaterThan(0);
    }
    expect(Object.keys(r.byEducation).sort()).toEqual(Object.keys(CONTENT.educations).sort());
    for (const x of Object.values(r.byEducation)) {
      expect(x.firstSalaryMedian).toBeGreaterThan(0);
      expect(x.topEndingShare).toBeGreaterThanOrEqual(0);
      expect(x.topEndingShare).toBeLessThanOrEqual(1);
    }
    expect(r.byEducation.highschool.avgStartAge).toBeLessThan(r.byEducation.switcher.avgStartAge);
  });
});
