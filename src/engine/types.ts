export const STAT_IDS = ['impl', 'design', 'debug', 'infra', 'ai', 'mental'] as const;
export type StatId = (typeof STAT_IDS)[number];
export type Stats = Record<StatId, number>;
export const STAT_LABELS: Record<StatId, string> = {
  impl: '구현', design: '설계', debug: '디버깅', infra: '인프라', ai: 'AI 활용', mental: '멘탈',
};

export type PositionId = 'backend' | 'frontend' | 'sre' | 'ai';
export const POSITION_IDS: readonly PositionId[] = ['backend', 'frontend', 'sre', 'ai'];
export const ROUTE_IDS = ['commerce', 'finance', 'ai-startup'] as const;
export type RouteId = (typeof ROUTE_IDS)[number];
export type CompanyRoute = RouteId | 'whatap';
export const ROUTE_LABELS: Record<CompanyRoute, string> = {
  commerce: '커머스', finance: '금융·공공', 'ai-startup': 'AI', whatap: '와탭',
};

export type CardId = 'apm' | 'server' | 'k8s' | 'db' | 'log' | 'browser' | 'gpu' | 'ai-agent-obs' | 'whatap-ai';
export type ViewId =
  | 'grep' | 'hitmap' | 'trace' | 'topology' | 'server-metrics' | 'pods' | 'db-locks'
  | 'log-search' | 'rum' | 'gpu-metrics' | 'agent-trajectory' | 'token-cost' | 'llm-quality';
export type GrowthType = 'early' | 'normal' | 'late';
export type Role = 'owner' | 'main' | 'support';
export type Track = 'ic' | 'mgmt';

export type Condition = {
  route?: RouteId[];
  position?: PositionId[];
  minCareerYear?: number;
  maxCareerYear?: number;
  minCalendarYear?: number;
  minAge?: number;
  maxAge?: number;
  minOvr?: number;
  minBurnout?: number;
  /** 지금 회사 근속 연수 (1 이상) */
  minYearsAtCompany?: number;
  track?: Track;
  flags?: string[];
  notFlags?: string[];
  /** 모두 보유해야 함 */
  cards?: CardId[];
  /** 하나라도 없으면 통과 */
  missingCards?: CardId[];
  minStat?: Partial<Stats>;
  maxStat?: Partial<Stats>;
  minTrait?: Record<string, number>;
};

export type Effects = {
  stats?: Partial<Stats>;
  reputation?: number;
  burnout?: number;
  /** 만원 단위 증감 */
  salary?: number;
  flags?: string[];
  removeFlags?: string[];
  traits?: Record<string, number>;
  addCards?: CardId[];
  /** 다음 해에 이 이벤트를 예약 (현재 회사에 묶임) */
  next?: string;
  /** 이 이벤트를 같은 해에 곧바로 이어서 띄운다 (이벤트 선택지에서만) */
  now?: string;
  /** 이 회사로 옮긴다 ("이직" 이야기 없이). `{route}`는 현재 루트로 바뀐다. (이벤트 선택지에서만) */
  company?: string;
  track?: Track;
  retire?: boolean;
  /** 인생 이야기에 남길 문장 */
  story?: string;
};

export type EventChoice = {
  label: string;
  requires?: { card?: CardId; minStat?: Partial<Stats> };
  chance?: { base: number; stat?: StatId; card?: CardId };
  effects: Effects;
  failEffects?: Effects;
};

export type GameEvent = {
  id: string;
  arc?: string;
  when: Condition;
  weight?: number;
  /** 기본 true: 한 커리어에 한 번만 */
  once?: boolean;
  /** true면 next로 예약됐을 때만 등장 */
  scheduledOnly?: boolean;
  text: string;
  choices: EventChoice[];
};

export type IncidentOption = { label: string; view: ViewId; correct: boolean; clue?: string };
export type IncidentStep = { prompt: string; options: IncidentOption[] };
export type IncidentAction = { label: string; baseChance: number; perClue: number; effects: Effects; failEffects: Effects };
export type Incident = {
  /** 주 담당 포지션. 없으면 모두. 아니면 OFF_ROLE_WEIGHT배로 드물게 '지원 호출'로 뜬다 */
  positions?: PositionId[];
  id: string;
  title: string;
  when: Condition;
  weight?: number;
  summary: string;
  steps: IncidentStep[];
  actions: IncidentAction[];
  aiHint?: string;
};

export type Tier = 'startup' | 'mid' | 'large' | 'bigtech' | 'whatap';
export const TIER_LABELS: Record<Tier, string> = {
  startup: '스타트업', mid: '중견', large: '대기업', bigtech: '빅테크', whatap: '관측성 전문',
};
/** 스타트업 성장 단계. stages[0]은 시작 상태(회사 level·baseSalary와 같음) */
export type GrowthStage = {
  name: string;
  level: number;
  /** 만원 */
  baseSalary: number;
  /** 이 단계에서 규모가 바뀌면 (이후 단계도 이어받는다) */
  tier?: Tier;
  /** 이 단계에 새로 생기는 관측 도구 */
  addCards?: CardId[];
  /** 연말마다 다음 단계로 갈 확률 / 폐업 확률. 마지막 단계는 둘 다 0 */
  up: number;
  down: number;
  /** 이 단계에 도달했을 때 feed·story 문장. `{company}` 뒤에 조사(이/가 등)를 붙여 쓴다 */
  text: string;
  /** 상장 단계 (마지막 단계에만). 상장할 수 있는 회사만 스톡옵션을 준다 */
  ipo?: true;
  /** 이 단계에 도달했을 때 적용 (stats, reputation, burnout, flags, removeFlags, traits, story, retire만. retire는 마지막 단계만) */
  effects?: Effects;
  /** 이 단계에서 폐업할 때 적용 (effects와 같되 retire 금지) */
  closeEffects?: Effects;
};

export type Company = {
  id: string;
  name: string;
  route: CompanyRoute;
  tier: Tier;
  level: number;
  /** 만원 */
  baseSalary: number;
  cards: CardId[];
  start?: boolean;
  hidden?: boolean;
  /** 작은 회사: 플레이어 OVR이 level + TINY_OUTGROW를 넘으면 이직 제안이 오지 않는다 */
  tiny?: boolean;
  /** 성장 단계 (스타트업만) */
  stages?: GrowthStage[];
  /** 창업 회사. hidden이고 이벤트 company 효과로만 들어간다. founder 플래그가 있어도 성장 판정을 굴린다 */
  founder?: true;
};

export type CardDef = { id: CardId; name: string; color: string; views: ViewId[] };

export type HistoryRow = { year: number; age: number; companyId: string; title: string; rating: number; ovr: number; salary: number; assets?: number };

export type ShopCategory = 'gear' | 'growth' | 'rest' | 'life' | 'invest';
export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  gear: '장비', growth: '자기계발', rest: '휴식', life: '인생', invest: '투자',
};
export type ShopItem = {
  id: string;
  name: string;
  category: ShopCategory;
  /** 만원 */
  price: number;
  text: string;
  when?: Condition;
  /** 기본 true: 한 번 사면 다시 나오지 않는다 (`shop:{id}` 플래그) */
  once?: boolean;
  effects: Effects;
  /** 투자: chance 확률로 price × win, 아니면 price × lose를 돌려받는다 */
  gamble?: { chance: number; win: number; lose: number };
};

/** 시작 후보의 유형. 강점은 가장 높게, 약점은 가장 낮게 뽑힌다. */
export type Archetype = {
  id: string;
  name: string;
  tagline: string;
  positions: PositionId[];
  /** 강점 스탯 1~2개 */
  spikes: StatId[];
  /** 약점 스탯 1~2개 */
  dumps: StatId[];
  /** 시작할 때 한 번 적용하는 작은 보정 */
  twist?: {
    reputation?: number;
    /** 번아웃 민감도 가감 (기본 0.8~1.2) */
    burnoutProne?: number;
    /** 이 성장형이 더 잘 나온다 */
    growth?: GrowthType;
  };
};

export type GameState = {
  name: string;
  position: PositionId;
  /** 시작 후보 유형 (Archetype.id) */
  archetypeId: string;
  route: CompanyRoute;
  year: number;
  age: number;
  yearsInCareer: number;
  stats: Stats;
  potential: number;
  growthType: GrowthType;
  burnoutProne: number;
  companyId: string;
  deck: CardId[];
  cardsSeen: CardId[];
  companiesWorked: string[];
  yearsAtCompany: number;
  salary: number;
  maxSalary: number;
  reputation: number;
  burnout: number;
  title: string;
  track: Track;
  flags: string[];
  traits: Record<string, number>;
  scheduled: { id: string; companyId: string }[];
  seenEvents: string[];
  recur: string[];
  yearScore: number;
  record: {
    incidentsTotal: number;
    incidentsResolved: number;
    mttrTotalMin: number;
    /** 복구하면서 MTTR이 FAST_MTTR분 이하였던 장애 수 */
    fastResolves: number;
    history: HistoryRow[];
    story: string[];
  };
  retired: boolean;
  endingId?: string;
  /** 순자산 (만원) */
  assets: number;
  /** 상점에서 산 물건 id (산 순서대로, 중복 가능) */
  purchases: string[];
  /** 회사별 성장 단계 (없으면 0). 다니지 않는 회사는 멈춰 있다 */
  companyStage: Record<string, number | 'closed'>;
  /** 지금 회사에서 받은 스톡옵션 (만원, 상장 때 IPO_MULT배로 행사) */
  stock?: { companyId: string; value: number };
};

export type Ending = { id: string; priority: number; title: string; description: string; check: (s: GameState) => boolean };

export type Content = {
  cards: Record<CardId, CardDef>;
  companies: Record<string, Company>;
  events: Record<string, GameEvent>;
  incidents: Record<string, Incident>;
  endings: Ending[];
  shop: Record<string, ShopItem>;
  archetypes: Record<string, Archetype>;
};
