import { nextTitleProgress } from '../../engine/roles';
import type { GameState, Tier } from '../../engine/types';
import s from './NextTitle.module.css';

/** 다음 직급과 조건 한 줄. 미충족 조건만 강조한다. 최고 직급이면 그리지 않는다 */
export function NextTitle({ state, tier }: { state: GameState; tier: Tier }) {
  const p = nextTitleProgress(state, tier);
  if (!p) return null;
  return (
    <div className={s.line}>
      <span className={s.label}>{`다음 직급 ${p.title}`}</span>
      {p.reqs.map((r) => (
        <span key={r.label} className={s.req} data-ok={r.ok}>{`${r.label} ${r.current}/${r.need}`}</span>
      ))}
    </div>
  );
}
