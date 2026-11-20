import { hashKey } from '../data';
import { num, rngFor } from './fake';
import { flavorOf } from './flavor';
import { Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

type Kind = 'agent' | 'llm' | 'tool' | 'end';
type Step = { depth: number; kind: Kind; label: string; meta: string; bad?: boolean };

const COLOR: Record<Kind, string> = {
  agent: 'var(--normal)',
  llm: 'var(--step-httpc)',
  tool: 'var(--step-sql)',
  end: 'var(--good)',
};

const ROW = 24;
const TOP = 16;
const R = 6;
const xOf = (d: number) => 22 + d * 56;
const yOf = (i: number) => TOP + i * ROW;

function build(k: string, anomaly: boolean): { steps: Step[]; loopFrom: number; loopTo: number; tokens: number } {
  const r = rngFor(k, 'traj');
  const fl = flavorOf(k).agents;
  const team = r.pick(fl.teams);
  const ms = (a: number, b: number) => `${(r.int(a, b) / 1000).toFixed(1)}s`;
  const tok = (a: number, b: number) => `${num(r.int(a, b))} tok`;
  const head: Step[] = [
    { depth: 0, kind: 'agent', label: team.lead, meta: ms(80, 200) },
    { depth: 1, kind: 'llm', label: 'LLM · 의도 분류', meta: tok(400, 900) },
    { depth: 1, kind: 'agent', label: team.sub, meta: ms(40, 120) },
    { depth: 2, kind: 'tool', label: `${team.tool}()`, meta: ms(120, 600) },
  ];
  if (!anomaly) {
    const steps: Step[] = [
      ...head,
      { depth: 2, kind: 'llm', label: 'LLM · 결과 요약', meta: tok(900, 1800) },
      { depth: 1, kind: 'tool', label: 'policy_check()', meta: ms(30, 90) },
      { depth: 1, kind: 'llm', label: 'LLM · 최종 답변', meta: tok(600, 1400) },
      { depth: 0, kind: 'end', label: '응답 완료', meta: ms(3200, 5800) },
    ];
    return { steps, loopFrom: -1, loopTo: -1, tokens: r.int(4200, 7800) };
  }
  if (fl.broken) {
    // 루프가 아니라 한 갈래가 틀어진 채로 끝까지 가 버리는 그림 (빈 검색 결과, 문서 속 지시 등)
    const b = fl.broken;
    const steps: Step[] = [
      ...head.slice(0, 3),
      { depth: 2, kind: 'tool', label: b.tool, meta: b.toolMeta, bad: true },
      { depth: 2, kind: 'llm', label: b.llm, meta: tok(900, 1800), bad: true },
      ...(b.next ? [{ depth: 2, kind: 'tool' as const, label: b.next, meta: ms(120, 600), bad: true }] : []),
      { depth: 1, kind: 'llm', label: 'LLM · 최종 답변', meta: tok(600, 1400) },
      { depth: 0, kind: 'end', label: b.end, meta: ms(3200, 5800), bad: true },
    ];
    return { steps, loopFrom: -1, loopTo: -1, tokens: r.int(4200, 7800) };
  }
  const steps: Step[] = [
    ...head,
    { depth: 2, kind: 'llm', label: 'LLM · 재시도 판단', meta: tok(900, 1800) },
    { depth: 2, kind: 'tool', label: `${team.tool}()`, meta: ms(120, 600), bad: true },
    { depth: 2, kind: 'llm', label: 'LLM · 재시도 판단', meta: tok(900, 1800), bad: true },
    { depth: 2, kind: 'tool', label: `${team.tool}()`, meta: ms(120, 600), bad: true },
    { depth: 0, kind: 'end', label: '토큰 한도 초과 · 중단', meta: ms(92000, 118000), bad: true },
  ];
  return { steps, loopFrom: 7, loopTo: 4, tokens: r.int(310_000, 480_000) };
}

export function Trajectory(p: WidgetProps) {
  const { steps, loopFrom, loopTo, tokens } = build(p.k, p.anomaly);
  const h = yOf(steps.length - 1) + TOP;
  const uid = `tj${hashKey(p.k).toString(36)}`;
  const loopX = xOf(2) - R - 3;
  return (
    <Panel {...p} title="에이전트 실행 경로" sub={`트래젝토리 · 스텝 ${loopFrom >= 0 ? '120+' : steps.length} · ${num(tokens)} tok`}>
      <div className={s.legend}>
        <span><i style={{ background: COLOR.agent, borderRadius: 999 }} />에이전트</span>
        <span><i style={{ background: COLOR.llm, borderRadius: 999 }} />LLM</span>
        <span><i style={{ background: COLOR.tool, borderRadius: 999 }} />도구</span>
        <span className={s.legendNote}>↓ 실행 순서 · → 위임 깊이</span>
      </div>
      <svg className={s.diagram} viewBox={`0 0 344 ${h}`} role="img" aria-label="에이전트 실행 순서 그래프">
        <defs>
          <marker id={uid} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--critical)" />
          </marker>
        </defs>
        {[0, 1, 2].map((d) => (
          <line key={d} x1={xOf(d)} x2={xOf(d)} y1={4} y2={h - 4} className={s.gridV} strokeDasharray="2 4" />
        ))}
        {steps.slice(1).map((st, j) => {
          const i = j + 1;
          const prev = steps[j];
          const x0 = xOf(prev.depth);
          const x1 = xOf(st.depth);
          const y0 = yOf(i - 1);
          const y1 = yOf(i);
          // 깊어질 때: 아래로 내려가 오른쪽으로. 얕아질 때: 반 칸 내려가 왼쪽으로 꺾은 뒤 노드로 내려간다.
          const d =
            x1 === x0
              ? `M${x0},${y0 + R}V${y1 - R}`
              : x1 > x0
                ? `M${x0},${y0 + R}V${y1}H${x1 - R}`
                : `M${x0},${y0 + R}V${y1 - ROW / 2}H${x1}V${y1 - R}`;
          return <path key={i} d={d} fill="none" stroke={st.bad ? 'var(--critical)' : 'var(--axis)'} strokeWidth={1.2} opacity={st.bad ? 1 : 0.7} />;
        })}
        {loopFrom >= 0 && (
          <g>
            <path
              d={`M${loopX},${yOf(loopFrom)} C${loopX - 34},${yOf(loopFrom)} ${loopX - 34},${yOf(loopTo)} ${loopX - 2},${yOf(loopTo)}`}
              fill="none"
              stroke="var(--critical)"
              strokeWidth={1.6}
              strokeDasharray="4 2"
              markerEnd={`url(#${uid})`}
            />
            <rect x={loopX - 44} y={(yOf(loopFrom) + yOf(loopTo)) / 2 - 8} width={30} height={16} rx={8} fill="var(--critical)" />
            <text x={loopX - 29} y={(yOf(loopFrom) + yOf(loopTo)) / 2 + 3.5} textAnchor="middle" className={s.loopBadge}>×40</text>
          </g>
        )}
        {steps.map((st, i) => {
          const x = xOf(st.depth);
          const y = yOf(i);
          const c = st.bad ? 'var(--critical)' : COLOR[st.kind];
          return (
            <g key={i}>
              {st.kind === 'end' ? (
                <rect x={x - R} y={y - R} width={R * 2} height={R * 2} rx={2} fill={c} />
              ) : (
                <circle cx={x} cy={y} r={R} fill="#222" stroke={c} strokeWidth={2} />
              )}
              <text x={x + R + 6} y={y + 3.5} className={st.kind === 'tool' ? s.trajTool : s.trajLabel} fill={st.bad ? 'var(--critical)' : 'var(--text)'}>{st.label}</text>
              <text x={338} y={y + 3.5} textAnchor="end" className={s.trajMeta} fill={st.bad ? 'var(--critical)' : 'var(--text-2)'}>{st.meta}</text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
