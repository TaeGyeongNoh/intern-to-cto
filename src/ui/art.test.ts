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
  it('프롤로그·아크 접두사 매핑', () => {
    expect(eventArt('prologue-start')).toBe(eventArt('prologue-result'));
    expect(eventArt('prologue-intern')).not.toBe(eventArt('prologue-start'));
    expect(eventArt('prologue-fail')).not.toBe(eventArt('prologue-start'));
    expect(eventArt('prologue-fail')).not.toBe(eventArt('prologue-intern'));
    for (const arc of ['blackfriday', 'migration', 'msa']) {
      expect(eventArt(`${arc}-1`), arc).toBeTruthy();
      expect(eventArt(`${arc}-some-future-step`)).toBe(eventArt(`${arc}-1`));
    }
    expect(new Set(['blackfriday-1', 'migration-1', 'msa-1', 'prologue-start'].map(eventArt)).size).toBe(4);
    expect(eventArt('no-such-event')).toBeUndefined();
  });
});
