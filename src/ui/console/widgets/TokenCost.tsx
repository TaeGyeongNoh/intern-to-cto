import { num, rngFor } from './fake';
import { Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

const AGENTS = ['cs-supervisor', 'order-agent', 'refund-agent', 'search-agent', 'summary-agent'];
/** 100만 토큰당 단가($, 입출력 평균) */
const PRICE = 4.2;

const fmtTok = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`);

export function TokenCost(p: WidgetProps) {
  const r = rngFor(p.k, 'tokens');
  const hot = p.anomaly ? r.int(0, AGENTS.length - 1) : -1;
  const rows = AGENTS.map((name, i) => {
    const base = r.int(180, 620) * 1000;
    return { name, tokens: i === hot ? base * 9 : base, hot: i === hot };
  });
  const total = rows.reduce((a, b) => a + b.tokens, 0);
  const requests = r.int(2400, 4200);
  const cost = (total / 1_000_000) * PRICE * 8; // 하루 누적 느낌으로 부풀림
  const perReq = cost / requests;
  const cache = p.anomaly ? r.int(9, 18) : r.int(58, 74);
  const max = Math.max(...rows.map((x) => x.tokens));
  return (
    <Panel {...p} title="토큰 · 비용" sub="에이전트별 · 최근 1시간 토큰 사용량">
      <div className={s.kpis}>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>오늘 비용</span>
          <b className={p.anomaly ? s.critText : undefined}>${cost.toFixed(2)}</b>
          {p.anomaly && <span className={s.kpiDelta}>▲ {r.int(520, 780)}%</span>}
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>요청당 비용</span>
          <b>${perReq.toFixed(3)}</b>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>캐시 적중률</span>
          <b className={p.anomaly ? s.warnText : undefined}>{cache}%</b>
        </div>
      </div>
      <ul className={s.hbars}>
        {rows.map((row) => (
          <li key={row.name} className={row.hot ? s.hbarHot : undefined}>
            <span className={`${s.mono} ${s.hbarLabel}`}>{row.name}</span>
            <span className={s.hbarTrack}>
              <span style={{ width: `${Math.max(2, (row.tokens / max) * 100)}%` }} />
            </span>
            <span className={`${s.mono} ${s.num} ${s.hbarVal}`}>{fmtTok(row.tokens)}</span>
          </li>
        ))}
      </ul>
      <p className={s.footnote}>요청 {num(requests)}건 · 총 {fmtTok(total)} tok</p>
    </Panel>
  );
}
