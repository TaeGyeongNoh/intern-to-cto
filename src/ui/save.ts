import type { Content } from '../engine/types';
import { replay, type Game, type Input, type Setup } from '../engine/game';

export const SAVE_KEY = 'bagm-save-v1';
export type SaveData = { v: 1; setup: Setup; seed: number; log: Input[] };

export const encodeSave = (g: Game): string => JSON.stringify({ v: 1, setup: g.setup, seed: g.seed, log: g.log } satisfies SaveData);

export function decodeSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as SaveData;
    return d && d.v === 1 && d.setup && typeof d.seed === 'number' && Array.isArray(d.log) ? d : null;
  } catch {
    return null;
  }
}

export const restore = (d: SaveData, c: Content): Game => replay(d.setup, d.seed, d.log, c);

export function loadSave(): SaveData | null {
  try { return decodeSave(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}
export function writeSave(g: Game): void {
  try { localStorage.setItem(SAVE_KEY, encodeSave(g)); } catch { /* 저장 실패해도 플레이는 계속 */ }
}
export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
}
