import { useMemo, useState } from 'react';
import { CONTENT } from '../../content';
import { newGame, type Game } from '../../engine/game';
import { generateCandidates, ovr, POSITION_LABELS } from '../../engine/stats';
import { ROUTE_IDS, ROUTE_LABELS, STAT_IDS, STAT_LABELS, type CardId, type PositionId, type RouteId, type StatId } from '../../engine/types';
import { Button, Chip, StatBar } from '../components/Icon';
import {
  ChevronRight, Dices, Landmark, Rocket, ShoppingCart, Siren, type IconType,
} from '../components/Icons';
import { AVATARS, MARK, ROUTE_ART } from '../art';
import type { SaveData } from '../save';
import { won } from './format';
import c from './common.module.css';
import s from './CreateScreen.module.css';

const POSITIONS: { id: PositionId; desc: string }[] = [
  { id: 'backend', desc: '서버와 API의 수호자. 결제 지연은 일단 내 탓' },
  { id: 'frontend', desc: '유저가 보는 모든 것. 흰 화면 공포증 보유' },
  { id: 'sre', desc: '새벽 3시 온콜의 주인공. 알람 소리에 깬다' },
  { id: 'ai', desc: '토큰과 GPU를 태우는 사람. 환각은 기능입니다' },
];

const ROUTES: Record<RouteId, { icon: IconType; incident: string; cards: CardId[] }> = {
  commerce: { icon: ShoppingCart, incident: '블프 자정, 결제 버튼이 안 눌린다', cards: ['apm', 'browser'] },
  finance: { icon: Landmark, incident: '월말 정산 배치가 DB 락에 걸렸다', cards: ['db', 'server', 'log'] },
  'ai-startup': { icon: Rocket, incident: '에이전트가 무한 루프로 토큰을 태운다', cards: ['gpu', 'ai-agent-obs', 'whatap-ai'] },
};

const startCompany = (r: RouteId) => Object.values(CONTENT.companies).find((co) => co.route === r && co.start);
const newSeed = () => Math.floor(Math.random() * 1e9);

export function CreateScreen({ onStart, saved, onContinue }: { onStart: (g: Game) => void; saved?: SaveData | null; onContinue: () => void }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<PositionId>('backend');
  const [route, setRoute] = useState<RouteId>('commerce');
  const [seed, setSeed] = useState(newSeed);
  const [candidate, setCandidate] = useState(0);
  const cands = useMemo(() => generateCandidates(position, seed, CONTENT.archetypes), [position, seed]);

  const start = () => {
    const n = name.trim() || '김개발';
    onStart(newGame({ name: n, position, route, candidate }, seed, CONTENT));
  };

  return (
    <div className={s.wrap}>
      <header className={s.hero}>
        <span className={s.markTile}><img src={MARK} alt="" width={64} height={64} decoding="async" /></span>
        <h1 className={s.title}>인턴에서 CTO까지</h1>
        <p className={s.sub}>AI 시대, 개발자 인생 시뮬레이션</p>
      </header>

      <main className={c.page}>
        {saved && (
          <section className={`${c.card} ${s.continue}`}>
            <div>
              <div className={c.label}>저장된 커리어</div>
              <b>{saved.setup.name}</b> · {POSITION_LABELS[saved.setup.position]} · {ROUTE_LABELS[saved.setup.route]}
              <div className={s.muted}>{saved.log.length}번의 선택을 이어서</div>
            </div>
            <Button onClick={onContinue}>이어하기 <ChevronRight size={16} strokeWidth={2.25} /></Button>
          </section>
        )}

        <section className={s.section}>
          <h2 className={s.h2}><span className={s.step}>1</span>이름</h2>
          <input
            className={s.input}
            value={name}
            maxLength={10}
            placeholder="김개발"
            onChange={(e) => setName(e.target.value.slice(0, 10))}
            aria-label="이름"
          />
        </section>

        <section className={s.section}>
          <h2 className={s.h2}><span className={s.step}>2</span>포지션</h2>
          <div className={s.grid2}>
            {POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${s.pick} ${position === p.id ? s.on : ''}`}
                onClick={() => { setPosition(p.id); setCandidate(0); }}
                aria-pressed={position === p.id}
              >
                <img className={s.avatar} src={AVATARS[p.id]} alt={`${POSITION_LABELS[p.id]} 캐릭터`} width={52} height={52} loading="lazy" decoding="async" />
                <b>{POSITION_LABELS[p.id]}</b>
                <span className={s.desc}>{p.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.h2}><span className={s.step}>3</span>첫 직장</h2>
          <div className={s.routes}>
            {ROUTE_IDS.map((r) => {
              const co = startCompany(r);
              const meta = ROUTES[r];
              return (
                <button
                  key={r}
                  type="button"
                  className={`${s.pick} ${s.route} ${route === r ? s.on : ''}`}
                  onClick={() => setRoute(r)}
                  aria-pressed={route === r}
                >
                  <div className={s.routeHead}>
                    <span className={s.glyph}><meta.icon size={16} /></span>
                    <b>{ROUTE_LABELS[r]}</b>
                    {co && <span className={s.muted}>· {co.name} · {won(co.baseSalary)}</span>}
                  </div>
                  <div className={s.routeBody}>
                    <div className={s.routeText}>
                      <span className={`${s.desc} ${s.incident}`}><Siren size={14} className={s.incidentIcon} />{meta.incident}</span>
                      <span className={s.chips}>{meta.cards.map((id) => <Chip key={id} id={id} />)}</span>
                    </div>
                    <img className={s.routeArt} src={ROUTE_ART[r]} alt="" width={120} height={80} loading="lazy" decoding="async" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.h2Row}>
            <h2 className={s.h2}><span className={s.step}>4</span>나는 어떤 신입?</h2>
            <Button variant="ghost" onClick={() => { setSeed(newSeed()); setCandidate(0); }}><Dices size={16} />다시 뽑기</Button>
          </div>
          <p className={s.muted}>세 명 모두 OVR 45, 능력치 합 240. 유형마다 강점·약점과 타고난 기질이 달라요.</p>
          <div className={s.cands}>
            {cands.map(({ archetypeId, stats: st }, i) => {
              const a = CONTENT.archetypes[archetypeId];
              const tone = (id: StatId) => (a.spikes.includes(id) ? 'strong' : a.dumps.includes(id) ? 'weak' : 'plain');
              return (
              <button
                key={archetypeId}
                type="button"
                className={`${s.pick} ${s.cand} ${candidate === i ? s.on : ''}`}
                onClick={() => setCandidate(i)}
                aria-pressed={candidate === i}
              >
                <div className={s.candHead}>
                  <b className={s.candName}>{a.name}</b>
                  <span className={s.ovr}>OVR <b>{ovr(st, position)}</b></span>
                </div>
                <p className={s.tagline}>{a.tagline}</p>
                {STAT_IDS.map((id) => <StatBar key={id} label={STAT_LABELS[id]} value={st[id]} tone={tone(id)} />)}
              </button>
              );
            })}
          </div>
        </section>
      </main>

      <div className={s.bottom}>
        <div className={s.bottomInner}>
          <Button onClick={start}>커리어 시작 <ChevronRight size={18} strokeWidth={2.25} /></Button>
        </div>
      </div>
    </div>
  );
}
