import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content';
import { apply, careerInputs, newGame, pending, validInputs } from '../engine/game';
import { createRng } from '../engine/rng';
import { GameView } from './GameView';

describe('GameView 스모크', () => {
  it('랜덤 플레이 10판의 모든 단계가 렌더된다', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = createRng(seed * 31);
      let g = newGame({ name: '스모크', position: 'sre', route: (['commerce', 'finance', 'ai-startup'] as const)[seed % 3], candidate: seed % 3 }, seed, CONTENT);
      for (let guard = 0; ; guard++) {
        expect(() => renderToString(<GameView game={g} log={[]} onInput={() => {}} onRestart={() => {}} />)).not.toThrow();
        if (pending(g).kind === 'ended' || guard > 3000) break;
        // 모든 단계를 거치도록 스스로 은퇴하지 않는다
        g = apply(g, r.pick(careerInputs(g, CONTENT)), CONTENT);
      }
      expect(pending(g).kind).toBe('ended');
    }
  });
});

describe('EndingScreen 공유 모드', () => {
  it('공유된 커리어 배너와 공유 버튼이 렌더된다', async () => {
    const { EndingScreen } = await import('./screens/EndingScreen');
    const r = createRng(99);
    let g = newGame({ name: '공유왕', position: 'backend', route: 'finance', candidate: 0 }, 9, CONTENT);
    while (pending(g).kind !== 'ended') g = apply(g, r.pick(validInputs(g, CONTENT)), CONTENT);
    const html = renderToString(<EndingScreen game={g} shared onRestart={() => {}} />);
    expect(html).toContain('공유왕님의 커리어');
    expect(html).toContain('나도 해보기');
    expect(html).toContain('카드 저장');
    expect(html).toContain('링크 복사');
    expect(html).toContain(CONTENT.archetypes[g.state.archetypeId].name);
  });
});

describe('유형 표시', () => {
  it('생성 화면 후보 카드에 유형 이름과 한 줄 소개가 나온다', async () => {
    const { CreateScreen } = await import('./screens/CreateScreen');
    const html = renderToString(<CreateScreen onStart={() => {}} onContinue={() => {}} />);
    const shown = Object.values(CONTENT.archetypes).filter((a) => html.includes(a.name) && html.includes(a.tagline.replace(/"/g, '&quot;')));
    expect(shown).toHaveLength(3);
  });
  it('홈 화면과 공유 카드에 유형 이름이 나온다', async () => {
    const { cardData } = await import('./shareCard');
    const g = newGame({ name: '유형왕', position: 'ai', route: 'ai-startup', candidate: 2 }, 5, CONTENT);
    const name = CONTENT.archetypes[g.state.archetypeId].name;
    expect(renderToString(<GameView game={g} log={[]} onInput={() => {}} onRestart={() => {}} />)).toContain(name);
    expect(cardData(g).who).toContain(name);
  });
});

describe('출신 (학력·병역)', () => {
  it('생성 화면에 출신·병역 단계와 시작 나이 요약이 나온다', async () => {
    const { CreateScreen } = await import('./screens/CreateScreen');
    const html = renderToString(<CreateScreen onStart={() => {}} onContinue={() => {}} />);
    for (const e of Object.values(CONTENT.educations)) expect(html).toContain(e.name);
    for (const sv of Object.values(CONTENT.services)) expect(html).toContain(sv.name);
    expect(html).toContain('22세 시작 · 은퇴까지 최대 26년');
    expect(html).toContain('출신 보정 전');
    expect(html).toContain('석사만');
  });
  it('대체복무 중이면 홈에 남은 복무 기간 칩', async () => {
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '복무', position: 'backend', route: 'commerce', candidate: 0 }, 1, CONTENT);
    const view = (over: object) => renderToString(<GameView game={{ ...g, state: makeState(over), queue: [{ kind: 'year' as const }] }} log={[]} onInput={() => {}} onRestart={() => {}} />);
    expect(view({ yearsInCareer: 1, boundUntil: 3 })).toContain('복무 중 · 2년 남음');
    expect(view({ yearsInCareer: 3, boundUntil: 3 })).not.toContain('복무 중');
  });
  it('엔딩 화면과 공유 카드에 기본이 아닌 학력만 나온다', async () => {
    const { cardData } = await import('./shareCard');
    const { EndingScreen } = await import('./screens/EndingScreen');
    const { makeState } = await import('../engine/testing');
    const ended = (education?: string, service?: string) => {
      const g = newGame({ name: '출신', position: 'backend', route: 'commerce', candidate: 0, education, service }, 1, CONTENT);
      return { ...g, state: makeState({ retired: true, endingId: 'ordinary' }), queue: [{ kind: 'ended' as const }] };
    };
    const hs = ended('highschool', 'industrial');
    expect(cardData(hs).who).toContain('고졸·전문대');
    expect(cardData(hs).who).not.toContain('산업기능요원');
    expect(renderToString(<EndingScreen game={hs} onRestart={() => {}} />)).toContain('고졸·전문대');
    expect(cardData(ended()).who).not.toContain('4년제');
    expect(cardData(ended('university', 'active')).who).not.toContain('4년제');
  });
});

describe('지원 호출', () => {
  it('주 담당이 아닌 장애면 콘솔에 지원 호출 라벨이 나온다', async () => {
    const { IncidentConsole } = await import('./console/IncidentConsole');
    const g = newGame({ name: '지원', position: 'frontend', route: 'finance', candidate: 0 }, 1, CONTENT);
    const game = { ...g, queue: [{ kind: 'incident-step' as const, incidentId: 'db-lock', step: 0, clues: 0, hintUsed: false, order: [0, 1, 2] }] };
    const html = renderToString(<IncidentConsole game={game} onInput={() => {}} />);
    expect(html).toContain('지원 호출');
    expect(html).toContain('백엔드');
  });
});

describe('결과 카드', () => {
  it('제목, 성공 여부, 상세, 변화량 칩을 그린다', async () => {
    const { ResultCard } = await import('./screens/ResultCard');
    const html = renderToString(<ResultCard outcome={{ title: 'PG 우회', ok: true, detail: 'MTTR 58분', deltas: [{ label: '평판', value: '+3', good: true }] }} onClose={() => {}} />);
    expect(html).toContain('PG 우회');
    expect(html).toContain('성공');
    expect(html).toContain('MTTR 58분');
    expect(html).toContain('평판 +3');
    expect(html).toContain('다음');
  });
  it('변화가 없으면 안내 문구', async () => {
    const { ResultCard } = await import('./screens/ResultCard');
    expect(renderToString(<ResultCard outcome={{ title: '덮는다', deltas: [] }} onClose={() => {}} />)).toContain('눈에 띄는 변화는 없다');
  });
});

describe('상점 정보', () => {
  it('현재 번아웃과 적용 후 값, 보유 물건이 보인다', async () => {
    const { ShopScreen } = await import('./screens/ShopScreen');
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '쇼핑', position: 'backend', route: 'commerce', candidate: 0 }, 1, CONTENT);
    const game = { ...g, state: makeState({ assets: 5000, burnout: 62, purchases: ['keyboard', 'coin'] }), queue: [{ kind: 'shop' as const, items: ['chair'] }] };
    const html = renderToString(<ShopScreen game={game} items={['chair']} onInput={() => {}} />);
    expect(html).toContain('번아웃 62');
    expect(html).toContain('62 → 58');
    expect(html).toContain('보유');
    expect(html).toContain(CONTENT.shop.keyboard.name);
    expect(html).not.toContain(`>${CONTENT.shop.coin.name}<`);
  });
});

describe('투자', () => {
  for (const market of ['bull', 'flat', 'bear'] as const) {
    it(`상점: ${market} 시장 띠와 투자 단계 버튼`, async () => {
      const { ShopScreen } = await import('./screens/ShopScreen');
      const { makeState } = await import('../engine/testing');
      const { MARKET_LABELS } = await import('../engine/types');
      const { marketHeadline } = await import('../content/market');
      const g = newGame({ name: '투자', position: 'backend', route: 'commerce', candidate: 0 }, 1, CONTENT);
      const items = ['chair', 'coin', 'dev-stock'];
      const state = makeState({ assets: 10000, market });
      const html = renderToString(<ShopScreen game={{ ...g, state, queue: [{ kind: 'shop' as const, items }] }} items={items} onInput={() => {}} />);
      expect(html).toContain(MARKET_LABELS[market]);
      expect(html).toContain(marketHeadline(market, state.year));
      expect(html).toContain('투자 · 한 해 하나만 살 수 있다');
      expect(html).toContain('맛보기 · 1,000만원');
      expect(html).toContain('진심 · 3,000만원');
      expect(html).toContain('풀매수 · 1억원');
      expect(html).toContain('성공 +2억원 · 실패 −8,000만원');
      expect(html).toContain(`${MARKET_LABELS[market]} ${Math.round(CONTENT.shop.coin.gamble!.chance[market] * 100)}% 확률로 ×3`);
    });
  }
  it('엔딩 화면에 투자 손익 (투자를 안 했으면 숨김)', async () => {
    const { EndingScreen } = await import('./screens/EndingScreen');
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '엔딩', position: 'backend', route: 'commerce', candidate: 0 }, 1, CONTENT);
    const ended = (over: object) => ({ ...g, state: makeState({ retired: true, endingId: 'ordinary', ...over }), queue: [] });
    expect(renderToString(<EndingScreen game={ended({ purchases: ['coin'], investNet: -2350 })} onRestart={() => {}} />)).toContain('−2,350만원');
    expect(renderToString(<EndingScreen game={ended({ purchases: ['keyboard'] })} onRestart={() => {}} />)).not.toContain('투자 손익');
  });
});

describe('회사 생활', () => {
  it('협상 화면: 제시안, 득실 한 줄, 다음 직급 진행', async () => {
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '협상', position: 'ai', route: 'ai-startup', candidate: 0 }, 1, CONTENT);
    const state = makeState({ companyId: 'rwttn', route: 'ai-startup', title: '시니어', salary: 5250, reputation: 30 });
    const game = { ...g, state, queue: [{ kind: 'negotiate' as const, rating: 4, base: 5250, prev: 5000, prevMax: 5000 }, { kind: 'year' as const }] };
    const html = renderToString(<GameView game={game} log={[]} onInput={() => {}} onRestart={() => {}} />);
    expect(html).toContain('연봉 협상');
    expect(html).toContain('연봉 5,000만원 → 5,250만원 (+5%)');
    expect(html).toContain('제시안에 사인한다');
    expect(html).toContain('성공 50%');
    expect(html).toContain('인상 대신 스톡옵션을 받는다');
    expect(html).toContain('스톡옵션 +1,000만원어치');
    expect(html).toContain('다음 직급 스태프');
  });
  it('폐업 강제 이직: 제목이 바뀌고 남는다 버튼이 없다', async () => {
    const { OfferScreen } = await import('./screens/OfferScreen');
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '폐업', position: 'backend', route: 'commerce', candidate: 0 }, 1, CONTENT);
    const state = makeState({ companyId: 'tiny-commerce', companyStage: { 'tiny-commerce': 'closed' } });
    const offers = [{ companyId: 'dangeun', role: 'main' as const, salary: 3900 }];
    const game = { ...g, state, queue: [{ kind: 'offers' as const, offers, forced: true as const }] };
    const html = renderToString(<OfferScreen game={game} offers={offers} forced onInput={() => {}} />);
    expect(html).toContain('오늘의떡집이 문을 닫았다. 새 회사를 찾아야 한다');
    expect(html).not.toContain('지금 회사에 남는다');
  });
  it('이직 제안에 스톡옵션 소멸 경고', async () => {
    const { OfferScreen } = await import('./screens/OfferScreen');
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '경고', position: 'backend', route: 'commerce', candidate: 0 }, 1, CONTENT);
    const state = makeState({ companyId: 'rwttn', stock: { companyId: 'rwttn', value: 1240 } });
    const offers = [{ companyId: 'dangeun', role: 'main' as const, salary: 3900 }];
    const html = renderToString(<OfferScreen game={{ ...g, state, queue: [{ kind: 'offers' as const, offers }] }} offers={offers} onInput={() => {}} />);
    expect(html).toContain('이직하면 스톡옵션 1,240만원어치가 사라진다');
    expect(html).toContain('지금 회사에 남는다');
  });
  it('홈 화면에 회사 단계 이름과 다음 직급 조건', async () => {
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '홈', position: 'ai', route: 'ai-startup', candidate: 0 }, 1, CONTENT);
    const state = makeState({ companyId: 'rwttn', companyStage: { rwttn: 1 }, stock: { companyId: 'rwttn', value: 800 } });
    const html = renderToString(<GameView game={{ ...g, state, queue: [{ kind: 'year' as const }] }} log={[]} onInput={() => {}} onRestart={() => {}} />);
    expect(html).toContain('스타트업 · 시리즈 A');
    expect(html).toContain('다음 직급 ');
    expect(html).toContain('스톡옵션 800만원어치');
  });
});

describe('즉시 은퇴 버튼', () => {
  it('경력 1년차부터 해 넘기기 옆에 은퇴하기가 보인다 (첫 해에는 없다)', async () => {
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '은퇴', position: 'backend', route: 'commerce', candidate: 0 }, 1, CONTENT);
    const view = (over: object) => renderToString(<GameView game={{ ...g, state: makeState(over), queue: [{ kind: 'year' as const }] }} log={[]} onInput={() => {}} onRestart={() => {}} />);
    const working = view({ yearsInCareer: 3 });
    expect(working).toContain('은퇴하기');
    expect(working).toContain('다음 해로');
    expect(working).not.toContain('정말 은퇴할까요');
    expect(view({ yearsInCareer: 0 })).not.toContain('은퇴하기');
  });
  it('새 엔딩도 엔딩 화면에 렌더된다', async () => {
    const { EndingScreen } = await import('./screens/EndingScreen');
    const { makeState } = await import('../engine/testing');
    const g = newGame({ name: '파이어', position: 'backend', route: 'commerce', candidate: 0 }, 1, CONTENT);
    for (const endingId of ['fire', 'new-path']) {
      const ended = { ...g, state: makeState({ retired: true, flags: ['retired-voluntary'], endingId }), queue: [{ kind: 'ended' as const }] };
      const title = CONTENT.endings.find((e) => e.id === endingId)!.title;
      expect(renderToString(<EndingScreen game={ended} onRestart={() => {}} />)).toContain(title);
    }
  });
});
