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
console.log('현실성: 나이별 연말 연봉 (판 수 · 중앙값 / p90 · 1억 이상 · 2억 이상)');
for (const [age, x] of Object.entries(r.realism.salaryByAge))
  console.log(`  ${age}세 ${String(x.n).padStart(5)}판 · ${won(x.median)} / ${won(x.p90)} · ${pct(x.over1eok)} · ${pct(x.over2eok)}`);
console.log('현실성: 연차별 직급 분포');
for (const [y, tally] of Object.entries(r.realism.titleByYear)) {
  const row = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([t, v]) => `${t} ${pct(v)}`).join(', ');
  console.log(`  ${y.padStart(2)}년차 ${row}`);
}
