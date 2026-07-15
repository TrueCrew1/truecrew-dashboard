import type { MockData } from "@/data/mockData";
import { type Task, type WorkflowStage } from "@/types";
import {
  deriveShiftStats,
  isActiveIncidentStatus,
  OPEN_TASK_STAGES,
} from "../../../lib/queries/dashboard-stats";
import {
  formatOpenGateSummary,
  getBlockingGates,
} from "../../../lib/stage-change";
import { resolveCustomerForTask } from "../../../lib/task-context";

const OPEN_STAGE_SET = new Set<string>(OPEN_TASK_STAGES);

const CUSTOMER_FACING_TYPES = new Set(["onboarding", "ticket"]);
const WORKFLOW_LINKED_TYPES = new Set(["build", "deploy", "repair", "ticket"]);

function isOpenStage(stage: WorkflowStage | string): boolean {
  return OPEN_STAGE_SET.has(stage);
}

export interface ChiefLiveContext {
  stats: ReturnType<typeof deriveShiftStats>;
  focusItems: MockData["focusItems"];
  alerts: MockData["alerts"];
  openTaskCount: number;
  blockingTasks: Task[];
  overdueTasks: Task[];
  tasksMissingCustomer: Task[];
  tasksMissingWorkflow: Task[];
  activeIncidents: MockData["incidents"];
  blockedDeploys: MockData["deploys"];
  waitingCustomers: MockData["customers"];
}

export function buildChiefLiveContext(data: MockData): ChiefLiveContext {
  const workflowLinkedTaskIds = new Set(
    data.workflows.flatMap((workflow) => workflow.linkedTaskIds),
  );

  const openTasks = data.tasks.filter((task) => isOpenStage(task.stage));

  const blockingTasks = data.tasks.filter((task) => {
    if (!isOpenStage(task.stage)) return false;
    return getBlockingGates(task.gates).length > 0 || Boolean(task.blocker);
  });

  const tasksMissingCustomer = openTasks.filter((task) => {
    if (!CUSTOMER_FACING_TYPES.has(task.workflowType)) return false;
    const customer = resolveCustomerForTask(task, data.customers, {
      allowTitleMatch: false,
    });
    return customer.source === "none";
  });

  const tasksMissingWorkflow = openTasks.filter(
    (task) =>
      WORKFLOW_LINKED_TYPES.has(task.workflowType) &&
      !workflowLinkedTaskIds.has(task.id),
  );

  const now = Date.now();
  const overdueTasks = openTasks.filter((task) => {
    if (!task.dueAt) return false;
    return new Date(task.dueAt).getTime() < now;
  });

  return {
    stats: deriveShiftStats({
      tasks: data.tasks,
      incidents: data.incidents,
    }),
    focusItems: data.focusItems,
    alerts: data.alerts,
    openTaskCount: openTasks.length,
    blockingTasks,
    overdueTasks,
    tasksMissingCustomer,
    tasksMissingWorkflow,
    activeIncidents: data.incidents.filter(
      (incident) => incident.severity <= 2 && isActiveIncidentStatus(incident.status),
    ),
    blockedDeploys: data.deploys.filter((deploy) => deploy.stage === "Planned"),
    waitingCustomers: data.customers.filter(
      (customer) => customer.stage === "Waiting",
    ),
  };
}

/**
 * Shared by chiefApprovalBoard.ts (gate-override proposals) and
 * chiefCommandRouter.ts (resolveBlocked) — kept here so neither of those
 * two files needs to import from the other.
 */
export function formatGateBlockers(task: Task): string[] {
  const lines: string[] = [];
  const blockingGates = getBlockingGates(task.gates);
  if (blockingGates.length > 0) {
    lines.push(`${task.title} (${task.id}): ${formatOpenGateSummary(blockingGates)}`);
  }
  if (task.blocker) {
    lines.push(`${task.title} (${task.id}): ${task.blocker}`);
  }
  return lines;
}

/** Shared by chiefApprovalBoard.ts and chiefCommandRouter.ts — see formatGateBlockers. */
export function gateRiskNote(task: Task): string {
  const openLabels = getBlockingGates(task.gates)
    .map((gate) => gate.label)
    .join(", ");
  return openLabels
    ? `Bypassing ${openLabels} may advance work before checks complete.`
    : "Confirm the external blocker is resolved or acceptable to override.";
}
