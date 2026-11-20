import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { ENDING_ART, eventArt } from './art';

describe('일러스트 매핑', () => {
  it('모든 엔딩에 일러스트가 있다', () => {
    for (const e of CONTENT.endings) expect(ENDING_ART[e.id], e.id).toBeTruthy();
  });
  it('모든 이벤트에 일러스트가 있다', () => {
    for (const id of Object.keys(CONTENT.events)) expect(eventArt(id), id).toBeTruthy();
  });
});
