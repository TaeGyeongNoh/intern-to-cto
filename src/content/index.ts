import { toRecord } from '../engine/util';
import type { Content } from '../engine/types';
import { COMPANIES } from './companies';
import { ENDINGS } from './endings';
import { EVENTS } from './events';
import { INCIDENTS } from './incidents';
import { PROLOGUE_EVENTS } from './prologue';
import { CARDS } from './cards';
import { SHOP_ITEMS } from './shop';
import { ARCHETYPES } from './archetypes';

export const CONTENT: Content = {
  cards: CARDS,
  companies: toRecord(COMPANIES),
  events: toRecord([...PROLOGUE_EVENTS, ...EVENTS]),
  incidents: toRecord(INCIDENTS),
  endings: ENDINGS,
  shop: toRecord(SHOP_ITEMS),
  archetypes: toRecord(ARCHETYPES),
};
