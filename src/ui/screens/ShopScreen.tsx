import type { ReactNode } from 'react';
import { CONTENT } from '../../content';
import { marketHeadline } from '../../content/market';
import { validInputs, type Game, type Input } from '../../engine/game';
import { ALL_IN_BURNOUT, investChance, shopChoices, type ShopChoice } from '../../engine/shop';
import {
  MARKET_LABELS, SHOP_CATEGORY_LABELS, STAT_IDS, STAT_LABELS, type GameState, type MarketMood, type ShopCategory, type ShopItem,
} from '../../engine/types';
import { Button } from '../components/Icon';
import {
  Coins, GraduationCap, IconText, KeyRound, Keyboard, Minus, PiggyBank, ShoppingCart, Store, TreePalm, TrendingDown, TrendingUp, Wallet,
  type IconType,
} from '../components/Icons';
import { iGa, pct, won } from './format';
import { OwnedItems } from './OwnedItems';
import c from './common.module.css';
import s from './ShopScreen.module.css';

const CATEGORY_ICON: Record<ShopCategory, IconType> = {
  gear: Keyboard, growth: GraduationCap, rest: TreePalm, life: KeyRound, invest: Coins,
};
const MARKET_ICON: Record<MarketMood, IconType> = { bull: TrendingUp, flat: Minus, bear: TrendingDown };

type Effect = { text: string; good: boolean };

/** 물건 효과를 짧은 칩 문구로 (번아웃은 줄어야 좋다). 투자 확률은 올해 시장 분위기 기준 */
function effectChips(item: ShopItem, st: GameState): Effect[] {
  const e = item.effects;
  const after = (cur: number, v: number, min: number, max: number) => Math.max(min, Math.min(max, cur + v));
  const out: Effect[] = [];
  for (const id of STAT_IDS) {
    const v = e.stats?.[id];
    if (v) out.push({ text: `${STAT_LABELS[id]} ${st.stats[id]} → ${after(st.stats[id], v, 1, 99)}`, good: v > 0 });
  }
  if (e.reputation) out.push({ text: `평판 ${st.reputation} → ${after(st.reputation, e.reputation, 0, 100)}`, good: e.reputation > 0 });
  if (e.burnout) out.push({ text: `번아웃 ${st.burnout} → ${after(st.burnout, e.burnout, 0, 100)}`, good: e.burnout < 0 });
  if (item.gamble) {
    const g = item.gamble;
    out.push({ text: `${MARKET_LABELS[st.market]} ${pct(investChance(item, st.market))} 확률로 ×${g.win}`, good: true });
    out.push({ text: `아니면 ×${g.lose}`, good: false });
    out.push({ text: `풀매수면 번아웃 +${ALL_IN_BURNOUT}`, good: false });
  }
  return out;
}

/** 부호 붙은 만원 금액 */
const signedWon = (v: number) => `${v >= 0 ? '+' : '−'}${won(Math.abs(v))}`;

export function ShopScreen({ game, items, onInput }: { game: Game; items: string[]; onInput: (i: Input) => void }) {
  const st = game.state;
  const valid = new Set(validInputs(game, CONTENT).flatMap((v) => (v.t === 'pick' ? [v.i] : [])));
  const choices = shopChoices(items, st, CONTENT);
  const money = won(st.assets);
  const indexed = choices.map((ch, i) => ({ ...ch, i }));
  const general = items.filter((id) => CONTENT.shop[id].category !== 'invest');
  const invest = items.filter((id) => CONTENT.shop[id].category === 'invest');
  const MarketIcon = MARKET_ICON[st.market];

  return (
    <div className={s.wrap}>
      <header className={s.head}>
        <IconText icon={Store} tone="inherit" size={14} className={s.kicker}>{st.year}년 연말 · 보너스 시즌</IconText>
        <h1 className={s.title}>통장에 {money}{iGa(money)} 모였다</h1>
        <p className={s.sub}>하나 사거나, 그냥 모아 두거나. 한 해에 하나만 살 수 있다.</p>
        <div className={s.status}>
          <span className={s.statusChip} data-hot={st.burnout >= 70}>{`번아웃 ${st.burnout}`}</span>
          {STAT_IDS.map((id) => <span key={id} className={s.statusChip}>{`${STAT_LABELS[id]} ${st.stats[id]}`}</span>)}
        </div>
      </header>

      <div className={s.market} data-mood={st.market}>
        <span className={s.marketMood}><MarketIcon size={16} />{MARKET_LABELS[st.market]}</span>
        <span className={s.marketText}>{marketHeadline(st.market, st.year)}</span>
      </div>

      <main className={`${c.page} ${s.list}`}>
        {general.map((id) => {
          const ch = indexed.find((x) => x.itemId === id)!;
          return <ItemCard key={id} item={CONTENT.shop[id]} st={st} disabled={!valid.has(ch.i)} onBuy={() => onInput({ t: 'pick', i: ch.i })} />;
        })}

        {invest.length > 0 && <h2 className={s.section}>투자 · 한 해 하나만 살 수 있다</h2>}
        {invest.map((id) => (
          <InvestCard
            key={id} item={CONTENT.shop[id]} st={st}
            stakes={indexed.filter((x) => x.itemId === id)}
            valid={valid} onPick={(i) => onInput({ t: 'pick', i })}
          />
        ))}

        <div className={s.skip}>
          <Button variant="ghost" disabled={!valid.has(choices.length)} onClick={() => onInput({ t: 'pick', i: choices.length })}>
            <PiggyBank size={16} />이번엔 지갑을 닫는다
          </Button>
          <span className={s.skipNote}>모아 둔 돈은 엔딩 카드의 순자산이 된다</span>
        </div>
        <OwnedItems state={st} />
      </main>
    </div>
  );
}

function CardTop({ item, right }: { item: ShopItem; right?: ReactNode }) {
  const Icon = CATEGORY_ICON[item.category];
  return (
    <div className={s.top}>
      <span className={s.icon}><Icon size={20} /></span>
      <div className={s.nameBox}>
        <span className={s.category}>{SHOP_CATEGORY_LABELS[item.category]}{item.once === false ? ' · 반복 구매' : ''}</span>
        <div className={s.name}>{item.name}</div>
      </div>
      {right}
    </div>
  );
}

function Chips({ item, st }: { item: ShopItem; st: GameState }) {
  const chips = effectChips(item, st);
  if (chips.length === 0) return null;
  return (
    <div className={s.chips}>
      {chips.map((x) => <span key={x.text} className={s.chip} data-good={x.good}>{x.text}</span>)}
    </div>
  );
}

function ItemCard({ item, st, disabled, onBuy }: { item: ShopItem; st: GameState; disabled: boolean; onBuy: () => void }) {
  return (
    <article className={s.card} data-category={item.category}>
      <CardTop item={item} right={<IconText icon={Wallet} className={s.price}>{won(item.price)}</IconText>} />
      <p className={s.text}>{item.text}</p>
      <Chips item={item} st={st} />
      <div className={s.cta}>
        <span className={s.after}>사고 나면 {won(st.assets - item.price)}</span>
        <Button disabled={disabled} onClick={onBuy}><ShoppingCart size={16} />산다</Button>
      </div>
    </article>
  );
}

function InvestCard({ item, st, stakes, valid, onPick }: {
  item: ShopItem; st: GameState; stakes: (ShopChoice & { i: number })[]; valid: Set<number>; onPick: (i: number) => void;
}) {
  const g = item.gamble!;
  return (
    <article className={s.card} data-category={item.category}>
      <CardTop item={item} right={<span className={s.minStake}>{`최소 ${won(item.price)}`}</span>} />
      <p className={s.text}>{item.text}</p>
      <Chips item={item} st={st} />
      <div className={s.stakes}>
        {stakes.map((x) => {
          const stake = x.stake ?? item.price;
          const win = Math.round(stake * g.win) - stake;
          const lose = Math.round(stake * g.lose) - stake;
          return (
            <button key={x.i} type="button" className={s.stake} disabled={!valid.has(x.i)} onClick={() => onPick(x.i)}>
              <span className={s.stakeHead}>{`${CONTENT.market.stakeLabels[x.tier ?? 0]} · ${won(stake)}`}</span>
              <span className={s.stakeRange}>{`성공 ${signedWon(win)} · 실패 ${signedWon(lose)}`}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
