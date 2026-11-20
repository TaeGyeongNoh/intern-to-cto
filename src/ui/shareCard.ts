import { CONTENT } from '../content';
import { CARDS } from '../content/cards';
import type { Game } from '../engine/game';
import { POSITION_LABELS } from '../engine/stats';
import { ENDING_ART } from './art';
import { won } from './screens/format';

/**
 * 결과 공유 카드(1080×1350 PNG)를 Canvas 2D로 직접 그린다.
 * 브라우저 이벤트 핸들러에서만 호출할 것 (렌더 시점에 DOM API를 쓰지 않는다).
 */
const W = 1080;
const H = 1350;
const FONT = `Roboto, 'Noto Sans KR', sans-serif`;
const C = {
  primary: '#296CF2', strong: '#004BE0', purple: '#8B52FF', weak: '#EEF3FF',
  text: '#222222', text2: '#757575', border: '#EAEAEA', surface: '#FFFFFF',
};
const SITE = 'taegyeongnoh.github.io/intern-to-cto';
const GAME_TITLE = '인턴에서 CTO까지';

export type CardData = {
  endingId: string;
  title: string;
  who: string;
  stats: { label: string; value: string }[];
  highlights: string[];
  art?: string;
};

/** 화면과 같은 기준으로 카드에 들어갈 값을 뽑는다 */
export function cardData(g: Game): CardData {
  const st = g.state;
  const r = st.record;
  const ending = CONTENT.endings.find((e) => e.id === st.endingId);
  const years = r.history.length || st.yearsInCareer;
  const avgMttr = r.incidentsTotal ? `${Math.round(r.mttrTotalMin / r.incidentsTotal)}분` : '—';
  return {
    endingId: st.endingId ?? 'ending',
    title: ending?.title ?? '커리어 종료',
    who: `${st.name} · ${st.title} · ${POSITION_LABELS[st.position]} · ${years}년`,
    stats: [
      { label: '막아낸 장애', value: `${r.incidentsResolved}/${r.incidentsTotal}` },
      { label: '평균 MTTR', value: avgMttr },
      { label: '최고 연봉', value: won(st.maxSalary) },
      { label: '관측 도구', value: `${st.cardsSeen.length}/${Object.keys(CARDS).length}` },
    ],
    highlights: highlights(r.story),
    art: st.endingId ? ENDING_ART[st.endingId] : undefined,
  };
}

/** 첫 줄·마지막 줄과 그 사이에서 고르게 몇 줄 */
function highlights(story: string[], n = 4): string[] {
  if (story.length <= n) return story;
  return Array.from({ length: n }, (_, i) => story[Math.round((i * (story.length - 1)) / (n - 1))]);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src}`));
    img.src = src;
  });
}

async function ensureFonts(text: string): Promise<void> {
  if (!document.fonts) return;
  try {
    // 한글 웹폰트는 unicode-range 조각으로 나뉘어 있어서 카드에 쓸 글자를 명시적으로 불러온다
    await Promise.all(
      ['400', '700'].flatMap((w) => [`${w} 32px 'Noto Sans KR'`, `${w} 32px Roboto`].map((f) => document.fonts.load(f, text))),
    );
  } catch { /* 폰트가 없으면 시스템 폰트로 그린다 */ }
  await document.fonts.ready;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 글자 단위 줄바꿈 (공백이 있으면 공백에서 우선 끊는다). maxLines를 넘으면 말줄임 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let rest = text.trim();
  while (rest && lines.length < maxLines) {
    if (ctx.measureText(rest).width <= maxW) { lines.push(rest); rest = ''; break; }
    let cut = 1;
    while (cut < rest.length && ctx.measureText(rest.slice(0, cut + 1)).width <= maxW) cut++;
    const sp = rest.lastIndexOf(' ', cut);
    if (sp > cut * 0.6) cut = sp;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest && lines.length) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  return wrap(ctx, text, maxW, 1)[0] ?? '';
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

export async function renderShareCard(d: CardData): Promise<HTMLCanvasElement> {
  const allText = [GAME_TITLE, SITE, 'ENDING 인생 하이라이트', d.title, d.who, ...d.stats.flatMap((s) => [s.label, s.value]), ...d.highlights].join('');
  const [img] = await Promise.all([d.art ? loadImage(d.art).catch(() => null) : Promise.resolve(null), ensureFonts(allText)]);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.textBaseline = 'alphabetic';

  // 배경: 옅은 파랑→보라
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#EAF0FF');
  bg.addColorStop(1, '#F3ECFF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 카드
  const cx = 56, cy = 48, cw = W - 112, ch = 1190;
  ctx.save();
  ctx.shadowColor = 'rgba(30, 40, 90, .12)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, cx, cy, cw, ch, 40);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.restore();

  const px = cx + 44;
  const pw = cw - 88;
  let y = cy + 44;

  // 일러스트
  const artH = 380;
  ctx.save();
  roundRect(ctx, px, y, pw, artH, 28);
  ctx.clip();
  if (img) drawCover(ctx, img, px, y, pw, artH);
  else {
    const g = ctx.createLinearGradient(px, y, px + pw, y + artH);
    g.addColorStop(0, C.primary);
    g.addColorStop(1, C.purple);
    ctx.fillStyle = g;
    ctx.fillRect(px, y, pw, artH);
  }
  ctx.restore();
  y += artH + 40;

  // ENDING 배지
  ctx.font = `700 22px ${FONT}`;
  const kick = 'ENDING';
  ctx.letterSpacing = '4px';
  const kw = ctx.measureText(kick).width + 40;
  const kg = ctx.createLinearGradient(px, 0, px + kw, 0);
  kg.addColorStop(0, C.primary);
  kg.addColorStop(1, C.purple);
  roundRect(ctx, px, y, kw, 40, 20);
  ctx.fillStyle = kg;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(kick, px + 20, y + 28);
  ctx.letterSpacing = '0px';
  y += 40 + 62;

  // 엔딩 제목
  ctx.font = `700 58px ${FONT}`;
  ctx.fillStyle = C.text;
  for (const line of wrap(ctx, d.title, pw, 2)) {
    ctx.fillText(line, px, y);
    y += 72;
  }
  y -= 72 - 50;

  // 이름 · 직함 · 포지션 · 연차
  ctx.font = `500 30px ${FONT}`;
  ctx.fillStyle = C.text2;
  ctx.fillText(fit(ctx, d.who, pw), px, y);
  y += 40;

  // 주요 기록 2×2
  const gap = 16;
  const tw = (pw - gap) / 2;
  const th = 112;
  d.stats.forEach((s, i) => {
    const tx = px + (i % 2) * (tw + gap);
    const ty = y + Math.floor(i / 2) * (th + gap);
    roundRect(ctx, tx, ty, tw, th, 20);
    ctx.fillStyle = C.weak;
    ctx.fill();
    ctx.font = `500 24px ${FONT}`;
    ctx.fillStyle = C.text2;
    ctx.fillText(s.label, tx + 28, ty + 42);
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = C.strong;
    ctx.fillText(fit(ctx, s.value, tw - 56), tx + 28, ty + 92);
  });
  y += th * 2 + gap + 52;

  // 인생 하이라이트
  ctx.font = `500 24px ${FONT}`;
  ctx.fillStyle = C.text2;
  ctx.fillText('인생 하이라이트', px, y);
  y += 20;
  const bottom = cy + ch - 40;
  ctx.font = `400 28px ${FONT}`;
  const lineH = 44;
  for (const h of d.highlights) {
    if (y + lineH > bottom) break;
    y += lineH;
    ctx.fillStyle = C.primary;
    ctx.beginPath();
    ctx.arc(px + 7, y - 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.fillText(fit(ctx, h, pw - 32), px + 32, y);
  }

  // 하단: 게임 제목 + 사이트
  const fy = cy + ch + 64;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillStyle = C.strong;
  ctx.fillText(GAME_TITLE, cx + 8, fy);
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = C.text2;
  ctx.textAlign = 'right';
  ctx.fillText(SITE, cx + cw - 8, fy);
  ctx.textAlign = 'left';

  return canvas;
}

export const cardFilename = (endingId: string) => `intern-to-cto-${endingId}.png`;

export async function downloadShareCard(g: Game): Promise<void> {
  const d = cardData(g);
  const canvas = await renderShareCard(d);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('toBlob failed');
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = cardFilename(d.endingId);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
