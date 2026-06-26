import type { Persona, TaskPriority, WorkflowStage, WorkflowType } from "@/types";

export type TodaySite = "production" | "staging" | "internal";
export type TodayCrew = "platform" | "support" | "founder" | "operator";
export type SlaTier = "p0" | "p1" | "p2" | "p3";

export interface TodayTask {
  id: string;
  title: string;
  description: string;
  stage: WorkflowStage;
  workflowType: WorkflowType;
  priority: TaskPriority;
  assignee?: Persona;
  dueAt?: string;
  blocker?: string;
  site: TodaySite;
  crew: TodayCrew;
  slaTier: SlaTier;
  slaDueAt?: string;
  isMit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodayFilters {
  site: TodaySite | "all";
  crew: TodayCrew | "all";
  slaTier: SlaTier | "all";
}

export interface CrewCapacity {
  crew: TodayCrew;
  label: string;
  inProgress: number;
  capacity: number;
  utilization: number;
}

export interface NextAction {
  taskId: string;
  title: string;
  reason: string;
  urgency: "critical" | "high" | "normal";
  slaDueAt?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  site?: TodaySite;
  crew?: TodayCrew;
  slaTier?: SlaTier;
  priority?: TaskPriority;
  workflowType?: WorkflowType;
}
