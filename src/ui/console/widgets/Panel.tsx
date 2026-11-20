import type { ReactNode } from 'react';
import { Search } from '../../components/Icons';
import s from './widgets.module.css';

export type WidgetProps = {
  k: string;
  anomaly: boolean;
  clue?: string;
  /** 이 화면을 열어 준 관측 도구 이름. 패널 하단 구석에 작게 표시 */
  source?: string;
};

type PanelProps = WidgetProps & {
  title: string;
  sub?: string;
  right?: ReactNode;
  /** 정상일 때 하단 문구 */
  okText?: string;
  children: ReactNode;
};

/** 위젯 카드: 헤더(제목·부제·우측 컨트롤) + 본문 + 하단 상태/단서 배너 */
export function Panel({ anomaly, clue, source, title, sub, right, okText = '특이사항 없음', children }: PanelProps) {
  const src = source ? <span className={s.source}>{source}</span> : null;
  return (
    <section className={s.panel}>
      <header className={s.head}>
        <div className={s.titles}>
          <h3 className={s.title}>{title}</h3>
          {sub && <span className={s.sub}>{sub}</span>}
        </div>
        {right && <div className={s.right}>{right}</div>}
      </header>
      <div className={s.body}>{children}</div>
      {anomaly && clue ? (
        <div className={s.clue} role="note">
          <Search size={14} strokeWidth={2} className={s.clueIcon} data-testid="clue-marker" />
          <span>{clue}</span>
          {src}
        </div>
      ) : !anomaly ? (
        <div className={s.ok}>
          <span className={s.okDot} aria-hidden />
          {okText}
          {src}
        </div>
      ) : src ? (
        <div className={s.ok}>{src}</div>
      ) : null}
    </section>
  );
}

export type Tone = 'good' | 'warning' | 'critical' | 'normal' | 'muted';

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`${s.badge} ${s[`b_${tone}`]}`}>{children}</span>;
}

/** HTML로 그리는 축 라벨 (SVG를 늘려도 글자가 깨지지 않게) */
export function AxisY({ labels }: { labels: { at: number; text: string }[] }) {
  return (
    <div className={s.axisY} aria-hidden>
      {labels.map((l) => (
        <span key={l.text} style={{ top: `${(1 - l.at) * 100}%` }}>{l.text}</span>
      ))}
    </div>
  );
}

export function AxisX({ labels }: { labels: { at: number; text: string }[] }) {
  return (
    <div className={s.axisX} aria-hidden>
      {labels.map((l) => (
        <span key={l.text} style={{ left: `${l.at * 100}%` }}>{l.text}</span>
      ))}
    </div>
  );
}
