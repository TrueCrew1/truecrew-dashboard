import type { MockData } from "@/data/mockData";
import { mockData } from "@/data/mockData";
import type {
  AlertItem,
  CrewMember,
  Customer,
  DashboardAction,
  Deploy,
  DispatchSlot,
  FocusItem,
  Incident,
  InventoryItem,
  Invoice,
  Job,
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
  jobs?: Job[];
  crew?: CrewMember[];
  dispatch?: DispatchSlot[];
  invoices?: Invoice[];
  inventory?: InventoryItem[];
  dashboardActions?: DashboardAction[];
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

export function mergeWithMockFallback(live: Partial<CommandCenterPayload>): MockData {
  return {
    tasks: live.tasks?.length ? live.tasks : mockData.tasks,
    workflows: live.workflows?.length ? live.workflows : mockData.workflows,
    incidents: live.incidents?.length ? live.incidents : mockData.incidents,
    tools: live.tools?.length ? live.tools : mockData.tools,
    deploys: live.deploys?.length ? live.deploys : mockData.deploys,
    customers: live.customers?.length ? live.customers : mockData.customers,
    runbooks: live.runbooks?.length ? live.runbooks : mockData.runbooks,
    prompts: live.prompts?.length ? live.prompts : mockData.prompts,
    notes: live.notes?.length ? live.notes : mockData.notes,
    focusItems: live.focusItems?.length ? live.focusItems : mockData.focusItems,
    alerts: live.alerts?.length ? live.alerts : mockData.alerts,
    jobs: live.jobs?.length ? live.jobs : mockData.jobs,
    crew: live.crew?.length ? live.crew : mockData.crew,
    dispatch: live.dispatch?.length ? live.dispatch : mockData.dispatch,
    invoices: live.invoices?.length ? live.invoices : mockData.invoices,
    inventory: live.inventory?.length ? live.inventory : mockData.inventory,
    dashboardActions: live.dashboardActions?.length
      ? live.dashboardActions
      : mockData.dashboardActions,
  };
}
