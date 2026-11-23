# AGENTS.md

이 레포에서 일하는 모든 코딩 에이전트(Claude Code, Codex 등)와 사람이 공통으로 따르는 컨텍스트다. 도구별 설정 파일(`CLAUDE.md` 등)은 이 파일을 가리키기만 하고, 규칙은 여기에만 쓴다.

## 프로젝트

「인턴에서 CTO까지」. AI 시대 개발자 커리어 시뮬레이션 웹게임이다(한국어). 정적 사이트이고, `main`에 push하면 GitHub Pages(`/intern-to-cto/`)로 자동 배포된다.

- 한 판은 5~10분이다. 취준·인턴 프롤로그 → 1년 단위 턴 약 20~25회 → 은퇴·엔딩·공유 카드 순서로 진행한다.
- 해마다 아래 순서로 처리한다.
  1. 성장과 번아웃을 계산한다.
  2. 장애 0~2건이 터지면 콘솔 화면에서 대응한다.
  3. 이벤트나 스토리 아크가 진행된다.
  4. 연말 평가가 나온다.
  5. 상점이 열린다.
  6. 이직 제안을 받는다.
- 핵심 메커닉은 **관측성 덱**이다. 회사마다 보유한 관측 도구 카드가 다르고, 장애 콘솔에서는 카드가 있어야 그 뷰(히트맵, 트레이스, 에이전트 트래젝토리 등)를 열 수 있다. 카드가 없으면 `grep`만 쓸 수 있다.
- 시작 후보 3명은 포지션별 유형(아키타입, `src/content/archetypes.ts`)에서 서로 다르게 뽑힌다. 강점 스탯은 가장 높고 약점은 가장 낮으며, 모두 OVR 45·합 240이다. 유형마다 작은 시작 보정(평판, 번아웃 민감도, 성장형 쏠림)이 있다.
- 출신(학력 4종, `src/content/origins.ts`)과 병역(4종)을 고른다. 시작 나이(20~28), 작은 스탯 보정, 첫 연봉 가감, 첫 프롤로그가 달라지고, 대체복무는 첫 회사에 3년 묶인다(`bound`). 기본 출신(4년제·해당 없음)은 효과가 없어야 한다(옛 저장·공유 링크 호환, `validate`가 강제). 성장 계수는 연차(경력 나이), 쇠퇴·은퇴는 실제 나이를 본다.
- 엔딩은 15종이고 엔딩 도감이 있다. 공유 링크는 시드와 입력 로그를 리플레이하는 방식이다.

## 명령어

```bash
npm i
npm run dev          # 개발 서버
npm test             # vitest 전체
npm run typecheck    # tsc --noEmit
npm run validate     # 콘텐츠 데이터 무결성 검사
npm run simulate -- 2000   # 무작위 플레이 N판 → 엔딩 분포·연봉·해결률 리포트
npm run build        # 프로덕션 빌드 (BASE_PATH=/intern-to-cto/ 로 서브패스 빌드)
```

작업을 끝내기 전에 `npm test && npm run typecheck && npm run validate && npm run build`가 모두 통과해야 한다.

## 구조

```
src/engine/   순수 TS 게임 엔진. UI를 모른다. 결정론적.
  game.ts       상태 머신: newGame / pending / validInputs / apply / replay
  rng.ts        시드 RNG (mulberry32). 모든 확률은 이걸로만
  season.ts     1년 진행·연말 평가     salary.ts  시장가 기반 연봉
  events.ts     이벤트 선택            incident.ts 장애 판정
  career.ts     이직·스카우트·엔딩     shop.ts    상점
  effects.ts    효과 적용              conditions.ts 조건 매칭
  josa.ts       한국어 조사 처리       validate.ts / simulate.ts
src/content/  게임 데이터만 둔다 (이벤트·아크·장애·회사·카드·엔딩·상점·프롤로그·유형)
src/ui/       React 18 화면. CSS Modules, 아이콘은 lucide(components/Icons.tsx 한 곳에서 관리)
  console/      장애 콘솔(다크) + 위젯 13종(widgets/), 위젯 데이터는 (incidentId:view, anomaly)로 결정
  screens/      생성·홈·이벤트·이직·상점·엔딩
  art.ts        일러스트 매핑 (src/assets/art/*.webp)
scripts/      validate-content.ts, simulate.ts
```

## 반드시 지킬 규칙

**엔진**
- 결정론을 지킨다. 엔진과 콘텐츠에서 `Math.random`, `Date`를 쓰지 않는다. 확률은 `Rng`로만 굴리고, `Game.rngState`에 상태를 저장한다. 같은 `(setup, seed, log)`는 항상 같은 결과를 내야 한다(저장·공유·리플레이가 여기에 의존한다).
- 엔진은 불변으로 다룬다. 입력 상태를 수정하지 않고 새 객체를 반환한다.
- UI는 규칙을 다시 구현하지 않는다. 버튼 활성 여부는 항상 `validInputs()`로 판단한다.
- 콘텐츠를 추가하는 일은 데이터만 추가하는 일이어야 한다. 엔진 수정이 필요하면 스키마(`types.ts`)와 `validate.ts`도 함께 고친다.
- 엔진 로직은 TDD로 작업한다(테스트 먼저). 테스트 의도를 약화시켜 통과시키지 않는다.

**밸런스**
- 확률·연봉·성장 공식을 건드렸으면 `npm run simulate -- 2000`으로 확인한다. 목표는 아래와 같다.
  - 평균 커리어 20~26년
  - 장애 해결률이 단서 있음일 때 단서 0개보다 20%p 이상 높을 것
  - 단일 엔딩 비중 35% 이하
  - 10년차 연봉 중앙값 약 6,000~7,500만원, 최고연봉 p90은 약 1.5억 이하(빅테크 CTO만 드물게 2~3억)
  - 히든 엔딩(와탭 입사)은 수% 수준으로 드물게
- 시뮬레이션 목표를 맞추는 것과 별개로, 결과가 **대한민국 개발자 현실**과 맞아야 한다. 수치를 정하거나 추천할 때는 아래 기준표와 대조하고 근거를 함께 적는다. 기준이 낡았거나 없으면 공개 통계를 찾아 갱신한다.

  | 항목 | 현실 기준 (2024~2025) | 출처 |
  |---|---|---|
  | 연차별 개발자 평균 연봉 | 1년차 3,400~3,800만, 3년차 약 4,200만, 5~6년차 4,300~5,100만, 10년차 약 6,200만(직무별 4,900~8,300만) | 잡플래닛(고용보험 인증), 원티드, 점핏 2025 |
  | 나이별 (시뮬 목표) | 30세 중앙값 4,500~5,500만, 40세 중앙값 6,500~8,500만, 40세 1억 이상 10~20%, 2억 이상 2% 미만 (예전 "1억 이상 20~30%, 2억 이상 1% 미만"은 근거 없는 추정이었다) | 위 자료 + 국가데이터처 2024(40대 임금근로자 평균 월 469만) + 국세청 2023 귀속 연말정산: 총급여 1억 초과 6.7%, 2024 귀속 2억 초과 1.39% ([한국경제](https://www.hankyung.com/article/202412198129i), [서울경제](https://www.sedaily.com/article/13997731)) |
  | 기업 규모 격차 | 대기업 평균 월 613만, 중소기업 월 307만. 대형 IT 개발직군 평균은 1억 이상도 있음 | 국가데이터처 2024, 기업 공시 |
  | 직급 | 시니어는 대체로 7~10년차 이후, 10년차 스태프 10~15%, 프린시펄은 드물게 | 업계 통념(근거 약함, 더 나은 자료가 있으면 갱신) |
  | 창업 | 창업기업 5년 생존율 약 34%, 엑싯(M&A·IPO)은 수% | 중기부 2020 기준 |
  | 연말 평가 | 상대평가(강제 배분) S 10~15%, A 25~30%, B 약 40%, C 10~15%, D 3~5% | 대기업·IT 인사 관행(업계 통념, 근거 약함) |
  | 병역 | 산업기능요원 현역 34개월·보충역 23개월, 전문연구요원 36개월 | 병무청 |
  | 학력별 첫 연봉 | 전문대 초임 = 일반대의 83%(월 257.7만 vs 309.1만), 석사는 경력 2년 안팎 인정(근거 약함), 300인 미만 대졸 초임 3,238만 | 교육부 2023 졸업자 취업통계, 경총 2023 |
- 엔진이나 콘텐츠가 바뀌면 예전 저장과 공유 링크가 리플레이에 실패할 수 있다. 실패하면 조용히 새 게임으로 넘어가도록 이미 처리돼 있다.

**콘텐츠·톤**
- 모든 문구는 한국어로 쓰고, 가볍고 위트 있게 쓴다. 개발자 밈은 괜찮다.
- 실존 회사는 패러디 이름만 쓴다(예: 쿠팡팡, 토스트뱅크, 네이부). 특정 회사를 비하하지 않는다.
- 이모지를 쓰지 않는다(UI, 엔진 문구, 콘솔 출력 모두). 아이콘은 lucide를, 그림은 일러스트를 쓴다.
- 변수가 들어간 문장의 조사는 `josa.ts`를 쓴다. "(으)로", "을(를)" 같은 병기를 하지 않는다.

**관측성 제품의 노출 방식**
- 모니터링 제품(APM, AI Agent Observability, WhaTap AI 등)은 **게임 메커닉 안에서만** 드러낸다. 덱 카드 이름, 콘솔 패널 구석의 작은 출처 라벨, AI 어시스턴트 버튼, 드문 히든 엔딩이 그 범위다.
- 로고, "Powered by", 광고성 문구, 출처를 밝히는 코드 주석("○○ 브랜드 컬러" 등), 외부 회사 에셋 복사는 금지한다.

**UI**
- 모바일 우선으로 만든다. 375px 폭에서 가로 스크롤이 생기면 안 된다.
- 색은 `src/ui/theme/tokens.css`의 CSS 변수만 쓴다. 장애 콘솔은 `[data-theme="dark"]`이다.
- `GameView`와 각 화면은 `renderToString`으로 렌더 테스트가 돈다(`render.test.tsx`). 렌더 중에 DOM API(canvas, clipboard 등)를 호출하지 말고, 이벤트 핸들러 안에서만 쓴다.

## 일러스트

- `src/assets/art/*.webp`에 있다. GPT 이미지 생성으로 만들었고, 아래 스타일로 통일한다.
  > flat vector illustration, minimal geometric shapes, soft rounded forms, very subtle gradients. Palette: blue #296CF2, purple #8B52FF, deep navy #1E2A4A, soft gray #E9ECF2, light blue #D7E2FF, tiny orange #FF9D1D accent. Pure white background. No text, letters, numbers, logos or emoji. Recurring main character: gender-neutral young Korean software engineer, dark tousled hair, round thin-frame glasses, blue hoodie.
- 크기: 아바타와 심볼은 384px, 장면은 960px 폭(3:2)이고 `cwebp -q 80`으로 변환한다.
- 새 이벤트 id는 `art.ts`의 접두사 매핑(`blackfriday-`, `migration-`, `msa-`, `prologue-` 등)을 따른다. 모든 이벤트·엔딩에 그림이 있어야 테스트가 통과한다.

## Git·배포

- `main`에 push하면 `.github/workflows/deploy.yml`이 테스트·빌드 후 Pages로 배포한다. Actions는 커밋 SHA로 고정돼 있다.
- `docs/`는 로컬 전용(gitignore)이다. 설계 메모나 플랜은 공개 레포에 올리지 않는다.
- 공개 레포다. 비밀값, 개인 경로, 사내 레포 경로를 커밋하지 않는다. 브라우저 RUM 스니펫 키(`index.html`)는 원래 공개되는 값이다.

## 백로그

- 업계 루트 추가(게임사, 빅테크)
- 엔딩 확장, 영어/일본어
- 공유 링크에 콘텐츠 버전 표기(밸런스를 바꿔도 예전 링크가 열리도록)
- 엔딩 카드 OG 이미지
