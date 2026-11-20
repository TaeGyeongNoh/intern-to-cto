import { num, rngFor } from './fake';
import { Badge, Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

type Metric = { id: string; higherIsBetter: boolean };

const METRICS: Metric[] = [
  { id: 'hallucination', higherIsBetter: false },
  { id: 'faithfulness', higherIsBetter: true },
  { id: 'toxicity', higherIsBetter: false },
  { id: 'relevance', higherIsBetter: true },
  { id: 'PII', higherIsBetter: false },
  { id: 'prompt_injection', higherIsBetter: false },
];

export function QualityBadges(p: WidgetProps) {
  const r = rngFor(p.k, 'quality');
  // 대부분은 hallucination, 가끔 다른 지표가 터진다
  const badId = p.anomaly ? (r.chance(0.6) ? 'hallucination' : r.pick(METRICS.slice(1)).id) : '';
  const evals = r.int(800, 2400);
  const items = METRICS.map((m) => {
    const bad = m.id === badId;
    // score: 0~1. "좋음" 방향으로 정상 범위를 잡는다
    const good = m.higherIsBetter ? 0.86 + r.next() * 0.12 : r.next() * 0.04;
    const worst = m.higherIsBetter ? 0.22 + r.next() * 0.2 : 0.31 + r.next() * 0.25;
    const score = bad ? worst : good;
    const health = m.higherIsBetter ? score : 1 - score;
    return { ...m, score, bad, health };
  });
  return (
    <Panel {...p} title="응답 품질 평가" sub={`LLM-as-a-judge · 최근 1시간 · 평가 ${num(evals)}건`}>
      <div className={s.qgrid}>
        {items.map((m) => (
          <div key={m.id} className={`${s.qcard} ${m.bad ? s.qcardBad : ''}`}>
            <div className={s.qtop}>
              <span className={s.qname}>{m.id}</span>
              {m.bad ? <Badge tone="critical">위험</Badge> : <Badge tone="good">정상</Badge>}
            </div>
            <div className={s.qscore} style={{ color: m.bad ? 'var(--critical)' : 'var(--text)' }}>
              {m.score.toFixed(2)}
              <span className={s.qdir}>{m.higherIsBetter ? '↑ 높을수록 좋음' : '↓ 낮을수록 좋음'}</span>
            </div>
            <div className={s.meter}>
              <span style={{ width: `${m.health * 100}%`, background: m.bad ? 'var(--critical)' : 'var(--good)' }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
