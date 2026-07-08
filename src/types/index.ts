export enum WorkflowStage {
  Inbox = "Inbox",
  Triage = "Triage",
  Planned = "Planned",
  InProgress = "In Progress",
  Waiting = "Waiting",
  Review = "Review",
  Done = "Done",
  Logged = "Logged",
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  WorkflowStage.Inbox,
  WorkflowStage.Triage,
  WorkflowStage.Planned,
  WorkflowStage.InProgress,
  WorkflowStage.Waiting,
  WorkflowStage.Review,
  WorkflowStage.Done,
  WorkflowStage.Logged,
];

export type WorkflowType =
  | "build"
  | "deploy"
  | "repair"
  | "ticket"
  | "onboarding"
  | "decision";

export type Persona = "founder" | "operator" | "observer";

export type IncidentSeverity = 1 | 2 | 3 | 4;

export type IncidentStatus =
  | "open"
  | "mitigating"
  | "mitigated"
  | "resolved"
  | "post_mortem_filed";

export type ServiceStatus =
  | "healthy"
  | "degraded"
  | "down"
  | "maintenance"
  | "unknown";

export type ServiceCategory =
  | "api"
  | "frontend"
  | "worker"
  | "database"
  | "integration"
  | "internal_tool";

export type DeployEnvironment = "production" | "staging" | "preview" | "local";

export type DeployMethod =
  | "github_actions"
  | "netlify"
  | "vercel"
  | "manual"
  | "other";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface EntityBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: Persona;
}

export interface GateCheck {
  id: string;
  label: string;
  required: boolean;
  passed: boolean;
}

export interface LinkedEntityRef {
  type:
    | "task"
    | "workflow"
    | "incident"
    | "tool"
    | "deploy"
    | "customer"
    | "runbook"
    | "prompt"
    | "note";
  id: string;
  label: string;
}

export interface Task extends EntityBase {
  title: string;
  description: string;
  stage: WorkflowStage;
  workflowType: WorkflowType;
  priority: TaskPriority;
  assignee?: Persona;
  dueAt?: string;
  blocker?: string;
  gates: GateCheck[];
  linkedEntities: LinkedEntityRef[];
  githubRef?: string;
  obsidianNoteId?: string;
}

export interface Workflow extends EntityBase {
  title: string;
  type: WorkflowType;
  stage: WorkflowStage;
  owner: Persona;
  summary: string;
  gates: GateCheck[];
  linkedTaskIds: string[];
  linkedEntityIds: LinkedEntityRef[];
}

export interface Incident extends EntityBase {
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  serviceId: string;
  serviceName: string;
  summary: string;
  openedAt: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  linkedRepairId?: string;
  runbookId?: string;
}

export interface Tool extends EntityBase {
  name: string;
  slug: string;
  category: ServiceCategory;
  status: ServiceStatus;
  environment: DeployEnvironment;
  owner: Persona;
  url?: string;
  healthCheckUrl?: string;
  githubRepo?: string;
  deployMethod: DeployMethod;
  currentVersion?: string;
  lastDeployedAt?: string;
  lastDeployId?: string;
  runbookId?: string;
  openIncidentIds: string[];
  tags: string[];
}

export interface Deploy extends EntityBase {
  title: string;
  stage: WorkflowStage;
  buildId: string;
  buildTitle: string;
  serviceId: string;
  serviceName: string;
  environment: DeployEnvironment;
  version: string;
  githubRef: string;
  rollbackPlan: string;
  deployedAt?: string;
  healthCheckPassed?: boolean;
}

export interface Customer extends EntityBase {
  name: string;
  slug: string;
  tier: "starter" | "growth" | "enterprise";
  stage: WorkflowStage;
  primaryContact: string;
  email: string;
  healthScore: number;
  status: "prospect" | "onboarding" | "active" | "churned";
  linkedTicketIds: string[];
  onboardingChecklist: GateCheck[];
}

export interface Runbook extends EntityBase {
  title: string;
  serviceId: string;
  serviceName: string;
  obsidianPath: string;
  summary: string;
  lastReviewedAt?: string;
  tags: string[];
}

export interface Prompt extends EntityBase {
  title: string;
  category: string;
  version: string;
  content: string;
  tags: string[];
  linkedWorkflowTypes: WorkflowType[];
}

export interface Note extends EntityBase {
  title: string;
  type: "build" | "deploy" | "incident" | "ticket" | "decision" | "onboarding";
  obsidianPath: string;
  summary: string;
  sourceTaskId?: string;
  syncedAt: string;
  tags?: string[];
  refinementSource?: "deterministic" | "ai";
  agent?: "librarian";
  /** Canonical artifact fields when agent === "librarian". */
  workItemId?: string;
  artifactType?: "obsidian_note";
  targetPath?: string;
}

export type ArtifactType = "obsidian_note";

/** Indexed Obsidian artifact created by the Librarian agent. */
export interface Artifact {
  id: string;
  workItemId: string;
  artifactType: ArtifactType;
  title: string;
  targetPath: string;
  tags: string[];
  createdAt: string;
  summary?: string;
  refinementSource?: "deterministic" | "ai";
  syncedAt?: string;
  updatedAt?: string;
  createdBy?: Persona;
}

export type LibrarianWorkItemType = "obsidian_filing";

export type WorkItemStatus = "pending" | "active" | "filed" | "blocked";

/** Librarian/Obsidian filing work item derived from a task. */
export interface WorkItem {
  id: string;
  type: LibrarianWorkItemType;
  source: string;
  status: WorkItemStatus;
}

export interface AlertItem {
  id: string;
  type: "gate_block" | "incident" | "inbox" | "deploy" | "waiting";
  severity: IncidentSeverity | "info";
  title: string;
  message: string;
  timestamp: string;
  entityRef?: LinkedEntityRef;
}

export interface FocusItem {
  id: string;
  taskId: string;
  title: string;
  stage: WorkflowStage;
  workflowType: WorkflowType;
  reason: string;
  dueAt?: string;
}
