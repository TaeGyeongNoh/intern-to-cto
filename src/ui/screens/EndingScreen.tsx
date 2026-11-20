import { useEffect, useRef, useState } from 'react';
import { CONTENT } from '../../content';
import { CARDS } from '../../content/cards';
import type { Game } from '../../engine/game';
import { ovr, POSITION_LABELS } from '../../engine/stats';
import type { CardId } from '../../engine/types';
import { Button, Chip } from '../components/Icon';
import { Award, Download, Link, Play, RotateCcw } from '../components/Icons';
import { ENDING_ART } from '../art';
import { shareUrl } from '../share';
import { won } from './format';
import c from './common.module.css';
import s from './EndingScreen.module.css';

const ALL_CARDS = Object.keys(CARDS) as CardId[];

/** 엔딩 카드에 남길 만한 상점 구매 (산 순서대로) */
const PURCHASE_BADGES: Record<string, string> = {
  house: '내 집 마련', jeonse: '전셋집 입주', ev: '전기차 오너', 'grad-school': '야간 대학원 졸업', jeju: '제주 한 달 살기', cat: '고양이 집사',
};

function purchaseBadges(purchases: readonly string[]): string[] {
  const ids = [...new Set(purchases)].filter((id) => PURCHASE_BADGES[id]);
  // 내 집을 마련했으면 전세 배지는 생략
  return ids.filter((id) => !(id === 'jeonse' && ids.includes('house'))).map((id) => PURCHASE_BADGES[id]);
}

/** shared: 남이 공유한 커리어를 보는 읽기 전용 모드 (onRestart = "나도 해보기") */
export function EndingScreen({ game, onRestart, shared }: { game: Game; onRestart: () => void; shared?: boolean }) {
  const st = game.state;
  const ending = CONTENT.endings.find((e) => e.id === st.endingId);
  const r = st.record;
  const avgMttr = r.incidentsTotal ? Math.round(r.mttrTotalMin / r.incidentsTotal) : 0;
  const years = r.history.length || st.yearsInCareer;
  const isWhatap = st.endingId === 'whatap';
  const art = st.endingId ? ENDING_ART[st.endingId] : undefined;
  const badges = purchaseBadges(st.purchases);
  const { toast, show } = useToast();
  const [busy, setBusy] = useState(false);

  const saveCard = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { downloadShareCard } = await import('../shareCard');
      await downloadShareCard(game);
      show('카드를 저장했어요');
    } catch (e) {
      console.error(e);
      show('카드를 만들지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    let url: string;
    try {
      url = shareUrl(game);
    } catch (e) {
      console.error(e);
      show('링크를 만들지 못했어요');
      return;
    }
    const mobile = typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches;
    if (mobile) {
      try {
        await navigator.share({ title: `인턴에서 CTO까지 — ${ending?.title ?? '커리어'}`, text: `${st.name}님의 커리어: ${ending?.title ?? ''}`, url });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      show('링크를 복사했어요');
    } catch (e) {
      console.error(e);
      show('링크를 복사하지 못했어요');
    }
  };

  return (
    <div className={s.wrap}>
      {shared && (
        <div className={s.sharedBar}>
          <span className={s.sharedName}>{`${st.name}님의 커리어`}</span>
          <Button onClick={onRestart}><Play size={14} />나도 해보기</Button>
        </div>
      )}
      <header className={`${s.hero} ${isWhatap ? s.heroWhatap : ''}`}>
        {art && <img className={s.art} src={art} alt={ending ? `엔딩 일러스트: ${ending.title}` : ''} width={960} height={640} decoding="async" />}
        <div className={s.kicker}>ENDING</div>
        <h1 className={s.title}>{ending?.title ?? '커리어 종료'}</h1>
        <p className={s.desc}>{ending?.description}</p>
        <div className={s.who}>
          {st.name} · {st.title} {POSITION_LABELS[st.position]}{CONTENT.archetypes[st.archetypeId] ? ` · ${CONTENT.archetypes[st.archetypeId].name}` : ''} · {st.age}세 · OVR {ovr(st.stats, st.position)}
        </div>
      </header>

      <main className={`${c.page} ${s.main}`}>
        <section className={`${c.card} ${s.stats}`}>
          <Stat label="커리어" value={`${years}년`} />
          <Stat label="최고 연봉" value={won(st.maxSalary)} />
          <Stat label="순자산" value={won(st.assets)} />
          <Stat label="막아낸 장애" value={`${r.incidentsResolved}/${r.incidentsTotal}`} />
          <Stat label="평균 MTTR" value={r.incidentsTotal ? `${avgMttr}분` : '—'} />
          <Stat label="거쳐 간 회사" value={`${st.companiesWorked.length}곳`} />
          <Stat label="관측 도구" value={`${st.cardsSeen.length}/${ALL_CARDS.length}`} />
          <Stat label="평판" value={`${st.reputation}`} />
          <Stat label="지른 물건" value={`${st.purchases.length}개`} />
        </section>

        {badges.length > 0 && (
          <section className={c.card}>
            <div className={c.label}>인생 업적</div>
            <div className={s.badges}>
              {badges.map((b) => <span key={b} className={s.badge}><Award size={14} />{b}</span>)}
            </div>
          </section>
        )}

        <section className={c.card}>
          <div className={c.label}>경험한 관측 도구</div>
          <div className={s.chips}>
            {ALL_CARDS.map((id) => <Chip key={id} id={id} dim={!st.cardsSeen.includes(id)} />)}
          </div>
          {st.cardsSeen.length === 0 && <p className={s.muted}>평생 grep으로 버텼다. 존경과 애도를 동시에…</p>}
        </section>

        <section className={c.card}>
          <div className={c.label}>인생 이야기</div>
          <ol className={s.story}>
            {r.story.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        </section>

        <section className={s.share} aria-label="공유">
          <Button variant="ghost" disabled={busy} onClick={saveCard}><Download size={16} />{busy ? '만드는 중…' : '카드 저장'}</Button>
          <Button variant="ghost" onClick={copyLink}><Link size={16} />링크 복사</Button>
        </section>

        <div className={s.cta}>
          {shared
            ? <Button onClick={onRestart}><Play size={16} />나도 해보기</Button>
            : <Button onClick={onRestart}><RotateCcw size={16} />새 커리어 시작</Button>}
        </div>
      </main>
      {toast && <div className={s.toast} role="status">{toast}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <b className={s.statValue}>{value}</b>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (msg: string) => {
    clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(null), 2200);
  };
  return { toast, show };
}
