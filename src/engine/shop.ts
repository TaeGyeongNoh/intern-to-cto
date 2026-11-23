import { matches } from './conditions';
import { applyEffects } from './effects';
import type { Rng } from './rng';
import { MARKET_MOODS, type Content, type GameState, type MarketMood, type ShopItem } from './types';

/** 연말마다 연봉에서 모이는 비율 */
export const SAVINGS_RATE = 0.25;
/** 상점에 한 번에 진열되는 물건 수 */
export const SHOP_SLOTS = 3;

/** 투자 금액 단계: 자산 대비 비율 (맛보기 · 진심 · 풀매수) */
export const STAKE_TIERS = [0.1, 0.3, 1] as const;
/** 만원. 투자 물건의 price(최소 투자금) 하한. 결과 카드에서 의미 있는 크기의 하한(디자인 값) */
export const MIN_STAKE = 100;
/** 풀매수 번아웃 (시세 새로고침 강박). 휴식 물건 하나가 줄이는 양(4~25)보다 작게 둔 디자인 값 */
export const ALL_IN_BURNOUT = 4;

/** 한 번 산 물건 표시 플래그 (콘텐츠 조건에서 `shop:jeonse`처럼 쓴다) */
export const shopFlag = (id: string): string => `shop:${id}`;

export function shopAvailable(item: ShopItem, s: GameState): boolean {
  if (item.once !== false && s.flags.includes(shopFlag(item.id))) return false;
  if (item.price > s.assets) return false;
  return !item.when || matches(item.when, s);
}

/** 다음 해 시장 분위기 (콘텐츠 전이표로 한 번 굴린다) */
export function nextMarket(prev: MarketMood, rng: Rng, c: Content): MarketMood {
  return rng.weighted(MARKET_MOODS.map((m) => ({ item: m, weight: c.market.transitions[prev][m] })));
}

/** 그 분위기에서 투자 물건의 성공 확률 */
export function investChance(item: ShopItem, mood: MarketMood): number {
  return item.gamble ? item.gamble.chance[mood] : 0;
}

/** 금액 단계 (tier: STAKE_TIERS 인덱스). 최소 투자금 미만은 빼고, 전액은 내림하지 않는다 */
export function stakeTiers(assets: number, item: ShopItem): { tier: number; stake: number }[] {
  const out: { tier: number; stake: number }[] = [];
  STAKE_TIERS.forEach((f, tier) => {
    const stake = f === 1 ? assets : Math.floor((assets * f) / 10) * 10;
    if (stake < item.price) return;
    const dup = out.findIndex((x) => x.stake === stake);
    if (dup >= 0) out[dup] = { tier, stake };
    else out.push({ tier, stake });
  });
  return out.sort((a, b) => a.stake - b.stake);
}

export function stakeOptions(assets: number, item: ShopItem): number[] {
  return stakeTiers(assets, item).map((x) => x.stake);
}

/** 상점 입력 하나: 일반 물건은 itemId만, 투자 물건은 금액 단계까지 */
export type ShopChoice = { itemId: string; stake?: number; tier?: number };

/** 상점 입력 목록 (pick i = choices[i], pick choices.length = 지갑을 닫는다). 상태에서 다시 계산하므로 순수 함수다 */
export function shopChoices(items: readonly string[], s: GameState, c: Content): ShopChoice[] {
  return items.flatMap((id): ShopChoice[] => {
    const item = c.shop[id];
    if (!item.gamble) return [{ itemId: id }];
    return stakeTiers(s.assets, item).map((x) => ({ itemId: id, stake: x.stake, tier: x.tier }));
  });
}

/** 올해 상점에 진열될 물건: 일반 물건 중 최대 SHOP_SLOTS개(콘텐츠 순서 유지) 뒤에 살 수 있는 투자 물건을 모두 붙인다 */
export function pickShopItems(s: GameState, rng: Rng, c: Content): string[] {
  const all = Object.values(c.shop).filter((x) => shopAvailable(x, s));
  const pool = all.filter((x) => x.category !== 'invest');
  const chosen = new Set<string>();
  while (chosen.size < SHOP_SLOTS && chosen.size < pool.length) {
    const left = pool.filter((x) => !chosen.has(x.id));
    chosen.add(rng.pick(left).id);
  }
  return [...pool.filter((x) => chosen.has(x.id)), ...all.filter((x) => x.category === 'invest')].map((x) => x.id);
}

const man = (v: number) => `${v.toLocaleString('ko-KR')}만원`;

/** 산 물건 목록 (투자 제외, 중복 없이 산 순서대로) */
export function ownedItems(s: GameState, c: Content): ShopItem[] {
  const out: ShopItem[] = [];
  for (const id of s.purchases) {
    const item = c.shop[id];
    if (item && item.category !== 'invest' && !out.includes(item)) out.push(item);
  }
  return out;
}

export type GambleResult = { ok: boolean; stake: number; back: number };

/**
 * 물건을 산다. 투자 물건이면 stake(기본 price)를 걸고 시장 분위기 확률로 결과가 바로 나온다.
 * label: feed에 붙일 금액 단계 이름 (콘텐츠 문구라 호출하는 쪽이 준다)
 */
export function buyItem(
  s: GameState, item: ShopItem, rng: Rng, stake?: number, label?: string,
): { state: GameState; feed: string[]; gamble?: GambleResult } {
  const cost = item.gamble ? (stake ?? item.price) : item.price;
  let next: GameState = {
    ...s,
    assets: s.assets - cost,
    purchases: [...s.purchases, item.id],
    flags: s.flags.includes(shopFlag(item.id)) ? s.flags : [...s.flags, shopFlag(item.id)],
  };
  next = applyEffects(next, item.effects);
  const feed = [`구입 · ${item.name}${label ? ` · ${label}` : ''} (−${man(cost)})`];
  let gamble: GambleResult | undefined;
  if (item.gamble) {
    const ok = rng.chance(investChance(item, s.market));
    const back = Math.round(cost * (ok ? item.gamble.win : item.gamble.lose));
    next = { ...next, assets: next.assets + back, investNet: next.investNet + back - cost };
    if (cost === s.assets) next = applyEffects(next, { burnout: ALL_IN_BURNOUT });
    feed.push(`${item.name} — ${ok ? '성공' : '실패'} (${man(back)} 회수)`);
    gamble = { ok, stake: cost, back };
  }
  return { state: next, feed, gamble };
}
