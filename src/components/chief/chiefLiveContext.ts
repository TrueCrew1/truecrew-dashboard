import type { MockData } from "@/data/mockData";
import type { Task, WorkflowStage } from "@/types";
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
import type { ApprovalProposal, ChiefResponse } from "./types";

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

  return {
    stats: deriveShiftStats({
      tasks: data.tasks,
      incidents: data.incidents,
    }),
    focusItems: data.focusItems,
    alerts: data.alerts,
    openTaskCount: openTasks.length,
    blockingTasks,
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

export function deriveApprovalCandidates(
  data: MockData,
  ctx: ChiefLiveContext,
): ApprovalProposal[] {
  const proposals: ApprovalProposal[] = [];
  const contextData = { customers: data.customers, workflows: data.workflows };

  for (const task of ctx.blockingTasks.filter((t) => t.workflowType === "build").slice(0, 2)) {
    const blockingGates = getBlockingGates(task.gates);
    if (blockingGates.length === 0 && !task.blocker) continue;

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
    });
  }

  for (const incident of ctx.activeIncidents.filter((i) => !i.linkedRepairId).slice(0, 1)) {
    proposals.push({
      id: `apr-repair-${incident.id}`,
      title: `Open repair workflow for ${incident.serviceName}`,
      summary: `Sev ${incident.severity} incident "${incident.title}" has no linked repair task.`,
      recommendedAction: `Create repair workflow for ${incident.serviceName} and link to ${incident.id}.`,
      riskNote: "Repair workflow may pause dependent build and deploy tasks.",
      status: "pending",
      createdAt: incident.openedAt,
      specialist: "Research Agent",
    });
  }

  for (const deploy of ctx.blockedDeploys.slice(0, 1)) {
    proposals.push({
      id: `apr-deploy-${deploy.id}`,
      title: `Release ${deploy.serviceName} deploy hold`,
      summary: `${deploy.title} is planned but waiting on upstream build gates.`,
      recommendedAction: `Confirm gate clearance or approve deploy hold override for ${deploy.id}.`,
      riskNote: "Deploying before gates pass may ship unverified changes.",
      status: "pending",
      createdAt: deploy.createdAt,
      specialist: "Workflow Gate Agent",
    });
  }

  for (const customer of ctx.waitingCustomers.slice(0, 1)) {
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
    });
  }

  for (const task of ctx.tasksMissingCustomer.slice(0, 1)) {
    const workOrder = resolveTaskContextFromTask(task, contextData);
    proposals.push({
      id: `apr-customer-${task.id}`,
      title: `Link customer to ${task.id}`,
      summary: `${task.title} (${task.workflowType}) has no confirmed customer link.`,
      recommendedAction: `Attach a customer record to ${task.id} — work order: ${workOrder.workOrderName}.`,
      riskNote: "Missing customer context can delay SLA tracking and billing attribution.",
      status: "pending",
      createdAt: task.updatedAt,
    });
  }

  return proposals;
}

const DEFAULT_RESPONSE: ChiefResponse = {
  summary:
    "Reviewed your request against current operational context. No immediate conflicts detected.",
  recommendedAction:
    "Try a focused query: at-risk items, blockers, pending approvals, or missing customer context.",
  routedTo: "Chief",
};

function resolveRiskToday(ctx: ChiefLiveContext): ChiefResponse {
  const { stats, focusItems, openTaskCount, blockingTasks, activeIncidents } = ctx;

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

  const summary = [
    `${openTaskCount} open task(s).`,
    focusSummary,
    incidentSummary,
    blockerSummary,
    `${stats.openWorkOrders} open work order(s), ${stats.overduePMs} overdue PM(s).`,
  ].join(" ");

  const recommendedAction =
    focusItems.length > 0
      ? `Start with focus queue item "${focusItems[0].title}" (${focusItems[0].reason}).`
      : blockingTasks.length > 0
        ? `Address blockers on ${blockingTasks[0].id} before taking new work.`
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
    approvalNeeded: customerGaps.length > 0,
    approvalTitle:
      customerGaps.length > 0
        ? `Link customer to ${ctx.tasksMissingCustomer[0].id}`
        : undefined,
    approvalPrompt:
      customerGaps.length > 0
        ? `Propose customer link for ${ctx.tasksMissingCustomer[0].title}?`
        : undefined,
    riskNote: "Proposal only — customer links must be confirmed in the task record.",
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

  if (/\b(incident|alert|monitor|sev|uptime|degrad)\b/i.test(trimmed)) {
    return resolveIncidents(ctx);
  }

  if (/\b(knowledge|doc|search|library|note|obsidian|runbook)\b/i.test(trimmed)) {
    return resolveKnowledge(data, trimmed);
  }

  return {
    ...DEFAULT_RESPONSE,
    summary: `Received: "${trimmed}". No specialist match — Chief handled this directly against live queue state (${ctx.openTaskCount} open tasks).`,
  };
}
