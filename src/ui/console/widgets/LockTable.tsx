import { rngFor } from './fake';
import { flavorOf } from './flavor';
import { Badge, Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

type Kind = 'holder' | 'waiting' | 'scan' | 'active' | 'idle';
type Row = { sid: number; kind: Kind; wait: number; sql: string };

function build(k: string, anomaly: boolean): Row[] {
  const r = rngFor(k, 'locks');
  const fl = flavorOf(k).locks;
  const sid = () => r.int(100, 980);
  if (!anomaly) {
    return Array.from({ length: 6 }, (_, i) => ({
      sid: sid(),
      kind: i < 3 ? ('active' as const) : ('idle' as const),
      wait: 0,
      sql: i < 3 ? r.pick(fl.busy) : '-',
    }));
  }
  if (fl.mode === 'scan') {
    // 락이 아니라 풀스캔 세션들이 커넥션을 전부 붙잡고 있는 그림
    const scans: Row[] = Array.from({ length: 5 + r.int(0, 1) }, () => ({ sid: sid(), kind: 'scan' as const, wait: r.int(9, 58), sql: fl.holder }))
      .sort((a, b) => b.wait - a.wait);
    return [...scans, { sid: sid(), kind: 'waiting', wait: r.int(3, 30), sql: r.pick(fl.busy) }];
  }
  const holder: Row = { sid: sid(), kind: 'holder', wait: 0, sql: fl.holder };
  const waiting: Row[] = Array.from({ length: 4 + r.int(0, 1) }, () => ({
    sid: sid(),
    kind: 'waiting' as const,
    wait: r.int(8, 120),
    sql: r.pick(fl.waiting),
  })).sort((a, b) => b.wait - a.wait);
  return [holder, ...waiting, { sid: sid(), kind: 'active', wait: 0, sql: r.pick(fl.busy) }];
}

const LABEL: Record<Kind, { tone: 'critical' | 'warning' | 'good' | 'muted'; text: string }> = {
  holder: { tone: 'critical', text: '락 보유' },
  scan: { tone: 'critical', text: '풀스캔' },
  waiting: { tone: 'warning', text: '락 대기' },
  active: { tone: 'good', text: '실행 중' },
  idle: { tone: 'muted', text: '유휴' },
};

export function LockTable(p: WidgetProps) {
  const rows = build(p.k, p.anomaly);
  const fl = flavorOf(p.k).locks;
  const waits = rows.filter((x) => x.kind === 'waiting').length;
  const scans = rows.filter((x) => x.kind === 'scan').length;
  const sub = scans ? `${fl.db} · 커넥션 풀 20/20 · 풀스캔 ${scans}건` : `${fl.db} · 락 대기 ${waits}건`;
  return (
    <Panel {...p} title="락 트리 · 액티브 세션" sub={sub}>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '17%' }} />
            <col />
          </colgroup>
          <thead>
            <tr><th>SID</th><th>상태</th><th className={s.num}>{scans ? '실행·대기' : '대기시간'}</th><th>SQL</th></tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={row.kind === 'holder' || row.kind === 'scan' ? s.rowCritical : undefined}>
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
