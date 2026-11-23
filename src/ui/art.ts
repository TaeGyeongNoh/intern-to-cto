import type { PositionId, RouteId } from '../engine/types';
import mark from '../assets/art/mark.webp';
import avatarBackend from '../assets/art/avatar-backend.webp';
import avatarFrontend from '../assets/art/avatar-frontend.webp';
import avatarSre from '../assets/art/avatar-sre.webp';
import avatarAi from '../assets/art/avatar-ai.webp';
import routeCommerce from '../assets/art/route-commerce.webp';
import routeFinance from '../assets/art/route-finance.webp';
import routeAi from '../assets/art/route-ai.webp';
import evMonitoring from '../assets/art/event-monitoring.webp';
import evLead from '../assets/art/event-lead.webp';
import evKeynote from '../assets/art/event-keynote.webp';
import evFounder from '../assets/art/event-founder.webp';
import evAiReplace from '../assets/art/event-ai-replace.webp';
import evBurnout from '../assets/art/event-burnout.webp';
import evChatbot from '../assets/art/event-chatbot.webp';
import evPrologue from '../assets/art/event-prologue.webp';
import evIntern from '../assets/art/event-intern.webp';
import evJobFail from '../assets/art/event-jobfail.webp';
import evBlackFriday from '../assets/art/event-blackfriday.webp';
import evMigration from '../assets/art/event-migration.webp';
import evMsa from '../assets/art/event-msa.webp';
import endWhatap from '../assets/art/ending-whatap.webp';
import endAiReplaced from '../assets/art/ending-ai-replaced.webp';
import endBurnout from '../assets/art/ending-burnout.webp';
import endFounderExit from '../assets/art/ending-founder-exit.webp';
import endFounderFail from '../assets/art/ending-founder-fail.webp';
import endCto from '../assets/art/ending-cto.webp';
import endVp from '../assets/art/ending-vp.webp';
import endLegendSre from '../assets/art/ending-legend-sre.webp';
import endKeynote from '../assets/art/ending-keynote.webp';
import endPrincipal from '../assets/art/ending-principal.webp';
import endOneCompany from '../assets/art/ending-one-company.webp';
import endOrdinary from '../assets/art/ending-ordinary.webp';

export const MARK = mark;

export const AVATARS: Record<PositionId, string> = {
  backend: avatarBackend, frontend: avatarFrontend, sre: avatarSre, ai: avatarAi,
};

export const ROUTE_ART: Record<RouteId, string> = {
  commerce: routeCommerce, finance: routeFinance, 'ai-startup': routeAi,
};

export const ENDING_ART: Record<string, string> = {
  whatap: endWhatap, 'ai-replaced': endAiReplaced, burnout: endBurnout,
  'founder-exit': endFounderExit, 'founder-fail': endFounderFail, cto: endCto, vp: endVp,
  'legend-sre': endLegendSre, keynote: endKeynote, principal: endPrincipal,
  'one-company': endOneCompany, ordinary: endOrdinary,
  // 흔한 끝 엔딩은 기존 그림을 재사용한다
  staff: endPrincipal, 'team-lead': evLead, 'veteran-senior': endOneCompany,
  // 자발적 은퇴: 파이어족은 쉬는 그림, 다른 길은 새 출발(취준) 그림
  fire: evBurnout, 'new-path': evPrologue,
};

const EVENT_ART: Record<string, string> = {
  'adopt-commerce': evMonitoring, 'adopt-finance': evMonitoring, 'adopt-ai': evMonitoring,
  'lead-offer': evLead, keynote: evKeynote,
  'founder-offer': evFounder, 'founder-runway': evFounder,
  'ai-replacement': evAiReplace, rest: evBurnout,
  'ai-chatbot-1': evChatbot, 'ai-chatbot-2': evChatbot, 'ai-chatbot-3a': evChatbot, 'ai-chatbot-3b': evChatbot,
  'prologue-start': evPrologue, 'prologue-result': evPrologue,
  'prologue-intern': evIntern, 'prologue-fail': evJobFail,
};

/** 아크 단위 일러스트 — 같은 접두사로 이벤트가 늘어나도 그대로 붙는다 (위에서부터 첫 매치) */
const EVENT_ART_PREFIX: [prefix: string, art: string][] = [
  ['prologue-intern', evIntern],
  ['prologue-fail', evJobFail],
  ['prologue-', evPrologue],
  ['blackfriday-', evBlackFriday],
  ['migration-', evMigration],
  ['msa-', evMsa],
  ['tenure-', evLead],
  ['lead-', evLead],
];

export const eventArt = (eventId: string): string | undefined =>
  EVENT_ART[eventId] ?? EVENT_ART_PREFIX.find(([p]) => eventId.startsWith(p))?.[1];
