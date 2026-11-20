import { CONTENT } from '../../content';
import { validInputs, type Game, type Input } from '../../engine/game';
import { POSTMORTEM_CHOICES } from '../../engine/incident';
import { Modal } from '../components/Icon';
import { EyeOff, FileText, IconText, Megaphone, Siren, UserRoundX, type IconType } from '../components/Icons';
import { Pill } from './RouteBadge';
import s from './Sheet.module.css';

const HINTS: { icon: IconType; hint: string }[] = [
  { icon: Megaphone, hint: '팀 문화 ↑ · 평판 ↑' },
  { icon: EyeOff, hint: '재발할 수도…' },
  { icon: UserRoundX, hint: '평판 ↓' },
];

export function PostmortemCard({ game, incidentId, resolved, onInput }: {
  game: Game; incidentId: string; resolved: boolean; onInput: (i: Input) => void;
}) {
  const inc = CONTENT.incidents[incidentId];
  const valid = new Set(validInputs(game, CONTENT).flatMap((v) => (v.t === 'pick' ? [v.i] : [])));
  return (
    <Modal>
      <div className={s.head}>
        <span className={s.icon}><FileText size={16} /></span>
        <span className={s.kicker}>포스트모템</span>
        <Pill tone={resolved ? 'var(--good)' : 'var(--warning)'}>{resolved ? '복구 완료' : '임시 수습'}</Pill>
      </div>
      {inc && <div className={s.sub}><IconText icon={Siren} tone="critical" size={14}>{inc.title}</IconText></div>}
      <p className={s.text}>장애가 {resolved ? '복구됐다' : '수습됐다'}. 포스트모템은?</p>
      <div className={s.choices}>
        {POSTMORTEM_CHOICES.map((label, i) => (
          <button key={i} type="button" className={s.choice} disabled={!valid.has(i)} onClick={() => onInput({ t: 'pick', i })}>
            {HINTS[i] ? <IconText icon={HINTS[i].icon} tone="inherit">{label}</IconText> : <span>{label}</span>}
            <span className={s.meta}>{HINTS[i]?.hint}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
