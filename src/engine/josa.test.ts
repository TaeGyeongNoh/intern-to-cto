import { describe, expect, it } from 'vitest';
import { finalSound, josa, withJosa } from './josa';

describe('finalSound', () => {
  it('한글 받침 유무와 ㄹ받침을 구분한다', () => {
    expect(finalSound('팀장')).toBe('other');
    expect(finalSound('주니어')).toBe('none');
    expect(finalSound('쿠팡팡')).toBe('other');
    expect(finalSound('국밥은행')).toBe('other');
    expect(finalSound('미드레벨')).toBe('rieul');
    expect(finalSound('프린시펄')).toBe('rieul');
  });
  it('약어는 알파벳 이름으로 읽는다', () => {
    expect(finalSound('CTO')).toBe('none');
    expect(finalSound('APM')).toBe('other'); // 엠
    expect(finalSound('SRE')).toBe('none');
    expect(finalSound('URL')).toBe('rieul'); // 엘
    expect(finalSound('HR')).toBe('rieul'); // 알
  });
  it('영단어는 흔한 끝소리로 읽는다', () => {
    expect(finalSound('VP of Engineering')).toBe('other');
    expect(finalSound('Google')).toBe('rieul');
    expect(finalSound('Team')).toBe('other');
    expect(finalSound('Server')).toBe('none');
  });
  it('숫자는 한국어 발음으로 읽는다', () => {
    expect(finalSound('버전 1')).toBe('rieul');
    expect(finalSound('버전 2')).toBe('none');
    expect(finalSound('3')).toBe('other');
    expect(finalSound('10')).toBe('other'); // 영
  });
  it('끝의 괄호·따옴표·공백은 무시하고, 판단할 글자가 없으면 받침 없는 쪽', () => {
    expect(finalSound('팀장 ')).toBe('other');
    expect(finalSound('"팀장"')).toBe('other');
    expect(finalSound('')).toBe('none');
    expect(finalSound('...')).toBe('none');
  });
});

describe('josa', () => {
  it('이/가, 을/를, 은/는, 와/과', () => {
    expect(josa('팀장', '이/가')).toBe('이');
    expect(josa('주니어', '이/가')).toBe('가');
    expect(josa('팀장', '을/를')).toBe('을');
    expect(josa('CTO', '을/를')).toBe('를');
    expect(josa('VP of Engineering', '을/를')).toBe('을');
    expect(josa('시니어', '은/는')).toBe('는');
    expect(josa('APM', '와/과')).toBe('과');
    expect(josa('로그', '와/과')).toBe('와');
  });
  it('(으)로: ㄹ받침은 로', () => {
    expect(josa('팀장', '(으)로')).toBe('으로');
    expect(josa('CTO', '(으)로')).toBe('로');
    expect(josa('프린시펄', '(으)로')).toBe('로');
    expect(josa('미드레벨', '(으)로')).toBe('로');
    expect(josa('쿠팡팡', '(으)로')).toBe('으로');
    expect(josa('토스트뱅크', '(으)로')).toBe('로');
  });
  it('withJosa는 단어 뒤에 붙인다', () => {
    expect(withJosa('스태프', '(으)로')).toBe('스태프로');
    expect(withJosa('VP of Engineering', '(으)로')).toBe('VP of Engineering으로');
    expect(withJosa('팀장', '을/를')).toBe('팀장을');
  });
});
