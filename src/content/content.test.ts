import { describe, expect, it } from 'vitest';
import { validateContent } from '../engine/validate';
import { CONTENT } from '.';

describe('CONTENT', () => {
  it('검증 에러가 없다', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });
  it('엔딩 12종', () => {
    expect(CONTENT.endings).toHaveLength(12);
  });
});
