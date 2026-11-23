import type { Outcome } from '../../engine/game';
import { Button, Modal } from '../components/Icon';
import { ChevronRight, CircleCheck, CircleX, ClipboardList, type IconType } from '../components/Icons';
import { Pill } from './RouteBadge';
import sheet from './Sheet.module.css';
import s from './ResultCard.module.css';

export function ResultCard({ outcome, onClose }: { outcome: Outcome; onClose: () => void }) {
  const Icon: IconType = outcome.ok === undefined ? ClipboardList : outcome.ok ? CircleCheck : CircleX;
  return (
    <Modal onClose={onClose}>
      <div className={sheet.head}>
        <span className={sheet.icon}><Icon size={16} /></span>
        <span className={sheet.kicker}>결과</span>
        {outcome.ok !== undefined && <Pill tone={outcome.ok ? 'var(--good)' : 'var(--critical)'}>{outcome.ok ? '성공' : '실패'}</Pill>}
      </div>
      <p className={sheet.text}>{outcome.title}</p>
      {outcome.detail && <p className={s.detail}>{outcome.detail}</p>}
      {outcome.deltas.length > 0 ? (
        <div className={s.chips}>
          {outcome.deltas.map((d) => <span key={d.label} className={s.chip} data-good={d.good}>{`${d.label} ${d.value}`}</span>)}
        </div>
      ) : (
        <p className={s.none}>눈에 띄는 변화는 없다</p>
      )}
      <div className={s.cta}>
        <Button onClick={onClose}>다음 <ChevronRight size={16} strokeWidth={2.25} /></Button>
      </div>
    </Modal>
  );
}
