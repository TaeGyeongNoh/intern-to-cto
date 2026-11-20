import { CONTENT } from '../content';
import { createRng } from './rng';
import { createInitialState } from './state';
import type { GameState } from './types';

/** 테스트용 상태. 커머스 백엔드 신입(당근당근)에서 필요한 값만 덮어쓴다. */
export function makeState(over: Partial<GameState> = {}): GameState {
  const base = createInitialState({ name: '테스트', position: 'backend', route: 'commerce', candidate: 0 }, 1, createRng(1), CONTENT);
  return { ...base, ...over };
}
