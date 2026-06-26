import type { Task } from "@/types";

export function isLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === "true";
}

export async function fetchTasksFromApi(): Promise<Task[]> {
  const response = await fetch("/api/tasks");
  if (!response.ok) {
    throw new Error(`Tasks API returned ${response.status}`);
  }
  const payload = (await response.json()) as { tasks: Task[] };
  return payload.tasks ?? [];
}

export async function fetchHealth(): Promise<{
  ok: boolean;
  supabase: boolean;
  githubWebhook: boolean;
}> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error(`Health API returned ${response.status}`);
  }
  return response.json();
}
