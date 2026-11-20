export const STAT_IDS = ['impl', 'design', 'debug', 'infra', 'ai', 'mental'] as const;
export type StatId = (typeof STAT_IDS)[number];
export type Stats = Record<StatId, number>;
export const STAT_LABELS: Record<StatId, string> = {
  impl: '구현', design: '설계', debug: '디버깅', infra: '인프라', ai: 'AI 활용', mental: '멘탈',
};

export type PositionId = 'backend' | 'frontend' | 'sre' | 'ai';
export const ROUTE_IDS = ['commerce', 'finance', 'ai-startup'] as const;
export type RouteId = (typeof ROUTE_IDS)[number];
export type CompanyRoute = RouteId | 'whatap';
export const ROUTE_LABELS: Record<CompanyRoute, string> = {
  commerce: '커머스', finance: '금융·공공', 'ai-startup': 'AI 스타트업', whatap: '와탭',
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
};

export type CardDef = { id: CardId; name: string; color: string; views: ViewId[] };

export type HistoryRow = { year: number; age: number; companyId: string; title: string; rating: number; ovr: number };

export type GameState = {
  name: string;
  position: PositionId;
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
    history: HistoryRow[];
    story: string[];
  };
  retired: boolean;
  endingId?: string;
};

export type Ending = { id: string; priority: number; title: string; description: string; check: (s: GameState) => boolean };

export type Content = {
  cards: Record<CardId, CardDef>;
  companies: Record<string, Company>;
  events: Record<string, GameEvent>;
  incidents: Record<string, Incident>;
  endings: Ending[];
};
