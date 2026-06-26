import { useCallback, useEffect, useMemo, useState } from "react";
import { mockTasks } from "@/data/mockData";
import { WorkflowStage } from "@/types";
import { isLiveApiEnabled } from "@/lib/api/client";
import { fetchTodayTasks, createTodayTask as createSupabaseTask } from "@/lib/today/queries";
import { isSupabaseClientConfigured } from "@/lib/supabase/client";
import type { CreateTaskInput, TodayFilters, TodayTask } from "@/lib/today/types";

function mockToTodayTasks(): TodayTask[] {
  return mockTasks
    .filter(
      (t) =>
        t.stage !== WorkflowStage.Done && t.stage !== WorkflowStage.Logged,
    )
    .map((t, i) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      stage: t.stage,
      workflowType: t.workflowType,
      priority: t.priority,
      assignee: t.assignee,
      dueAt: t.dueAt,
      blocker: t.blocker,
      site: (i % 3 === 0 ? "staging" : "production") as TodayTask["site"],
      crew: (t.assignee === "operator"
        ? "support"
        : t.assignee === "founder"
          ? "founder"
          : "platform") as TodayTask["crew"],
      slaTier: (
        t.priority === "critical"
          ? "p0"
          : t.priority === "high"
            ? "p1"
            : t.priority === "medium"
              ? "p2"
              : "p3"
      ) as TodayTask["slaTier"],
      slaDueAt:
        t.id === "task-002"
          ? new Date(Date.now() - 2 * 86400000).toISOString()
          : t.dueAt ??
            new Date(
              Date.now() +
                (t.priority === "critical"
                  ? 4
                  : t.priority === "high"
                    ? 24
                    : 72) *
                  3600000,
            ).toISOString(),
      isMit: t.id === "task-004",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
}

async function fetchViaApi(): Promise<TodayTask[]> {
  const response = await fetch("/api/tasks");
  if (!response.ok) throw new Error(`Tasks API returned ${response.status}`);
  const payload = (await response.json()) as { tasks: Record<string, unknown>[] };

  return payload.tasks
    .filter(
      (t) =>
        t.stage !== WorkflowStage.Done && t.stage !== WorkflowStage.Logged,
    )
    .map((t) => ({
      id: String(t.id),
      title: String(t.title),
      description: String(t.description ?? ""),
      stage: t.stage as TodayTask["stage"],
      workflowType: t.workflowType as TodayTask["workflowType"],
      priority: t.priority as TodayTask["priority"],
      assignee: t.assignee as TodayTask["assignee"],
      dueAt: t.dueAt ? String(t.dueAt) : undefined,
      blocker: t.blocker ? String(t.blocker) : undefined,
      site: (t.site as TodayTask["site"]) ?? "production",
      crew: (t.crew as TodayTask["crew"]) ?? "platform",
      slaTier: (t.slaTier as TodayTask["slaTier"]) ?? "p2",
      slaDueAt: t.slaDueAt ? String(t.slaDueAt) : undefined,
      isMit: Boolean(t.isMit),
      createdAt: String(t.createdAt),
      updatedAt: String(t.updatedAt),
    }));
}

export function useTodayTasks() {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"supabase" | "api" | "mock">("mock");
  const [filters, setFilters] = useState<TodayFilters>({
    site: "all",
    crew: "all",
    slaTier: "all",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSupabaseClientConfigured()) {
        const data = await fetchTodayTasks();
        setTasks(data);
        setSource("supabase");
      } else if (isLiveApiEnabled()) {
        const data = await fetchViaApi();
        setTasks(data.length > 0 ? data : mockToTodayTasks());
        setSource(data.length > 0 ? "api" : "mock");
      } else {
        setTasks(mockToTodayTasks());
        setSource("mock");
      }
    } catch (err) {
      setTasks(mockToTodayTasks());
      setSource("mock");
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      if (isSupabaseClientConfigured()) {
        const created = await createSupabaseTask(input);
        setTasks((prev) => [created, ...prev]);
        return created;
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Create task failed: ${response.status}`);
      }

      const { task } = (await response.json()) as { task: TodayTask };
      setTasks((prev) => [task, ...prev]);
      return task;
    },
    [],
  );

  return useMemo(
    () => ({
      tasks,
      loading,
      error,
      source,
      filters,
      setFilters,
      refresh: load,
      createTask,
    }),
    [tasks, loading, error, source, filters, load, createTask],
  );
}
