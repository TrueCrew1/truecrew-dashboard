import type { MockData } from "@/data/mockData";
import { mockData } from "@/data/mockData";
import type {
  AlertItem,
  Artifact,
  Customer,
  Deploy,
  FocusItem,
  Incident,
  Note,
  Persona,
  Prompt,
  Runbook,
  Task,
  Tool,
  Workflow,
  WorkflowStage,
  WorkItem,
} from "@/types";

let warnedMissingInternalKey = false;

/**
 * Every /api route except the GitHub webhook is gated by requireInternalAuth
 * (lib/auth.ts), which fails closed on a missing/mismatched x-internal-key.
 * Without this header attached here, every browser request 401s in live mode
 * regardless of how correctly the server side is configured.
 */
function internalAuthHeaders(): HeadersInit {
  const key = import.meta.env.VITE_INTERNAL_KEY;
  if (!key) {
    if (isLiveApiEnabled() && !warnedMissingInternalKey) {
      warnedMissingInternalKey = true;
      console.error(
        "[api/client] VITE_USE_LIVE_API is true but VITE_INTERNAL_KEY is not set — " +
          "every internal-auth API call will fail closed with 401. Set VITE_INTERNAL_KEY " +
          "to match the server's INTERNAL_API_SECRET (see .env.example).",
      );
    }
    return {};
  }
  return { "x-internal-key": key };
}

function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: { ...internalAuthHeaders(), ...init.headers },
  });
}

export function isLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === "true";
}

export interface CommandCenterPayload {
  tasks: Task[];
  workflows: Workflow[];
  incidents: Incident[];
  tools: Tool[];
  deploys: Deploy[];
  customers: Customer[];
  runbooks: Runbook[];
  prompts: Prompt[];
  notes: Note[];
  focusItems: FocusItem[];
  alerts: AlertItem[];
  source?: string;
}

export async function fetchCommandCenterData(): Promise<CommandCenterPayload> {
  const response = await apiFetch("/api/data");
  if (!response.ok) {
    throw new Error(`Data API returned ${response.status}`);
  }
  return response.json() as Promise<CommandCenterPayload>;
}

export async function fetchTasksFromApi(): Promise<Task[]> {
  const data = await fetchCommandCenterData();
  return data.tasks;
}

export async function patchTaskStage(
  taskId: string,
  stage: WorkflowStage,
): Promise<Task> {
  const response = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Task update returned ${response.status}`);
  }

  const payload = (await response.json()) as { task: Task };
  return payload.task;
}

export interface ChiefApprovalDecisionPayload {
  proposalId: string;
  status: "approved" | "rejected" | "sent_back";
  decidedAt: string;
  actor: "founder" | "operator" | "observer" | null;
}

export interface ChiefApprovalActivityPayload {
  title: string;
  summary: string;
  source?: string;
  category?: string;
  missionKind?: string;
}

export interface ChiefApprovalActivityRecordPayload {
  proposalId: string;
  title: string;
  summary: string;
  decision: "approved" | "rejected" | "sent_back";
  decidedAt: string;
  actor: "founder" | "operator" | "observer" | null;
  source: string | null;
  category: string | null;
  missionKind: string | null;
  recordedAt: string;
}

export interface RecordChiefApprovalDecisionResult {
  decision: ChiefApprovalDecisionPayload;
  activity?: {
    recorded: boolean;
    vaultPath?: string;
    obsidianDecisionPath?: string;
    error?: string;
  };
}

export class ChiefApprovalConflictError extends Error {
  decision: ChiefApprovalDecisionPayload;

  constructor(decision: ChiefApprovalDecisionPayload) {
    super("Already decided");
    this.name = "ChiefApprovalConflictError";
    this.decision = decision;
  }
}

export async function fetchChiefApprovalDecisions(): Promise<ChiefApprovalDecisionPayload[]> {
  const response = await apiFetch("/api/chief/approvals");
  if (!response.ok) {
    throw new Error(`Approval decisions API returned ${response.status}`);
  }
  const body = (await response.json()) as { decisions?: ChiefApprovalDecisionPayload[] };
  return body.decisions ?? [];
}

export async function recordChiefApprovalDecision(
  proposalId: string,
  status: "approved" | "rejected" | "sent_back",
  actor?: "founder" | "operator" | "observer" | null,
  activity?: ChiefApprovalActivityPayload,
): Promise<RecordChiefApprovalDecisionResult> {
  const response = await apiFetch("/api/chief/approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proposalId,
      status,
      actor: actor ?? null,
      activity: activity ?? undefined,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    decision?: ChiefApprovalDecisionPayload;
    activity?: RecordChiefApprovalDecisionResult["activity"];
  };

  if (response.status === 409 && body.decision) {
    throw new ChiefApprovalConflictError(body.decision);
  }

  if (!response.ok) {
    throw new Error(body.error ?? `Approval decision API returned ${response.status}`);
  }

  if (!body.decision) {
    throw new Error("Approval decision API returned no decision");
  }

  return {
    decision: body.decision,
    activity: body.activity,
  };
}

export async function fetchApprovalActivity(): Promise<{
  activity: ChiefApprovalActivityRecordPayload[];
  vaultConfigured: boolean;
}> {
  const response = await apiFetch("/api/chief/approval-activity");
  if (!response.ok) {
    throw new Error(`Approval activity API returned ${response.status}`);
  }

  const body = (await response.json()) as {
    activity?: ChiefApprovalActivityRecordPayload[];
    vaultConfigured?: boolean;
  };

  return {
    activity: body.activity ?? [],
    vaultConfigured: body.vaultConfigured ?? false,
  };
}

export async function fetchHealth(): Promise<{
  ok: boolean;
  supabase: boolean;
  githubWebhook: boolean;
  host: string;
}> {
  const response = await apiFetch("/api/health");
  if (!response.ok) {
    throw new Error(`Health API returned ${response.status}`);
  }
  return response.json();
}

export interface ObsidianNote {
  title: string;
  /**
   * "maintenance" is a vault-only type the DB's Note["type"] union doesn't
   * carry (see #97/#98) — the vault reader (lib/obsidian/read.ts) can
   * legitimately return it for vault-only Maintenance notes.
   */
  type: Note["type"] | "maintenance";
  obsidianPath: string;
  summary?: string;
  syncedAt?: string;
}

export interface ObsidianNotesResult {
  notes: ObsidianNote[];
  configured: boolean;
}

interface ObsidianNotesPayload {
  notes?: ObsidianNote[];
  configured?: boolean;
  error?: string;
}

export class ObsidianVaultError extends Error {
  constructor(message = "Vault unreachable") {
    super(message);
    this.name = "ObsidianVaultError";
  }
}

function isObsidianUnconfigured(status: number, body: ObsidianNotesPayload | null): boolean {
  if (status === 404) return true;
  if (body?.configured === false) return true;
  if (status === 503 && body?.error?.toLowerCase().includes("not configured")) return true;
  return false;
}

export async function fetchObsidianNotes(): Promise<ObsidianNotesResult> {
  let response: Response;

  try {
    response = await apiFetch("/api/obsidian/notes");
  } catch {
    throw new ObsidianVaultError();
  }

  const body = (await response.json().catch(() => null)) as ObsidianNotesPayload | null;

  if (isObsidianUnconfigured(response.status, body)) {
    return { notes: [], configured: false };
  }

  if (!response.ok) {
    throw new ObsidianVaultError(body?.error ?? "Vault unreachable");
  }

  return {
    notes: body?.notes ?? [],
    configured: body?.configured ?? true,
  };
}

export interface CreateArtifactResult {
  ok: boolean;
  workItem: WorkItem;
  artifact: Artifact;
  vaultWritten: boolean;
}

export class ArtifactExistsError extends Error {
  constructor(message = "Artifact already exists for this task") {
    super(message);
    this.name = "ArtifactExistsError";
  }
}

export async function createTaskArtifact(
  taskId: string,
  options: { useAi?: boolean; actor?: Persona } = {},
): Promise<CreateArtifactResult> {
  const response = await apiFetch("/api/librarian/artifacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId,
      useAi: options.useAi === true,
      actor: options.actor,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    workItem?: WorkItem;
    artifact?: Artifact;
    vaultWritten?: boolean;
  };

  if (response.status === 409) {
    throw new ArtifactExistsError(body.error);
  }

  if (!response.ok || !body.artifact || !body.workItem) {
    throw new Error(body.error ?? `Create artifact returned ${response.status}`);
  }

  return {
    ok: true,
    workItem: body.workItem,
    artifact: body.artifact,
    vaultWritten: body.vaultWritten === true,
  };
}

export interface CreateMaintenanceNoteResult {
  ok: boolean;
  workItem: WorkItem;
  note: Artifact;
  vaultWritten: boolean;
}

export async function createMaintenanceNote(
  taskId: string,
  options: { actor?: Persona } = {},
): Promise<CreateMaintenanceNoteResult> {
  const response = await apiFetch("/api/maintenance/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId,
      actor: options.actor,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    workItem?: WorkItem;
    note?: Artifact;
    vaultWritten?: boolean;
  };

  if (!response.ok || !body.note || !body.workItem) {
    throw new Error(body.error ?? `Create maintenance note returned ${response.status}`);
  }

  return {
    ok: true,
    workItem: body.workItem,
    note: body.note,
    vaultWritten: body.vaultWritten === true,
  };
}

export async function fetchTaskArtifacts(taskId: string): Promise<Artifact[]> {
  const response = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/artifacts`);
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    artifacts?: Artifact[];
  };

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(body.error ?? `Task artifacts API returned ${response.status}`);
  }

  return body.artifacts ?? [];
}

export function mergeWithMockFallback(live: Partial<CommandCenterPayload>): MockData {
  return {
    tasks: (live.tasks as Task[])?.length ? (live.tasks as Task[]) : mockData.tasks,
    workflows: (live.workflows as Workflow[])?.length
      ? (live.workflows as Workflow[])
      : mockData.workflows,
    incidents: (live.incidents as Incident[])?.length
      ? (live.incidents as Incident[])
      : mockData.incidents,
    tools: (live.tools as Tool[])?.length ? (live.tools as Tool[]) : mockData.tools,
    deploys: (live.deploys as Deploy[])?.length ? (live.deploys as Deploy[]) : mockData.deploys,
    customers: (live.customers as Customer[])?.length
      ? (live.customers as Customer[])
      : mockData.customers,
    runbooks: (live.runbooks as Runbook[])?.length
      ? (live.runbooks as Runbook[])
      : mockData.runbooks,
    prompts: (live.prompts as Prompt[])?.length ? (live.prompts as Prompt[]) : mockData.prompts,
    notes: (live.notes as Note[])?.length ? (live.notes as Note[]) : mockData.notes,
    focusItems: (live.focusItems as FocusItem[])?.length
      ? (live.focusItems as FocusItem[])
      : mockData.focusItems,
    alerts: (live.alerts as AlertItem[])?.length
      ? (live.alerts as AlertItem[])
      : mockData.alerts,
  };
}

export type DataSourceKind = "mock" | "supabase" | "mock-fallback";

export function formatDataSourceLabel(source: DataSourceKind): string {
  switch (source) {
    case "supabase":
      return "live (Supabase)";
    case "mock-fallback":
      return "mock fallback";
    default:
      return "mock";
  }
}
