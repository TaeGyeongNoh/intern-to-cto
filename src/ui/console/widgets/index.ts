import type { ViewId } from '../../../engine/types';
import { GrepTerminal } from './GrepTerminal';
import { Hitmap } from './Hitmap';
import { GpuMemory, ServerCpu } from './LineChart';
import { LockTable } from './LockTable';
import { LogList } from './LogList';
import type { WidgetProps } from './Panel';
import { PodTable } from './PodTable';
import { QualityBadges } from './QualityBadges';
import { RumBars } from './RumBars';
import { Topology } from './Topology';
import { TokenCost } from './TokenCost';
import { TraceTable } from './TraceTable';
import { Trajectory } from './Trajectory';

export type { WidgetProps } from './Panel';

/** ViewId → 위젯 컴포넌트 */
export const WIDGETS: Record<ViewId, (p: WidgetProps) => JSX.Element> = {
  grep: GrepTerminal,
  hitmap: Hitmap,
  trace: TraceTable,
  topology: Topology,
  'server-metrics': ServerCpu,
  pods: PodTable,
  'db-locks': LockTable,
  'log-search': LogList,
  rum: RumBars,
  'gpu-metrics': GpuMemory,
  'agent-trajectory': Trajectory,
  'token-cost': TokenCost,
  'llm-quality': QualityBadges,
};
