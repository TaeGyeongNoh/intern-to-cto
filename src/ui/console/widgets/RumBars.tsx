import { num, rngFor } from './fake';
import { Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

const PAGES = ['/', '/products', '/products/:id', '/cart', '/checkout', '/mypage'];

export function RumBars(p: WidgetProps) {
  const r = rngFor(p.k, 'rum');
  const hotPage = p.anomaly ? r.pick(['/checkout', '/checkout', '/cart', '/products/:id']) : '';
  const rows = PAGES.map((page) => ({
    page,
    errors: page === hotPage ? r.int(1200, 2600) : r.int(2, 38),
    hot: page === hotPage,
  }));
  const max = Math.max(...rows.map((x) => x.errors), 60);
  const total = rows.reduce((a, b) => a + b.errors, 0);
  const users = Math.round(total * (0.55 + r.next() * 0.2));
  return (
    <Panel {...p} title="페이지별 JS 에러" sub={`브라우저 · 최근 30분 · 영향 사용자 ${num(users)}명`}>
      <ul className={s.hbars}>
        {rows.map((row) => (
          <li key={row.page} className={row.hot ? s.hbarHot : undefined}>
            <span className={`${s.mono} ${s.hbarLabel}`}>{row.page}</span>
            <span className={s.hbarTrack}>
              <span style={{ width: `${Math.max(1.5, (row.errors / max) * 100)}%` }} />
            </span>
            <span className={`${s.mono} ${s.num} ${s.hbarVal}`}>{num(row.errors)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
