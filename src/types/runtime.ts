export type RuntimeTriggerType = "manual" | "reactive" | "scheduled";

export type RuntimeWorkItemStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type LibrarianInputKind = "chief_decision";

export type RuntimeRequestedBy = "founder" | "operator" | "observer" | "system";

export interface ChiefDecisionPayload {
  title: string;
  decision: string;
  context?: string;
  consequences?: string;
  proposalId?: string;
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

export type MaintenanceInputKind = "maintenance_task";

export interface MaintenanceTaskPayload {
  title: string;
  description: string;
  context?: string;
  notes?: string;
  workOrderId?: string;
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

export type PlannerInputKind = "planning_task";

export interface PlannerTaskPayload {
  title: string;
  description: string;
  context?: string;
  notes?: string;
  proposalId?: string;
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
