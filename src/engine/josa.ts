/**
 * 한국어 조사 고르기. 마지막 글자의 받침으로 판단한다.
 * 한글이 아니면 흔한 경우만 한국어 발음으로 읽고(숫자, 약어, 영단어 끝소리), 나머지는 받침 없는 쪽으로 둔다.
 */
export type FinalSound = 'none' | 'rieul' | 'other';
export type Particle = '이/가' | '을/를' | '은/는' | '와/과' | '(으)로';

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const RIEUL = 8;

/** 영 일 이 삼 사 오 육 칠 팔 구 */
const DIGIT: Record<string, FinalSound> = {
  0: 'other', 1: 'rieul', 2: 'none', 3: 'other', 4: 'none', 5: 'none', 6: 'other', 7: 'rieul', 8: 'rieul', 9: 'none',
};

/** 알파벳 이름(약어 읽기): 엘·알은 ㄹ, 엠·엔은 받침, 나머지는 받침 없음 */
const LETTER: Record<string, FinalSound> = { L: 'rieul', R: 'rieul', M: 'other', N: 'other' };

function englishWord(word: string): FinalSound {
  const w = word.toLowerCase();
  if (/(ng|m|n|k|ck)$/.test(w)) return 'other';
  if (/(l|le)$/.test(w)) return 'rieul';
  return 'none';
}

export function finalSound(text: string): FinalSound {
  const trimmed = text.replace(/[^0-9A-Za-z가-힣]+$/u, '');
  const ch = trimmed.at(-1);
  if (!ch) return 'none';
  const code = ch.charCodeAt(0);
  if (code >= HANGUL_START && code <= HANGUL_END) {
    const jong = (code - HANGUL_START) % 28;
    if (jong === 0) return 'none';
    return jong === RIEUL ? 'rieul' : 'other';
  }
  if (/[0-9]/.test(ch)) return DIGIT[ch];
  const word = trimmed.match(/[A-Za-z]+$/)?.[0] ?? '';
  if (word.length > 0 && word === word.toUpperCase()) return LETTER[ch] ?? 'none';
  return englishWord(word);
}

/** [받침 있을 때, 없을 때] */
const FORMS: Record<Exclude<Particle, '(으)로'>, [string, string]> = {
  '이/가': ['이', '가'], '을/를': ['을', '를'], '은/는': ['은', '는'], '와/과': ['과', '와'],
};

export function josa(word: string, particle: Particle): string {
  const f = finalSound(word);
  if (particle === '(으)로') return f === 'other' ? '으로' : '로';
  const [withBatchim, without] = FORMS[particle];
  return f === 'none' ? without : withBatchim;
}

export const withJosa = (word: string, particle: Particle): string => `${word}${josa(word, particle)}`;
