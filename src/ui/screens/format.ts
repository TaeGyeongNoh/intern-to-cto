import type { CompanyRoute, Tier } from '../../engine/types';
import {
  Activity, Calendar, CircleCheck, CircleX, ClipboardList, CornerDownRight, FileText, Flag, House, Minus, Plane, Search, Sparkles, TrendingUp,
  type IconType,
} from '../components/Icons';

/** 만원 단위 → "3,800만원" / "1억 2,000만원" */
export function won(v: number): string {
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  if (eok === 0) return `${rest.toLocaleString('ko-KR')}만원`;
  return rest === 0 ? `${eok}억원` : `${eok}억 ${rest.toLocaleString('ko-KR')}만원`;
}

export const pct = (p: number) => `${Math.round(p * 100)}%`;

export const TIER_LABELS: Record<Tier, string> = {
  startup: '스타트업', mid: '중견', large: '대기업', bigtech: '빅테크', whatap: '관측성 전문',
};

export const ROUTE_TONE: Record<CompanyRoute, string> = {
  commerce: '#FF8800', finance: '#00B543', 'ai-startup': '#8B52FF', whatap: '#296CF2',
};

/** 받침 유무로 이/가 고르기 (영문은 끝 글자 발음 기준 대략) */
export function iGa(word: string): string {
  const ch = word.trim().at(-1) ?? '';
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 ? '이' : '가';
  return /[lmnLMN0136780]/.test(ch) ? '이' : '가';
}

/** 카드 컬러 위에 올릴 글자색 (밝은 색이면 진한 글자) */
export function inkOn(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#1b1b2b' : '#ffffff';
}

/** 기록 한 줄 → 아이콘·톤. 엔진 문자열의 키워드로만 판별한다 (이모지 파싱 없음). */
export type FeedTone = 'muted' | 'primary' | 'good' | 'warning' | 'critical';
export function feedIcon(line: string): { icon: IconType; tone: FeedTone } {
  if (line.startsWith('와탭 AI')) return { icon: Sparkles, tone: 'primary' };
  // 이벤트 결과는 선택지 문구가 자유라서 다른 키워드보다 먼저 본다
  if (/ — 성공$/.test(line)) return { icon: CornerDownRight, tone: 'good' };
  if (/ — 실패$/.test(line)) return { icon: CornerDownRight, tone: 'critical' };
  if (line.startsWith('연말 평가')) return { icon: ClipboardList, tone: 'muted' };
  if (line.includes('승진')) return { icon: TrendingUp, tone: 'good' };
  if (line.startsWith('복구 실패')) return { icon: CircleX, tone: 'critical' };
  if (line.startsWith('복구')) return { icon: CircleCheck, tone: 'good' };
  if (line.includes('별다른 단서가 없다')) return { icon: Minus, tone: 'muted' };
  if (line.startsWith('단서')) return { icon: Search, tone: 'primary' };
  if (line.includes('포스트모템') || line.includes('덮는다') || line.includes('탓')) return { icon: FileText, tone: 'muted' };
  if (line.includes('이직')) return { icon: Plane, tone: 'primary' };
  if (line.includes('남는다')) return { icon: House, tone: 'muted' };
  if (line.startsWith('엔딩')) return { icon: Flag, tone: 'primary' };
  if (/^\d{4}년 · /.test(line)) return { icon: Calendar, tone: 'muted' };
  if (line.startsWith('OVR ')) return { icon: Activity, tone: 'muted' };
  // 확률 없는 이벤트 선택지 등
  return { icon: CornerDownRight, tone: 'muted' };
}
