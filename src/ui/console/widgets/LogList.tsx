import { clockMs, nowSec, num, rngFor } from './fake';
import { Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

type Level = 'INFO' | 'WARN' | 'ERROR';
type Line = { t: number; level: Level; msg: string };

const INFO = [
  'GET /api/products 200 34ms',
  'POST /api/cart 200 51ms',
  'order created orderId=%d',
  'cache hit ratio=0.94 region=product',
  'GET /api/order/%d 200 22ms',
  'scheduler tick: settlement batch idle',
];
const WARN = [
  'HikariPool-1 - Connection is not available, request timed out after 3000ms',
  'slow request POST /api/order/checkout took %dms',
  'retrying pg-gateway call (attempt 2/3)',
];
const ERROR = [
  'PaymentException: pg-gateway read timeout (5000ms)',
  'java.net.SocketTimeoutException: Read timed out',
  'Transaction rolled back orderId=%d',
];

function fmt(msg: string, n: number) {
  return msg.replace('%d', String(n));
}

function build(k: string, anomaly: boolean): Line[] {
  const r = rngFor(k, 'logs');
  let t = nowSec(k) * 1000 - r.int(20_000, 40_000);
  return Array.from({ length: 10 }, (_, i) => {
    t += r.int(80, 2400);
    const roll = r.next();
    const late = i >= 3;
    const level: Level = anomaly && late ? (roll < 0.45 ? 'ERROR' : roll < 0.75 ? 'WARN' : 'INFO') : 'INFO';
    const pool = level === 'ERROR' ? ERROR : level === 'WARN' ? WARN : INFO;
    return { t, level, msg: fmt(r.pick(pool), r.int(1000, 99999)) };
  }).reverse();
}

export function LogList(p: WidgetProps) {
  const lines = build(p.k, p.anomaly);
  const r = rngFor(p.k, 'loghist');
  const bars = Array.from({ length: 30 }, (_, i) => {
    const total = r.int(30, 60);
    const err = p.anomaly && i >= 21 ? r.int(12, 28) : r.int(0, 10) < 9 ? 0 : 1;
    return { total: total + err, err };
  });
  const max = Math.max(...bars.map((b) => b.total));
  const count = bars.reduce((a, b) => a + b.total, 0);
  return (
    <Panel {...p} title="로그 검색" sub={`order-api · 최근 10분 · ${num(count)}건`}>
      <div className={s.search} aria-hidden>
        <span className={s.searchIcon}>⌕</span>
        <span className={s.searchText}>{p.anomaly ? 'level:(ERROR OR WARN)' : 'service:order-api'}</span>
        <span className={s.searchBtn}>검색</span>
      </div>
      <div className={s.histo} aria-hidden>
        {bars.map((b, i) => (
          <span key={i} style={{ height: `${(b.total / max) * 100}%` }}>
            {b.err > 0 && <i style={{ height: `${(b.err / b.total) * 100}%` }} />}
          </span>
        ))}
      </div>
      <ul className={s.logs}>
        {lines.map((l, i) => (
          <li key={i} className={l.level === 'ERROR' ? s.logErr : l.level === 'WARN' ? s.logWarn : undefined}>
            <span className={s.logTime}>{clockMs(l.t)}</span>
            <span className={`${s.logLevel} ${s[`lv_${l.level}`]}`}>{l.level}</span>
            <span className={s.logMsg}>{l.msg}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
