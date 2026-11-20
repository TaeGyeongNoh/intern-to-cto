import { matches } from './conditions';
import { applyEffects } from './effects';
import type { Rng } from './rng';
import type { Content, GameState, ShopItem } from './types';

/** 연말마다 연봉에서 모이는 비율 */
export const SAVINGS_RATE = 0.25;
/** 상점에 한 번에 진열되는 물건 수 */
export const SHOP_SLOTS = 3;

/** 한 번 산 물건 표시 플래그 (콘텐츠 조건에서 `shop:jeonse`처럼 쓴다) */
export const shopFlag = (id: string): string => `shop:${id}`;

export function shopAvailable(item: ShopItem, s: GameState): boolean {
  if (item.once !== false && s.flags.includes(shopFlag(item.id))) return false;
  if (item.price > s.assets) return false;
  return !item.when || matches(item.when, s);
}

/** 올해 상점에 진열될 물건 (살 수 있는 것 중 최대 SHOP_SLOTS개, 콘텐츠 순서 유지) */
export function pickShopItems(s: GameState, rng: Rng, c: Content): string[] {
  const pool = Object.values(c.shop).filter((x) => shopAvailable(x, s));
  const chosen = new Set<string>();
  while (chosen.size < SHOP_SLOTS && chosen.size < pool.length) {
    const left = pool.filter((x) => !chosen.has(x.id));
    chosen.add(rng.pick(left).id);
  }
  return pool.filter((x) => chosen.has(x.id)).map((x) => x.id);
}

const man = (v: number) => `${v.toLocaleString('ko-KR')}만원`;

export function buyItem(s: GameState, item: ShopItem, rng: Rng): { state: GameState; feed: string[] } {
  let next: GameState = {
    ...s,
    assets: s.assets - item.price,
    purchases: [...s.purchases, item.id],
    flags: s.flags.includes(shopFlag(item.id)) ? s.flags : [...s.flags, shopFlag(item.id)],
  };
  next = applyEffects(next, item.effects);
  const feed = [`구입 · ${item.name} (−${man(item.price)})`];
  if (item.gamble) {
    const ok = rng.chance(item.gamble.chance);
    const back = Math.round(item.price * (ok ? item.gamble.win : item.gamble.lose));
    next = { ...next, assets: next.assets + back };
    feed.push(`${item.name} — ${ok ? '성공' : '실패'} (${man(back)} 회수)`);
  }
  return { state: next, feed };
}
