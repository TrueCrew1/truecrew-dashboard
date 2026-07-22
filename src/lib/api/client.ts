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

/**
 * Attaches the x-internal-key header (client copy of INTERNAL_API_SECRET,
 * see .env.example) required by every requireInternalAuth-gated /api route.
 * Pulled out as a pure function (no import.meta dependency) so it's testable
 * under plain node:test — see client.test.ts.
 */
export function withInternalAuthHeader(
  headers: HeadersInit | undefined,
  internalKey: string | undefined,
): Headers {
  const merged = new Headers(headers);
  if (internalKey?.trim()) {
    merged.set("x-internal-key", internalKey.trim());
  }
  return merged;
}

// Was previously never attached here, so requireInternalAuth-gated routes
// 401'd from the browser regardless of the server-side secret's value.
function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const internalKey = import.meta.env.VITE_INTERNAL_KEY as string | undefined;
  const headers = withInternalAuthHeader(init.headers, internalKey);
  return fetch(input, { ...init, headers });
}

/**
 * The single live-vs-mock gate for Command Center's data path.
 *
 * OFF (default, `VITE_USE_LIVE_API` unset or not `"true"`): every read below
 * returns `src/data/mockData.ts` verbatim, `source: "mock"`, no network call
 * — matches this repo's `npm run dev` default.
 * ON: reads hit the real Supabase-backed routes (`GET /api/data`,
 * `GET /api/tasks`), gated server-side by `requireInternalAuth` +
 * `isSupabaseConfigured()`. `source` becomes `"supabase"`, or
 * `"mock-fallback"` if the live response came back with zero tasks (see
 * `mergeWithMockFallback` below) — never a silent empty state.
 *
 * This flag is checked once, inside `fetchCommandCenterData`/
 * `fetchTasksFromApi` themselves — callers never need to branch on it
 * before calling. `DataContext` still pre-checks it too, only to skip
 * `setLoading(true)` on the synchronous mock path (a UX nicety, not a
 * second source of truth) — see the comment there.
 */
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

interface CommandCenterApiErrorPayload {
  error?: string;
  code?: string;
  message?: string;
  hint?: string;
}

/**
 * Typed, stable error shape for `GET /api/data` / `GET /api/tasks` failures
 * — carries the backend's structured `code`/`hint` (see those routes) so a
 * future UI can branch on `.code` instead of parsing `.message` text.
 * Never leaks a raw Supabase error to the caller.
 */
export class CommandCenterApiError extends Error {
  status: number;
  code?: string;
  hint?: string;

  constructor(status: number, payload: CommandCenterApiErrorPayload | null) {
    super(payload?.message ?? payload?.error ?? `Data API returned ${status}`);
    this.name = "CommandCenterApiError";
    this.status = status;
    this.code = payload?.code;
    this.hint = payload?.hint;
  }
}

export async function fetchCommandCenterData(): Promise<CommandCenterPayload> {
  if (!isLiveApiEnabled()) {
    console.log("[data-rail] mock_path_used", { route: "/api/data" });
    return { ...mockData, source: "mock" };
  }

  const response = await apiFetch("/api/data");

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as CommandCenterApiErrorPayload | null;
    console.error("[data-rail] live_path_error", {
      route: "/api/data",
      status: response.status,
      code: payload?.code,
    });
    throw new CommandCenterApiError(response.status, payload);
  }

  console.log("[data-rail] live_path_used", { route: "/api/data" });
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
): Promise<ChiefApprovalDecisionPayload> {
  const response = await apiFetch("/api/chief/approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposalId, status, actor: actor ?? null }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    decision?: ChiefApprovalDecisionPayload;
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

  return body.decision;
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
  type: Note["type"];
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

export interface ChiefAiFallbackResult {
  summary: string;
  model: string;
  source?: "azure" | "ollama";
  category?: "general" | "code" | "reasoning";
}

export function isChiefAiFallbackEnabled(): boolean {
  return import.meta.env.VITE_CHIEF_AI_FALLBACK_ENABLED === "true";
}

export function isChiefLocalOnlyModeDefault(): boolean {
  return import.meta.env.VITE_CHIEF_LOCAL_ONLY_MODE === "true";
}

/**
 * Asks the model router (Azure, then Ollama, per lib/chief/modelRouter.ts's
 * rules) for a response when resolveChiefCommand couldn't match a
 * specialist. Returns null (rather than throwing) on any failure or when no
 * fallback tier is enabled, so callers can silently keep the deterministic
 * response.
 */
export async function askChiefAiFallback(
  query: string,
  contextSummary?: string,
  localOnly?: boolean,
): Promise<ChiefAiFallbackResult | null> {
  try {
    const response = await apiFetch("/api/chief/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, contextSummary, localOnly: localOnly === true }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      summary?: string;
      model?: string;
      source?: "azure" | "ollama";
      category?: "general" | "code" | "reasoning";
    };
    if (!body.summary) return null;

    return {
      summary: body.summary,
      model: body.model ?? "unknown",
      source: body.source,
      category: body.category,
    };
  } catch {
    return null;
  }
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

export interface UnifiedSearchApiResponse {
  query: string;
  intent: import("@/lib/search/types").CommandIntent;
  groups: import("@/lib/search/types").SearchResultGroup[];
  suggestedActions: import("@/lib/search/types").SuggestedAction[];
  totalResults: number;
  tookMs: number;
  actionResult?: import("@/lib/search/types").ActionDispatchResult;
}

export async function fetchUnifiedSearch(query: string): Promise<UnifiedSearchApiResponse | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const response = await apiFetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
    if (!response.ok) return null;
    return (await response.json()) as UnifiedSearchApiResponse;
  } catch {
    return null;
  }
}

export async function dispatchUnifiedSearchAction(
  query: string,
): Promise<UnifiedSearchApiResponse | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const response = await apiFetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
    });
    if (!response.ok) return null;
    return (await response.json()) as UnifiedSearchApiResponse;
  } catch {
    return null;
  }
}
