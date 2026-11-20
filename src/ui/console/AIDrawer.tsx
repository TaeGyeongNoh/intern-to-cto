import { AIMark } from '../components/Icon';
import { Sparkles, X } from '../components/Icons';
import s from './AIDrawer.module.css';

export type AIMessage = { from: 'me' | 'ai'; text: string };

export type AIChip = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

/** AI 어시스턴트 드로어. 데스크톱은 오른쪽 패널, 600px 미만은 바텀시트. */
export function AIDrawer({ messages, chips, notice, typing, onClose }: {
  messages: AIMessage[];
  chips: AIChip[];
  /** 칩 아래 안내 (예: 이미 힌트를 드렸어요) */
  notice?: string;
  /** 답변 대기 중 */
  typing?: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div className={s.scrim} onClick={onClose} aria-hidden />
      <aside className={s.drawer} role="dialog" aria-label="WhaTap AI">
        <header className={s.head}>
          <Sparkles size={20} className={s.headIcon} />
          <span className={s.headTitle}>WhaTap AI</span>
          <span className={s.beta}>Beta</span>
          <button type="button" className={s.close} onClick={onClose} aria-label="닫기"><X size={18} /></button>
        </header>
        <div className={s.body}>
          <div className={s.welcome}>
            <AIMark size={40} />
            <p>와탭 AI 어시스턴트입니다. 무엇부터 살펴볼까요?</p>
          </div>
          <div className={s.chips}>
            {chips.map((c) => (
              <button key={c.label} type="button" className={s.chip} disabled={c.disabled} onClick={c.onClick}>
                {c.label}
              </button>
            ))}
          </div>
          {notice && <p className={s.notice}>{notice}</p>}
          <div className={s.thread}>
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'me' ? s.me : s.ai}>
                {m.from === 'ai' && <AIMark size={20} className={s.avatar} />}
                <p className={s.bubble}>{m.text}</p>
              </div>
            ))}
            {typing && (
              <div className={s.ai}>
                <AIMark size={20} className={s.avatar} />
                <p className={`${s.bubble} ${s.typing}`}><i /><i /><i /></p>
              </div>
            )}
          </div>
        </div>
        <footer className={s.foot}>
          <div className={s.input} aria-hidden>메시지를 입력하세요…</div>
          <span className={s.footNote}>AI 답변은 참고용입니다. 최종 판단은 당신의 몫!</span>
        </footer>
      </aside>
    </>
  );
}
