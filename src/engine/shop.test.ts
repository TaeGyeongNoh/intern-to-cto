import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { createRng } from './rng';
import { buyItem, ownedItems, pickShopItems, SAVINGS_RATE, SHOP_SLOTS, shopFlag } from './shop';
import { makeState } from './testing';
import type { Content, ShopItem } from './types';

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
    const coin = item('coin', 1000, { category: 'invest', once: false, gamble: { chance: 0.5, win: 3, lose: 0.2 } });
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
    const coin = item('coin', 1000, { category: 'invest', once: false, gamble: { chance: 0.5, win: 3, lose: 0.2 } });
    const r = buyItem(makeState({ assets: 1000 }), coin, createRng(1));
    expect(r.gamble).toBeDefined();
    expect(r.gamble!.back).toBe(r.gamble!.ok ? 3000 : 200);
    expect(buyItem(makeState({ assets: 100 }), item('a', 10), createRng(1)).gamble).toBeUndefined();
  });
});
