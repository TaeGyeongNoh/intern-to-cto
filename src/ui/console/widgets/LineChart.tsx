import { hashKey, series } from '../data';
import { hhmm, nowSec } from './fake';
import { AxisX, AxisY, Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

type Props = WidgetProps & {
  title: string;
  /** 인스턴스 이름 접두사 (prod / gpu-node) */
  host: string;
  /** true면 anomaly와 무관하게 평탄한 데이터를 쓴다 */
  flat?: boolean;
};

const N = 60;
const W = 600;
const H = 100;
const THRESHOLD = 70;
const COLORS = ['var(--normal)', '#00C4B4', '#B78BFF'];

const x = (i: number) => (i / (N - 1)) * W;
const y = (v: number) => H - (v / 100) * H;
const line = (d: number[], from = 0) =>
  d.map((v, i) => `${i ? 'L' : 'M'}${x(i + from).toFixed(1)},${y(v).toFixed(1)}`).join('');

export function LineChart({ title, host, flat, ...p }: Props) {
  const main = series(p.k, flat ? false : p.anomaly, N);
  const others = [series(`${p.k}:b`, false, N).map((v) => v * 0.8), series(`${p.k}:c`, false, N).map((v) => v * 0.65)];
  const all = [main, ...others];
  const cur = main[N - 1];
  const hot = main.some((v) => v >= THRESHOLD);
  // 임계치를 넘기 시작한 지점부터 끝까지 붉게 칠한다
  const hotFrom = Math.max(0, main.findIndex((v) => v >= THRESHOLD) - 1);
  const end = nowSec(p.k);
  // 1칸 = 10초, 60칸 = 10분
  const xLabels = [1, 3, 5, 7, 9].map((m) => ({ at: (m * 60) / 600, text: hhmm(end - 600 + m * 60) }));
  const yLabels = [0, 25, 50, 75, 100].map((v) => ({ at: v / 100, text: String(v) }));
  const gid = `lc${hashKey(p.k + title).toString(36)}`;

  return (
    <Panel
      {...p}
      title={title}
      sub="최근 10분 · 10초 평균"
      right={
        <span className={s.kpiInline}>
          현재 <b style={{ color: cur >= THRESHOLD ? 'var(--critical)' : 'var(--text)' }}>{Math.round(cur)}%</b>
        </span>
      }
    >
      <div className={s.legend}>
        {all.map((_, i) => (
          <span key={i}>
            <i style={{ background: COLORS[i] }} />
            {host}-{String(i + 1).padStart(2, '0')}
          </span>
        ))}
        <span><i className={s.dashSwatch} />임계치 {THRESHOLD}%</span>
      </div>
      <div className={s.chart}>
        <AxisY labels={yLabels} />
        <svg className={s.plot} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${title} 추이`}>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--normal)" stopOpacity={0.35} />
              <stop offset="1" stopColor="var(--normal)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((v) => (
            <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} className={s.grid} vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={0} x2={W} y1={y(THRESHOLD)} y2={y(THRESHOLD)} stroke="var(--warning)" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          {others.map((d, i) => (
            <path key={i} d={line(d)} fill="none" stroke={COLORS[i + 1]} strokeWidth={1.2} opacity={0.75} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${line(main)}L${W},${H}L0,${H}Z`} fill={`url(#${gid})`} />
          <path d={line(main)} fill="none" stroke={COLORS[0]} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {hot && (
            <path
              d={line(main.slice(hotFrom), hotFrom)}
              fill="none"
              stroke="var(--critical)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <AxisX labels={xLabels} />
      </div>
    </Panel>
  );
}

/** server-metrics: 장애 콘텐츠에서 대부분 오답 경로라 늘 평탄하게 그린다 */
export function ServerCpu(p: WidgetProps) {
  return <LineChart {...p} title="CPU %" host="prod" flat />;
}

/** gpu-metrics */
export function GpuMemory(p: WidgetProps) {
  return <LineChart {...p} title="GPU 메모리 %" host="gpu-node" />;
}
