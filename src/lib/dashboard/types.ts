export type KpiStatus = "red" | "amber" | "green";
export type TrendDirection = "up" | "down" | "flat";

export interface DrillLink {
  label: string;
  to: string;
}

export interface KpiTile {
  id: string;
  label: string;
  value: string;
  status: KpiStatus;
  context: string;
  drillTo: string;
  entityId?: string;
}

export interface DispatchRow {
  id: string;
  time: string;
  label: string;
  detail: string;
  status: "scheduled" | "gap" | "delayed" | "unassigned";
  drillTo: string;
  entityId?: string;
}

export interface DispatchSummary {
  scheduledToday: number;
  crewGaps: number;
  delayedJobs: number;
  rows: DispatchRow[];
}

export interface ActionQueueRow {
  id: string;
  pill: string;
  title: string;
  reason: string;
  age: string;
  drillTo: string;
  entityId: string;
}

export interface RevenueRow {
  id: string;
  label: string;
  count: number;
  amount: string;
  drillTo: string;
}

export interface RevenueLane {
  draftCount: number;
  sentCount: number;
  unpaidBalance: string;
  rows: RevenueRow[];
}

export interface RiskRow {
  id: string;
  title: string;
  detail: string;
  pill: string;
  drillTo: string;
  entityId: string;
}

export interface RiskLane {
  blockedCount: number;
  repeatCount: number;
  agingCount: number;
  rows: RiskRow[];
}

export interface TrendCard {
  id: string;
  label: string;
  now: string;
  delta: string;
  direction: TrendDirection;
  drillTo: string;
}

export interface ExecutiveDashboardModel {
  kpis: KpiTile[];
  dispatch: DispatchSummary;
  actionQueue: ActionQueueRow[];
  revenue: RevenueLane;
  risk: RiskLane;
  trends: TrendCard[];
}
