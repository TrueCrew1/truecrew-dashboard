import { useEffect, useState } from "react";
import type { DbTaskRow } from "../../lib/supabase/admin";

export interface PendingGate {
  key: string;
  name: string;
  description: string;
}

export interface BuildGateTask {
  id: string;
  title: string;
  detail: string;
  meta?: string;
  tone: "neutral" | "warn" | "critical";
  routeTo: string;
  routeLabel: string;
  timestamp?: string;
  pendingGates: PendingGate[];
}

const REQUIRED_BUILD_GATES: Record<string, PendingGate> = {
  lint: { key: "lint", name: "Lint", description: "Code style and syntax checks" },
  typecheck: { key: "typecheck", name: "TypeCheck", description: "TypeScript compilation" },
  test: { key: "test", name: "Tests", description: "Unit and integration tests" },
  build: { key: "build", name: "Build", description: "Production build compilation" },
};

function getPendingGates(task: DbTaskRow): PendingGate[] {
  const pending: PendingGate[] = [];
  
  if (task.workflow_type !== "build") return pending;
  
  const completedGates = new Set(
    (task.gate_status as Record<string, boolean>) || {}
  );
  
  for (const gate of Object.values(REQUIRED_BUILD_GATES)) {
    if (!completedGates.has(gate.key)) {
      pending.push(gate);
    }
  }
  
  return pending;
}

function mapTaskToBuildGateTask(task: DbTaskRow): BuildGateTask | null {
  const pendingGates = getPendingGates(task);
  if (pendingGates.length === 0) return null;

  const isOverdue = task.due_at && new Date(task.due_at) < new Date();
  const tone = isOverdue ? "critical" : pendingGates.length > 2 ? "warn" : "neutral";

  return {
    id: task.id,
    title: task.title,
    detail: task.description || "Build task awaiting required gates",
    meta: task.priority,
    tone,
    routeTo: `/tasks/${task.id}`,
    routeLabel: "task",
    timestamp: task.updated_at || task.created_at,
    pendingGates,
  };
}

export function useBuildTasks(): {
  buildGateTasks: BuildGateTask[];
  isLoading: boolean;
  error: string | null;
} {
  const [buildGateTasks, setBuildGateTasks] = useState<BuildGateTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchBuildTasks() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch("/api/tasks?workflowType=build&stage=in_progress");
        if (!response.ok) {
          throw new Error(`Failed to fetch build tasks: ${response.statusText}`);
        }
        
        const data = await response.json();
        const tasks: DbTaskRow[] = data.tasks || [];
        
        const mappedTasks = tasks
          .map(mapTaskToBuildGateTask)
          .filter((task): task is BuildGateTask => task !== null);
        
        if (mounted) {
          setBuildGateTasks(mappedTasks);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchBuildTasks();

    return () => {
      mounted = false;
    };
  }, []);

  return { buildGateTasks, isLoading, error };
}
