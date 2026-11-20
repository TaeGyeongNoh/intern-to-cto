import { pending, type Game, type Input } from '../engine/game';
import { IncidentConsole } from './console/IncidentConsole';
import { EndingScreen } from './screens/EndingScreen';
import { EventCard } from './screens/EventCard';
import { HomeScreen } from './screens/HomeScreen';
import { OfferScreen } from './screens/OfferScreen';
import { PostmortemCard } from './screens/PostmortemCard';
import { ShopScreen } from './screens/ShopScreen';

export type GameViewProps = {
  game: Game;
  /** 기록 피드 (최신이 앞, 최대 100줄) */
  log: string[];
  onInput: (i: Input) => void;
  onRestart: () => void;
};

export function GameView({ game, log, onInput, onRestart }: GameViewProps) {
  const p = pending(game);
  const home = <HomeScreen game={game} log={log} onInput={onInput} />;
  switch (p.kind) {
    case 'year':
      return home;
    case 'event':
      return <>{home}<EventCard game={game} eventId={p.eventId} onInput={onInput} /></>;
    case 'incident-step':
    case 'incident-action':
      // 장애마다 새로 마운트해 inspect·타이머·드로어 상태를 초기화한다
      return <>{home}<IncidentConsole key={`${game.state.year}:${p.incidentId}`} game={game} onInput={onInput} /></>;
    case 'postmortem':
      return <>{home}<PostmortemCard game={game} incidentId={p.incidentId} resolved={p.resolved} onInput={onInput} /></>;
    case 'shop':
      return <ShopScreen game={game} items={p.items} onInput={onInput} />;
    case 'offers':
      return <OfferScreen game={game} offers={p.offers} onInput={onInput} />;
    case 'review':
      return home;
    case 'ended':
      return <EndingScreen game={game} onRestart={onRestart} />;
  }
}
