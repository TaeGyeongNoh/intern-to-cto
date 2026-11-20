import type { CSSProperties } from 'react';
import { CONTENT } from '../../content';
import { CARDS } from '../../content/cards';
import { choiceChance, choiceLocked } from '../../engine/events';
import { validInputs, type Game, type Input } from '../../engine/game';
import { STAT_LABELS, type StatId } from '../../engine/types';
import { CardIcon, Modal } from '../components/Icon';
import { IconText, Lock, MessageCircle } from '../components/Icons';
import { eventArt } from '../art';
import { iGa, inkOn, pct } from './format';
import s from './Sheet.module.css';

const chanceTone = (p: number) => (p >= 0.7 ? 'var(--good)' : p >= 0.4 ? 'var(--warning)' : 'var(--critical)');

export function EventCard({ game, eventId, onInput }: { game: Game; eventId: string; onInput: (i: Input) => void }) {
  const ev = CONTENT.events[eventId];
  const st = game.state;
  const valid = new Set(validInputs(game, CONTENT).flatMap((v) => (v.t === 'pick' ? [v.i] : [])));

  const art = eventArt(eventId);

  return (
    <Modal>
      {art && <img className={s.hero} src={art} alt="" width={960} height={640} decoding="async" />}
      <div className={s.head}>
        <span className={s.icon}><MessageCircle size={16} /></span>
        <span className={s.kicker}>{st.year}년 · 선택의 순간</span>
      </div>
      <p className={s.text}>{ev.text}</p>
      <div className={s.choices}>
        {ev.choices.map((ch, i) => {
          const ok = valid.has(i) && !choiceLocked(ch, st);
          const chance = choiceChance(ch, st);
          const card = ch.requires?.card;
          const cardMissing = !!card && !st.deck.includes(card);

          if (!ok && cardMissing && card) {
            const name = CARDS[card].name;
            return (
              <div key={i} className={s.locked} style={{ '--card': CARDS[card].color, '--card-ink': inkOn(CARDS[card].color) } as CSSProperties} aria-disabled>
                <div className={s.lockedTop}>
                  <span className={s.lockIcon}><CardIcon id={card} size={18} /></span>
                  <IconText icon={Lock} size={14} className={s.lockedLabel}>{ch.label}</IconText>
                </div>
                <div className={s.wish}>
                  {name}{iGa(name)} 있었다면…
                  <span className={s.need}>{CARDS[card].name} 필요</span>
                </div>
              </div>
            );
          }

          if (!ok) {
            const stats = Object.entries(ch.requires?.minStat ?? {}) as [StatId, number][];
            const why = stats.filter(([k, v]) => st.stats[k] < v).map(([k, v]) => `${STAT_LABELS[k]} ${v} 이상`).join(', ');
            return (
              <button key={i} type="button" className={`${s.choice} ${s.dim}`} disabled>
                <IconText icon={Lock} size={14}>{ch.label}</IconText>
                {why && <span className={s.meta}>{why} 필요</span>}
              </button>
            );
          }

          return (
            <button key={i} type="button" className={s.choice} onClick={() => onInput({ t: 'pick', i })}>
              <span>{ch.label}</span>
              {chance !== undefined && (
                <span className={s.chance} style={{ color: chanceTone(chance) }}>
                  성공 {pct(chance)}
                  {ch.chance?.card && st.deck.includes(ch.chance.card) && <CardIcon id={ch.chance.card} size={12} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
