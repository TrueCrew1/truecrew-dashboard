/**
 * Deterministic Chief command router.
 * Shared by the dashboard client and POST /api/chief/command.
 * AI fallback is NOT here — see chiefAiFallback.ts / runChiefCommand.ts.
 */

import {
  formatOpenGateSummary,
  getBlockingGates,
} from "../stage-change.js";
import { NO_CUSTOMER_LINKED } from "../task-context.js";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../missions/types.js";
import type { Task } from "../../src/types/index.js";
import type {
  ChiefCommandApprovalCandidate,
  ChiefCommandKnowledgeLibrary,
  ChiefCommandLiveContext,
  ChiefCommandResult,
  ChiefCommandWorkflowRef,
} from "./commandTypes.js";

const DEFAULT_RESPONSE: ChiefCommandResult = {
  summary:
    "Reviewed your request against current operational context. No immediate conflicts detected.",
  recommendedAction:
    "Try a focused query: at-risk items, blockers, pending approvals, or missing customer context.",
  routedTo: "Chief",
  matched: false,
  resolution: "deterministic",
};

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

function resolveRiskToday(ctx: ChiefCommandLiveContext): ChiefCommandResult {
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
    matched: true,
    resolution: "deterministic",
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

function resolveBlocked(ctx: ChiefCommandLiveContext): ChiefCommandResult {
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
      matched: true,
      resolution: "deterministic",
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
    matched: true,
    resolution: "deterministic",
    specialists: [
      {
        specialist: "Workflow Gate Agent",
        contribution: `${ctx.blockingTasks.length} blocked task(s), ${ctx.blockedDeploys.length} held deploy(s)`,
      },
    ],
  };
}

function resolveApprovals(candidates: ChiefCommandApprovalCandidate[]): ChiefCommandResult {
  const pending = candidates.filter((proposal) => proposal.status === "pending");

  if (pending.length === 0) {
    return {
      summary: "No pending approval candidates from current workflow state.",
      recommendedAction: "Check blockers or focus queue for new situations that need a decision.",
      routedTo: "Chief",
      matched: true,
      resolution: "deterministic",
    };
  }

  const titles = pending.map((proposal) => proposal.title).join("; ");

  return {
    summary: `${pending.length} approval candidate(s) need review: ${titles}.`,
    recommendedAction:
      "Open the Approvals tab to review each proposal — nothing executes until you decide.",
    routedTo: "Chief",
    matched: true,
    resolution: "deterministic",
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

function resolveMissingContext(ctx: ChiefCommandLiveContext): ChiefCommandResult {
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
      matched: true,
      resolution: "deterministic",
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
    matched: true,
    resolution: "deterministic",
  };
}

function resolveIncidents(ctx: ChiefCommandLiveContext): ChiefCommandResult {
  if (ctx.activeIncidents.length === 0) {
    return {
      summary: "No active Sev 1–2 incidents. Monitor feed shows no elevated alerts requiring triage.",
      recommendedAction: "Check blocked deploys or focus queue for operational risk.",
      routedTo: "Research Agent",
      matched: true,
      resolution: "deterministic",
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
    matched: true,
    resolution: "deterministic",
    specialists: [
      {
        specialist: "Research Agent",
        contribution: `Correlated ${ctx.activeIncidents.length} active incident(s) with service health`,
      },
    ],
  };
}

function resolveAlerts(
  ctx: ChiefCommandLiveContext,
  approvalCandidates: ChiefCommandApprovalCandidate[],
): ChiefCommandResult {
  if (ctx.alerts.length === 0) {
    return {
      summary: "No open alerts in the current dashboard feed.",
      recommendedAction: "Run a status overview or check blockers for latent risk.",
      routedTo: "Chief",
      matched: true,
      resolution: "deterministic",
    };
  }

  const alertApprovals = approvalCandidates.filter(
    (p) => p.category === "alert_action" && p.status === "pending",
  );
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
    matched: true,
    resolution: "deterministic",
    specialists: [
      {
        specialist: "Workflow Gate Agent",
        contribution: `Correlated ${ctx.alerts.length} alert(s) with gate and deploy state`,
      },
    ],
  };
}

function resolveKnowledge(
  knowledge: ChiefCommandKnowledgeLibrary,
  input: string,
): ChiefCommandResult {
  const terms = input
    .toLowerCase()
    .replace(/\b(knowledge|doc|search|library|note|obsidian|runbook|for)\b/gi, " ")
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  const sources = [
    ...knowledge.runbooks.map((entry) => ({
      kind: "runbook",
      title: entry.title,
      tags: entry.tags,
    })),
    ...knowledge.prompts.map((entry) => ({
      kind: "prompt",
      title: entry.title,
      tags: entry.tags,
    })),
    ...knowledge.notes.map((entry) => ({
      kind: "note",
      title: entry.title,
      tags: [] as string[],
    })),
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
      matched: true,
      resolution: "deterministic",
      specialists: [
        { specialist: "Librarian Agent", contribution: "Indexed local runbooks, prompts, and notes" },
      ],
    };
  }

  return {
    summary: `Found ${top.length} knowledge entr${top.length === 1 ? "y" : "ies"}: ${top.map((e) => e.title).join("; ")}.`,
    recommendedAction: `Open "${top[0].title}" in AI & Knowledge and attach to the relevant task if applicable.`,
    routedTo: "Librarian Agent",
    matched: true,
    resolution: "deterministic",
    specialists: [
      {
        specialist: "Librarian Agent",
        contribution: `Matched ${matched.length} document(s) from local library`,
      },
    ],
  };
}

/**
 * Command intent → Research monitor-incident-postmortem mission proposal.
 * Approve uses the existing ChiefPanel → executeMonitorIncidentPostmortemMission path.
 */
function resolveProposePostmortem(
  ctx: ChiefCommandLiveContext,
  approvalCandidates: ChiefCommandApprovalCandidate[],
): ChiefCommandResult {
  if (ctx.activeIncidents.length === 0) {
    return {
      summary: "No active Sev 1–2 incident to draft a postmortem against.",
      recommendedAction: "Open Monitor when an incident is active, then ask again.",
      routedTo: "Research Agent",
      matched: true,
      resolution: "deterministic",
      specialists: [
        { specialist: "Research Agent", contribution: "Postmortem request — no active incident" },
      ],
    };
  }

  const primary = ctx.activeIncidents[0];
  const alreadyPending = approvalCandidates.some(
    (p) =>
      p.status === "pending" &&
      (p.id.includes(primary.id) || p.title.toLowerCase().includes(primary.title.toLowerCase())),
  );

  if (alreadyPending) {
    return {
      summary: `A pending approval already covers incident ${primary.id} (${primary.title}).`,
      recommendedAction: "Open Approvals and decide on the existing card — do not duplicate.",
      routedTo: "Research Agent",
      matched: true,
      resolution: "deterministic",
    };
  }

  return {
    summary: `Propose Research postmortem for Sev ${primary.severity} "${primary.title}" on ${primary.serviceName}.`,
    recommendedAction:
      "Approve in Chief → Approvals to run research:monitor-incident-postmortem (Obsidian note + mission record).",
    approvalNeeded: true,
    approvalTitle: `Monitor incident postmortem: ${primary.title}`,
    approvalPrompt: `Run Research postmortem mission for incident ${primary.id}?`,
    riskNote: "Mission writes vault artifacts only after approval; nothing runs from this command alone.",
    routedTo: "Research Agent",
    matched: true,
    resolution: "deterministic",
    missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
    missionProjectId: primary.id,
    specialists: [
      {
        specialist: "Research Agent",
        contribution: `Postmortem proposal for ${primary.id}`,
      },
    ],
  };
}

/**
 * Command intent → Research project-summary-handoff mission proposal.
 */
function resolveProposeHandoff(
  workflows: ChiefCommandWorkflowRef[],
  approvalCandidates: ChiefCommandApprovalCandidate[],
): ChiefCommandResult {
  const eligible = workflows.filter((w) => w.stage === "In Progress" || w.stage === "Review");
  const primary = eligible[0] ?? workflows[0];

  if (!primary) {
    return {
      summary: "No workflow/project available for a project-summary handoff.",
      recommendedAction: "Open Builds when a workflow exists, then ask again.",
      routedTo: "Research Agent",
      matched: true,
      resolution: "deterministic",
    };
  }

  const alreadyPending = approvalCandidates.some(
    (p) => p.status === "pending" && p.id.includes(primary.id),
  );

  if (alreadyPending) {
    return {
      summary: `A pending handoff approval already covers project ${primary.id} (${primary.title}).`,
      recommendedAction: "Open Approvals and decide on the existing card.",
      routedTo: "Research Agent",
      matched: true,
      resolution: "deterministic",
    };
  }

  return {
    summary: `Propose Research project summary + build handoff for "${primary.title}" (${primary.stage}).`,
    recommendedAction:
      "Approve in Chief → Approvals to run research:project-summary-handoff.",
    approvalNeeded: true,
    approvalTitle: `Project summary handoff: ${primary.title}`,
    approvalPrompt: `Run Research handoff mission for project ${primary.id}?`,
    riskNote: "Mission loads Supabase context and writes Obsidian handoff artifacts only after approval.",
    routedTo: "Research Agent",
    matched: true,
    resolution: "deterministic",
    missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    missionProjectId: primary.id,
    specialists: [
      {
        specialist: "Research Agent",
        contribution: `Handoff proposal for ${primary.id}`,
      },
    ],
  };
}

export function isUnmatchedChiefCommandResult(result: ChiefCommandResult): boolean {
  return result.matched === false;
}

export interface ResolveChiefCommandInput {
  prompt: string;
  liveContext: ChiefCommandLiveContext;
  knowledge: ChiefCommandKnowledgeLibrary;
  approvals: ChiefCommandApprovalCandidate[];
  workflows?: ChiefCommandWorkflowRef[];
}

/**
 * Deterministic regex/rule router. Does not call AI.
 * Unmatched prompts return matched:false so runChiefCommand can invoke AI fallback.
 */
export function resolveChiefCommand(input: ResolveChiefCommandInput): ChiefCommandResult {
  const trimmed = input.prompt.trim();
  if (!trimmed) return DEFAULT_RESPONSE;

  const { liveContext: ctx, knowledge, approvals, workflows = [] } = input;

  if (
    /\b(postmortem|post-mortem)\b/i.test(trimmed) ||
    (/\b(draft|propose|run)\b/i.test(trimmed) &&
      /\bresearch\b/i.test(trimmed) &&
      /\bincident\b/i.test(trimmed))
  ) {
    return resolveProposePostmortem(ctx, approvals);
  }

  if (
    /\b(handoff|project summary)\b/i.test(trimmed) &&
    /\b(propose|draft|run|research|ask)\b/i.test(trimmed)
  ) {
    return resolveProposeHandoff(workflows, approvals);
  }

  if (
    /\b(approv|approval)\b/i.test(trimmed) ||
    (/\b(review|pending)\b/i.test(trimmed) && /\b(show|need|my|what)\b/i.test(trimmed))
  ) {
    return resolveApprovals(approvals);
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
    return resolveAlerts(ctx, approvals);
  }

  if (/\b(knowledge|doc|search|library|note|obsidian|runbook)\b/i.test(trimmed)) {
    return resolveKnowledge(knowledge, trimmed);
  }

  return {
    ...DEFAULT_RESPONSE,
    summary: `Received: "${trimmed}". No specialist match — Chief handled this directly against live queue state (${ctx.openTaskCount} open tasks).`,
  };
}
