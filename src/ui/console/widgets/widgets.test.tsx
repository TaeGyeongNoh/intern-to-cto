import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ViewId } from '../../../engine/types';
import { FLAVOR_IDS, flavorOf, incidentOf } from './flavor';
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

  describe('장애별 flavor', () => {
    const render = (incident: string, view: ViewId, anomaly = true) => {
      const W = WIDGETS[view];
      return renderToString(<W k={`${incident}:${view}`} anomaly={anomaly} />);
    };
    const qualityBad = (html: string) => html.match(/>([A-Za-z_]+)<\/span><span[^>]*>위험</)?.[1];

    it('키에서 장애 id를 읽고, 모르는 장애는 일반 flavor', () => {
      expect(incidentOf('db-lock:trace')).toBe('db-lock');
      expect(flavorOf('nope:trace')).toBe(flavorOf('t'));
      expect(flavorOf('db-lock:trace')).not.toBe(flavorOf('t'));
      for (const id of ['payment-latency', 'db-lock', 'oom-kill', 'token-bomb', 'hallucination', 'frontend-js-error', 'gpu-oom', 'slow-query', 'prompt-injection', 'cdn-cache', 'lcp-regression', 'spa-memory-leak']) {
        expect(FLAVOR_IDS, id).toContain(id);
      }
    });

    it('PG 호출은 결제 장애 트레이스에만 나온다', () => {
      expect(render('payment-latency', 'trace')).toContain('pg-gateway');
      expect(render('payment-latency', 'topology')).toContain('외부 PG');
      for (const id of ['db-lock', 'oom-kill', 'token-bomb', 'hallucination', 'gpu-oom', 'slow-query', 'prompt-injection', 'unknown']) {
        for (const view of VIEWS) {
          for (const anomaly of [true, false]) expect(render(id, view, anomaly), `${id}:${view}`).not.toContain('pg-gateway');
        }
      }
    });

    it('위젯 내용이 단서와 맞는다', () => {
      expect(render('cdn-cache', 'log-search')).toContain('index.html');
      expect(render('lcp-regression', 'log-search')).toContain('hero-banner');
      expect(render('spa-memory-leak', 'log-search')).toContain('ws subscribe');
      expect(render('db-lock', 'trace')).toContain('UPDATE orders');
      expect(render('db-lock', 'db-locks')).toContain('settlement-batch');
      expect(render('db-lock', 'log-search')).toContain('settlement-batch schedule changed');
      expect(render('oom-kill', 'pods')).toMatch(/\/(<!-- -->)?512(<!-- -->)?Mi/);
      expect(render('oom-kill', 'trace')).toContain('ExcelExportService');
      expect(render('slow-query', 'trace')).toContain('transaction_history');
      expect(render('slow-query', 'db-locks')).toContain('풀스캔');
      expect(render('slow-query', 'log-search')).toContain('DROP INDEX');
      expect(render('token-bomb', 'token-cost')).toMatch(/hbarHot[^"]*"><span[^>]*>search-agent</);
      expect(render('token-bomb', 'agent-trajectory')).toContain('web_search()');
      expect(render('token-bomb', 'agent-trajectory')).toContain('×40');
      expect(render('hallucination', 'agent-trajectory')).toContain('0 docs');
      expect(render('hallucination', 'agent-trajectory')).not.toContain('×40');
      expect(render('hallucination', 'trace')).toContain('vector-db');
      expect(render('prompt-injection', 'agent-trajectory')).toContain('admin_export_config()');
      expect(render('frontend-js-error', 'rum')).toMatch(/hbarHot[^"]*"><span[^>]*>\/checkout</);
      expect(render('gpu-oom', 'pods')).toContain('vllm-server');
      for (const [id, metric] of [['hallucination', 'hallucination'], ['prompt-injection', 'prompt_injection'], ['token-bomb', 'relevance']]) {
        expect(qualityBad(render(id, 'llm-quality')), id).toBe(metric);
      }
    });

    it.each(FLAVOR_IDS)('%s: 모든 위젯이 결정적으로 그려진다', (id) => {
      for (const view of VIEWS) {
        expect(render(id, view)).toBe(render(id, view));
        expect(render(id, view, false)).not.toContain('data-testid="clue-marker"');
      }
    });
  });
});
