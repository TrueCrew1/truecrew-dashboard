import type { MockData } from "@/data/mockData";
import {
  WorkflowStage,
  type Artifact,
  type Incident,
  type IncidentSeverity,
  type Note,
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
} from "../../../lib/task-context";
import {
  CHIEF_ROUTES,
  routeForFocusItem,
  routeForTask,
  routeLabelForPath,
} from "./chiefRoutes";
import { compareApprovalsByAge, getApprovalUrgencyBadge } from "./chiefApprovalUrgency";
import { noteToArtifact } from "../../../lib/librarian/artifact";
import { isObsidianFilingCandidate, workItemFromTask } from "../../../lib/librarian/workItem";
import type { ChiefCommandResult } from "../../../lib/chief/commandTypes";
import { resolveChiefCommand as resolveChiefCommandCore } from "../../../lib/chief/resolveCommand";
import { stableChiefId } from "./chiefMock";
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

/**
 * Reprioritization rule: picks the single most overdue open task (earliest
 * dueAt) out of the existing overdueTasks signal. Ties keep original order
 * (Array.sort is stable) since the input is already open-task order.
 */
export function selectMostOverdueTask(overdueTasks: Task[]): Task | undefined {
  return [...overdueTasks].sort((a, b) => {
    const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  })[0];
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

/**
 * Derives operator approval candidates from live ops state.
 *
 * Operator path rules (see docs/CHIEF_WORK_TRUTH.md):
 * - Only escalate when a real decision is needed or a real mission can launch.
 * - Executable: active Sev 1–2 incident without repair → Research postmortem mission.
 * - Grounded: blocked build gates / held deploys (judgment needed; no auto-runner yet).
 * - Does NOT invent customer-link / focus / overdue / onboarding / alert cards —
 *   those stay on the Board as signals, not fake approvals.
 */
export function deriveApprovalCandidates(
  data: MockData,
  ctx: ChiefLiveContext,
): ApprovalProposal[] {
  const proposals: ApprovalProposal[] = [];
  void data;

  for (const task of ctx.blockingTasks.filter((t) => t.workflowType === "build").slice(0, 2)) {
    const blockingGates = getBlockingGates(task.gates);
    if (blockingGates.length === 0 && !task.blocker) continue;

    const route = CHIEF_ROUTES.builds;
    proposals.push({
      id: `apr-gate-${task.id}`,
      title: `Override gates for ${task.id}`,
      summary:
        blockingGates.length > 0
          ? `${task.title} has ${blockingGates.length} open required gate(s).`
          : `${task.title} is blocked: ${task.blocker}`,
      recommendedAction: `Document reason and advance ${task.id} past open gates in Builds (manual — no auto-override mission).`,
      riskNote: gateRiskNote(task),
      status: "pending",
      createdAt: new Date().toISOString(),
      specialist: "Workflow Gate Agent",
      category: "gate_override",
      source: "ops_change",
      workTruth: "grounded",
      ...proposalRoute(route),
    });
  }

  for (const incident of ctx.activeIncidents.filter((i) => !i.linkedRepairId).slice(0, 1)) {
    proposals.push({
      id: stableChiefId("apr-research-incident", incident.id),
      title: `Monitor incident postmortem: ${incident.title}`,
      summary: `Sev ${incident.severity} incident "${incident.title}" on ${incident.serviceName} has no linked repair — Research can draft a postmortem mission.`,
      recommendedAction: `Approve to run research:monitor-incident-postmortem for ${incident.id}.`,
      riskNote: "Executable — approve launches the existing Research postmortem runner.",
      status: "pending",
      createdAt: incident.openedAt,
      specialist: "Research Agent",
      category: "incident_repair",
      source: "ops_change",
      workTruth: "executable",
      missionKind: "research:monitor-incident-postmortem",
      missionProjectId: incident.id,
      recommendedDecision: "hold",
      ...proposalRoute(CHIEF_ROUTES.monitor),
    });
  }

  for (const deploy of ctx.blockedDeploys.slice(0, 1)) {
    proposals.push({
      id: `apr-deploy-${deploy.id}`,
      title: `Release ${deploy.serviceName} deploy hold`,
      summary: `${deploy.title} is planned but waiting on upstream build gates.`,
      recommendedAction: `Confirm gate clearance in Review, or document an override (manual — no auto-deploy mission).`,
      riskNote: "Deploying before gates pass may ship unverified changes.",
      status: "pending",
      createdAt: deploy.createdAt,
      specialist: "Workflow Gate Agent",
      category: "deploy_release",
      source: "ops_change",
      workTruth: "grounded",
      ...proposalRoute(CHIEF_ROUTES.review),
    });
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

type ProjectSummaryHandoffMissionLike = {
  id: string;
  status: "queued" | "running" | "completed" | "blocked" | "failed";
  projectId: string;
  projectTitle: string;
  updatedAt: string;
  error?: string;
  outputNotePath?: string;
  handoff?: { recommendedNextBuildStep: string };
};

function mapMissionStatusToAgentWork(
  status: ProjectSummaryHandoffMissionLike["status"],
): AgentWorkItem["status"] {
  if (status === "queued") return "queued";
  if (status === "running") return "active";
  if (status === "completed") return "completed";
  return "blocked";
}

export function deriveProjectSummaryHandoffWorkItems(
  missions: ProjectSummaryHandoffMissionLike[],
): AgentWorkItem[] {
  return missions.map((mission) => {
    const status = mapMissionStatusToAgentWork(mission.status);
    const note =
      mission.status === "completed"
        ? mission.handoff?.recommendedNextBuildStep ??
          (mission.outputNotePath ? `Wrote ${mission.outputNotePath}` : "Handoff complete.")
        : mission.error ?? `Status: ${mission.status}`;

    return {
      id: `agentwork-research-psh-${mission.id}`,
      agent: "Research Agent",
      task: `Project summary handoff — ${mission.projectTitle || mission.projectId}`,
      status,
      priority: status === "blocked" ? "high" : "medium",
      note,
      updatedAt: mission.updatedAt,
      source: "live",
    };
  });
}

function artifactsByWorkItemId(notes: Note[]): Map<string, Artifact> {
  const map = new Map<string, Artifact>();
  for (const note of notes) {
    const artifact = noteToArtifact(note);
    if (artifact?.workItemId) {
      map.set(artifact.workItemId, artifact);
    }
  }
  return map;
}

/**
 * Real, not mock: derives Librarian Agent's Agents-tab entries from task
 * records plus indexed Obsidian artifacts (notes where agent === "librarian").
 * Tasks at Done/Logged without an artifact show as active filing work; filed
 * tasks show title, target path, and tags on the card note line.
 */
export function deriveLibrarianAgentWorkItems(
  tasks: Task[],
  notes: Note[],
): AgentWorkItem[] {
  const artifacts = artifactsByWorkItemId(notes);

  return tasks
    .filter((task) => artifacts.has(task.id) || isObsidianFilingCandidate(task))
    .map((task) => {
      const artifact = artifacts.get(task.id);
      const workItem = workItemFromTask(task, Boolean(artifact));

      const status: AgentWorkItem["status"] =
        workItem.status === "filed"
          ? "completed"
          : workItem.status === "blocked"
            ? "blocked"
            : workItem.status === "pending"
              ? "queued"
              : "active";

      const note = artifact
        ? `${artifact.title} · ${artifact.targetPath} · tags: ${artifact.tags.join(", ")}`
        : workItem.status === "blocked"
          ? "Open gates or blocker must clear before filing."
          : "Ready to create Obsidian artifact from task context rail.";

      return {
        id: `agentwork-librarian-${task.id}`,
        agent: "Librarian Agent",
        task: artifact?.title ?? `${task.title} — Obsidian filing`,
        status,
        priority: task.priority,
        note,
        updatedAt: artifact?.createdAt ?? task.updatedAt,
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

  const unresolvedOverdueTasks = ctx.overdueTasks.filter((entry) => !focusTaskIds.has(entry.id));
  const mostOverdueTask = selectMostOverdueTask(unresolvedOverdueTasks);

  // Reprioritization rule: the single most overdue open task is promoted
  // ahead of everything else on the board, including the focus queue below,
  // so "look here first" always resolves to one place.
  if (mostOverdueTask) {
    items.push({
      id: `board-risk-overdue-${mostOverdueTask.id}`,
      lane: "at_risk",
      title: mostOverdueTask.title,
      detail: mostOverdueTask.dueAt
        ? `Needs attention — most overdue open task, past due ${mostOverdueTask.dueAt}`
        : "Needs attention — most overdue open task",
      routeTo: CHIEF_ROUTES.operationsOverdue,
      routeLabel: routeLabelForPath(CHIEF_ROUTES.operationsOverdue),
      meta: mostOverdueTask.id,
      tone: "critical",
      timestamp: mostOverdueTask.dueAt ?? mostOverdueTask.updatedAt,
      needsAttention: true,
    });
  }

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

  for (const task of unresolvedOverdueTasks) {
    if (task.id === mostOverdueTask?.id) continue;

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

/**
 * Deterministic command router lives in lib/chief/resolveCommand.ts
 * (shared with POST /api/chief/command). This wrapper keeps the previous
 * client call signature used across the dashboard.
 */
export function resolveChiefCommand(
  input: string,
  data: MockData,
  ctx: ChiefLiveContext,
  approvalCandidates: ApprovalProposal[],
): ChiefResponse {
  const result = resolveChiefCommandCore({
    prompt: input,
    liveContext: {
      stats: {
        openWorkOrders: ctx.stats.openWorkOrders,
        overduePMs: ctx.stats.overduePMs,
      },
      focusItems: ctx.focusItems,
      alerts: ctx.alerts,
      openTaskCount: ctx.openTaskCount,
      blockingTasks: ctx.blockingTasks,
      overdueTasks: ctx.overdueTasks,
      tasksMissingCustomer: ctx.tasksMissingCustomer,
      tasksMissingWorkflow: ctx.tasksMissingWorkflow,
      activeIncidents: ctx.activeIncidents,
      blockedDeploys: ctx.blockedDeploys,
      waitingCustomers: ctx.waitingCustomers,
    },
    knowledge: {
      runbooks: data.runbooks.map((entry) => ({ title: entry.title, tags: entry.tags })),
      prompts: data.prompts.map((entry) => ({ title: entry.title, tags: entry.tags })),
      notes: data.notes.map((entry) => ({ title: entry.title })),
    },
    workflows: data.workflows.map((workflow) => ({
      id: workflow.id,
      title: workflow.title,
      stage: workflow.stage,
      owner: workflow.owner,
      summary: workflow.summary,
      linkedTaskIds: workflow.linkedTaskIds,
    })),
    approvals: approvalCandidates.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      summary: proposal.summary,
      status: proposal.status,
      specialist: proposal.specialist,
      category: proposal.category,
      riskNote: proposal.riskNote,
    })),
  });

  return mapCommandResultToChiefResponse(result);
}

function mapCommandResultToChiefResponse(result: ChiefCommandResult): ChiefResponse {
  return {
    summary: result.summary,
    blockers: result.blockers,
    recommendedAction: result.recommendedAction,
    approvalNeeded: result.approvalNeeded,
    approvalPrompt: result.approvalPrompt,
    approvalTitle: result.approvalTitle,
    riskNote: result.riskNote,
    routedTo: result.routedTo as ChiefResponse["routedTo"],
    specialists: result.specialists as ChiefResponse["specialists"],
    matched: result.matched,
    resolution: result.resolution,
    missionKind: result.missionKind,
    missionProjectId: result.missionProjectId,
    workTruth: result.workTruth,
  };
}
