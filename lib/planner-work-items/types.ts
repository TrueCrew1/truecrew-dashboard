// Planner work items — internal planning task tracker.
//
// Standalone feature, deliberately separate from the agent-runtime job queue
// in lib/runtime/types.ts (runtime_work_items, agent_role = 'planner'). See
// the migration header comment in
// supabase/migrations/20260711000001_planner_work_items.sql for why.

export const PLANNER_WORK_ITEM_STATUSES = ["new", "in_progress", "blocked", "done"] as const;
export type PlannerWorkItemStatus = (typeof PLANNER_WORK_ITEM_STATUSES)[number];

export const PLANNER_WORK_ITEM_PRIORITIES = ["low", "medium", "high"] as const;
export type PlannerWorkItemPriority = (typeof PLANNER_WORK_ITEM_PRIORITIES)[number];

export interface DbPlannerWorkItemRow {
  id: string;
  title: string;
  description: string | null;
  status: PlannerWorkItemStatus;
  priority: PlannerWorkItemPriority;
  assignee: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

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
