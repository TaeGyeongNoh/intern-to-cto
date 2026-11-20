import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ViewId } from '../../../engine/types';
import { WIDGETS } from './index';

const VIEWS = Object.keys(WIDGETS) as ViewId[];

describe('console widgets', () => {
  it('ViewId 13종이 모두 등록돼 있다', () => {
    expect(VIEWS).toHaveLength(13);
  });

  it.each(VIEWS)('%s: anomaly면 단서 배너를, 정상이면 정상 상태를 그린다', (view) => {
    const W = WIDGETS[view];
    const bad = renderToString(<W k="t" anomaly={true} clue="단서" />);
    const ok = renderToString(<W k="t" anomaly={false} />);
    expect(bad).toContain('단서');
    expect(bad).toContain('data-testid="clue-marker"');
    expect(ok).not.toContain('data-testid="clue-marker"');
    expect(ok.length).toBeGreaterThan(200);
  });

  it.each(VIEWS)('%s: 같은 k면 같은 그림, 다른 k면 다른 그림', (view) => {
    const W = WIDGETS[view];
    const a = renderToString(<W k="inc-1:x" anomaly={true} />);
    expect(renderToString(<W k="inc-1:x" anomaly={true} />)).toBe(a);
    expect(renderToString(<W k="inc-2:y" anomaly={true} />)).not.toBe(a);
  });

  it('anomaly 연출: 트레이스 경고, OOMKilled, 루프 배지', () => {
    const Traj = WIDGETS['agent-trajectory'];
    const Locks = WIDGETS['db-locks'];
    expect(renderToString(<WIDGETS.trace k="t" anomaly={true} />)).toContain('aria-label="경고"');
    expect(renderToString(<WIDGETS.trace k="t" anomaly={false} />)).not.toContain('aria-label="경고"');
    expect(renderToString(<WIDGETS.pods k="t" anomaly={true} />)).toContain('OOMKilled');
    expect(renderToString(<WIDGETS.pods k="t" anomaly={false} />)).not.toContain('OOMKilled');
    expect(renderToString(<Traj k="t" anomaly={true} />)).toContain('×40');
    expect(renderToString(<Locks k="t" anomaly={true} />)).toContain('락 보유');
  });
});
