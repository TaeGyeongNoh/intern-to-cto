import { describe, expect, it } from 'vitest';
import { validateContent } from '../engine/validate';
import { CONTENT } from '.';

describe('CONTENT', () => {
  it('검증 에러가 없다', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });
  it('아크는 시작 이벤트 하나만 무작위로 뜨고 나머지는 예약 전용', () => {
    for (const arc of ['blackfriday', 'migration', 'msa', 'ai-chatbot']) {
      const evs = Object.values(CONTENT.events).filter((e) => e.arc === arc);
      expect(evs.length, arc).toBeGreaterThanOrEqual(2);
      expect(evs.length, arc).toBeLessThanOrEqual(4);
      expect(evs.filter((e) => !e.scheduledOnly).map((e) => e.id), arc).toEqual([`${arc}-1`]);
      for (const e of evs) expect(e.id.startsWith(`${arc}-`), e.id).toBe(true);
    }
  });
  it('엔딩 15종', () => {
    expect(CONTENT.endings).toHaveLength(15);
  });
});
