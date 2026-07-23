export const PLANNER_AGENT_ROLE = "planner" as const;
export const PLANNER_INPUT_KIND = "planning_task" as const;

export const PLANNER_TRIGGER_TYPES = ["manual", "reactive", "scheduled"] as const;
export type PlannerTriggerType = (typeof PLANNER_TRIGGER_TYPES)[number];

export const PLANNER_REQUESTED_BY = ["founder", "operator", "observer", "system"] as const;
export type PlannerRequestedBy = (typeof PLANNER_REQUESTED_BY)[number];

export const PLANNER_WORK_ITEM_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type PlannerWorkItemStatus = (typeof PLANNER_WORK_ITEM_STATUSES)[number];

export interface PlannerTaskPayload {
  title: string;
  description: string;
  context?: string;
  notes?: string;
  proposalId?: string;
}

export interface DbRuntimePlannerWorkItemRow {
  id: string;
  agent_role: string;
  trigger_type: PlannerTriggerType;
  input_kind: string;
  input_payload: PlannerTaskPayload;
  status: PlannerWorkItemStatus;
  idempotency_key: string | null;
  requested_by: PlannerRequestedBy;
  chief_proposal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuntimePlannerWorkItemClient {
  id: string;
  agentRole: typeof PLANNER_AGENT_ROLE;
  inputKind: typeof PLANNER_INPUT_KIND;
  status: PlannerWorkItemStatus;
  triggerType: PlannerTriggerType;
  inputPayload: PlannerTaskPayload;
  idempotencyKey: string | null;
  requestedBy: PlannerRequestedBy;
  chiefProposalId: string | null;
  createdAt: string;
  updatedAt: string;
}
