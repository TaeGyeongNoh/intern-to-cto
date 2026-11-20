import { hashKey } from '../data';
import { num, rngFor } from './fake';
import { flavorOf } from './flavor';
import { Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

type Node = { id: string; x: number; y: number; abbr: string; label: string; kind: 'user' | 'app' | 'db' | 'ext' };
type Edge = { from: string; to: string; tps: number; ms: number };

const R = 17;

export function Topology(p: WidgetProps) {
  const r = rngFor(p.k, 'topo');
  const fl = flavorOf(p.k).topology;
  const ext = r.pick(fl.ext);
  const nodes: Node[] = [
    { id: 'u', x: 34, y: 84, abbr: 'USER', label: '사용자', kind: 'user' },
    { id: 'api', x: 122, y: 84, abbr: 'API', label: 'api-gateway', kind: 'app' },
    { id: 'pay', x: 214, y: 84, ...fl.app, kind: 'app' },
    { id: 'db', x: 306, y: 30, ...fl.db, kind: 'db' },
    { id: 'ext', x: 306, y: 130, ...ext, kind: 'ext' },
  ];
  const tps = r.int(80, 160);
  const edges: Edge[] = [
    { from: 'u', to: 'api', tps, ms: r.int(40, 90) },
    { from: 'api', to: 'pay', tps: Math.round(tps * 0.6), ms: r.int(30, 80) },
    { from: 'pay', to: 'db', tps: Math.round(tps * 0.9), ms: p.anomaly && fl.bad === 'db' ? r.int(4200, 7800) : r.int(2, 12) },
    { from: 'pay', to: 'ext', tps: Math.round(tps * 0.4), ms: p.anomaly && fl.bad === 'ext' ? r.int(4200, 7800) : r.int(90, 260) },
  ];
  const at = (id: string) => nodes.find((n) => n.id === id)!;
  const uid = `tp${hashKey(p.k).toString(36)}`;
  const isBad = (e: Edge) => p.anomaly && e.to === fl.bad;

  return (
    <Panel {...p} title="애플리케이션 토폴로지" sub={`실시간 · 호출 ${num(tps)}/s`}>
      <svg className={s.diagram} viewBox="0 0 344 172" role="img" aria-label="서비스 호출 토폴로지">
        <defs>
          <marker id={`${uid}n`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--axis)" />
          </marker>
          <marker id={`${uid}c`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--critical)" />
          </marker>
        </defs>
        {edges.map((e) => {
          const a = at(e.from);
          const b = at(e.to);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy);
          const ux = dx / len;
          const uy = dy / len;
          const x1 = a.x + ux * (R + 2);
          const y1 = a.y + uy * (R + 2);
          const x2 = b.x - ux * (R + 4);
          const y2 = b.y - uy * (R + 4);
          const bad = isBad(e);
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          return (
            <g key={e.to}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={bad ? 'var(--critical)' : 'var(--axis)'}
                strokeWidth={bad ? 2 : 1.2}
                strokeDasharray={bad ? '5 3' : undefined}
                markerEnd={`url(#${uid}${bad ? 'c' : 'n'})`}
              />
              <text
                x={dy === 0 ? mx : mx + Math.abs(uy) * 9}
                y={dy === 0 ? my - 5 : my + (dy < 0 ? ux : -ux) * 9 + 3}
                className={s.edgeText}
                textAnchor={dy === 0 ? 'middle' : 'start'}
                fill={bad ? 'var(--critical)' : 'var(--text-2)'}>
                {num(e.ms)}ms
              </text>
            </g>
          );
        })}
        {nodes.map((n) => {
          const bad = p.anomaly && n.id === fl.bad;
          const color = n.kind === 'db' ? 'var(--step-dbc)' : n.kind === 'ext' ? 'var(--step-httpc)' : n.kind === 'user' ? 'var(--good)' : 'var(--normal)';
          return (
            <g key={n.id}>
              {bad && <circle cx={n.x} cy={n.y} r={R + 5} fill="none" stroke="var(--critical)" strokeWidth={2} opacity={0.9} />}
              <circle cx={n.x} cy={n.y} r={R} fill="#2E2E2E" stroke={bad ? 'var(--critical)' : color} strokeWidth={2} />
              <text x={n.x} y={n.y + 3} textAnchor="middle" className={s.nodeAbbr} fill={bad ? 'var(--critical)' : color}>{n.abbr}</text>
              <text x={n.x} y={n.y + R + (bad ? 18 : 13)} textAnchor="middle" className={s.nodeLabel} fill={bad ? 'var(--critical)' : 'var(--text)'}>{n.label}</text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
