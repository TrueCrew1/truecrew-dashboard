export const LIBRARIAN_AGENT_ROLE = "librarian" as const;

export const RUNTIME_TRIGGER_TYPES = ["manual", "reactive", "scheduled"] as const;
export type RuntimeTriggerType = (typeof RUNTIME_TRIGGER_TYPES)[number];

export const RUNTIME_WORK_ITEM_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type RuntimeWorkItemStatus = (typeof RUNTIME_WORK_ITEM_STATUSES)[number];

export const LIBRARIAN_INPUT_KINDS = ["chief_decision"] as const;
export type LibrarianInputKind = (typeof LIBRARIAN_INPUT_KINDS)[number];

export const RUNTIME_EXECUTION_JOB_STATUSES = ["pending", "running", "succeeded", "failed"] as const;
export type RuntimeExecutionJobStatus = (typeof RUNTIME_EXECUTION_JOB_STATUSES)[number];

export const RUNTIME_REQUESTED_BY = ["founder", "operator", "observer", "system"] as const;
export type RuntimeRequestedBy = (typeof RUNTIME_REQUESTED_BY)[number];

export interface ChiefDecisionPayload {
  title: string;
  decision: string;
  context?: string;
  consequences?: string;
  proposalId?: string;
}

export interface RuntimePassRecord {
  tier: 0 | 1 | 2 | 3;
  step: string;
  outcome: string;
  at: string;
}

export interface DbRuntimeWorkItemRow {
  id: string;
  agent_role: string;
  trigger_type: RuntimeTriggerType;
  input_kind: LibrarianInputKind;
  input_payload: ChiefDecisionPayload;
  status: RuntimeWorkItemStatus;
  idempotency_key: string | null;
  requested_by: RuntimeRequestedBy;
  chief_proposal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRuntimeExecutionJobRow {
  id: string;
  work_item_id: string;
  status: RuntimeExecutionJobStatus;
  passes: RuntimePassRecord[];
  runner: string;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface DbRuntimeArtifactRow {
  id: string;
  execution_job_id: string;
  artifact_kind: "obsidian_note" | "index_row";
  uri: string;
  content_hash: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbRuntimeSinkDeliveryRow {
  id: string;
  artifact_id: string;
  sink: "obsidian" | "supabase_notes";
  status: "delivered" | "failed" | "skipped";
  delivered_at: string;
  details: Record<string, unknown>;
}

export interface RuntimeWorkItemClient {
  id: string;
  agentRole: string;
  triggerType: RuntimeTriggerType;
  inputKind: LibrarianInputKind;
  inputPayload: ChiefDecisionPayload;
  status: RuntimeWorkItemStatus;
  idempotencyKey: string | null;
  requestedBy: RuntimeRequestedBy;
  chiefProposalId: string | null;
  createdAt: string;
  updatedAt: string;
  latestObsidianPath: string | null;
}

export const MAINTENANCE_AGENT_ROLE = "maintenance" as const;

export const MAINTENANCE_INPUT_KINDS = ["maintenance_task"] as const;
export type MaintenanceInputKind = (typeof MAINTENANCE_INPUT_KINDS)[number];

export interface MaintenanceTaskPayload {
  title: string;
  description: string;
  context?: string;
  notes?: string;
  workOrderId?: string;
}

export interface DbRuntimeMaintenanceWorkItemRow {
  id: string;
  agent_role: string;
  trigger_type: RuntimeTriggerType;
  input_kind: MaintenanceInputKind;
  input_payload: MaintenanceTaskPayload;
  status: RuntimeWorkItemStatus;
  idempotency_key: string | null;
  requested_by: RuntimeRequestedBy;
  chief_proposal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuntimeMaintenanceWorkItemClient {
  id: string;
  agentRole: string;
  triggerType: RuntimeTriggerType;
  inputKind: MaintenanceInputKind;
  inputPayload: MaintenanceTaskPayload;
  status: RuntimeWorkItemStatus;
  idempotencyKey: string | null;
  requestedBy: RuntimeRequestedBy;
  chiefProposalId: string | null;
  createdAt: string;
  updatedAt: string;
  latestObsidianPath: string | null;
}

export const PLANNER_AGENT_ROLE = "planner" as const;

export const PLANNER_INPUT_KINDS = ["planning_task"] as const;
export type PlannerInputKind = (typeof PLANNER_INPUT_KINDS)[number];

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
  trigger_type: RuntimeTriggerType;
  input_kind: PlannerInputKind;
  input_payload: PlannerTaskPayload;
  status: RuntimeWorkItemStatus;
  idempotency_key: string | null;
  requested_by: RuntimeRequestedBy;
  chief_proposal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuntimePlannerWorkItemClient {
  id: string;
  agentRole: string;
  triggerType: RuntimeTriggerType;
  inputKind: PlannerInputKind;
  inputPayload: PlannerTaskPayload;
  status: RuntimeWorkItemStatus;
  idempotencyKey: string | null;
  requestedBy: RuntimeRequestedBy;
  chiefProposalId: string | null;
  createdAt: string;
  updatedAt: string;
  latestObsidianPath: string | null;
}
