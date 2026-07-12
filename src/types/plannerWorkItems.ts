// Planner work items — internal planning task tracker (frontend types).
//
// Deliberately separate from src/types/runtime.ts, which mirrors the
// agent-runtime job queue (RuntimePlannerWorkItemClient etc. served by
// /api/runtime/planner/work-items). This tracks the plain task-tracker
// resource served by /api/planner/work-items.

export type PlannerWorkItemStatus = "new" | "in_progress" | "blocked" | "done";

export type PlannerWorkItemPriority = "low" | "medium" | "high";

export interface PlannerWorkItem {
  id: string;
  title: string;
  description: string | null;
  status: PlannerWorkItemStatus;
  priority: PlannerWorkItemPriority;
  assignee: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerWorkItemInput {
  title: string;
  description?: string;
  status?: PlannerWorkItemStatus;
  priority?: PlannerWorkItemPriority;
  assignee?: string;
  dueDate?: string;
}
