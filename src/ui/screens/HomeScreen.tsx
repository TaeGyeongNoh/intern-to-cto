import type { ReactNode } from 'react';
import { CONTENT } from '../../content';
import { CARDS } from '../../content/cards';
import { pending, validInputs, type Game, type Input } from '../../engine/game';
import { ROLE_LABELS, roleFor } from '../../engine/roles';
import { ovr, POSITION_LABELS } from '../../engine/stats';
import { STAT_IDS, STAT_LABELS, type CardId, type Role } from '../../engine/types';
import { Button, Chip, StatBar } from '../components/Icon';
import { ArrowDown, ArrowUp, ChevronRight, EyeOff, Flame, IconText, PiggyBank, Wallet } from '../components/Icons';
import { feedIcon, TIER_LABELS, won } from './format';
import { AVATARS } from '../art';
import { Pill, RouteBadge } from './RouteBadge';
import c from './common.module.css';
import s from './HomeScreen.module.css';

const ALL_CARDS = Object.keys(CARDS) as CardId[];
const ROLE_TONE: Record<Role, string> = { owner: 'var(--primary)', main: 'var(--good)', support: 'var(--text-2)' };

function deckQuip(deck: readonly CardId[]): string {
  const n = deck.length;
  if (n === 0) return '모니터링: ssh와 grep, 그리고 기도뿐';
  if (n === 1 && deck[0] === 'log') return '로그만 있음… grep 실력만 늘고 있다';
  if (n >= ALL_CARDS.length) return '풀스택 관측성. 장애가 와도 커피는 식지 않는다';
  if (n >= 5) return '꽤 잘 보인다. 범인은 이 안에 있다';
  return '보이는 만큼 고친다. 안 보이면… 감으로';
}

export function HomeScreen({ game, log, onInput }: { game: Game; log: string[]; onInput: (i: Input) => void }) {
  const st = game.state;
  const co = CONTENT.companies[st.companyId];
  const o = ovr(st.stats, st.position);
  const role = roleFor(o, co.level);
  const hist = st.record.history;
  const ovrDelta = hist.length >= 2 ? hist[hist.length - 1].ovr - hist[hist.length - 2].ovr : 0;
  const isYear = pending(game).kind === 'year';
  const canAdvance = isYear && validInputs(game, CONTENT).length > 0;
  const hot = st.burnout >= 70;

  return (
    <div className={s.wrap}>
      <header className={s.topbar}>
        <span className={s.topTitle}>인턴에서 CTO까지</span>
        <span className={s.topYear}>{st.year}</span>
      </header>

      <main className={`${c.page} ${s.main}`}>
        {/* 상태 카드 */}
        <section className={`${c.card} ${s.profile}`}>
          <img className={s.avatar} src={AVATARS[st.position]} alt={`${POSITION_LABELS[st.position]} 캐릭터`} width={56} height={56} decoding="async" />
          <div className={s.profileText}>
            <div className={s.meta}>{st.year}년 · {st.age}세 · {st.yearsInCareer}년차</div>
            <div className={s.name}>{st.name}</div>
            <div className={s.titleLine}>{st.title} {POSITION_LABELS[st.position]}</div>
            <div className={s.coLine}>
              <b>{co.name}</b>
              <RouteBadge route={co.route} />
              <span className={s.muted}>{TIER_LABELS[co.tier]}</span>
            </div>
            <div className={s.coLine}>
              <Pill tone={ROLE_TONE[role]}>{ROLE_LABELS[role]}</Pill>
              <IconText icon={Wallet} className={s.salary}>{won(st.salary)}</IconText>
              <IconText icon={PiggyBank} className={s.salary}><span className={s.muted}>자산</span> {won(st.assets)}</IconText>
            </div>
          </div>
          <div className={s.ovrBox}>
            <span className={s.ovrLabel}>OVR</span>
            <span className={s.ovrNum}>{o}</span>
            {ovrDelta !== 0 && (
              <span className={ovrDelta > 0 ? s.up : s.down}>{ovrDelta > 0 ? <ArrowUp size={12} strokeWidth={2.25} /> : <ArrowDown size={12} strokeWidth={2.25} />}{Math.abs(ovrDelta)}</span>
            )}
          </div>
        </section>

        {/* 게이지 */}
        <section className={`${c.card} ${s.gauges}`}>
          <Gauge label="평판" value={st.reputation} color="var(--primary)" hint={st.reputation >= 60 ? '업계가 이름을 안다' : st.reputation >= 30 ? '팀에선 알아준다' : '아직은 무명'} />
          <Gauge
            label="번아웃"
            value={st.burnout}
            color={hot ? 'var(--critical)' : st.burnout >= 40 ? 'var(--warning)' : 'var(--good)'}
            hint={hot ? <IconText icon={Flame} tone="critical" size={12}>위험! 쉬어야 한다</IconText> : st.burnout >= 40 ? '슬슬 지친다' : '쌩쌩하다'}
            hot={hot}
          />
        </section>

        {/* 능력치 */}
        <section className={c.card}>
          <div className={s.secHead}>
            <span className={c.label}>능력치</span>
            <IconText icon={EyeOff} size={14} className={s.muted}>잠재력은 비공개</IconText>
          </div>
          <div className={s.stats}>
            {STAT_IDS.map((id) => <StatBar key={id} label={STAT_LABELS[id]} value={st.stats[id]} />)}
          </div>
        </section>

        {/* 관측성 덱 */}
        <section className={c.card}>
          <div className={s.secHead}>
            <span className={c.label}>관측성 덱 <b className={s.deckCount}>{st.deck.length}/{ALL_CARDS.length}</b></span>
            <span className={s.muted}>회사가 쓰는 관측 도구</span>
          </div>
          <div className={s.deck}>
            {ALL_CARDS.map((id) => <Chip key={id} id={id} dim={!st.deck.includes(id)} />)}
          </div>
          <p className={s.quip}>{deckQuip(st.deck)}</p>
        </section>

        {/* 기록 타임라인 */}
        <section className={c.card}>
          <div className={s.secHead}>
            <span className={c.label}>기록</span>
            <span className={s.muted}>최근 순</span>
          </div>
          {log.length === 0 ? (
            <p className={s.muted}>아직 아무 일도 없었다. 폭풍 전의 고요…</p>
          ) : (
            <ol className={s.timeline}>
              {log.map((line, i) => {
                const { icon: I, tone } = feedIcon(line);
                return (
                  <li key={`${i}-${line}`} className={i < 6 ? s.fresh : undefined} data-tone={tone}>
                    <span className={s.mark}><I size={14} /></span>
                    {line}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>

      {isYear && (
        <div className={s.bottom}>
          <div className={s.bottomInner}>
            <Button disabled={!canAdvance} onClick={() => onInput({ t: 'pick', i: 0 })}>
              다음 해로 <span className={s.nextYear}>{st.year + 1}</span> <ChevronRight size={18} strokeWidth={2.25} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Gauge({ label, value, color, hint, hot }: { label: string; value: number; color: string; hint: ReactNode; hot?: boolean }) {
  return (
    <div className={`${s.gauge} ${hot ? s.hot : ''}`}>
      <div className={s.gaugeHead}>
        <span className={c.label}>{label}</span>
        <b style={{ color }}>{value}</b>
      </div>
      <div className={s.track}>
        <div className={s.fill} style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
      <span className={s.hint}>{hint}</span>
    </div>
  );
}
