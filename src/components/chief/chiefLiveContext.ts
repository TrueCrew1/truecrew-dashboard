import type { MockData } from "@/data/mockData";
import {
  WorkflowStage,
  type AlertItem,
  type Incident,
  type IncidentSeverity,
  type Task,
  type TaskPriority,
} from "@/types";
import {
  deriveShiftStats,
  isActiveIncidentStatus,
  OPEN_TASK_STAGES,
} from "../../../lib/queries/dashboard-stats";
import {
  formatOpenGateSummary,
  getBlockingGates,
} from "../../../lib/stage-change";
import {
  NO_CUSTOMER_LINKED,
  resolveCustomerForTask,
  resolveTaskContextFromTask,
} from "../../../lib/task-context";
import {
  CHIEF_ROUTES,
  routeForEntityRef,
  routeForFocusItem,
  routeForTask,
  routeLabelForPath,
} from "./chiefRoutes";
import { compareApprovalsByAge, getApprovalUrgencyBadge } from "./chiefApprovalUrgency";
import type {
  AgentWorkAgentName,
  AgentWorkItem,
  ApprovalProposal,
  ApprovalSource,
  ChiefBoardItem,
  ChiefBoardLaneConfig,
  ChiefResponse,
  ChiefSpecialist,
} from "./types";

export const CHIEF_BOARD_LANES: ChiefBoardLaneConfig[] = [
  {
    lane: "at_risk",
    label: "At-risk work",
    emptyMessage: "No focus-queue or overdue items.",
  },
  {
    lane: "blocked",
    label: "Blocked gates",
    emptyMessage: "No open gates or held deploys.",
  },
  {
    lane: "missing_context",
    label: "Missing context",
    emptyMessage: "All open tasks have customer and workflow links.",
  },
  {
    lane: "approval",
    label: "Needs approval",
    emptyMessage: "No pending proposals — queue is clear.",
  },
];

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

function formatGateBlockers(task: Task): string[] {
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

function gateRiskNote(task: Task): string {
  const openLabels = getBlockingGates(task.gates)
    .map((gate) => gate.label)
    .join(", ");
  return openLabels
    ? `Bypassing ${openLabels} may advance work before checks complete.`
    : "Confirm the external blocker is resolved or acceptable to override.";
}

function proposalRoute(path: string) {
  return { routeTo: path, routeLabel: routeLabelForPath(path) };
}

function proposalEntityId(proposal: ApprovalProposal): string | undefined {
  const match = proposal.id.match(
    /^apr-(?:gate|repair|deploy|onboard|customer|workflow|focus|overdue|alert)-(.+)$/,
  );
  return match?.[1];
}

function alertTitleFromProposal(proposal: ApprovalProposal): string | null {
  const match = proposal.title.match(/^Respond to alert:\s*(.+)$/i);
  return match?.[1] ?? null;
}

function alertProposalFromItem(alert: AlertItem, coveredIds: Set<string>): ApprovalProposal | null {
  const entityId = alert.entityRef?.id;
  if (entityId && coveredIds.has(entityId)) return null;

  const route = alert.entityRef
    ? routeForEntityRef(alert.entityRef)
    : alert.type === "inbox"
      ? CHIEF_ROUTES.operations
      : CHIEF_ROUTES.today;

  const recommendedAction =
    alert.type === "incident"
      ? `Triage ${entityId ?? "incident"} and confirm repair workflow status.`
      : alert.type === "gate_block"
        ? `Review build gates blocking ${alert.entityRef?.label ?? "deploy"}.`
        : alert.type === "waiting"
          ? `Review onboarding checklist for ${alert.entityRef?.label ?? "customer"}.`
          : alert.type === "deploy"
            ? `Confirm deploy readiness for ${alert.entityRef?.label ?? "release"}.`
            : `Review inbox item and propose next action.`;

  return {
    id: `apr-alert-${alert.id}`,
    title: `Respond to alert: ${alert.title}`,
    summary: alert.message,
    recommendedAction,
    riskNote: "Proposal only — operator confirms before any workflow change.",
    status: "pending",
    createdAt: alert.timestamp,
    specialist: alert.type === "incident" ? "Research Agent" : "Workflow Gate Agent",
    category: "alert_action",
    ...proposalRoute(route),
  };
}

export function deriveApprovalCandidates(
  data: MockData,
  ctx: ChiefLiveContext,
): ApprovalProposal[] {
  const proposals: ApprovalProposal[] = [];
  const coveredEntityIds = new Set<string>();
  const contextData = { customers: data.customers, workflows: data.workflows };

  const trackEntity = (id: string | undefined) => {
    if (id) coveredEntityIds.add(id);
  };

  for (const task of ctx.blockingTasks.filter((t) => t.workflowType === "build").slice(0, 2)) {
    const blockingGates = getBlockingGates(task.gates);
    if (blockingGates.length === 0 && !task.blocker) continue;

    trackEntity(task.id);
    const route = CHIEF_ROUTES.builds;
    proposals.push({
      id: `apr-gate-${task.id}`,
      title: `Override gates for ${task.id}`,
      summary:
        blockingGates.length > 0
          ? `${task.title} has ${blockingGates.length} open required gate(s).`
          : `${task.title} is blocked: ${task.blocker}`,
      recommendedAction: `Document reason and advance ${task.id} past open gates.`,
      riskNote: gateRiskNote(task),
      status: "pending",
      createdAt: new Date().toISOString(),
      specialist: "Workflow Gate Agent",
      category: "gate_override",
      ...proposalRoute(route),
    });
  }

  for (const incident of ctx.activeIncidents.filter((i) => !i.linkedRepairId).slice(0, 1)) {
    trackEntity(incident.id);
    proposals.push({
      id: `apr-repair-${incident.id}`,
      title: `Open repair workflow for ${incident.serviceName}`,
      summary: `Sev ${incident.severity} incident "${incident.title}" has no linked repair task.`,
      recommendedAction: `Create repair workflow for ${incident.serviceName} and link to ${incident.id}.`,
      riskNote: "Repair workflow may pause dependent build and deploy tasks.",
      status: "pending",
      createdAt: incident.openedAt,
      specialist: "Research Agent",
      category: "incident_repair",
      ...proposalRoute(CHIEF_ROUTES.monitor),
    });
  }

  for (const deploy of ctx.blockedDeploys.slice(0, 1)) {
    trackEntity(deploy.id);
    proposals.push({
      id: `apr-deploy-${deploy.id}`,
      title: `Release ${deploy.serviceName} deploy hold`,
      summary: `${deploy.title} is planned but waiting on upstream build gates.`,
      recommendedAction: `Confirm gate clearance or approve deploy hold override for ${deploy.id}.`,
      riskNote: "Deploying before gates pass may ship unverified changes.",
      status: "pending",
      createdAt: deploy.createdAt,
      specialist: "Workflow Gate Agent",
      category: "deploy_release",
      ...proposalRoute(CHIEF_ROUTES.review),
    });
  }

  for (const customer of ctx.waitingCustomers.slice(0, 1)) {
    trackEntity(customer.id);
    const openGates = customer.onboardingChecklist.filter(
      (gate) => gate.required && !gate.passed,
    );
    proposals.push({
      id: `apr-onboard-${customer.id}`,
      title: `Unblock ${customer.name} onboarding`,
      summary:
        openGates.length > 0
          ? `${customer.name} onboarding stalled — ${openGates.length} checklist gate(s) open.`
          : `${customer.name} is in Waiting stage with an external dependency.`,
      recommendedAction: `Review onboarding checklist for ${customer.name} and propose next action.`,
      riskNote: "Low execution risk — proposal only until operator confirms.",
      status: "pending",
      createdAt: customer.updatedAt,
      specialist: "Workflow Gate Agent",
      category: "onboarding",
      ...proposalRoute(CHIEF_ROUTES.customers),
    });
  }

  for (const task of ctx.tasksMissingCustomer.slice(0, 1)) {
    trackEntity(task.id);
    const workOrder = resolveTaskContextFromTask(task, contextData);
    const route = routeForTask(task);
    proposals.push({
      id: `apr-customer-${task.id}`,
      title: `Link customer to ${task.id}`,
      summary: `${task.title} (${task.workflowType}) has no confirmed customer link.`,
      recommendedAction: `Attach a customer record to ${task.id} — work order: ${workOrder.workOrderName}.`,
      riskNote: "Missing customer context can delay SLA tracking and billing attribution.",
      status: "pending",
      createdAt: task.updatedAt,
      category: "customer_link",
      ...proposalRoute(route),
    });
  }

  for (const task of ctx.tasksMissingWorkflow.slice(0, 1)) {
    trackEntity(task.id);
    const route = routeForTask(task);
    proposals.push({
      id: `apr-workflow-${task.id}`,
      title: `Attach workflow to ${task.id}`,
      summary: `${task.title} (${task.workflowType}) is not linked to a workflow or work order.`,
      recommendedAction: `Link ${task.id} to an active workflow for stage tracking and gate visibility.`,
      riskNote: "Unlinked tasks may be invisible to gate scans and shift stats.",
      status: "pending",
      createdAt: task.updatedAt,
      specialist: "Workflow Gate Agent",
      category: "workflow_link",
      ...proposalRoute(route),
    });
  }

  const focusTaskIds = new Set(ctx.focusItems.map((item) => item.taskId));
  for (const item of ctx.focusItems.slice(0, 2)) {
    trackEntity(item.taskId);
    const route = routeForFocusItem(item);
    proposals.push({
      id: `apr-focus-${item.id}`,
      title: `Escalate: ${item.title}`,
      summary: `Focus queue — ${item.reason}`,
      recommendedAction: `Review ${item.taskId} and propose unblock or stage advance.`,
      riskNote: "At-risk item may block downstream roadmap or deploy work.",
      status: "pending",
      createdAt: item.dueAt ?? new Date().toISOString(),
      specialist: item.workflowType === "decision" ? "Roadmap Agent" : "Workflow Gate Agent",
      category: "focus_escalation",
      ...proposalRoute(route),
    });
  }

  for (const task of ctx.overdueTasks.filter((t) => !focusTaskIds.has(t.id)).slice(0, 1)) {
    trackEntity(task.id);
    const route = CHIEF_ROUTES.operationsOverdue;
    proposals.push({
      id: `apr-overdue-${task.id}`,
      title: `Review overdue ${task.id}`,
      summary: `${task.title} is past due (${task.dueAt}).`,
      recommendedAction: `Confirm priority, reassign, or advance ${task.id} to clear overdue backlog.`,
      riskNote: "Overdue work may breach SLA or block dependent tasks.",
      status: "pending",
      createdAt: task.dueAt ?? task.updatedAt,
      specialist: "Roadmap Agent",
      category: "overdue_review",
      ...proposalRoute(route),
    });
  }

  for (const alert of ctx.alerts.slice(0, 2)) {
    const alertProposal = alertProposalFromItem(alert, coveredEntityIds);
    if (alertProposal) {
      if (alert.entityRef?.id) trackEntity(alert.entityRef.id);
      proposals.push(alertProposal);
    }
  }

  return proposals;
}

/**
 * Dedup-merge approval proposal sources by id, last source wins on
 * conflict. Shared by ChiefPanel (sidebar queue) and any other surface
 * that needs the same pending-approval set — e.g. a homepage snapshot —
 * so both read from one merge rule instead of two copies of it. Does not
 * apply operator decisions; callers that track decisions (ChiefPanel)
 * layer those on separately.
 */
export function mergeApprovalSources(
  ...sources: ApprovalProposal[][]
): ApprovalProposal[] {
  const byId = new Map<string, ApprovalProposal>();
  for (const proposal of sources.flat()) {
    byId.set(proposal.id, proposal);
  }
  return [...byId.values()];
}

/**
 * Real, not mock: derives Build's Agents-tab entries from the same live
 * task data (gates, blocker, stage) Chief already uses elsewhere in this
 * file — no separate agent-status source exists, so a build-workflow
 * task's own record IS the truthful signal. Baseline integration for the
 * Agents tab (see agentWorkBoardMock.ts); other agents there still run on
 * hand-written mock entries pending their own real signal.
 *
 * Status mapping: Done/Logged -> completed; an open required gate or a
 * blocker string -> blocked; Inbox/Triage/Planned (not yet started) ->
 * queued; anything else open -> active. There is no live signal yet for
 * "awaiting_approval" specifically (that would require cross-referencing
 * the approvals queue), so build tasks never land in that lane here.
 */
export function deriveBuildAgentWorkItems(tasks: Task[]): AgentWorkItem[] {
  return tasks
    .filter((task) => task.workflowType === "build")
    .map((task) => {
      const blockingGates = getBlockingGates(task.gates);
      const isBlocked = blockingGates.length > 0 || Boolean(task.blocker);
      const isDone = task.stage === WorkflowStage.Done || task.stage === WorkflowStage.Logged;
      const isUnstarted =
        task.stage === WorkflowStage.Inbox ||
        task.stage === WorkflowStage.Triage ||
        task.stage === WorkflowStage.Planned;

      const status: AgentWorkItem["status"] = isDone
        ? "completed"
        : isBlocked
          ? "blocked"
          : isUnstarted
            ? "queued"
            : "active";

      const note = isDone
        ? "Build complete — see task record for deploy/next steps."
        : task.blocker
          ? task.blocker
          : blockingGates.length > 0
            ? formatOpenGateSummary(blockingGates)
            : isUnstarted
              ? "Not yet started."
              : "In progress — no open blockers.";

      return {
        id: `agentwork-build-${task.id}`,
        agent: "Build Agent",
        task: task.title,
        status,
        priority: task.priority,
        note,
        updatedAt: task.updatedAt,
        source: "live",
      };
    });
}

/**
 * Real, not mock: derives Workflow Gate Agent's Agents-tab entries the same
 * way deriveBuildAgentWorkItems does — a task's own gates/blocker/stage IS
 * the truthful signal, no separate agent-status source exists. Scoped to
 * non-build tasks with a gate checklist (workflowType !== "build" &&
 * task.gates.length > 0) so a task isn't listed under two different
 * agents' rows at once — build tasks already have their own row via
 * deriveBuildAgentWorkItems, and Workflow Gate Agent's real job elsewhere
 * in this file (see specialist attribution on gate/deploy/onboarding
 * proposals above) already spans every workflow type, build included.
 * Second live-derived row for the Agents tab; Librarian, Research,
 * Roadmap, and Marketer remain mock pending their own real signal.
 *
 * Status mapping: same rules as deriveBuildAgentWorkItems — Done/Logged ->
 * completed; an open required gate or a blocker string -> blocked;
 * Inbox/Triage/Planned (not yet started) -> queued; anything else open ->
 * active. No live "awaiting_approval" signal here either, same reason.
 */
export function deriveWorkflowGateAgentWorkItems(tasks: Task[]): AgentWorkItem[] {
  return tasks
    .filter((task) => task.workflowType !== "build" && task.gates.length > 0)
    .map((task) => {
      const blockingGates = getBlockingGates(task.gates);
      const isBlocked = blockingGates.length > 0 || Boolean(task.blocker);
      const isDone = task.stage === WorkflowStage.Done || task.stage === WorkflowStage.Logged;
      const isUnstarted =
        task.stage === WorkflowStage.Inbox ||
        task.stage === WorkflowStage.Triage ||
        task.stage === WorkflowStage.Planned;

      const status: AgentWorkItem["status"] = isDone
        ? "completed"
        : isBlocked
          ? "blocked"
          : isUnstarted
            ? "queued"
            : "active";

      const note = isDone
        ? "All required gates cleared."
        : task.blocker
          ? task.blocker
          : blockingGates.length > 0
            ? formatOpenGateSummary(blockingGates)
            : isUnstarted
              ? "Not yet started."
              : "In progress — no open blockers.";

      return {
        id: `agentwork-workflowgate-${task.id}`,
        agent: "Workflow Gate Agent",
        task: task.title,
        status,
        priority: task.priority,
        note,
        updatedAt: task.updatedAt,
        source: "live",
      };
    });
}

/** Incidents don't carry a TaskPriority — severity is the closest real signal, and the two scales already line up ordinally. */
const INCIDENT_SEVERITY_PRIORITY: Record<IncidentSeverity, TaskPriority> = {
  1: "critical",
  2: "high",
  3: "medium",
  4: "low",
};

/**
 * Real, not mock: derives Research Agent's Agents-tab entries from real
 * incident data — the same signal Chief already treats as Research
 * Agent's domain elsewhere in this file (see the specialist attribution
 * on incident alerts and incident-repair proposals above). Every incident
 * becomes a row, same as Build and Workflow Gate take their whole domain
 * rather than pre-filtering by urgency — severity conveys relative
 * urgency via the priority badge instead.
 *
 * Status mapping: incidents don't have their own gate checklist or
 * blocker field, so there's no live "blocked" or "queued" signal here —
 * same honesty rule Build and Workflow Gate apply to "awaiting_approval"
 * (no signal, no lane). Instead: any status in ACTIVE_INCIDENT_STATUSES
 * (open/mitigating/mitigated — see lib/queries/dashboard-stats.ts, the
 * same constant Chief's shift stats already use) -> active; resolved or
 * post_mortem_filed -> completed.
 *
 * Third live-derived row for the Agents tab; Librarian, Roadmap, and
 * Marketer remain mock pending their own real signal.
 */
export function deriveResearchAgentWorkItems(incidents: Incident[]): AgentWorkItem[] {
  return incidents.map((incident) => {
    const isDone = !isActiveIncidentStatus(incident.status);
    const status: AgentWorkItem["status"] = isDone ? "completed" : "active";

    const note = isDone
      ? "Resolved — see incident record for post-mortem/follow-up."
      : `Sev ${incident.severity} · ${incident.status} — ${incident.summary}`;

    return {
      id: `agentwork-research-${incident.id}`,
      agent: "Research Agent",
      task: incident.title,
      status,
      priority: INCIDENT_SEVERITY_PRIORITY[incident.severity],
      note,
      updatedAt: incident.updatedAt,
      source: "live",
    };
  });
}

function agentFromApprovalSource(source: ApprovalSource): AgentWorkAgentName | null {
  switch (source) {
    case "agent_build":
    case "repo_change":
    case "pr":
      return "Build Agent";
    case "research_agent":
      return "Research Agent";
    case "planner_agent":
      return "Roadmap Agent";
    case "content_agent":
      return "Marketer Agent";
    case "ops_change":
      return null;
  }
}

function agentFromApprovalSpecialist(
  specialist: Exclude<ChiefSpecialist, "Chief">,
): AgentWorkAgentName | null {
  switch (specialist) {
    case "Workflow Gate Agent":
      return "Workflow Gate Agent";
    case "Librarian Agent":
      return "Librarian Agent";
    case "Research Agent":
      return "Research Agent";
    case "Roadmap Agent":
      return "Roadmap Agent";
    case "Marketer Agent":
      return "Marketer Agent";
  }
}

function resolveAgentForAwaitingApproval(proposal: ApprovalProposal): AgentWorkAgentName | null {
  if (proposal.source) {
    const fromSource = agentFromApprovalSource(proposal.source);
    if (fromSource) return fromSource;
  }
  if (proposal.specialist) {
    return agentFromApprovalSpecialist(proposal.specialist);
  }
  return null;
}

function priorityFromAwaitingApproval(proposal: ApprovalProposal): TaskPriority {
  const urgency = getApprovalUrgencyBadge(proposal);
  if (urgency?.escalate) return "high";
  if (urgency?.urgency === "dueSoon") return "medium";
  return "medium";
}

/**
 * Real, not mock: derives Agents-tab "Awaiting approval" rows from pending
 * proposals in the shared Chief approval queue. Only proposals with explicit
 * source or specialist attribution map to an agent — anything ambiguous is
 * omitted rather than guessed. Source wins when both are present and the
 * source maps; ops_change proposals rely on specialist only.
 */
export function deriveAgentAwaitingApprovalWorkItems(
  approvals: ApprovalProposal[],
): AgentWorkItem[] {
  const pending = approvals
    .filter((proposal) => proposal.status === "pending")
    .sort(compareApprovalsByAge);

  const items: AgentWorkItem[] = [];

  for (const proposal of pending) {
    const agent = resolveAgentForAwaitingApproval(proposal);
    if (!agent) continue;

    items.push({
      id: `agentwork-awaiting-${proposal.id}`,
      agent,
      task: proposal.title,
      status: "awaiting_approval",
      priority: priorityFromAwaitingApproval(proposal),
      note: "Operator decision pending — review on Approvals tab.",
      updatedAt: proposal.updatedAt ?? proposal.createdAt,
      source: "live",
    });
  }

  return items;
}

export function deriveChiefBoardItems(
  ctx: ChiefLiveContext,
  pendingApprovals: ApprovalProposal[],
): ChiefBoardItem[] {
  const items: ChiefBoardItem[] = [];
  const focusTaskIds = new Set(ctx.focusItems.map((item) => item.taskId));
  const blockingTaskIds = new Set(ctx.blockingTasks.map((task) => task.id));
  const focusIds = new Set(ctx.focusItems.map((item) => item.id));
  const focusTitles = new Set(ctx.focusItems.map((item) => item.title.toLowerCase()));

  for (const item of ctx.focusItems) {
    if (blockingTaskIds.has(item.taskId)) continue;

    const route = routeForFocusItem(item);
    items.push({
      id: `board-risk-focus-${item.id}`,
      lane: "at_risk",
      title: item.title,
      detail: item.reason,
      routeTo: route,
      routeLabel: routeLabelForPath(route),
      meta: item.taskId,
      tone: "warn",
      timestamp: item.dueAt,
    });
  }

  for (const task of ctx.overdueTasks.filter((entry) => !focusTaskIds.has(entry.id))) {
    items.push({
      id: `board-risk-overdue-${task.id}`,
      lane: "at_risk",
      title: task.title,
      detail: task.dueAt ? `Past due ${task.dueAt}` : "Past due",
      routeTo: CHIEF_ROUTES.operationsOverdue,
      routeLabel: routeLabelForPath(CHIEF_ROUTES.operationsOverdue),
      meta: task.id,
      tone: "critical",
      timestamp: task.dueAt ?? task.updatedAt,
    });
  }

  for (const task of ctx.blockingTasks) {
    const blockingGates = getBlockingGates(task.gates);
    const route = routeForTask(task);
    const detail =
      blockingGates.length > 0
        ? formatOpenGateSummary(blockingGates)
        : (task.blocker ?? "External blocker on open work");

    items.push({
      id: `board-blocked-task-${task.id}`,
      lane: "blocked",
      title: task.title,
      detail,
      routeTo: route,
      routeLabel: routeLabelForPath(route),
      meta: task.id,
      tone: blockingGates.length > 0 ? "warn" : "critical",
      timestamp: task.updatedAt,
    });
  }

  for (const deploy of ctx.blockedDeploys) {
    items.push({
      id: `board-blocked-deploy-${deploy.id}`,
      lane: "blocked",
      title: deploy.title,
      detail: `Planned deploy for ${deploy.serviceName} — waiting on upstream build gates.`,
      routeTo: CHIEF_ROUTES.review,
      routeLabel: routeLabelForPath(CHIEF_ROUTES.review),
      meta: deploy.id,
      tone: "warn",
      timestamp: deploy.createdAt,
    });
  }

  for (const task of ctx.tasksMissingCustomer) {
    const route = routeForTask(task);
    items.push({
      id: `board-context-customer-${task.id}`,
      lane: "missing_context",
      title: task.title,
      detail: `${task.workflowType} task — ${NO_CUSTOMER_LINKED}`,
      routeTo: route,
      routeLabel: routeLabelForPath(route),
      meta: task.id,
      tone: "warn",
      timestamp: task.updatedAt,
    });
  }

  for (const task of ctx.tasksMissingWorkflow) {
    const route = routeForTask(task);
    items.push({
      id: `board-context-workflow-${task.id}`,
      lane: "missing_context",
      title: task.title,
      detail: "No linked workflow or work order for stage tracking.",
      routeTo: route,
      routeLabel: routeLabelForPath(route),
      meta: task.id,
      tone: "warn",
      timestamp: task.updatedAt,
    });
  }

  // Stale first — the longest-waiting proposals surface at the top of the
  // approval lane, same rule ApprovalBoard applies to the Approvals tab.
  const staleFirstApprovals = pendingApprovals
    .filter((entry) => entry.status === "pending")
    .sort(compareApprovalsByAge);

  for (const proposal of staleFirstApprovals) {
    const entityId = proposalEntityId(proposal);

    if (proposal.id.startsWith("apr-focus-") && entityId && focusIds.has(entityId)) {
      continue;
    }

    if (proposal.id.startsWith("apr-alert-")) {
      const alertTitle = alertTitleFromProposal(proposal);
      if (alertTitle && focusTitles.has(alertTitle.toLowerCase())) continue;
    }

    const route = proposal.routeTo ?? CHIEF_ROUTES.today;
    items.push({
      id: `board-approval-${proposal.id}`,
      lane: "approval",
      title: proposal.title,
      detail: proposal.summary,
      routeTo: route,
      routeLabel: proposal.routeLabel ?? routeLabelForPath(route),
      meta: entityId ?? proposal.specialist,
      tone: "critical",
      timestamp: proposal.createdAt,
      proposalId: proposal.id,
    });
  }

  return items;
}

const DEFAULT_RESPONSE: ChiefResponse = {
  summary:
    "Reviewed your request against current operational context. No immediate conflicts detected.",
  recommendedAction:
    "Try a focused query: at-risk items, blockers, pending approvals, or missing customer context.",
  routedTo: "Chief",
};

function resolveRiskToday(ctx: ChiefLiveContext): ChiefResponse {
  const {
    stats,
    focusItems,
    openTaskCount,
    blockingTasks,
    activeIncidents,
    overdueTasks,
    alerts,
    tasksMissingCustomer,
    tasksMissingWorkflow,
  } = ctx;

  const focusSummary =
    focusItems.length === 0
      ? "Focus queue is clear."
      : `${focusItems.length} focus item(s): ${focusItems.map((item) => item.title).join("; ")}.`;

  const incidentSummary =
    activeIncidents.length === 0
      ? "No Sev 1–2 incidents open."
      : `${activeIncidents.length} Sev 1–2 incident(s) — ${activeIncidents.map((i) => i.serviceName).join(", ")}.`;

  const blockerSummary =
    blockingTasks.length === 0
      ? "No gate or external blockers on open work."
      : `${blockingTasks.length} blocked task(s) need attention.`;

  const contextGapCount = tasksMissingCustomer.length + tasksMissingWorkflow.length;
  const contextSummary =
    contextGapCount === 0
      ? "No missing customer or workflow context."
      : `${contextGapCount} task(s) missing customer or workflow context.`;

  const alertSummary =
    alerts.length === 0
      ? "Alert feed is quiet."
      : `${alerts.length} open alert(s) — ${alerts.slice(0, 2).map((a) => a.title).join("; ")}${alerts.length > 2 ? "…" : ""}.`;

  const summary = [
    `${openTaskCount} open task(s).`,
    focusSummary,
    incidentSummary,
    blockerSummary,
    overdueTasks.length > 0 ? `${overdueTasks.length} overdue task(s).` : null,
    contextSummary,
    alertSummary,
    `${stats.openWorkOrders} open work order(s), ${stats.overduePMs} overdue PM(s).`,
  ]
    .filter(Boolean)
    .join(" ");

  const recommendedAction =
    focusItems.length > 0
      ? `Start with focus queue item "${focusItems[0].title}" (${focusItems[0].reason}).`
      : blockingTasks.length > 0
        ? `Address blockers on ${blockingTasks[0].id} before taking new work.`
        : overdueTasks.length > 0
          ? `Review overdue ${overdueTasks[0].id} on Operations.`
          : "Queue is stable — review pending approvals or clear missing context gaps.";

  return {
    summary,
    recommendedAction,
    routedTo: "Chief",
    blockers:
      blockingTasks.length > 0
        ? blockingTasks.flatMap(formatGateBlockers).slice(0, 5)
        : undefined,
    specialists: [
      ...(blockingTasks.length > 0
        ? [{ specialist: "Workflow Gate Agent" as const, contribution: "Gate and blocker scan" }]
        : []),
      ...(activeIncidents.length > 0
        ? [{ specialist: "Research Agent" as const, contribution: "Active incident summary" }]
        : []),
      ...(focusItems.some((item) => item.workflowType === "decision")
        ? [{ specialist: "Roadmap Agent" as const, contribution: "Decision and roadmap risk" }]
        : []),
    ],
  };
}

function resolveBlocked(ctx: ChiefLiveContext): ChiefResponse {
  const blockers = ctx.blockingTasks.flatMap(formatGateBlockers);

  for (const deploy of ctx.blockedDeploys) {
    blockers.push(
      `Deploy ${deploy.title} (${deploy.id}) planned — waiting on build gates for ${deploy.serviceName}.`,
    );
  }

  if (blockers.length === 0) {
    return {
      summary: "No open gates, external blockers, or held deploys detected on active work.",
      recommendedAction: "Run a status overview to confirm queue health.",
      routedTo: "Chief",
      specialists: [
        { specialist: "Workflow Gate Agent", contribution: "Full gate scan — all clear" },
      ],
    };
  }

  const primaryBuild = ctx.blockingTasks.find((task) => task.workflowType === "build");
  const primaryGates = primaryBuild ? getBlockingGates(primaryBuild.gates) : [];

  return {
    summary: `${blockers.length} blocker(s) across tasks and deploys. Primary constraint: ${blockers[0]}`,
    blockers: blockers.slice(0, 6),
    recommendedAction: primaryBuild
      ? `Resolve gates on ${primaryBuild.id} (${primaryBuild.title}) before advancing deploy or closeout.`
      : "Clear the listed external blockers before stage advancement.",
    approvalNeeded: Boolean(primaryBuild && (primaryGates.length > 0 || primaryBuild.blocker)),
    approvalTitle: primaryBuild ? `Override gates for ${primaryBuild.id}` : undefined,
    approvalPrompt: primaryBuild
      ? `Override open gates on ${primaryBuild.title} and continue anyway?`
      : undefined,
    riskNote: primaryBuild ? gateRiskNote(primaryBuild) : undefined,
    routedTo: "Workflow Gate Agent",
    specialists: [
      {
        specialist: "Workflow Gate Agent",
        contribution: `${ctx.blockingTasks.length} blocked task(s), ${ctx.blockedDeploys.length} held deploy(s)`,
      },
    ],
  };
}

function resolveApprovals(candidates: ApprovalProposal[]): ChiefResponse {
  const pending = candidates.filter((proposal) => proposal.status === "pending");

  if (pending.length === 0) {
    return {
      summary: "No pending approval candidates from current workflow state.",
      recommendedAction: "Check blockers or focus queue for new situations that need a decision.",
      routedTo: "Chief",
    };
  }

  const titles = pending.map((proposal) => proposal.title).join("; ");

  return {
    summary: `${pending.length} approval candidate(s) need review: ${titles}.`,
    recommendedAction: "Open the Approvals tab to review each proposal — nothing executes until you decide.",
    routedTo: "Chief",
    blockers: pending.map(
      (proposal) => `${proposal.title}: ${proposal.summary.slice(0, 80)}`,
    ),
    specialists: [
      {
        specialist: "Workflow Gate Agent",
        contribution: `${pending.filter((p) => p.specialist === "Workflow Gate Agent").length} gate/deploy proposal(s)`,
      },
      {
        specialist: "Research Agent",
        contribution: `${pending.filter((p) => p.specialist === "Research Agent").length} incident proposal(s)`,
      },
    ],
  };
}

function resolveMissingContext(ctx: ChiefLiveContext): ChiefResponse {
  const customerGaps = ctx.tasksMissingCustomer.map(
    (task) => `${task.title} (${task.id}, ${task.workflowType}) — ${NO_CUSTOMER_LINKED}`,
  );
  const workflowGaps = ctx.tasksMissingWorkflow.map(
    (task) => `${task.title} (${task.id}) — no linked workflow/work order`,
  );
  const gaps = [...customerGaps, ...workflowGaps];

  if (gaps.length === 0) {
    return {
      summary: "All open customer-facing tasks have confirmed customer links and workflow context.",
      recommendedAction: "No context gaps to fix — review blockers or focus queue instead.",
      routedTo: "Chief",
    };
  }

  return {
    summary: `${gaps.length} open task(s) missing customer or job context. ${gaps.slice(0, 2).join("; ")}${gaps.length > 2 ? "…" : ""}`,
    blockers: gaps.slice(0, 8),
    recommendedAction:
      customerGaps.length > 0
        ? `Link a customer to ${ctx.tasksMissingCustomer[0].id} first — ${ctx.tasksMissingCustomer[0].title}.`
        : `Attach ${ctx.tasksMissingWorkflow[0].id} to a workflow for work-order tracking.`,
    approvalNeeded: gaps.length > 0,
    approvalTitle:
      customerGaps.length > 0
        ? `Link customer to ${ctx.tasksMissingCustomer[0].id}`
        : workflowGaps.length > 0
          ? `Attach workflow to ${ctx.tasksMissingWorkflow[0].id}`
          : undefined,
    approvalPrompt:
      customerGaps.length > 0
        ? `Propose customer link for ${ctx.tasksMissingCustomer[0].title}?`
        : workflowGaps.length > 0
          ? `Propose workflow link for ${ctx.tasksMissingWorkflow[0].title}?`
          : undefined,
    riskNote: "Proposal only — context links must be confirmed in the task record.",
    routedTo: "Chief",
  };
}

function resolveIncidents(ctx: ChiefLiveContext): ChiefResponse {
  if (ctx.activeIncidents.length === 0) {
    return {
      summary: "No active Sev 1–2 incidents. Monitor feed shows no elevated alerts requiring triage.",
      recommendedAction: "Check blocked deploys or focus queue for operational risk.",
      routedTo: "Research Agent",
      specialists: [
        { specialist: "Research Agent", contribution: "Incident scan — none active at Sev 1–2" },
      ],
    };
  }

  const primary = ctx.activeIncidents[0];
  const needsRepair = !primary.linkedRepairId;

  return {
    summary: `${ctx.activeIncidents.length} Sev 1–2 incident(s). Primary: ${primary.title} on ${primary.serviceName} (Sev ${primary.severity}).`,
    blockers: ctx.activeIncidents.map(
      (inc) => `Sev ${inc.severity} — ${inc.serviceName}: ${inc.title}`,
    ),
    recommendedAction: needsRepair
      ? `Triage ${primary.id} and open a repair workflow for ${primary.serviceName}.`
      : `Continue mitigation on linked repair for ${primary.serviceName}.`,
    approvalNeeded: needsRepair,
    approvalTitle: needsRepair ? `Open repair workflow for ${primary.serviceName}` : undefined,
    approvalPrompt: needsRepair
      ? `Open repair workflow for ${primary.serviceName} incident?`
      : undefined,
    riskNote: "Repair workflow may pause dependent build tasks.",
    routedTo: "Research Agent",
    specialists: [
      {
        specialist: "Research Agent",
        contribution: `Correlated ${ctx.activeIncidents.length} active incident(s) with service health`,
      },
    ],
  };
}

function resolveAlerts(ctx: ChiefLiveContext, approvalCandidates: ApprovalProposal[]): ChiefResponse {
  if (ctx.alerts.length === 0) {
    return {
      summary: "No open alerts in the current dashboard feed.",
      recommendedAction: "Run a status overview or check blockers for latent risk.",
      routedTo: "Chief",
    };
  }

  const alertApprovals = approvalCandidates.filter((p) => p.category === "alert_action" && p.status === "pending");
  const lines = ctx.alerts.map(
    (alert) =>
      `${alert.title}: ${alert.message}${alert.entityRef ? ` (${alert.entityRef.label})` : ""}`,
  );

  return {
    summary: `${ctx.alerts.length} open alert(s). ${ctx.alerts
      .slice(0, 2)
      .map((a) => a.title)
      .join("; ")}${ctx.alerts.length > 2 ? "…" : ""}.`,
    blockers: lines.slice(0, 6),
    recommendedAction:
      alertApprovals.length > 0
        ? `Review ${alertApprovals.length} alert-driven proposal(s) on the Approvals tab.`
        : `Triage highest-severity alert first: "${ctx.alerts[0].title}".`,
    approvalNeeded: alertApprovals.length > 0,
    approvalTitle: alertApprovals[0]?.title,
    approvalPrompt: alertApprovals[0]
      ? `Propose response for alert: ${alertApprovals[0].title}?`
      : undefined,
    riskNote: alertApprovals[0]?.riskNote,
    routedTo: "Chief",
    specialists: [
      {
        specialist: "Workflow Gate Agent",
        contribution: `Correlated ${ctx.alerts.length} alert(s) with gate and deploy state`,
      },
    ],
  };
}

function resolveKnowledge(data: MockData, input: string): ChiefResponse {
  const terms = input
    .toLowerCase()
    .replace(/\b(knowledge|doc|search|library|note|obsidian|runbook|for)\b/gi, " ")
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  const sources = [
    ...data.runbooks.map((entry) => ({ kind: "runbook", title: entry.title, tags: entry.tags })),
    ...data.prompts.map((entry) => ({ kind: "prompt", title: entry.title, tags: entry.tags })),
    ...data.notes.map((entry) => ({ kind: "note", title: entry.title, tags: [] as string[] })),
  ];

  const matched =
    terms.length === 0
      ? sources.slice(0, 3)
      : sources.filter((entry) => {
          const haystack = `${entry.title} ${entry.tags.join(" ")}`.toLowerCase();
          return terms.some((term) => haystack.includes(term));
        });

  const top = matched.slice(0, 3);

  if (top.length === 0) {
    return {
      summary: "No knowledge entries matched your query in the current library snapshot.",
      recommendedAction: "Try broader terms or open AI & Knowledge to browse runbooks and prompts.",
      routedTo: "Librarian Agent",
      specialists: [
        { specialist: "Librarian Agent", contribution: "Indexed local runbooks, prompts, and notes" },
      ],
    };
  }

  return {
    summary: `Found ${top.length} knowledge entr${top.length === 1 ? "y" : "ies"}: ${top.map((e) => e.title).join("; ")}.`,
    recommendedAction: `Open "${top[0].title}" in AI & Knowledge and attach to the relevant task if applicable.`,
    routedTo: "Librarian Agent",
    specialists: [
      {
        specialist: "Librarian Agent",
        contribution: `Matched ${matched.length} document(s) from local library`,
      },
    ],
  };
}

export function resolveChiefCommand(
  input: string,
  data: MockData,
  ctx: ChiefLiveContext,
  approvalCandidates: ApprovalProposal[],
): ChiefResponse {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_RESPONSE;

  if (
    /\b(approv|approval)\b/i.test(trimmed) ||
    (/\b(review|pending)\b/i.test(trimmed) && /\b(show|need|my|what)\b/i.test(trimmed))
  ) {
    return resolveApprovals(approvalCandidates);
  }

  if (
    /\b(missing|without|no)\b.*\b(customer|job|context)\b/i.test(trimmed) ||
    /\b(customer|job|context)\b.*\b(missing|gap|unlinked|link)\b/i.test(trimmed)
  ) {
    return resolveMissingContext(ctx);
  }

  if (/\b(block|blocking|blocked|gate|gates|stuck|deploy)\b/i.test(trimmed)) {
    return resolveBlocked(ctx);
  }

  if (/\b(risk|at risk|today|status|overview|focus)\b/i.test(trimmed)) {
    return resolveRiskToday(ctx);
  }

  if (/\b(incident|monitor|sev|uptime|degrad)\b/i.test(trimmed)) {
    return resolveIncidents(ctx);
  }

  if (/\b(alert|alerts|feed|notify|notification)\b/i.test(trimmed)) {
    return resolveAlerts(ctx, approvalCandidates);
  }

  if (/\b(knowledge|doc|search|library|note|obsidian|runbook)\b/i.test(trimmed)) {
    return resolveKnowledge(data, trimmed);
  }

  return {
    ...DEFAULT_RESPONSE,
    summary: `Received: "${trimmed}". No specialist match — Chief handled this directly against live queue state (${ctx.openTaskCount} open tasks).`,
  };
}
