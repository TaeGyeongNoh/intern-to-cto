import { hhmmss, nowSec, rngFor, shuffle } from './fake';
import { Panel, type WidgetProps } from './Panel';
import s from './widgets.module.css';

const NOISE = [
  'INFO  ErrorPageFilter registered for /error',
  'DEBUG errorHandler=DefaultErrorHandler initialized',
  'INFO  retry policy: maxAttempts=3, onError=backoff',
  'WARN  deprecated config key "error.include-stacktrace"',
  'INFO  health check ok (errors=0)',
  'DEBUG metrics: http.server.errors count=0',
];

/** 관측 도구 없이 서버에 붙어 grep 하는 장면. 늘 단서가 없다. */
export function GrepTerminal(p: WidgetProps) {
  const r = rngFor(p.k, 'grep');
  const host = `prod-${String(r.int(1, 4)).padStart(2, '0')}`;
  const t = nowSec(p.k);
  const picked = shuffle(r, NOISE).slice(0, 4);
  // 오래된 줄부터 위로
  let at = t - r.int(1800, 5400);
  const stamps = picked.map(() => (at += r.int(40, 400)));
  return (
    <Panel {...p} title="터미널" sub={`${host} · ssh`} okText="단서가 될 만한 건 안 보인다…">
      <pre className={s.term}>
        <span className={s.termPrompt}>$ </span>ssh {host}{'\n'}
        <span className={s.termDim}>Last login: {hhmmss(t - r.int(3600, 86000))} from 10.0.{r.int(1, 9)}.{r.int(10, 250)}</span>{'\n'}
        <span className={s.termPrompt}>$ </span>grep -i error app.log | tail{'\n'}
        {picked.map((line, i) => (
          <span key={i}>
            <span className={s.termDim}>{hhmmss(stamps[i])} </span>
            {line}
            {'\n'}
          </span>
        ))}
        <span className={s.termPrompt}>$ </span>
        <span className={s.cursor} aria-hidden>▍</span>
      </pre>
      <p className={s.termNote}>로그는 수백만 줄인데… 어디서부터 봐야 하지?</p>
    </Panel>
  );
}
