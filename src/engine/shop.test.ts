import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { createRng } from './rng';
import {
  ALL_IN_BURNOUT, buyItem, investChance, MIN_STAKE, nextMarket, ownedItems, pickShopItems, SAVINGS_RATE, SHOP_SLOTS, shopChoices, shopFlag, stakeOptions,
} from './shop';
import { makeState } from './testing';
import { MARKET_MOODS, type Content, type MarketMood, type ShopItem } from './types';

const item = (id: string, price: number, over: Partial<ShopItem> = {}): ShopItem => ({
  id, name: id, category: 'gear', price, text: id, effects: {}, ...over,
});
const shop = (...items: ShopItem[]): Content => ({ ...CONTENT, shop: Object.fromEntries(items.map((x) => [x.id, x])) });

describe('pickShopItems', () => {
  it('살 수 있는 것만, 최대 3개, 중복 없이', () => {
    const c = shop(item('a', 10), item('b', 20), item('c', 30), item('d', 40), item('e', 999));
    for (let seed = 1; seed < 50; seed++) {
      const ids = pickShopItems(makeState({ assets: 100 }), createRng(seed), c);
      expect(ids.length).toBe(SHOP_SLOTS);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain('e');
    }
  });
  it('살 수 있는 게 없으면 빈 배열', () => {
    expect(pickShopItems(makeState({ assets: 5 }), createRng(1), shop(item('a', 10)))).toEqual([]);
  });
  it('한 번 산 물건(once)은 다시 나오지 않고, 반복 구매 물건은 다시 나온다', () => {
    const c = shop(item('a', 10), item('b', 10, { once: false }));
    const s = makeState({ assets: 100, flags: [shopFlag('a'), shopFlag('b')], purchases: ['a', 'b'] });
    expect(pickShopItems(s, createRng(1), c)).toEqual(['b']);
  });
  it('when 조건을 따른다 (예: 전세가 있어야 내 집 마련)', () => {
    const c = shop(item('house', 10, { when: { flags: [shopFlag('jeonse')] } }));
    expect(pickShopItems(makeState({ assets: 100 }), createRng(1), c)).toEqual([]);
    expect(pickShopItems(makeState({ assets: 100, flags: [shopFlag('jeonse')] }), createRng(1), c)).toEqual(['house']);
  });
  it('결정론적이다', () => {
    const s = makeState({ assets: 1_000_000 });
    expect(pickShopItems(s, createRng(7), CONTENT)).toEqual(pickShopItems(s, createRng(7), CONTENT));
  });
});

describe('buyItem', () => {
  it('값을 치르고 효과를 적용하고 구매 기록과 플래그를 남긴다', () => {
    const it0 = item('chair', 250, { effects: { burnout: -8 } });
    const r = buyItem(makeState({ assets: 1000, burnout: 30 }), it0, createRng(1));
    expect(r.state.assets).toBe(750);
    expect(r.state.burnout).toBe(22);
    expect(r.state.purchases).toEqual(['chair']);
    expect(r.state.flags).toContain(shopFlag('chair'));
    expect(r.feed[0]).toContain('chair');
  });
  it('투자는 확률로 크게 벌거나 잃는다', () => {
    const coin = item('coin', 1000, { category: 'invest', once: false, gamble: { chance: { bull: 0.5, flat: 0.5, bear: 0.5 }, win: 3, lose: 0.2 } });
    const outcomes = new Set<number>();
    for (let seed = 1; seed < 60; seed++) outcomes.add(buyItem(makeState({ assets: 1000 }), coin, createRng(seed)).state.assets);
    expect(outcomes).toEqual(new Set([3000, 200]));
  });
});

describe('저축', () => {
  it('연봉의 25%', () => {
    expect(SAVINGS_RATE).toBe(0.25);
  });
});

describe('ownedItems', () => {
  it('투자를 빼고, 중복 없이, 산 순서대로', () => {
    const c = shop(item('a', 10), item('b', 10), item('coin', 10, { category: 'invest', once: false }));
    expect(ownedItems(makeState({ purchases: ['b', 'coin', 'a', 'coin', 'b'] }), c).map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('콘텐츠에서 사라진 id는 건너뛴다', () => {
    expect(ownedItems(makeState({ purchases: ['ghost'] }), shop(item('a', 10)))).toEqual([]);
  });
});

describe('buyItem 도박 결과', () => {
  it('투자면 성공 여부와 회수액을 돌려준다', () => {
    const coin = item('coin', 1000, { category: 'invest', once: false, gamble: { chance: { bull: 0.5, flat: 0.5, bear: 0.5 }, win: 3, lose: 0.2 } });
    const r = buyItem(makeState({ assets: 1000 }), coin, createRng(1));
    expect(r.gamble).toBeDefined();
    expect(r.gamble!.back).toBe(r.gamble!.ok ? 3000 : 200);
    expect(buyItem(makeState({ assets: 100 }), item('a', 10), createRng(1)).gamble).toBeUndefined();
  });
});

const coinItem = (over: Partial<ShopItem> = {}): ShopItem =>
  item('coin', MIN_STAKE, { category: 'invest', once: false, gamble: { chance: { bull: 0.4, flat: 0.25, bear: 0.12 }, win: 3, lose: 0.2 }, ...over });

describe('stakeOptions', () => {
  it('자산의 10% · 30% · 전액 (10만원 단위로 내림, 전액은 그대로)', () => {
    expect(stakeOptions(10000, coinItem())).toEqual([1000, 3000, 10000]);
    expect(stakeOptions(12345, coinItem())).toEqual([1230, 3700, 12345]);
  });
  it('최소 투자금 미만 단계는 빠진다', () => {
    expect(stakeOptions(150, coinItem())).toEqual([150]);
    expect(stakeOptions(400, coinItem())).toEqual([120, 400]);
  });
  it('중복 없이 오름차순', () => {
    for (const a of [100, 333, 999, 1000, 54321]) {
      const xs = stakeOptions(a, coinItem());
      expect(new Set(xs).size).toBe(xs.length);
      expect([...xs].sort((p, q) => p - q)).toEqual(xs);
    }
  });
});

describe('shopChoices', () => {
  it('일반 물건은 하나, 투자 물건은 단계 수만큼 펼친다 (items 순서, 금액 오름차순)', () => {
    const c = shop(item('a', 10), coinItem());
    const ch = shopChoices(['a', 'coin'], makeState({ assets: 10000 }), c);
    expect(ch).toEqual([
      { itemId: 'a' },
      { itemId: 'coin', stake: 1000, tier: 0 },
      { itemId: 'coin', stake: 3000, tier: 1 },
      { itemId: 'coin', stake: 10000, tier: 2 },
    ]);
  });
  it('단계가 빠지면 tier는 원래 단계 번호를 유지한다', () => {
    const c = shop(coinItem());
    expect(shopChoices(['coin'], makeState({ assets: 400 }), c)).toEqual([
      { itemId: 'coin', stake: 120, tier: 1 },
      { itemId: 'coin', stake: 400, tier: 2 },
    ]);
  });
});

describe('buyItem 금액 지정', () => {
  it('성공이면 −stake + stake×win, 실패면 −stake + stake×lose, 손익을 investNet에 쌓는다', () => {
    const coin = coinItem({ effects: {} });
    const seen = new Set<boolean>();
    for (let seed = 1; seed < 80; seed++) {
      const s0 = makeState({ assets: 10000, investNet: 500 });
      const r = buyItem(s0, coin, createRng(seed), 3000);
      const back = r.gamble!.ok ? 9000 : 600;
      expect(r.gamble!.back).toBe(back);
      expect(r.gamble!.stake).toBe(3000);
      expect(r.state.assets).toBe(10000 - 3000 + back);
      expect(r.state.investNet).toBe(500 + back - 3000);
      seen.add(r.gamble!.ok);
    }
    expect(seen).toEqual(new Set([true, false]));
  });
  it('풀매수(전액)일 때만 번아웃이 더 붙는다', () => {
    const coin = coinItem({ effects: {} });
    const s0 = makeState({ assets: 10000, burnout: 10 });
    expect(buyItem(s0, coin, createRng(1), 10000).state.burnout).toBe(10 + ALL_IN_BURNOUT);
    expect(buyItem(s0, coin, createRng(1), 3000).state.burnout).toBe(10);
  });
  it('금액이 없으면 price를 건다', () => {
    const r = buyItem(makeState({ assets: 1000 }), coinItem({ effects: {} }), createRng(1));
    expect(r.gamble!.stake).toBe(MIN_STAKE);
  });
  it('입력 상태를 바꾸지 않는다', () => {
    const s0 = makeState({ assets: 10000 });
    const copy = JSON.parse(JSON.stringify(s0));
    buyItem(s0, coinItem(), createRng(3), 10000);
    expect(s0).toEqual(copy);
  });
  it('시장 분위기에 따라 성공 확률이 다르다 (상승장 > 하락장)', () => {
    const coin = coinItem({ effects: {} });
    const wins = (market: MarketMood) => {
      let k = 0;
      for (let seed = 1; seed <= 2000; seed++) k += buyItem(makeState({ assets: 1000, market }), coin, createRng(seed), 1000).gamble!.ok ? 1 : 0;
      return k / 2000;
    };
    expect(wins('bull')).toBeGreaterThan(wins('bear') + 0.15);
    expect(investChance(coin, 'flat')).toBe(0.25);
  });
});

describe('nextMarket', () => {
  it('같은 rng 상태면 같은 결과', () => {
    for (const m of MARKET_MOODS) expect(nextMarket(m, createRng(9), CONTENT)).toBe(nextMarket(m, createRng(9), CONTENT));
  });
  it('장기 비율은 상승 43% · 횡보 33% · 하락 24% 안팎, 하락장 다음 해 상승장은 약 40%', () => {
    const rng = createRng(2024);
    let m: MarketMood = 'flat';
    const count: Record<MarketMood, number> = { bull: 0, flat: 0, bear: 0 };
    let afterBear = 0;
    let bearToBull = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const next = nextMarket(m, rng, CONTENT);
      if (m === 'bear') {
        afterBear++;
        if (next === 'bull') bearToBull++;
      }
      m = next;
      count[m]++;
    }
    expect(Math.abs(count.bull / N - 0.43)).toBeLessThan(0.04);
    expect(Math.abs(count.flat / N - 0.33)).toBeLessThan(0.04);
    expect(Math.abs(count.bear / N - 0.24)).toBeLessThan(0.04);
    expect(Math.abs(bearToBull / afterBear - 0.4)).toBeLessThan(0.04);
  });
});

describe('pickShopItems 투자 칸', () => {
  it('일반 칸에는 투자 물건이 없고, 살 수 있는 투자 물건은 늘 뒤에 붙는다', () => {
    const etf = item('etf', MIN_STAKE, { category: 'invest', once: false, gamble: { chance: { bull: 0.6, flat: 0.6, bear: 0.5 }, win: 1.25, lose: 0.8 } });
    const c = shop(coinItem(), item('a', 10), item('b', 20), item('c', 30), item('d', 40), etf);
    for (let seed = 1; seed < 40; seed++) {
      const ids = pickShopItems(makeState({ assets: 1000 }), createRng(seed), c);
      expect(ids.slice(0, SHOP_SLOTS).every((id) => c.shop[id].category !== 'invest')).toBe(true);
      expect(ids.slice(SHOP_SLOTS)).toEqual(['coin', 'etf']);
    }
    expect(pickShopItems(makeState({ assets: 50 }), createRng(1), c)).not.toContain('coin');
  });
});
