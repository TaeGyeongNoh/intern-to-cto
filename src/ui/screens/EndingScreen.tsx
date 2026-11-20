import { CONTENT } from '../../content';
import { CARDS } from '../../content/cards';
import type { Game } from '../../engine/game';
import { ovr, POSITION_LABELS } from '../../engine/stats';
import type { CardId } from '../../engine/types';
import { Button, Chip } from '../components/Icon';
import { Camera, IconText, RotateCcw } from '../components/Icons';
import { ENDING_ART } from '../art';
import { won } from './format';
import c from './common.module.css';
import s from './EndingScreen.module.css';

const ALL_CARDS = Object.keys(CARDS) as CardId[];

export function EndingScreen({ game, onRestart }: { game: Game; onRestart: () => void }) {
  const st = game.state;
  const ending = CONTENT.endings.find((e) => e.id === st.endingId);
  const r = st.record;
  const avgMttr = r.incidentsTotal ? Math.round(r.mttrTotalMin / r.incidentsTotal) : 0;
  const years = r.history.length || st.yearsInCareer;
  const isWhatap = st.endingId === 'whatap';
  const art = st.endingId ? ENDING_ART[st.endingId] : undefined;

  return (
    <div className={s.wrap}>
      <header className={`${s.hero} ${isWhatap ? s.heroWhatap : ''}`}>
        {art && <img className={s.art} src={art} alt={ending ? `엔딩 일러스트: ${ending.title}` : ''} width={960} height={640} decoding="async" />}
        <div className={s.kicker}>ENDING</div>
        <h1 className={s.title}>{ending?.title ?? '커리어 종료'}</h1>
        <p className={s.desc}>{ending?.description}</p>
        <div className={s.who}>
          {st.name} · {st.title} {POSITION_LABELS[st.position]} · {st.age}세 · OVR {ovr(st.stats, st.position)}
        </div>
      </header>

      <main className={`${c.page} ${s.main}`}>
        <section className={`${c.card} ${s.stats}`}>
          <Stat label="커리어" value={`${years}년`} />
          <Stat label="최고 연봉" value={won(st.maxSalary)} />
          <Stat label="막아낸 장애" value={`${r.incidentsResolved}/${r.incidentsTotal}`} />
          <Stat label="평균 MTTR" value={r.incidentsTotal ? `${avgMttr}분` : '—'} />
          <Stat label="거쳐 간 회사" value={`${st.companiesWorked.length}곳`} />
          <Stat label="관측 도구" value={`${st.cardsSeen.length}/${ALL_CARDS.length}`} />
        </section>

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

        <section className={s.share} aria-label="공유 카드">
          <IconText icon={Camera}>공유 카드 · 링크 복사</IconText>
          <span className={s.soon}>곧 나와요</span>
        </section>

        <div className={s.cta}>
          <Button onClick={onRestart}><RotateCcw size={16} />새 커리어 시작</Button>
        </div>
      </main>
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
