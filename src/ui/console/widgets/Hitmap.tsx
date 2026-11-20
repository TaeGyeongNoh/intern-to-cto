import { HITMAP, hitmapPoints } from '../data';
import { hhmm, nowSec, num } from './fake';
import { AxisX, AxisY, Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

/** 세로 칸 수: 0~10s를 200ms 단위로 */
const ROWS = 50;
const BUCKET = HITMAP.maxMs / ROWS;

function fill(ms: number, error: boolean): string {
  if (error) return ms < 1000 ? 'var(--hit-e1)' : ms < 3000 ? 'var(--hit-e2)' : 'var(--hit-e3)';
  return ms < 1000 ? 'var(--hit-n1)' : ms < 3000 ? 'var(--hit-n2)' : 'var(--hit-n3)';
}

export function Hitmap(p: WidgetProps) {
  const pts = hitmapPoints(p.k, p.anomaly);
  // 같은 칸에 점이 겹치면 하나만 그린다. 에러가 우선이다.
  const cells = new Map<number, { col: number; row: number; ms: number; error: boolean }>();
  let errors = 0;
  for (const pt of pts) {
    if (pt.error) errors++;
    const row = Math.min(ROWS - 1, Math.floor(pt.ms / BUCKET));
    const id = pt.col * ROWS + row;
    const prev = cells.get(id);
    if (!prev || (pt.error && !prev.error)) cells.set(id, { col: pt.col, row, ms: pt.ms, error: pt.error });
  }
  const list = [...cells.values()].sort((a, b) => Number(a.error) - Number(b.error));
  const end = nowSec(p.k);
  const start = end - 600;
  const xLabels = [1, 3, 5, 7, 9].map((m) => ({ at: (m * 60) / 600, text: hhmm(start + m * 60) }));
  const yLabels = [0, 2, 4, 6, 8, 10].map((v) => ({ at: v / 10, text: v === 10 ? '10s' : String(v) }));

  return (
    <Panel
      {...p}
      title="트랜잭션 히트맵"
      sub={`최근 10분 · 트랜잭션 ${num(pts.length)} · 에러 ${num(errors)}`}
      right={
        <span className={s.toggle} aria-hidden>
          <span className={s.toggleTrack}><span className={s.toggleKnob} /></span>
          에러만 보기
        </span>
      }
    >
      <div className={s.chart}>
        <AxisY labels={yLabels} />
        <svg
          className={s.plot}
          viewBox={`0 0 ${HITMAP.cols} ${ROWS}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="응답시간 분포 히트맵"
        >
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`y${i}`} x1={0} x2={HITMAP.cols} y1={(ROWS * i) / 10} y2={(ROWS * i) / 10} className={s.grid} vectorEffect="non-scaling-stroke" />
          ))}
          {[1, 3, 5, 7, 9].map((m) => (
            <line key={`x${m}`} x1={m * 12} x2={m * 12} y1={0} y2={ROWS} className={s.gridV} vectorEffect="non-scaling-stroke" />
          ))}
          <g shapeRendering="crispEdges">
            {list.map((c) => (
              <rect key={c.col * ROWS + c.row} x={c.col + 0.1} y={ROWS - 1 - c.row + 0.1} width={0.8} height={0.8} fill={fill(c.ms, c.error)} />
            ))}
          </g>
        </svg>
        <AxisX labels={xLabels} />
      </div>
    </Panel>
  );
}
