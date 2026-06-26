import type { TaskRow } from "@/types/database";

export type TodayCrew = "field" | "maintenance" | "operations" | "admin";
export type TodaySlaTier = "critical" | "standard" | "routine";

export type TodayFilters = {
  site: string;
  crew: string;
  sla: string;
};

export type TodayTask = TaskRow;

export type NextActionUrgency = "critical" | "high" | "normal" | "low";

export interface NextActionStep {
  urgency: NextActionUrgency;
  action: string;
  detail: string;
  targetId: string | null;
}

export interface TodayZones {
  mit: TodayTask | null;
  inProgress: TodayTask[];
  priorityQueue: TodayTask[];
  overdue: TodayTask[];
  blockers: TodayTask[];
  waiting: TodayTask[];
}

export interface TodayFilterOptions {
  sites: string[];
  crews: TodayCrew[];
  slaTiers: TodaySlaTier[];
}
