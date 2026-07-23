/**
 * Research assignment model — operator-driven dispatch lane for Chief.
 * Session-local / controlled; not a live researcher backend.
 */
import type { ProjectToolScope } from "@/data/projects";

export type ResearchAssignmentStatus =
  | "draft"
  | "ready"
  | "sent"
  | "completed"
  | "failed";

export type ResearchAssignmentLane =
  | "general"
  | "competitive"
  | "operations"
  | "customer";

/** How send is fulfilled — honest label for UI. */
export type ResearchDispatchMode = "local_controlled";

export type ResearchAssignmentResultSource = "operator_recorded" | "controlled_local";

/** @deprecated Use `"controlled_local"` — kept only for reading older session payloads. */
export type ResearchAssignmentResultSourceLegacy = "controlled_stub";

export interface ResearchAssignmentResult {
  summary: string;
  findings: string[];
  recommendedNextStep: string;
  recordedAt: string;
  source: ResearchAssignmentResultSource;
}

export interface ResearchAssignment {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  topic: string;
  prompt: string;
  requestedOutput: string;
  researcherLane: ResearchAssignmentLane;
  status: ResearchAssignmentStatus;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  result?: ResearchAssignmentResult;
  dispatchMode: ResearchDispatchMode;
  /** Linked approval proposal when send is gated. */
  proposalId?: string;
}

export const RESEARCH_ASSIGNMENT_DISPATCH_KIND = "research:assignment-dispatch";

export const RESEARCH_ASSIGNMENT_LANE_LABEL: Record<ResearchAssignmentLane, string> = {
  general: "General research",
  competitive: "Competitive research",
  operations: "Operations research",
  customer: "Customer research",
};

export const RESEARCH_ASSIGNMENT_STATUS_LABEL: Record<ResearchAssignmentStatus, string> = {
  draft: "Draft",
  ready: "Ready to send",
  sent: "Sent (local)",
  completed: "Completed",
  failed: "Failed",
};

/** Operator-facing result provenance — never imply a live backend. */
export const RESEARCH_RESULT_SOURCE_LABEL: Record<ResearchAssignmentResultSource, string> = {
  controlled_local: "Controlled / local (no live backend)",
  operator_recorded: "Operator-recorded (no live backend)",
};

export const RESEARCH_DISPATCH_MODE_LABEL: Record<ResearchDispatchMode, string> = {
  local_controlled: "local_controlled — operator-driven; no live researcher backend",
};

export function matchResearchAssignmentIntent(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  if (
    /\b(research assignment|assign research|create a research|create research)\b/i.test(trimmed)
  ) {
    return true;
  }

  if (
    /\b(research|investigate|look into)\b/i.test(trimmed) &&
    /\b(competitor|competitors|competitive|customer|market|ops|operations|for this project|on this project)\b/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  if (/\b(send|dispatch)\b/i.test(trimmed) && /\bresearch\b/i.test(trimmed)) {
    return true;
  }

  return false;
}

export function detectResearchAssignmentLane(command: string): ResearchAssignmentLane {
  if (/\b(competitor|competitors|competitive|rival)\b/i.test(command)) return "competitive";
  if (/\b(customer|client|account)\b/i.test(command)) return "customer";
  if (/\b(ops|operations|jobsite|crew|field)\b/i.test(command)) return "operations";
  return "general";
}

export function extractResearchAssignmentTopic(command: string): string {
  const cleaned = command
    .replace(/\b(create|new|send|dispatch|assign|prepare|please)\b/gi, " ")
    .replace(/\b(a|an|the|this|for|on|about|research|assignment|investigate|look into)\b/gi, " ")
    .replace(/\b(project)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    const lane = detectResearchAssignmentLane(command);
    if (lane === "competitive") return "Competitors";
    if (lane === "customer") return "Customer context";
    if (lane === "operations") return "Operations context";
    return "Project research";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function defaultRequestedOutput(lane: ResearchAssignmentLane): string {
  switch (lane) {
    case "competitive":
      return "Short competitive scan: who they are, overlap with this project, risks, and one recommended next check.";
    case "customer":
      return "Customer/context brief: known facts, open questions, and one recommended follow-up.";
    case "operations":
      return "Ops research note: current friction, evidence, and one practical next action.";
    default:
      return "Structured research brief: findings, open questions, and recommended next step.";
  }
}

export function buildResearchAssignment(input: {
  scope: ProjectToolScope;
  command: string;
  assignmentId: string;
  now?: Date;
}): ResearchAssignment {
  const now = input.now ?? new Date();
  const topic = extractResearchAssignmentTopic(input.command);
  const researcherLane = detectResearchAssignmentLane(input.command);

  return {
    id: input.assignmentId,
    projectId: input.scope.projectId,
    projectName: input.scope.projectName,
    title: `Research: ${topic}`,
    topic,
    prompt: input.command.trim(),
    requestedOutput: defaultRequestedOutput(researcherLane),
    researcherLane,
    status: "ready",
    createdAt: now.toISOString(),
    dispatchMode: "local_controlled",
  };
}

export function buildControlledLocalResult(
  assignment: ResearchAssignment,
  now = new Date(),
): ResearchAssignmentResult {
  const lane = RESEARCH_ASSIGNMENT_LANE_LABEL[assignment.researcherLane];
  return {
    summary: `Controlled/local research result for “${assignment.topic}” (${lane}) on ${assignment.projectName}. Operator closed the workflow without a live researcher backend.`,
    findings: [
      `Asked: ${assignment.prompt}`,
      `Lane: ${lane}`,
      `Requested output: ${assignment.requestedOutput}`,
      "Dispatch mode remained local_controlled — no live researcher backend ran.",
    ],
    recommendedNextStep:
      "Review findings, then decide the next ops action in Chief (or record an operator result next time).",
    recordedAt: now.toISOString(),
    source: "controlled_local",
  };
}

/** @deprecated Prefer buildControlledLocalResult — same controlled/local payload. */
export function buildControlledStubResult(
  assignment: ResearchAssignment,
  now = new Date(),
): ResearchAssignmentResult {
  return buildControlledLocalResult(assignment, now);
}

/** Normalize legacy result source values from older session payloads. */
export function normalizeResearchResultSource(
  source: ResearchAssignmentResultSource | ResearchAssignmentResultSourceLegacy | string,
): ResearchAssignmentResultSource {
  if (source === "controlled_stub" || source === "controlled_local") return "controlled_local";
  if (source === "operator_recorded") return "operator_recorded";
  return "controlled_local";
}

export function buildOperatorRecordedResult(input: {
  summary: string;
  findings?: string[];
  recommendedNextStep?: string;
  now?: Date;
}): ResearchAssignmentResult {
  const summary = input.summary.trim() || "Operator-recorded research result.";
  return {
    summary,
    findings: input.findings?.map((f) => f.trim()).filter(Boolean) ?? [summary],
    recommendedNextStep:
      input.recommendedNextStep?.trim() || "Review with Chief and decide the next ops action.",
    recordedAt: (input.now ?? new Date()).toISOString(),
    source: "operator_recorded",
  };
}
