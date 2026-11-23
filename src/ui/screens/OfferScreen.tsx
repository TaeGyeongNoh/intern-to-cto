import { CONTENT } from '../../content';
import type { Game, Input, Offer } from '../../engine/game';
import { validInputs } from '../../engine/game';
import { companyStageName, effectiveCompany } from '../../engine/company';
import { withJosa } from '../../engine/josa';
import { ROLE_LABELS } from '../../engine/roles';
import type { Role } from '../../engine/types';
import { Button, Chip } from '../components/Icon';
import { ArrowRight, House, IconText, Inbox, Sparkles, Wallet } from '../components/Icons';
import { TIER_LABELS, won } from './format';
import { Pill, RouteBadge } from './RouteBadge';
import c from './common.module.css';
import s from './OfferScreen.module.css';

const ROLE_TONE: Record<Role, string> = { owner: 'var(--primary)', main: 'var(--good)', support: 'var(--text-2)' };

export function OfferScreen({ game, offers, forced = false, onInput }: { game: Game; offers: Offer[]; forced?: boolean; onInput: (i: Input) => void }) {
  const st = game.state;
  const cur = CONTENT.companies[st.companyId];
  const valid = new Set(validInputs(game, CONTENT).flatMap((v) => (v.t === 'pick' ? [v.i] : [])));
  const scout = offers.some((o) => o.special);
  const title = forced
    ? `${withJosa(cur.name, '이/가')} 문을 닫았다. 새 회사를 찾아야 한다`
    : scout ? '특별한 메일이 섞여 있다' : `이직 제안이 ${offers.length}건 도착했다`;

  return (
    <div className={s.wrap}>
      <header className={s.head}>
        <IconText icon={Inbox} tone="inherit" size={14} className={s.kicker}>{st.year}년 연말 · 받은편지함</IconText>
        <h1 className={s.title}>{title}</h1>
        <p className={s.now}>
          지금: <b>{cur.name}</b> · {won(st.salary)} · 덱 {st.deck.length}장
        </p>
        {st.stock && !forced && <p className={s.warn}>{`이직하면 스톡옵션 ${won(st.stock.value)}어치가 사라진다`}</p>}
      </header>

      <main className={`${c.page} ${s.list}`}>
        {offers.map((o, i) => (
          <OfferCard key={`${o.companyId}-${i}`} offer={o} game={game} disabled={!valid.has(i)} onPick={() => onInput({ t: 'pick', i })} />
        ))}

        {!forced && <div className={s.stay}>
          <Button variant="ghost" disabled={!valid.has(offers.length)} onClick={() => onInput({ t: 'pick', i: offers.length })}>
            <House size={16} />지금 회사에 남는다
          </Button>
          {scout && <span className={s.stayNote}>와탭 제안은 다시 오지 않을 수도 있어요</span>}
        </div>}
      </main>
    </div>
  );
}

function OfferCard({ offer, game, disabled, onPick }: {
  offer: Offer; game: Game; disabled: boolean; onPick: () => void;
}) {
  const { salary, deck } = game.state;
  const co = effectiveCompany(offer.companyId, game.state, CONTENT);
  const stage = companyStageName(game.state, offer.companyId, CONTENT);
  const raise = salary > 0 ? Math.round(((offer.salary - salary) / salary) * 100) : 0;
  const gain = co.cards.filter((id) => !deck.includes(id)).length;
  const lose = deck.filter((id) => !co.cards.includes(id)).length;
  const isScout = !!offer.special;

  return (
    <article className={`${s.card} ${isScout ? s.scout : ''}`}>
      {isScout && (
        <div className={s.scoutHead}>
          <span>와탭랩스에서 연락이 왔다</span>
        </div>
      )}
      <div className={s.top}>
        <div className={s.coName}>{co.name}</div>
        <span className={s.raise} data-up={raise >= 0}>{raise >= 0 ? '+' : ''}{raise}%</span>
      </div>
      <div className={s.tags}>
        <RouteBadge route={co.route} />
        <span className={s.tier}>{stage ? `${TIER_LABELS[co.tier]} · ${stage}` : TIER_LABELS[co.tier]}</span>
        <Pill tone={ROLE_TONE[offer.role]}>역할 · {ROLE_LABELS[offer.role]}</Pill>
      </div>
      <IconText icon={Wallet} className={s.salary}>{won(offer.salary)}</IconText>

      <div className={s.stack}>
        <div className={s.stackHead}>
          <span className={c.label}>이 회사의 모니터링</span>
          {(gain > 0 || lose > 0) && (
            <span className={s.diff}>
              {gain > 0 && <span className={s.gain}>+{gain}</span>}
              {lose > 0 && <span className={s.lose}>−{lose}</span>}
            </span>
          )}
        </div>
        {co.cards.length ? (
          <div className={s.chips}>{co.cards.map((id) => <Chip key={id} id={id} />)}</div>
        ) : (
          <div className={s.grep}>$ grep -r "ERROR" ./logs <span className={s.cursor}>▌</span> <em>grep만 있음</em></div>
        )}
      </div>

      <div className={s.cta}>
        <Button variant={isScout ? 'ai' : 'primary'} disabled={disabled} onClick={onPick}>
          {isScout ? <><Sparkles size={16} />와탭에 합류한다</> : <>이 회사로 간다<ArrowRight size={16} /></>}
        </Button>
      </div>
    </article>
  );
}
