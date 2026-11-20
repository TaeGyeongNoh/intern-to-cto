import { CONTENT } from '../src/content';
import { simulate } from '../src/engine/simulate';

const n = Number(process.argv[2] ?? 1000);
const r = simulate(n, CONTENT);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

console.log(`${r.games}판 · 평균 ${r.avgYears.toFixed(1)}년 (최대 ${r.maxYears}) · 판당 장애 ${r.avgIncidents.toFixed(1)}건`);
console.log(`장애 해결률: 단서 0개 ${pct(r.resolveRate.noClue)} / 단서 1개 이상 ${pct(r.resolveRate.withClues)}`);
console.log('엔딩 분포');
const all = CONTENT.endings.map((e) => e.id);
for (const id of all) {
  const cnt = r.endings[id] ?? 0;
  console.log(`  ${cnt === 0 ? '! ' : '  '}${id.padEnd(14)} ${String(cnt).padStart(5)}  ${pct(cnt / r.games)}`);
}
const top = Math.max(...Object.values(r.endings)) / r.games;
if (top > 0.35) console.log(`경고: 한 엔딩이 ${pct(top)}를 차지한다 (목표 35% 이하)`);
