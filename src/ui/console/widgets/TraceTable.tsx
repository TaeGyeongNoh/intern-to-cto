import { clockMs, nowSec, num, rngFor } from './fake';
import { flavorOf, type StepType } from './flavor';
import { Panel, type WidgetProps } from './Panel';
import { TriangleAlert } from '../../components/Icons';
import s from './widgets.module.css';

type Step = { type: StepType; text: string; start: number; gap: number; elapsed: number; slow: boolean };

const ORDER: StepType[] = ['method', 'method', 'dbc', 'sql', 'sql', 'httpc', 'method', 'sql', 'httpc', 'sql'];

function build(k: string, anomaly: boolean): Step[] {
  const r = rngFor(k, 'trace');
  const { texts, slow: slowStep } = flavorOf(k).trace;
  const n = 8 + r.int(0, 2);
  const types = ORDER.slice(0, n);
  // 이 장애에서 느려지는 스텝 종류(외부 호출/SQL/메서드) 자리 중 하나에 경고를 단다
  const candidates = types.map((t, i) => (t === slowStep.type ? i : -1)).filter((i) => i >= 2);
  const slowIdx = anomaly ? r.pick(candidates) : -1;
  let t = nowSec(k) * 1000 - r.int(2000, 9000);
  const out: Step[] = [];
  for (let i = 0; i < n; i++) {
    const type = types[i];
    const gap = i === 0 ? 0 : r.int(0, type === 'method' ? 3 : 12);
    t += gap;
    const slow = i === slowIdx;
    const base = type === 'httpc' ? r.int(18, 140) : type === 'sql' ? r.int(1, 28) : type === 'dbc' ? r.int(0, 4) : r.int(0, 2);
    const elapsed = slow ? r.int(slowStep.ms[0], slowStep.ms[1]) : base;
    const text = r.pick(texts[type]);
    out.push({ type, text: slow ? slowStep.text : text, start: t, gap, elapsed, slow });
    t += elapsed;
  }
  return out;
}

const TAG: Record<StepType, string> = { method: 'METHOD', sql: 'SQL', httpc: 'HTTPC', dbc: 'DBC' };

export function TraceTable(p: WidgetProps) {
  const steps = build(p.k, p.anomaly);
  const { endpoint } = flavorOf(p.k).trace;
  const t0 = steps[0].start;
  const total = steps[steps.length - 1].start + steps[steps.length - 1].elapsed - t0;
  return (
    <Panel {...p} title="트랜잭션 프로파일" sub={`${endpoint} · 경과 ${num(total)}ms`}>
      <div className={s.tableWrap}>
        <table className={`${s.table} ${s.trace}`}>
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '15%' }} />
            <col />
          </colgroup>
          <thead>
            <tr><th>No</th><th>시간</th><th className={s.num}>갭</th><th className={s.num}>경과</th><th>내용</th></tr>
          </thead>
          <tbody>
            {steps.map((st, i) => (
              <tr key={i} className={st.slow ? s.rowCritical : undefined}>
                <td className={s.dim}>{i}</td>
                <td className={s.mono}>{clockMs(st.start).slice(3)}</td>
                <td className={`${s.mono} ${s.num}`}>{st.gap}</td>
                <td className={`${s.mono} ${s.num} ${st.slow ? s.critText : ''}`}>
                  {num(st.elapsed)}
                </td>
                <td>
                  <div className={s.stepCell}>
                    {st.slow && <span className={`${s.critText} ${s.warnIcon}`} role="img" aria-label="경고" data-testid="trace-warning"><TriangleAlert size={13} strokeWidth={2} /></span>}
                    <span className={s.stepTag} style={{ color: `var(--step-${st.type})` }}>{TAG[st.type]}</span>
                    <span className={s.stepText} title={st.text}>{st.text}</span>
                  </div>
                  <div className={s.gantt} aria-hidden>
                    <span
                      style={{
                        left: `${((st.start - t0) / total) * 100}%`,
                        width: `max(2px, ${(st.elapsed / total) * 100}%)`,
                        background: st.slow ? 'var(--critical)' : `var(--step-${st.type})`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
