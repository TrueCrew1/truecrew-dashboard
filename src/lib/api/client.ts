import type { MockData } from "@/data/mockData";
import { mockData } from "@/data/mockData";
import type {
  AlertItem,
  Customer,
  Deploy,
  FocusItem,
  Incident,
  Note,
  Prompt,
  Runbook,
  Task,
  Tool,
  Workflow,
  WorkflowStage,
} from "@/types";

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
  const response = await fetch("/api/data");
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
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
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

export async function fetchHealth(): Promise<{
  ok: boolean;
  supabase: boolean;
  githubWebhook: boolean;
  host: string;
}> {
  const response = await fetch("/api/health");
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

const OBSIDIAN_FETCH_TIMEOUT_MS = 10_000;

export async function fetchObsidianNotes(): Promise<ObsidianNotesResult> {
  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OBSIDIAN_FETCH_TIMEOUT_MS);

  try {
    response = await fetch("/api/obsidian/notes", { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ObsidianVaultError();
    }
    throw new ObsidianVaultError();
  } finally {
    clearTimeout(timeoutId);
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
