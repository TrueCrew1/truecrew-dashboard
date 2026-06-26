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

export async function advanceTaskStage(taskId: string, stage: string): Promise<void> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new Error(body.message ?? body.error ?? `Stage advance failed (${response.status})`);
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
