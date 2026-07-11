import { useEffect, useState } from "react";
import { Task, GateCheck, WorkflowStage } from "@/types";

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

/** Stages a task can no longer meaningfully be "awaiting gates" in. */
const TERMINAL_STAGES: readonly WorkflowStage[] = [WorkflowStage.Done, WorkflowStage.Logged];

function toPendingGate(gate: GateCheck): PendingGate {
  return { key: gate.id, name: gate.label, description: gate.label };
}

/** A task's real, required-but-unpassed gates — driven by its own gate data, not a hardcoded list. */
function getPendingGates(task: Task): PendingGate[] {
  return task.gates.filter((gate) => gate.required && !gate.passed).map(toPendingGate);
}

function mapTaskToBuildGateTask(task: Task): BuildGateTask | null {
  const pendingGates = getPendingGates(task);
  if (pendingGates.length === 0) return null;

  const isOverdue = Boolean(task.dueAt && new Date(task.dueAt) < new Date());
  const tone = isOverdue ? "critical" : pendingGates.length > 2 ? "warn" : "neutral";

  return {
    id: task.id,
    title: task.title,
    detail: task.description || "Build task awaiting required gates",
    meta: task.priority,
    tone,
    routeTo: `/tasks/${task.id}`,
    routeLabel: "task",
    timestamp: task.updatedAt || task.createdAt,
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

        const response = await fetch("/api/data");
        if (!response.ok) {
          throw new Error(`Failed to fetch build tasks: ${response.statusText}`);
        }

        // Ensure the response is JSON before attempting to parse
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format: expected JSON");
        }

        const data = await response.json();
        const tasks: Task[] = data.tasks || [];

        const mappedTasks = tasks
          .filter((task) => task.workflowType === "build" && !TERMINAL_STAGES.includes(task.stage))
          .map(mapTaskToBuildGateTask)
          .filter((task): task is BuildGateTask => task !== null);

        if (mounted) {
          setBuildGateTasks(mappedTasks);
        }
      } catch (err) {
        if (mounted) {
          if (err instanceof SyntaxError) {
            setError("Failed to load build tasks: Invalid JSON response");
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Unknown error");
          }
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
