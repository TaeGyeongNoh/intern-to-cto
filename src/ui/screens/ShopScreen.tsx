import { CONTENT } from '../../content';
import { validInputs, type Game, type Input } from '../../engine/game';
import { SHOP_CATEGORY_LABELS, STAT_IDS, STAT_LABELS, type ShopCategory, type ShopItem } from '../../engine/types';
import { Button } from '../components/Icon';
import {
  Coins, GraduationCap, IconText, KeyRound, Keyboard, PiggyBank, ShoppingCart, Store, TreePalm, Wallet,
  type IconType,
} from '../components/Icons';
import { iGa, pct, won } from './format';
import c from './common.module.css';
import s from './ShopScreen.module.css';

const CATEGORY_ICON: Record<ShopCategory, IconType> = {
  gear: Keyboard, growth: GraduationCap, rest: TreePalm, life: KeyRound, invest: Coins,
};

type Effect = { text: string; good: boolean };

/** 물건 효과를 짧은 칩 문구로 (번아웃은 줄어야 좋다) */
function effectChips(item: ShopItem): Effect[] {
  const e = item.effects;
  const out: Effect[] = [];
  const sign = (v: number) => (v > 0 ? `+${v}` : `−${Math.abs(v)}`);
  for (const id of STAT_IDS) {
    const v = e.stats?.[id];
    if (v) out.push({ text: `${STAT_LABELS[id]} ${sign(v)}`, good: v > 0 });
  }
  if (e.reputation) out.push({ text: `평판 ${sign(e.reputation)}`, good: e.reputation > 0 });
  if (e.burnout) out.push({ text: `번아웃 ${sign(e.burnout)}`, good: e.burnout < 0 });
  if (item.gamble) {
    const g = item.gamble;
    out.push({ text: `${pct(g.chance)} 확률로 ×${g.win}`, good: true });
    out.push({ text: `아니면 ×${g.lose}`, good: false });
  }
  return out;
}

export function ShopScreen({ game, items, onInput }: { game: Game; items: string[]; onInput: (i: Input) => void }) {
  const st = game.state;
  const valid = new Set(validInputs(game, CONTENT).flatMap((v) => (v.t === 'pick' ? [v.i] : [])));
  const money = won(st.assets);

  return (
    <div className={s.wrap}>
      <header className={s.head}>
        <IconText icon={Store} tone="inherit" size={14} className={s.kicker}>{st.year}년 연말 · 보너스 시즌</IconText>
        <h1 className={s.title}>통장에 {money}{iGa(money)} 모였다</h1>
        <p className={s.sub}>하나 사거나, 그냥 모아 두거나. 한 해에 하나만 살 수 있다.</p>
      </header>

      <main className={`${c.page} ${s.list}`}>
        {items.map((id, i) => (
          <ItemCard key={id} item={CONTENT.shop[id]} assets={st.assets} disabled={!valid.has(i)} onBuy={() => onInput({ t: 'pick', i })} />
        ))}

        <div className={s.skip}>
          <Button variant="ghost" disabled={!valid.has(items.length)} onClick={() => onInput({ t: 'pick', i: items.length })}>
            <PiggyBank size={16} />이번엔 지갑을 닫는다
          </Button>
          <span className={s.skipNote}>모아 둔 돈은 엔딩 카드의 순자산이 된다</span>
        </div>
      </main>
    </div>
  );
}

function ItemCard({ item, assets, disabled, onBuy }: { item: ShopItem; assets: number; disabled: boolean; onBuy: () => void }) {
  const Icon = CATEGORY_ICON[item.category];
  const chips = effectChips(item);
  return (
    <article className={s.card} data-category={item.category}>
      <div className={s.top}>
        <span className={s.icon}><Icon size={20} /></span>
        <div className={s.nameBox}>
          <span className={s.category}>{SHOP_CATEGORY_LABELS[item.category]}{item.once === false ? ' · 반복 구매' : ''}</span>
          <div className={s.name}>{item.name}</div>
        </div>
        <IconText icon={Wallet} className={s.price}>{won(item.price)}</IconText>
      </div>
      <p className={s.text}>{item.text}</p>
      {chips.length > 0 && (
        <div className={s.chips}>
          {chips.map((x) => <span key={x.text} className={s.chip} data-good={x.good}>{x.text}</span>)}
        </div>
      )}
      <div className={s.cta}>
        <span className={s.after}>사고 나면 {won(assets - item.price)}</span>
        <Button disabled={disabled} onClick={onBuy}><ShoppingCart size={16} />산다</Button>
      </div>
    </article>
  );
}
