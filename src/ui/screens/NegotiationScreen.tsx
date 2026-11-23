import { CONTENT } from '../../content';
import { effectiveCompany, STOCK_GRANT_MULT } from '../../engine/company';
import { NEGOTIATE_CHOICES, validInputs, type Game, type Input } from '../../engine/game';
import { negotiateChance, negotiatedSalary } from '../../engine/salary';
import { Modal } from '../components/Icon';
import { Handshake } from '../components/Icons';
import { eventArt } from '../art';
import { NextTitle } from './NextTitle';
import { pct, won } from './format';
import sheet from './Sheet.module.css';
import s from './NegotiationScreen.module.css';

const signedPct = (from: number, to: number) => {
  const d = from > 0 ? Math.round(((to - from) / from) * 100) : 0;
  return `${d >= 0 ? '+' : '−'}${Math.abs(d)}%`;
};

export function NegotiationScreen({ game, rating, base, prev, onInput }: {
  game: Game; rating: number; base: number; prev: number; onInput: (i: Input) => void;
}) {
  const st = game.state;
  const co = effectiveCompany(st.companyId, st, CONTENT);
  const valid = new Set(validInputs(game, CONTENT).flatMap((v) => (v.t === 'pick' ? [v.i] : [])));
  const chance = negotiateChance(st, rating);
  const { win, lose } = negotiatedSalary(st, co, rating, prev, base);
  const grant = (base - prev) * STOCK_GRANT_MULT;
  const art = eventArt('lead-offer');
  const notes = [
    `확정 · ${won(base)}`,
    `성공 ${pct(chance)} · ${won(win)} (${signedPct(prev, win)}) / 실패 시 ${won(lose)} (${signedPct(prev, lose)})`,
    `연봉 동결 · 스톡옵션 +${won(grant)}어치 (상장해야 돈이 된다)`,
  ];

  return (
    <Modal>
      {art && <img className={sheet.hero} src={art} alt="" width={960} height={640} decoding="async" />}
      <div className={sheet.head}>
        <span className={sheet.icon}><Handshake size={16} /></span>
        <span className={sheet.kicker}>{`${st.year}년 연말 · 연봉 협상`}</span>
      </div>
      <p className={sheet.text}>{`평가 ${rating}/5. 인사팀이 "올해 인상률 ${signedPct(prev, base).replace('+', '')}"가 적힌 종이를 내민다. 볼펜은 이미 뚜껑이 열려 있다.`}</p>
      <div className={s.summary}>
        <span className={s.salary}>{`연봉 ${won(prev)} → ${won(base)} (${signedPct(prev, base)})`}</span>
        <NextTitle state={st} tier={co.tier} />
      </div>
      <div className={sheet.choices}>
        {NEGOTIATE_CHOICES.map((label, i) =>
          valid.has(i) ? (
            <button key={label} type="button" className={sheet.choice} onClick={() => onInput({ t: 'pick', i })}>
              <span>{label}</span>
              <span className={sheet.meta}>{notes[i]}</span>
            </button>
          ) : null,
        )}
      </div>
    </Modal>
  );
}
