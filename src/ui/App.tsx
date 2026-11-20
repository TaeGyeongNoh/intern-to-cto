import { useState } from 'react';
import { CONTENT } from '../content';
import { apply, newGame, pending, type Game, type Input } from '../engine/game';
import { clearSave, loadSave, writeSave, type SaveData } from './save';
import { GameView } from './GameView';
import { CreateScreen } from './screens/CreateScreen';
import { EndingScreen } from './screens/EndingScreen';
import { replayShare, SHARE_PARAM } from './share';

const LOG_MAX = 100;

/** 한 번의 apply에서 나온 feed를 최신이 앞인 로그에 쌓는다 */
const pushFeed = (log: string[], feed: readonly string[]) => [...[...feed].reverse(), ...log].slice(0, LOG_MAX);

/** 기록 피드 첫 줄. 프롤로그 중에는 아직 입사 전이라 중립적인 문장을 쓴다 */
const firstLine = (g: Game) => g.state.record.story[0] ?? (g.state.yearsInCareer === 0 ? '졸업을 앞둔 취준생' : `${CONTENT.companies[g.state.companyId].name}에서 일하는 중`);

/** 저장 데이터를 리플레이하면서 기록 피드도 다시 만든다 (실패하면 throw) */
function restoreWithLog(d: SaveData): { game: Game; log: string[] } {
  let game = newGame(d.setup, d.seed, CONTENT);
  let log = [firstLine(game)];
  for (const input of d.log) {
    game = apply(game, input, CONTENT);
    log = pushFeed(log, game.feed);
  }
  return { game, log };
}

/** 주소에 ?r= 공유 결과가 있고 끝까지 리플레이되면 그 게임 (아니면 null) */
function loadShared(): Game | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    return raw ? replayShare(raw, CONTENT) : null;
  } catch {
    return null;
  }
}

function clearShareQuery() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(SHARE_PARAM);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch { /* noop */ }
}

export function App() {
  // 공유된 커리어 보기는 읽기 전용: 플레이어 자신의 저장에는 손대지 않는다
  const [shared, setShared] = useState<Game | null>(loadShared);
  const [game, setGame] = useState<Game | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [saved, setSaved] = useState(() => loadSave());

  const start = (g: Game) => {
    clearSave();
    setSaved(null);
    setGame(g);
    setLog([firstLine(g)]);
    writeSave(g);
    window.scrollTo(0, 0);
  };

  const resume = () => {
    if (!saved) return;
    try {
      const r = restoreWithLog(saved);
      setGame(r.game);
      setLog(r.log);
    } catch (e) {
      // 콘텐츠가 바뀌어 리플레이가 깨지면 저장을 버리고 생성 화면으로
      console.error(e);
      clearSave();
      setSaved(null);
    }
  };

  const onInput = (input: Input) => {
    const tryIt = () => {
    clearShareQuery();
    setShared(null);
    window.scrollTo(0, 0);
  };

  if (shared) return <EndingScreen game={shared} shared onRestart={tryIt} />;
  if (!game) return;
    try {
      const next = apply(game, input, CONTENT);
      const before = pending(game).kind;
      const after = pending(next).kind;
      setGame(next);
      setLog((l) => pushFeed(l, next.feed));
      if (after === 'ended') clearSave();
      else writeSave(next);
      if (before !== after && (after === 'offers' || after === 'ended' || before === 'offers')) window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
    }
  };

  const restart = () => {
    clearSave();
    setSaved(null);
    setGame(null);
    setLog([]);
    window.scrollTo(0, 0);
  };

  const tryIt = () => {
    clearShareQuery();
    setShared(null);
    window.scrollTo(0, 0);
  };

  if (shared) return <EndingScreen game={shared} shared onRestart={tryIt} />;
  if (!game) return <CreateScreen onStart={start} saved={saved} onContinue={resume} />;
  return <GameView game={game} log={log} onInput={onInput} onRestart={restart} />;
}
