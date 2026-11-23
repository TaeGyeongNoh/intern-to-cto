import { useEffect, useState } from 'react';
import { CONTENT } from '../../content';
import { CARDS, VIEW_LABELS } from '../../content/cards';
import { pending, validInputs, type Game, type Input } from '../../engine/game';
import { actionChance, isOffRole } from '../../engine/incident';
import { POSITION_LABELS } from '../../engine/stats';
import type { CardDef, IncidentOption, ViewId } from '../../engine/types';
import { Button, CardIcon } from '../components/Icon';
import { ChevronLeft, ChevronRight, ChevronUp, IconText, LifeBuoy, Lock, Search, Siren, Sparkles, Wrench } from '../components/Icons';
import { pct } from '../screens/format';
import { AIDrawer, type AIChip, type AIMessage } from './AIDrawer';
import { WIDGETS } from './widgets';
import s from './IncidentConsole.module.css';

/** 방금 연 뷰의 결과. 엔진은 이미 다음 단계로 넘어갔어도 "다음"을 누를 때까지 보여준다. */
type Inspect = { step: number; picked: number; view: ViewId; correct: boolean; clue?: string; label: string; order: number[] };

const cardForView = (view: ViewId): CardDef | undefined => Object.values(CARDS).find((c) => c.views.includes(view));

/** 분 → HH:MM */
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const chanceTone = (p: number) => (p >= 0.7 ? 'var(--good)' : p >= 0.4 ? 'var(--warning)' : 'var(--critical)');

/** 관측 도구 카드로 연 화면이면 패널 구석에 붙는 작은 도구 이름 (grep은 없음) */
const sourceOf = (view: ViewId) => {
  const card = view === 'grep' ? undefined : cardForView(view);
  return card ? `WhaTap · ${card.name}` : undefined;
};

const AI_PREFIX = /^와탭 AI:\s*/;

export function IncidentConsole({ game, onInput }: { game: Game; onInput: (i: Input) => void }) {
  const p = pending(game);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const [mttr, setMttr] = useState(0);

  // 장식용 MTTR: 1초에 1분
  useEffect(() => {
    const t = window.setInterval(() => setMttr((m) => m + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  // ask 직후의 feed에서 AI 어시스턴트 답변을 꺼낸다
  useEffect(() => {
    if (!asking) return;
    const line = game.feed.find((l) => l.includes('와탭 AI'));
    if (line) setMessages((m) => [...m, { from: 'ai', text: line.replace(AI_PREFIX, '') }]);
    setAsking(false);
  }, [game, asking]);

  if (p.kind !== 'incident-step' && p.kind !== 'incident-action') return null;

  const st = game.state;
  const inc = CONTENT.incidents[p.incidentId];
  const company = CONTENT.companies[st.companyId];
  const valid = validInputs(game, CONTENT);
  const canPick = (i: number) => valid.some((v) => v.t === 'pick' && v.i === i);
  const canAsk = valid.some((v) => v.t === 'ask');
  const hasAI = st.deck.includes('whatap-ai');
  const total = inc.steps.length;
  const offRole = isOffRole(inc, st.position);
  const owners = (inc.positions ?? []).map((id) => POSITION_LABELS[id]).join('·');

  // 사이드바와 상단 문구는 inspect 중이면 방금 고른 단계를 기준으로 그린다
  const shownStep = inspect ? inspect.step : p.kind === 'incident-step' ? p.step : null;
  const step = shownStep === null ? undefined : inc.steps[shownStep];
  const doneSteps = inspect ? inspect.step + 1 : p.kind === 'incident-step' ? p.step : total;

  const order = inspect ? inspect.order : p.kind === 'incident-step' ? p.order : [];

  const pickOption = (i: number, o: IncidentOption) => {
    if (inspect || p.kind !== 'incident-step' || !canPick(i)) return;
    setInspect({ step: p.step, picked: i, view: o.view, correct: o.correct, clue: o.clue, label: o.label, order: p.order });
    onInput({ t: 'pick', i });
  };

  const say = (q: string, a: string) => setMessages((m) => [...m, { from: 'me', text: q }, { from: 'ai', text: a }]);
  const chips: AIChip[] = [
    {
      label: '무엇을 할 수 있나요?',
      onClick: () => say('무엇을 할 수 있나요?', '장애 원인 분석, 지표 요약, 그리고 새벽 3시의 정신적 지지까지 해드려요. 단, 장애 하나에 힌트는 한 번뿐이에요.'),
    },
    {
      label: '이 장애 원인 찾아줘',
      disabled: !canAsk || !!inspect || asking,
      onClick: () => {
        if (!canAsk || inspect) return;
        setMessages((m) => [...m, { from: 'me', text: '이 장애 원인 찾아줘' }]);
        setAsking(true);
        onInput({ t: 'ask' });
      },
    },
    {
      label: '주요 지표 보여줘',
      onClick: () => say('주요 지표 보여줘', `지금 제일 빨간 건 "${inc.title}"이에요. 장애 대응 중엔 원인부터 찾는 게 국룰이에요.`),
    },
  ];
  const notice =
    p.kind === 'incident-step' && p.hintUsed ? '이번 장애에선 이미 힌트를 드렸어요'
      : p.kind === 'incident-action' ? '원인 분석은 끝났어요. 이제 조치할 시간!'
        : inspect ? '결과를 확인하고 다음 단계에서 물어보세요' : undefined;

  const firstOpen = order.find((i) => canPick(i)) ?? order[0] ?? 0;
  const previewView = step ? step.options[firstOpen].view : undefined;

  return (
    <div className={s.root} data-theme="dark">
      <div className={s.vignette} aria-hidden />

      <header className={s.header}>
        <nav className={s.crumbs} aria-label="경로">
          <span className={s.crumbCo}>{company.name}</span>
          <ChevronRight size={12} className={s.crumbSep} />
          <span className={s.crumbInc}><Siren size={14} className={s.crumbIcon} /> {inc.title}</span>
        </nav>
        <div className={s.timer} title="MTTR (장식용)">
          <span className={s.liveDot} aria-hidden />
          <span className={s.timerLabel}>MTTR</span>
          <span className={s.timerNum} style={mttr >= 60 ? { color: 'var(--critical)' } : undefined}>{hhmm(mttr)}</span>
        </div>
        <Button variant="ai" disabled={!hasAI} onClick={() => setDrawer(true)}>
          {hasAI ? <Sparkles size={16} /> : <Lock size={16} />}<span className={s.aiLabel}>WhaTap AI</span>
        </Button>
      </header>

      <div className={s.layout}>
        <nav className={s.side} aria-label="분석 화면">
          <div className={s.sideTitle}>{step ? '분석 화면' : '조치'}</div>
          {step ? (
            order.map((i) => {
              const o = step.options[i];
              const card = cardForView(o.view);
              const open = canPick(i) || (!!inspect && inspect.picked === i);
              const active = inspect?.picked === i;
              return (
                <button
                  key={`${shownStep}:${i}`}
                  type="button"
                  className={`${s.item} ${active ? s.itemActive : ''}`}
                  disabled={!!inspect || !canPick(i)}
                  aria-current={active || undefined}
                  onClick={() => pickOption(i, o)}
                >
                  <span className={s.itemIcon}>
                    {o.view === 'grep' || !card ? <span className={s.grep}>&gt;_</span> : <CardIcon id={card.id} size={18} dim={!open} />}
                  </span>
                  <span className={s.itemText}>
                    <span className={s.itemLabel}>{VIEW_LABELS[o.view]}</span>
                    <span className={`${s.itemSub} ${open ? '' : s.subLocked}`}>{open ? o.label : <IconText icon={Lock} size={12} tone="inherit">{card?.name ?? ''} 필요</IconText>}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className={`${s.item} ${s.itemActive}`} aria-current>
              <span className={s.itemIcon}><Wrench size={18} /></span>
              <span className={s.itemText}>
                <span className={s.itemLabel}>조치 선택</span>
                <span className={s.itemSub}>단서 {p.clues}개 확보</span>
              </span>
            </div>
          )}
        </nav>

        <main className={s.main}>
          {offRole && (
            <div className={s.offRole}>
              <IconText icon={LifeBuoy} tone="warning" size={14}>지원 호출 · {owners} 장애에 불려 왔다</IconText>
            </div>
          )}
          {p.kind === 'incident-step' && p.step === 0 && !inspect && (
            <div className={s.alarm} role="alert">
              <span className={s.alarmBadge}>CRITICAL</span>
              <span>{inc.summary}</span>
            </div>
          )}

          <div className={s.status}>
            <ol className={s.stepper} aria-hidden>
              {Array.from({ length: total }, (_, i) => (
                <li key={i} className={i < doneSteps ? s.stepDone : i === shownStep ? s.stepNow : ''} />
              ))}
            </ol>
            <span>
              {step
                ? <>단계 {(shownStep ?? 0) + 1}/{total} · 단서 {p.clues}개 — <b>{step.prompt}</b></>
                : <>원인 분석 완료 · 단서 <b>{p.clues}개</b> 확보</>}
            </span>
          </div>

          {inspect ? (
            <div className={s.inspect} key={`${inspect.step}:${inspect.picked}`}>
              {WIDGETS[inspect.view]({ k: `${inc.id}:${inspect.view}`, anomaly: inspect.correct, clue: inspect.clue, source: sourceOf(inspect.view) })}
              <div className={`${s.result} ${inspect.correct ? s.resultHit : s.resultMiss}`}>
                <span className={s.resultText}>
                  {inspect.correct ? <><IconText icon={Search} tone="good" className={s.hitLabel}><b>단서 확보</b></IconText> · 단서 {p.clues}개</> : <>별다른 단서가 없다… <span className={s.dim}>({inspect.label})</span></>}
                </span>
                <Button onClick={() => setInspect(null)}>다음 <ChevronRight size={16} strokeWidth={2.25} /></Button>
              </div>
            </div>
          ) : step && previewView ? (
            <div className={s.preview}>
              <p className={s.guide}>
                <span className={s.guideArrow} aria-hidden>
                  <ChevronLeft size={18} strokeWidth={2.5} className={s.wide} />
                  <ChevronUp size={18} strokeWidth={2.5} className={s.narrow} />
                </span>
                <span className={s.wide}>왼쪽에서 어떤 화면을 열지 고르세요</span>
                <span className={s.narrow}>위 탭에서 어떤 화면을 열지 고르세요</span>
              </p>
              <div className={s.ghost} aria-hidden>
                {WIDGETS[previewView]({ k: `${inc.id}:${previewView}`, anomaly: false, source: sourceOf(previewView) })}
              </div>
            </div>
          ) : (
            <div className={s.actions}>
              <h2 className={s.actionsTitle}><IconText icon={Wrench} tone="primary" size={18}>조치 선택</IconText></h2>
              <p className={s.dim}>모은 단서가 많을수록 성공 확률이 오른다.</p>
              {inc.actions.map((a, i) => {
                const chance = actionChance(a, p.clues, st.stats.debug);
                return (
                  <button key={i} type="button" className={s.action} disabled={!canPick(i)} onClick={() => onInput({ t: 'pick', i })}>
                    <span className={s.actionLabel}>{a.label}</span>
                    <span className={s.actionMeta}>
                      <span className={s.chance} style={{ color: chanceTone(chance) }}>{pct(chance)}</span>
                      <span className={s.bar}><span style={{ width: pct(chance), background: chanceTone(chance) }} /></span>
                      <span className={s.dim}>단서 {p.clues}개 반영</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {drawer && (
        <AIDrawer messages={messages} chips={chips} notice={notice} typing={asking} onClose={() => setDrawer(false)} />
      )}
    </div>
  );
}
