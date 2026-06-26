import type { MockData } from "@/data/mockData";
import type {
  Incident,
  Persona,
  Tool,
  WorkflowStage,
} from "@/types";

export type PostureLevel = "red" | "amber" | "green";
export type KpiStatus = PostureLevel;
export type CapacityStatus = "available" | "loaded" | "blocked";
export type TrendDirection = "up" | "down" | "flat";

export interface Posture {
  level: PostureLevel;
  reason: string;
  entityId?: string;
}

export interface KpiTile {
  id: string;
  label: string;
  value: string;
  status: KpiStatus;
  context: string;
  entityId?: string;
}

export interface ActionQueueItem {
  id: string;
  entityId: string;
  tier: number;
  pill: string;
  title: string;
  owner: string;
  age: string;
  reason: string;
  revenueImpact: boolean;
  sortSeverity: number;
  updatedAt: string;
  dueAt?: string;
}

export interface OpsServiceRow {
  id: string;
  name: string;
  status: Tool["status"];
  incidentCount: number;
}

export interface OpsIncidentRow {
  id: string;
  title: string;
  severity: Incident["severity"];
  status: Incident["status"];
  serviceName: string;
}

export interface OpsDeployRow {
  id: string;
  title: string;
  stage: WorkflowStage;
  blocker: string;
}

export interface RevenueSegment {
  label: string;
  count: number;
  note?: string;
}

export interface OnboardingRow {
  id: string;
  name: string;
  checklistDone: number;
  checklistTotal: number;
}

export interface AtRiskRow {
  id: string;
  name: string;
  healthScore: number;
  reason: string;
}

export interface CapacityRow {
  persona: Persona;
  label: string;
  status: CapacityStatus;
}

export interface TrendCard {
  id: string;
  label: string;
  now: string;
  delta: string;
  direction: TrendDirection;
  baselineBuilding: boolean;
}

export interface ExecutiveDashboardModel {
  posture: Posture;
  kpis: KpiTile[];
  actionQueue: ActionQueueItem[];
  ops: {
    services: OpsServiceRow[];
    incidents: OpsIncidentRow[];
    deploys: OpsDeployRow[];
  };
  revenue: {
    segments: RevenueSegment[];
    onboarding: OnboardingRow[];
    atRisk: AtRiskRow[];
    enterpriseBlocker?: string;
  };
  capacity: CapacityRow[];
  trends: TrendCard[];
  drillEntityId?: string;
}

export type DashboardData = MockData;
