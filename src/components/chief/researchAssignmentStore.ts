/**
 * Session store + governed transitions for research assignments.
 * Local/controlled only — no background researcher swarm.
 *
 * Audit records mirror the draft/write mutation style: every transition
 * captures assignment identity, project, topic, lane, requested output,
 * dispatch mode, status, timestamps, and result provenance when present.
 */
import {
  buildControlledLocalResult,
  RESEARCH_RESULT_SOURCE_LABEL,
  type ResearchAssignment,
  type ResearchAssignmentLane,
  type ResearchAssignmentResult,
  type ResearchAssignmentResultSource,
  type ResearchAssignmentStatus,
  type ResearchDispatchMode,
} from "@/lib/chief/researchAssignment";

export interface ResearchAssignmentAudit {
  assignmentId: string;
  projectId: string;
  projectName: string;
  topic: string;
  requestedOutput: string;
  researcherLane: ResearchAssignmentLane;
  dispatchMode: ResearchDispatchMode;
  /** Human-readable target: project / lane. */
  target: string;
  action: "created" | "sent" | "completed" | "failed" | "duplicate_skipped";
  status: ResearchAssignmentStatus;
  attemptedAt: string;
  createdAt?: string;
  sentAt?: string;
  completedAt?: string;
  failedAt?: string;
  resultSource?: ResearchAssignmentResultSource;
  resultSummary?: string;
  detail?: string;
}

export type ResearchAssignmentTransitionOutcome =
  | {
      ok: true;
      kind: "sent" | "completed" | "duplicate_skipped";
      assignment: ResearchAssignment;
      message: string;
      audit: ResearchAssignmentAudit;
    }
  | {
      ok: false;
      kind: "failed";
      assignment: ResearchAssignment | null;
      message: string;
      audit: ResearchAssignmentAudit | null;
    };

type Listener = () => void;

const assignmentsById = new Map<string, ResearchAssignment>();
const auditsByAssignmentId = new Map<string, ResearchAssignmentAudit[]>();
const sendInFlight = new Set<string>();
const completeInFlight = new Set<string>();
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeResearchAssignments(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listResearchAssignments(): ResearchAssignment[] {
  return [...assignmentsById.values()].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

export function getResearchAssignment(id: string): ResearchAssignment | null {
  return assignmentsById.get(id) ?? null;
}

export function getResearchAssignmentAudits(id: string): ResearchAssignmentAudit[] {
  return [...(auditsByAssignmentId.get(id) ?? [])];
}

function baseAuditFields(assignment: ResearchAssignment): Omit<
  ResearchAssignmentAudit,
  "action" | "status" | "attemptedAt" | "detail" | "resultSource" | "resultSummary"
> {
  return {
    assignmentId: assignment.id,
    projectId: assignment.projectId,
    projectName: assignment.projectName,
    topic: assignment.topic,
    requestedOutput: assignment.requestedOutput,
    researcherLane: assignment.researcherLane,
    dispatchMode: assignment.dispatchMode,
    target: `${assignment.projectName} / ${assignment.researcherLane}`,
    createdAt: assignment.createdAt,
    sentAt: assignment.sentAt,
    completedAt: assignment.completedAt,
    failedAt: assignment.failedAt,
  };
}

function pushAudit(audit: ResearchAssignmentAudit): void {
  const prev = auditsByAssignmentId.get(audit.assignmentId) ?? [];
  auditsByAssignmentId.set(audit.assignmentId, [...prev, audit]);
}

export function upsertResearchAssignment(assignment: ResearchAssignment): ResearchAssignment {
  const existing = assignmentsById.get(assignment.id);
  if (
    existing &&
    (existing.status === "sent" ||
      existing.status === "completed" ||
      existing.status === "failed")
  ) {
    return existing;
  }

  // Same id already ready/draft — keep the live record; do not spam created audits
  // or overwrite proposal linkage / timestamps.
  if (existing && (existing.status === "ready" || existing.status === "draft")) {
    return existing;
  }

  const next = { ...assignment };
  assignmentsById.set(next.id, next);
  pushAudit({
    ...baseAuditFields(next),
    action: "created",
    status: next.status,
    attemptedAt: next.createdAt,
    detail: "Assignment created — send gated behind approval",
  });
  emit();
  return next;
}

export function linkResearchAssignmentProposal(
  assignmentId: string,
  proposalId: string,
): ResearchAssignment | null {
  const existing = assignmentsById.get(assignmentId);
  if (!existing) return null;
  if (existing.proposalId === proposalId) return existing;
  const next = { ...existing, proposalId };
  assignmentsById.set(assignmentId, next);
  emit();
  return next;
}

/** Approve → send. Local controlled only; idempotent. */
export function sendResearchAssignment(input: {
  assignmentId: string;
  now?: Date;
}): ResearchAssignmentTransitionOutcome {
  const assignmentId = input.assignmentId?.trim();
  const attemptedAt = (input.now ?? new Date()).toISOString();

  if (!assignmentId) {
    return {
      ok: false,
      kind: "failed",
      assignment: null,
      message: "Research assignment id is required.",
      audit: null,
    };
  }

  const existing = assignmentsById.get(assignmentId);

  if (!existing) {
    return {
      ok: false,
      kind: "failed",
      assignment: null,
      message: "Research assignment not found.",
      audit: null,
    };
  }

  if (existing.status === "sent" || existing.status === "completed") {
    const audit: ResearchAssignmentAudit = {
      ...baseAuditFields(existing),
      action: "duplicate_skipped",
      status: existing.status,
      attemptedAt,
      detail: existing.status,
      resultSource: existing.result?.source,
      resultSummary: existing.result?.summary,
    };
    pushAudit(audit);
    emit();
    return {
      ok: true,
      kind: "duplicate_skipped",
      assignment: existing,
      message: `Already sent — duplicate dispatch skipped for “${existing.topic}”.`,
      audit,
    };
  }

  if (existing.status === "failed") {
    return {
      ok: false,
      kind: "failed",
      assignment: existing,
      message: `Cannot send a failed assignment — create a new research assignment.`,
      audit: null,
    };
  }

  if (sendInFlight.has(existing.id)) {
    const audit: ResearchAssignmentAudit = {
      ...baseAuditFields(existing),
      action: "duplicate_skipped",
      status: existing.status,
      attemptedAt,
      detail: "in_progress",
    };
    pushAudit(audit);
    return {
      ok: true,
      kind: "duplicate_skipped",
      assignment: existing,
      message: `Send already in progress for “${existing.topic}”.`,
      audit,
    };
  }

  if (existing.status !== "ready" && existing.status !== "draft") {
    return {
      ok: false,
      kind: "failed",
      assignment: existing,
      message: `Cannot send assignment in status “${existing.status}”.`,
      audit: null,
    };
  }

  sendInFlight.add(existing.id);
  try {
    const next: ResearchAssignment = {
      ...existing,
      status: "sent",
      sentAt: attemptedAt,
    };
    assignmentsById.set(next.id, next);
    const audit: ResearchAssignmentAudit = {
      ...baseAuditFields(next),
      action: "sent",
      status: "sent",
      attemptedAt,
      detail: "local_controlled — no live researcher backend",
    };
    pushAudit(audit);
    emit();
    return {
      ok: true,
      kind: "sent",
      assignment: next,
      message: `Sent research assignment “${next.topic}” to Research Agent lane (${next.researcherLane}) in local_controlled mode. No live researcher backend ran — record a result when ready.`,
      audit,
    };
  } finally {
    sendInFlight.delete(existing.id);
  }
}

export function completeResearchAssignment(input: {
  assignmentId: string;
  result: ResearchAssignmentResult;
}): ResearchAssignmentTransitionOutcome {
  const assignmentId = input.assignmentId?.trim();
  const attemptedAt = input.result.recordedAt;

  if (!assignmentId) {
    return {
      ok: false,
      kind: "failed",
      assignment: null,
      message: "Research assignment id is required.",
      audit: null,
    };
  }

  if (!input.result.summary?.trim()) {
    return {
      ok: false,
      kind: "failed",
      assignment: assignmentsById.get(assignmentId) ?? null,
      message: "Result summary is required to complete a research assignment.",
      audit: null,
    };
  }

  const existing = assignmentsById.get(assignmentId);

  if (!existing) {
    return {
      ok: false,
      kind: "failed",
      assignment: null,
      message: "Research assignment not found.",
      audit: null,
    };
  }

  if (existing.status === "completed" && existing.result) {
    const audit: ResearchAssignmentAudit = {
      ...baseAuditFields(existing),
      action: "duplicate_skipped",
      status: "completed",
      attemptedAt,
      detail: "completed — result retained",
      resultSource: existing.result.source,
      resultSummary: existing.result.summary,
    };
    pushAudit(audit);
    emit();
    return {
      ok: true,
      kind: "duplicate_skipped",
      assignment: existing,
      message: `Already completed — duplicate result skipped for “${existing.topic}”. Prior result retained.`,
      audit,
    };
  }

  if (completeInFlight.has(existing.id)) {
    const audit: ResearchAssignmentAudit = {
      ...baseAuditFields(existing),
      action: "duplicate_skipped",
      status: existing.status,
      attemptedAt,
      detail: "complete_in_progress",
    };
    pushAudit(audit);
    return {
      ok: true,
      kind: "duplicate_skipped",
      assignment: existing,
      message: `Result recording already in progress for “${existing.topic}”.`,
      audit,
    };
  }

  if (existing.status !== "sent") {
    return {
      ok: false,
      kind: "failed",
      assignment: existing,
      message: `Cannot record a result while status is “${existing.status}” (send first).`,
      audit: null,
    };
  }

  completeInFlight.add(existing.id);
  try {
    const next: ResearchAssignment = {
      ...existing,
      status: "completed",
      completedAt: attemptedAt,
      result: input.result,
      error: undefined,
    };
    assignmentsById.set(next.id, next);
    const audit: ResearchAssignmentAudit = {
      ...baseAuditFields(next),
      action: "completed",
      status: "completed",
      attemptedAt,
      detail: input.result.source,
      resultSource: input.result.source,
      resultSummary: input.result.summary,
    };
    pushAudit(audit);
    emit();
    return {
      ok: true,
      kind: "completed",
      assignment: next,
      message: `Research workflow complete for “${next.topic}”. ${
        next.result
          ? RESEARCH_RESULT_SOURCE_LABEL[next.result.source]
          : "Controlled / local (no live backend)"
      }.`,
      audit,
    };
  } finally {
    completeInFlight.delete(existing.id);
  }
}

/** Close a sent assignment with an explicit controlled/local result (no live backend). */
export function completeResearchAssignmentWithControlledResult(input: {
  assignmentId: string;
  now?: Date;
}): ResearchAssignmentTransitionOutcome {
  const existing = assignmentsById.get(input.assignmentId);
  if (!existing) {
    return {
      ok: false,
      kind: "failed",
      assignment: null,
      message: "Research assignment not found.",
      audit: null,
    };
  }
  return completeResearchAssignment({
    assignmentId: input.assignmentId,
    result: buildControlledLocalResult(existing, input.now),
  });
}

/** @deprecated Prefer completeResearchAssignmentWithControlledResult — same behavior. */
export function completeResearchAssignmentWithStub(input: {
  assignmentId: string;
  now?: Date;
}): ResearchAssignmentTransitionOutcome {
  return completeResearchAssignmentWithControlledResult(input);
}

export function failResearchAssignment(input: {
  assignmentId: string;
  error: string;
  now?: Date;
}): ResearchAssignmentTransitionOutcome {
  const existing = assignmentsById.get(input.assignmentId);
  const attemptedAt = (input.now ?? new Date()).toISOString();
  if (!existing) {
    return {
      ok: false,
      kind: "failed",
      assignment: null,
      message: "Research assignment not found.",
      audit: null,
    };
  }

  if (existing.status === "completed") {
    return {
      ok: false,
      kind: "failed",
      assignment: existing,
      message: `Cannot fail a completed assignment — result already recorded.`,
      audit: null,
    };
  }

  if (existing.status === "failed") {
    const audit: ResearchAssignmentAudit = {
      ...baseAuditFields(existing),
      action: "duplicate_skipped",
      status: "failed",
      attemptedAt,
      detail: existing.error ?? "failed",
    };
    pushAudit(audit);
    emit();
    return {
      ok: true,
      kind: "duplicate_skipped",
      assignment: existing,
      message: `Already failed — duplicate fail skipped for “${existing.topic}”.`,
      audit,
    };
  }

  const next: ResearchAssignment = {
    ...existing,
    status: "failed",
    failedAt: attemptedAt,
    error: input.error.trim() || "Research assignment failed",
  };
  assignmentsById.set(next.id, next);
  const audit: ResearchAssignmentAudit = {
    ...baseAuditFields(next),
    action: "failed",
    status: "failed",
    attemptedAt,
    detail: next.error,
  };
  pushAudit(audit);
  emit();
  return {
    ok: false,
    kind: "failed",
    assignment: next,
    message: `Research assignment failed: ${next.error}`,
    audit,
  };
}

export function resetResearchAssignmentStoreForTests(): void {
  assignmentsById.clear();
  auditsByAssignmentId.clear();
  sendInFlight.clear();
  completeInFlight.clear();
}
