import { useCallback, useEffect, useState } from "react";
import { useData } from "@/context/DataContext";
import { WorkflowStage } from "@/types";

export type WorkOrderStatus =
  | "Open"
  | "In Progress"
  | "Complete"
  | "Closed"
  | "Cancelled";

const TERMINAL_STATUSES: WorkOrderStatus[] = ["Closed", "Cancelled"];

export function workflowStageToWorkOrderStatus(stage: WorkflowStage): WorkOrderStatus {
  switch (stage) {
    case WorkflowStage.InProgress:
    case WorkflowStage.Waiting:
    case WorkflowStage.Review:
      return "In Progress";
    case WorkflowStage.Done:
      return "Complete";
    case WorkflowStage.Logged:
      return "Closed";
    default:
      return "Open";
  }
}

export function getNextWorkOrderStatus(
  status: WorkOrderStatus,
): WorkOrderStatus | null {
  if (status === "Open") return "In Progress";
  if (status === "In Progress") return "Complete";
  return null;
}

export function workOrderStatusToWorkflowStage(status: WorkOrderStatus): WorkflowStage {
  switch (status) {
    case "In Progress":
      return WorkflowStage.InProgress;
    case "Complete":
      return WorkflowStage.Done;
    case "Closed":
      return WorkflowStage.Logged;
    default:
      return WorkflowStage.Planned;
  }
}

export function getAdvanceButtonLabel(status: WorkOrderStatus): string | null {
  if (status === "Open") return "Start";
  if (status === "In Progress") return "Complete";
  return null;
}

export function isTerminalWorkOrderStatus(status: WorkOrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

interface UseWorkOrderStatusOptions {
  taskId: string;
  stage: WorkflowStage;
}

interface UseWorkOrderStatusResult {
  status: WorkOrderStatus;
  displayStage: WorkflowStage;
  advanceLabel: string | null;
  canAdvance: boolean;
  error: string | null;
  errorFlash: boolean;
  advance: () => void;
}

export function useWorkOrderStatus({
  taskId,
  stage,
}: UseWorkOrderStatusOptions): UseWorkOrderStatusResult {
  const { updateTaskStage } = useData();
  const serverStatus = workflowStageToWorkOrderStatus(stage);
  const [optimisticStatus, setOptimisticStatus] = useState<WorkOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorFlash, setErrorFlash] = useState(false);

  const status = optimisticStatus ?? serverStatus;
  const advanceLabel = getAdvanceButtonLabel(status);
  const canAdvance = advanceLabel !== null;

  useEffect(() => {
    if (optimisticStatus === null) return;
    if (serverStatus === optimisticStatus) {
      setOptimisticStatus(null);
    }
  }, [optimisticStatus, serverStatus]);

  const advance = useCallback(() => {
    const nextStatus = getNextWorkOrderStatus(status);
    if (!nextStatus) return;

    const nextStage = workOrderStatusToWorkflowStage(nextStatus);
    setOptimisticStatus(nextStatus);
    setError(null);
    setErrorFlash(false);

    void updateTaskStage(taskId, nextStage).catch((err) => {
      setOptimisticStatus(null);
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
      setErrorFlash(true);
      window.setTimeout(() => setErrorFlash(false), 1200);
    });
  }, [status, taskId, updateTaskStage]);

  const displayStage =
    optimisticStatus !== null
      ? workOrderStatusToWorkflowStage(optimisticStatus)
      : stage;

  return {
    status,
    displayStage,
    advanceLabel,
    canAdvance,
    error,
    errorFlash,
    advance,
  };
}
