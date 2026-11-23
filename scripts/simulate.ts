import { CONTENT } from '../src/content';
import { simulate, type SimPolicy } from '../src/engine/simulate';
import { POSITION_IDS } from '../src/engine/types';

const n = Number(process.argv[2] ?? 1000);
const POLICIES: SimPolicy[] = ['random', 'skilled', 'loyal'];
const policy = (process.argv[3] ?? 'random') as SimPolicy;
if (!POLICIES.includes(policy)) throw new Error(`unknown policy ${policy} (${POLICIES.join(' | ')})`);
const r = simulate(n, CONTENT, 1, policy);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

if (policy !== 'random') console.log(`정책: ${policy}`);
console.log(`${r.games}판 · 평균 ${r.avgYears.toFixed(1)}년 (최대 ${r.maxYears}) · 판당 장애 ${r.avgIncidents.toFixed(1)}건`);
console.log(`장애 해결률: 단서 0개 ${pct(r.resolveRate.noClue)} / 단서 1개 이상 ${pct(r.resolveRate.withClues)}`);
const won = (x: number) => `${x.toLocaleString('ko-KR')}만원`;
console.log(`연봉: 10년차 중앙값 ${won(r.salaryYear10Median)} · 최고연봉 중앙값 ${won(r.maxSalary.median)} / p90 ${won(r.maxSalary.p90)} / 최대 ${won(r.maxSalary.max)}`);
console.log(`자산: 은퇴 순자산 중앙값 ${won(r.assets.median)} / p90 ${won(r.assets.p90)} · 판당 구매 ${r.avgPurchases.toFixed(1)}건 · 내 집 마련 ${pct(r.houseRate)}`);
console.log(`이벤트: 판당 ${r.avgEvents.toFixed(1)}건 · 반복 비율 ${pct(r.repeatShare)}`);
const cl = r.companyLife;
console.log(`회사 생활: 판당 협상 ${cl.negotiationsPerGame.toFixed(1)}회 (더 요구 성공 ${pct(cl.negotiateWinRate)}) · 승진 보류 ${cl.promotionHeldPerGame.toFixed(2)}회 · 상장 ${pct(cl.ipoRate)} · 폐업 ${pct(cl.shutdownRate)} · 스톡옵션 행사 ${pct(cl.stockPayoutRate)} (중앙값 ${won(cl.stockPayoutMedian)})`);
console.log('엔딩 분포');
const all = CONTENT.endings.map((e) => e.id);
for (const id of all) {
  const cnt = r.endings[id] ?? 0;
  console.log(`  ${cnt === 0 ? '! ' : '  '}${id.padEnd(14)} ${String(cnt).padStart(5)}  ${pct(cnt / r.games)}`);
}
const top = Math.max(...Object.values(r.endings)) / r.games;
if (top > 0.35) console.log(`경고: 한 엔딩이 ${pct(top)}를 차지한다 (목표 35% 이하)`);
console.log('유형별 (판 수 · 평균 연차 · 많이 나온 엔딩)');
for (const a of Object.values(CONTENT.archetypes)) {
  const x = r.byArchetype[a.id];
  if (!x) continue;
  const top3 = Object.entries(x.endings).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([id, cnt]) => `${id} ${pct(cnt / x.games)}`).join(', ');
  console.log(`  ${a.name.padEnd(8)} ${String(x.games).padStart(4)}판 · ${x.avgYears.toFixed(1)}년 · ${top3}`);
}
console.log('포지션별 (판 수 · 많이 나온 엔딩)');
for (const p of POSITION_IDS) {
  const x = r.byPosition[p];
  if (!x.games) continue;
  const top3 = Object.entries(x.endings).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, cnt]) => `${id} ${pct(cnt / x.games)}`).join(', ');
  const legend = p === 'sre' ? ` · legend-sre ${pct((x.endings['legend-sre'] ?? 0) / x.games)}` : '';
  console.log(`  ${p.padEnd(8)} ${String(x.games).padStart(4)}판 · ${top3}${legend}`);
}
const top3 = (endings: Record<string, number>, games: number) =>
  Object.entries(endings).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, cnt]) => `${id} ${pct(cnt / games)}`).join(', ');
const uni = r.byEducation.university;
console.log(`출신: 학력별 (판 수 · 시작 나이 · 평균 연차 · 첫 해 연봉(4년제 대비) · 10년차 중앙값(4년제 대비) · 최고연봉 중앙값(전체 대비) · cto+vp+principal)`);
for (const e of Object.values(CONTENT.educations)) {
  const x = r.byEducation[e.id];
  if (!x) continue;
  const rel = (a: number, b: number) => (b ? (a / b).toFixed(2) : '-');
  console.log(`  ${e.name.padEnd(8)} ${String(x.games).padStart(4)}판 · ${x.avgStartAge.toFixed(1)}세 · ${x.avgYears.toFixed(1)}년 · ${won(x.firstSalaryMedian)} (${rel(x.firstSalaryMedian, uni?.firstSalaryMedian ?? 0)}) · ${won(x.year10Median)} (${rel(x.year10Median, uni?.year10Median ?? 0)}) · ${won(x.maxSalaryMedian)} (${rel(x.maxSalaryMedian, r.maxSalary.median)}) · ${pct(x.topEndingShare)} · ${top3(x.endings, x.games)}`);
}
console.log('출신: 학력/병역 조합 (판 수 · 평균 연차 · 첫 해 연봉 · 최고연봉 중앙값 · 많이 나온 엔딩)');
for (const [key, x] of Object.entries(r.byOrigin).sort())
  console.log(`  ${key.padEnd(22)} ${String(x.games).padStart(4)}판 · ${x.avgYears.toFixed(1)}년 · ${won(x.firstSalaryMedian)} · ${won(x.maxSalaryMedian)} · ${top3(x.endings, x.games)}`);
const eduRows = Object.values(r.byEducation);
const tops = eduRows.map((x) => x.topEndingShare);
const warn: string[] = [];
for (const [id, x] of Object.entries(r.byEducation))
  if (Math.abs(x.maxSalaryMedian / r.maxSalary.median - 1) > 0.2) warn.push(`${id} 최고연봉 중앙값이 전체의 ±20% 밖`);
if (Math.min(...tops) > 0 && Math.max(...tops) / Math.min(...tops) > 2) warn.push(`학력별 상위 엔딩 비율 최대/최소 ${(Math.max(...tops) / Math.min(...tops)).toFixed(2)}배 (목표 2배 이하)`);
for (const [key, x] of Object.entries(r.byOrigin)) {
  const [ed, sv] = key.split('/');
  const none = r.byOrigin[`${ed}/none`];
  if ((sv === 'industrial' || sv === 'research') && none && none.avgYears - x.avgYears > 2) warn.push(`${key} 평균 커리어가 ${ed}/none보다 2년 넘게 짧다`);
}
for (const w of warn) console.log(`경고: ${w}`);
console.log('현실성: 나이별 연말 연봉 (판 수 · 중앙값 / p90 · 1억 이상 · 2억 이상)');
for (const [age, x] of Object.entries(r.realism.salaryByAge))
  console.log(`  ${age}세 ${String(x.n).padStart(5)}판 · ${won(x.median)} / ${won(x.p90)} · ${pct(x.over1eok)} · ${pct(x.over2eok)}`);
const rs = r.realism.ratingShare;
console.log(`현실성: 연말 별점 분포 5점 ${pct(rs[5])} · 4점 ${pct(rs[4])} · 3점 ${pct(rs[3])} · 2점 ${pct(rs[2])} · 1점 ${pct(rs[1])}`);
const f = r.founder;
console.log(`현실성: 창업 ${pct(f.rate)} · 창업자 중 엑싯 ${pct(f.exitShare)} · 5년 생존 ${pct(f.survive5)} · 평균 ${f.avgYears.toFixed(1)}년 · 창업 중 연봉 중앙값 ${won(f.salaryMedian)} · 재취업 연봉/창업 직전 ${f.reentryRatio.toFixed(2)} · 은퇴 때 창업 중 ${pct(f.activeAtRetire)}`);
console.log('현실성: 연차별 직급 분포');
for (const [y, tally] of Object.entries(r.realism.titleByYear)) {
  const row = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([t, v]) => `${t} ${pct(v)}`).join(', ');
  console.log(`  ${y.padStart(2)}년차 ${row}`);
}
