import type { ReactNode } from 'react';
import { CARDS } from '../../content/cards';
import type { CardId } from '../../engine/types';
import {
  Activity, AppWindow, ArrowDown, ArrowUp, Boxes, Cpu, Database, ScrollText, Server, Sparkles, Workflow,
  type IconType,
} from './Icons';
import s from './Icon.module.css';

const ICONS: Record<Exclude<CardId, 'whatap-ai'>, IconType> = {
  apm: Activity, server: Server, k8s: Boxes, db: Database, log: ScrollText,
  browser: AppWindow, gpu: Cpu, 'ai-agent-obs': Workflow,
};

/** AI 어시스턴트 마크: 보라·파랑 그라디언트 원 위의 흰 반짝임 */
export function AIMark({ size = 16, dim, className }: { size?: number; dim?: boolean; className?: string }) {
  return (
    <span
      className={className ? `${s.icon} ${s.aiMark} ${className}` : `${s.icon} ${s.aiMark}`}
      aria-hidden
      style={{ width: size, height: size, opacity: dim ? 0.4 : 1, filter: dim ? 'grayscale(1)' : undefined }}
    >
      <Sparkles size={Math.round(size * 0.62)} strokeWidth={2} color="#fff" />
    </span>
  );
}

/** 관측 도구 카드 아이콘. 카드 색으로 칠하고, 없는 카드(dim)는 회색으로 흐리게 */
export function CardIcon({ id, size = 16, dim }: { id: CardId; size?: number; dim?: boolean }) {
  if (id === 'whatap-ai') return <AIMark size={size} dim={dim} />;
  const I = ICONS[id];
  return (
    <I
      size={size}
      color={dim ? 'var(--text-2)' : CARDS[id].color}
      style={{ opacity: dim ? 0.4 : 1, flex: 'none', verticalAlign: 'middle' }}
    />
  );
}

export function Chip({ id, dim, label = true }: { id: CardId; dim?: boolean; label?: boolean }) {
  return (
    <span className={`${s.chip} ${dim ? s.chipDim : ''}`} title={CARDS[id].name}>
      <CardIcon id={id} dim={dim} />
      {label && CARDS[id].name}
    </span>
  );
}

export function Button({ variant = 'primary', disabled, onClick, children }: {
  variant?: 'primary' | 'ghost' | 'dark' | 'ai';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`${s.btn} ${s[variant]}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function StatBar({ label, value, max = 99, delta }: { label: string; value: number; max?: number; delta?: number }) {
  const pctW = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={s.stat}>
      <span>{label}</span>
      <div className={s.statTrack}><div className={s.statFill} style={{ width: `${pctW}%` }} /></div>
      <span className={s.statNum}>
        {value}
        {delta ? <span className={delta > 0 ? s.up : s.down}> {delta > 0 ? <ArrowUp size={11} strokeWidth={2.25} /> : <ArrowDown size={11} strokeWidth={2.25} />}{Math.abs(delta)}</span> : null}
      </span>
    </div>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.sheet} role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
