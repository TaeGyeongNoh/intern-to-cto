import { CONTENT } from '../../content';
import { ownedItems } from '../../engine/shop';
import type { GameState } from '../../engine/types';
import s from './ShopScreen.module.css';

/** 산 물건 이름 칩 (투자 제외). 없으면 아무것도 그리지 않는다 */
export function OwnedItems({ state }: { state: GameState }) {
  const items = ownedItems(state, CONTENT);
  if (items.length === 0) return null;
  return (
    <div className={s.owned}>
      <span className={s.ownedLabel}>보유</span>
      {items.map((x) => <span key={x.id} className={s.ownedChip}>{x.name}</span>)}
    </div>
  );
}
