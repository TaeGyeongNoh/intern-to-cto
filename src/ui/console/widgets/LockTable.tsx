import { rngFor } from './fake';
import { Badge, Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

type Kind = 'holder' | 'waiting' | 'active' | 'idle';
type Row = { sid: number; kind: Kind; wait: number; sql: string };

const BUSY_SQL = [
  'SELECT id, name FROM product WHERE category_id = ?',
  'SELECT COUNT(*) FROM orders WHERE created_at > ?',
  'INSERT INTO access_log (uri, ms) VALUES (?, ?)',
  'SELECT * FROM member WHERE email = ?',
];

function build(k: string, anomaly: boolean): Row[] {
  const r = rngFor(k, 'locks');
  const table = r.pick(['inventory', 'point_balance', 'coupon_stock']);
  const sid = () => r.int(100, 980);
  if (!anomaly) {
    return Array.from({ length: 6 }, (_, i) => ({
      sid: sid(),
      kind: i < 3 ? ('active' as const) : ('idle' as const),
      wait: 0,
      sql: i < 3 ? r.pick(BUSY_SQL) : '-',
    }));
  }
  const holder: Row = { sid: sid(), kind: 'holder', wait: 0, sql: `UPDATE ${table} SET qty = qty - 1 WHERE sku = ?` };
  const waiting: Row[] = Array.from({ length: 4 + r.int(0, 1) }, () => ({
    sid: sid(),
    kind: 'waiting' as const,
    wait: r.int(8, 120),
    sql: `UPDATE ${table} SET qty = qty - ? WHERE sku = ?`,
  })).sort((a, b) => b.wait - a.wait);
  return [holder, ...waiting, { sid: sid(), kind: 'active', wait: 0, sql: r.pick(BUSY_SQL) }];
}

const LABEL: Record<Kind, { tone: 'critical' | 'warning' | 'good' | 'muted'; text: string }> = {
  holder: { tone: 'critical', text: '락 보유' },
  waiting: { tone: 'warning', text: '락 대기' },
  active: { tone: 'good', text: '실행 중' },
  idle: { tone: 'muted', text: '유휴' },
};

export function LockTable(p: WidgetProps) {
  const rows = build(p.k, p.anomaly);
  const waits = rows.filter((x) => x.kind === 'waiting').length;
  return (
    <Panel {...p} title="락 트리 · 액티브 세션" sub={`order-db (MySQL) · 락 대기 ${waits}건`}>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '17%' }} />
            <col />
          </colgroup>
          <thead>
            <tr><th>SID</th><th>상태</th><th className={s.num}>대기시간</th><th>SQL</th></tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={row.kind === 'holder' ? s.rowCritical : undefined}>
                <td className={s.mono}>
                  {row.kind === 'waiting' && <span className={s.treeIndent} aria-hidden>└</span>}
                  {row.sid}
                </td>
                <td><Badge tone={LABEL[row.kind].tone}>{LABEL[row.kind].text}</Badge></td>
                <td className={`${s.mono} ${s.num} ${row.wait >= 30 ? s.warnText : ''}`}>{row.wait ? `${row.wait}s` : '-'}</td>
                <td className={`${s.mono} ${s.ellipsis} ${row.sql === '-' ? s.dim : s.sqlText}`} title={row.sql}>{row.sql}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
