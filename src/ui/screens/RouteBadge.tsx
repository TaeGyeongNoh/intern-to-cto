import type { ReactNode } from 'react';
import { ROUTE_LABELS, type CompanyRoute } from '../../engine/types';
import { ROUTE_TONE } from './format';
import s from './common.module.css';

export function RouteBadge({ route }: { route: CompanyRoute }) {
  const c = ROUTE_TONE[route];
  return (
    <span className={s.badge} style={{ color: c, borderColor: `${c}55`, background: `${c}14` }}>
      {ROUTE_LABELS[route]}
    </span>
  );
}

export function Pill({ children, tone = 'var(--primary)' }: { children: ReactNode; tone?: string }) {
  return <span className={s.pill} style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}>{children}</span>;
}
