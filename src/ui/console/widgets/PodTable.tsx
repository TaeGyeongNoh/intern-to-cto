import { rngFor, suffix } from './fake';
import { Badge, Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

type Pod = { name: string; oom: boolean; restarts: number; mem: number; limit: number };

function build(k: string, anomaly: boolean): Pod[] {
  const r = rngFor(k, 'pods');
  const app = r.pick(['order-api', 'payment-api', 'catalog-api', 'cart-api']);
  const rs = suffix(r, 9);
  const limit = r.pick([512, 768, 1024]);
  const bad = new Set<number>();
  if (anomaly) while (bad.size < 2) bad.add(r.int(0, 4));
  return Array.from({ length: 5 }, (_, i) => {
    const oom = bad.has(i);
    return {
      name: `${app}-${rs}-${suffix(r, 5)}`,
      oom,
      restarts: oom ? r.int(12, 41) : r.int(0, 10) < 8 ? 0 : 1,
      mem: oom ? limit : Math.round(limit * (0.38 + r.next() * 0.3)),
      limit,
    };
  });
}

export function PodTable(p: WidgetProps) {
  const pods = build(p.k, p.anomaly);
  const ready = pods.filter((x) => !x.oom).length;
  return (
    <Panel {...p} title="파드 목록" sub={`namespace: prod · Ready ${ready}/${pods.length}`}>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <colgroup>
            <col />
            <col style={{ width: '26%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <thead>
            <tr><th>이름</th><th>상태</th><th className={s.num}>재시작</th><th>메모리</th></tr>
          </thead>
          <tbody>
            {pods.map((pod) => (
              <tr key={pod.name} className={pod.oom ? s.rowCritical : undefined}>
                <td className={`${s.mono} ${s.ellipsis}`} title={pod.name}>{pod.name}</td>
                <td>{pod.oom ? <Badge tone="critical">OOMKilled</Badge> : <Badge tone="good">Running</Badge>}</td>
                <td className={`${s.mono} ${s.num} ${pod.oom ? s.critText : ''}`}>{pod.restarts}</td>
                <td>
                  <div className={s.meter}>
                    <span style={{ width: `${(pod.mem / pod.limit) * 100}%`, background: pod.oom ? 'var(--critical)' : 'var(--normal)' }} />
                  </div>
                  <div className={`${s.mono} ${s.tiny}`}>{pod.mem}/{pod.limit}Mi</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
