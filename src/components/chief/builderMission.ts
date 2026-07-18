import {
  evaluateApprovalPolicy,
  type ApprovalPolicyResult,
} from "./chiefApprovalPolicy";
import { stableChiefId } from "./chiefMock";
import type { ApprovalProposal } from "./types";

/**
 * Builder mission lifecycle status. Narrow and serializable — this is the
 * runtime contract for the first execution lane, not a full job queue.
 */
export type BuilderMissionStatus = "queued" | "running" | "completed" | "failed";

/**
 * Typed input Chief hands to Builder after an approved, forwardable Build
 * proposal. Kept small and JSON-serializable on purpose.
 */
export interface BuilderMission {
  missionId: string;
  /** Stable work-story / work-item id for this lane — today derived from the proposal. */
  workStoryId: string;
  /** Approval card this mission was launched from — uniqueness key for idempotency. */
  proposalId: string;
  objective: string;
  acceptanceCriteria: string[];
  /** Bounded context from the approved card — evidence / research / playbook when available. */
  context?: {
    evidenceSummary?: string;
    researchSummary?: string;
    playbookId?: string;
  };
  /** When the mission was first created (attempt 1). */
  createdAt: string;
}

/**
 * Typed Builder output. Practical and UI-friendly — not a full agent transcript.
 */
export interface BuilderMissionResult {
  missionId: string;
  status: Extract<BuilderMissionStatus, "completed" | "failed">;
  summary: string;
  /** Which attempt produced this result (1-based). */
  attempt: number;
  artifacts?: {
    branchName?: string;
    prUrl?: string;
    prNumber?: number;
    testsSummary?: string;
    notes?: string;
    failureReason?: string;
  };
  completedAt: string;
}

/**
 * A prior terminal attempt kept when retrying — history is never overwritten.
 */
export interface BuilderMissionAttemptHistory {
  attempt: number;
  status: Extract<BuilderMissionStatus, "completed" | "failed">;
  summary: string;
  failureReason?: string;
  artifacts?: BuilderMissionResult["artifacts"];
  completedAt: string;
}

/**
 * In-session record of a mission through its lifecycle. Session-scoped —
 * same durability bar as proposal bodies (decisions may persist; missions
 * for this slice do not). Uniqueness: one record per proposalId.
 */
export interface BuilderMissionRecord {
  mission: BuilderMission;
  status: BuilderMissionStatus;
  /** Current attempt number (1-based). Increments on each retry. */
  attempt: number;
  /** First creation time for this proposal's mission. */
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  /** Latest terminal result, if any. */
  result?: BuilderMissionResult;
  /** Latest failure reason (mirrors result.artifacts.failureReason when failed). */
  lastError?: string;
  /** Prior terminal attempts preserved across retries. */
  previousResults: BuilderMissionAttemptHistory[];
}

export type BuilderMissionPolicyBlockReason =
  | "not_builder_source"
  | "not_approved"
  | "not_forwardable";

export type BuilderMissionReuseReason =
  | "in_flight"
  | "already_completed"
  | "already_failed";

export type BuilderMissionLaunchBlockReason =
  | BuilderMissionPolicyBlockReason
  | "already_launched"
  | "not_retryable";

/**
 * Centralized start decision — the single place launch / reuse / retry /
 * block are decided. Callers must not invent parallel check-then-create paths.
 */
export type BuilderMissionStartDecision =
  | { kind: "launch"; proposal: ApprovalProposal; policy: ApprovalPolicyResult }
  | {
      kind: "retry";
      proposal: ApprovalProposal;
      policy: ApprovalPolicyResult;
      previous: BuilderMissionRecord;
    }
  | {
      kind: "reuse_existing";
      record: BuilderMissionRecord;
      reason: BuilderMissionReuseReason;
    }
  | { kind: "blocked"; reason: BuilderMissionLaunchBlockReason };

export type BuilderMissionLaunchResult =
  | {
      outcome: "launched";
      record: BuilderMissionRecord;
      /** Intermediate lifecycle snapshots when available. */
      steps?: {
        queued: BuilderMissionRecord;
        running: BuilderMissionRecord;
        final: BuilderMissionRecord;
      };
    }
  | {
      outcome: "reused";
      record: BuilderMissionRecord;
      reason: BuilderMissionReuseReason;
    }
  | {
      outcome: "retried";
      record: BuilderMissionRecord;
      steps?: {
        queued: BuilderMissionRecord;
        running: BuilderMissionRecord;
        final: BuilderMissionRecord;
      };
    }
  | { outcome: "blocked"; reason: BuilderMissionLaunchBlockReason };

/** Sources that may launch a Builder mission after operator approval. */
const BUILDER_MISSION_SOURCES = new Set(["agent_build"]);

/**
 * Deterministic mission id for a proposal so re-approving / re-launching
 * the same card does not invent a new identity.
 */
export function builderMissionIdForProposal(proposalId: string): string {
  return stableChiefId("mission-build", proposalId);
}

/**
 * Work-story id for this slice — no separate WorkStory model exists yet,
 * so we namespace off the proposal id.
 */
export function workStoryIdForProposal(proposalId: string): string {
  return stableChiefId("ws-build", proposalId);
}

/** Find the single mission record for a proposal (uniqueness key). */
export function findMissionForProposal(
  missions: readonly BuilderMissionRecord[],
  proposalId: string,
): BuilderMissionRecord | undefined {
  const missionId = builderMissionIdForProposal(proposalId);
  return missions.find((record) => record.mission.missionId === missionId);
}

export function isMissionInFlight(record: BuilderMissionRecord): boolean {
  return record.status === "queued" || record.status === "running";
}

/**
 * Policy-only eligibility (source / approved / forwardable). Does not
 * consider existing missions — use decideBuilderMissionStart for that.
 */
export function passesBuilderMissionPolicy(
  proposal: ApprovalProposal,
): { ok: true; policy: ApprovalPolicyResult } | { ok: false; reason: BuilderMissionPolicyBlockReason } {
  if (!proposal.source || !BUILDER_MISSION_SOURCES.has(proposal.source)) {
    return { ok: false, reason: "not_builder_source" };
  }

  if (proposal.status !== "approved") {
    return { ok: false, reason: "not_approved" };
  }

  const policy = evaluateApprovalPolicy({ proposal });
  const forwardable =
    proposal.routingDisposition === "forwarded" || policy.canApprove;

  if (!forwardable) {
    return { ok: false, reason: "not_forwardable" };
  }

  return { ok: true, policy };
}

/**
 * Whether a failed mission may be retried under current policy.
 * Completed missions are not retryable in this slice — only failed ones.
 */
export function canRetryBuilderMission(
  proposal: ApprovalProposal,
  record: BuilderMissionRecord,
): { ok: true; policy: ApprovalPolicyResult } | { ok: false; reason: BuilderMissionLaunchBlockReason } {
  if (record.status !== "failed") {
    return { ok: false, reason: "not_retryable" };
  }
  const policyCheck = passesBuilderMissionPolicy(proposal);
  if (!policyCheck.ok) return policyCheck;
  return { ok: true, policy: policyCheck.policy };
}

/**
 * Centralized launch / reuse / retry decision. Pure and race-safe when
 * called inside a single setState updater over the missions list.
 *
 * Rules (keyed by proposalId → stable missionId):
 * 1. Policy must pass (builder source, approved, forwardable + evidence).
 * 2. No existing mission → launch (attempt 1).
 * 3. Existing queued/running → reuse (suppress duplicate).
 * 4. Existing completed → reuse (no silent re-run).
 * 5. Existing failed + explicitRetry → retry (increment attempt, keep history).
 * 6. Existing failed without explicitRetry → reuse (suppress duplicate;
 *    caller must use the retry path to start another attempt).
 */
export function decideBuilderMissionStart(
  proposal: ApprovalProposal,
  existingMissions: readonly BuilderMissionRecord[],
  options: { explicitRetry?: boolean } = {},
): BuilderMissionStartDecision {
  const policyCheck = passesBuilderMissionPolicy(proposal);
  if (!policyCheck.ok) {
    return { kind: "blocked", reason: policyCheck.reason };
  }

  const existing = findMissionForProposal(existingMissions, proposal.id);

  if (!existing) {
    return { kind: "launch", proposal, policy: policyCheck.policy };
  }

  if (isMissionInFlight(existing)) {
    return { kind: "reuse_existing", record: existing, reason: "in_flight" };
  }

  if (existing.status === "completed") {
    return { kind: "reuse_existing", record: existing, reason: "already_completed" };
  }

  // failed
  if (options.explicitRetry) {
    const retryCheck = canRetryBuilderMission(proposal, existing);
    if (!retryCheck.ok) {
      return { kind: "blocked", reason: retryCheck.reason };
    }
    return {
      kind: "retry",
      proposal,
      policy: retryCheck.policy,
      previous: existing,
    };
  }

  // Failed without explicit retry — suppress duplicate launches from
  // approve replay / double-click; UI must call the retry path.
  return {
    kind: "reuse_existing",
    record: existing,
    reason: "already_failed",
  };
}

/**
 * Legacy helper used by older tests: policy gate + "no existing mission".
 * Prefer decideBuilderMissionStart for new code.
 */
export function canLaunchBuilderMission(
  proposal: ApprovalProposal,
  existingMissions: readonly BuilderMissionRecord[] = [],
): { ok: true } | { ok: false; reason: BuilderMissionLaunchBlockReason } {
  const decision = decideBuilderMissionStart(proposal, existingMissions);
  if (decision.kind === "launch") return { ok: true };
  if (decision.kind === "blocked") return { ok: false, reason: decision.reason };
  if (decision.kind === "reuse_existing") {
    return { ok: false, reason: "already_launched" };
  }
  // retry requires explicitRetry — without it, treat as not launchable here
  return { ok: false, reason: "already_launched" };
}

/**
 * Builds a typed BuilderMission from an approved proposal. Caller must
 * have already passed policy checks.
 */
export function createBuilderMissionFromProposal(
  proposal: ApprovalProposal,
  policyResult?: ApprovalPolicyResult,
  createdAt: string = new Date().toISOString(),
): BuilderMission {
  const policy = policyResult ?? evaluateApprovalPolicy({ proposal });
  const acceptanceCriteria =
    proposal.checklist
      ?.filter((item) => item.status === "pass")
      .map((item) => item.label) ?? [];

  return {
    missionId: builderMissionIdForProposal(proposal.id),
    workStoryId: workStoryIdForProposal(proposal.id),
    proposalId: proposal.id,
    objective: proposal.recommendedAction || proposal.summary,
    acceptanceCriteria:
      acceptanceCriteria.length > 0
        ? acceptanceCriteria
        : ["Complete the approved Builder action and report results."],
    context: {
      evidenceSummary: policy.evidenceSummary,
      researchSummary: proposal.summary,
    },
    createdAt,
  };
}

/**
 * Queues a brand-new mission record (attempt 1). Does not run it.
 */
export function queueBuilderMission(
  mission: BuilderMission,
  updatedAt: string = mission.createdAt,
): BuilderMissionRecord {
  return {
    mission,
    status: "queued",
    attempt: 1,
    createdAt: mission.createdAt,
    updatedAt,
    previousResults: [],
  };
}

/**
 * Prepare a failed mission for retry: archive the latest result into
 * previousResults, increment attempt, reset to queued. Does not start work.
 */
export function prepareBuilderMissionRetry(
  record: BuilderMissionRecord,
  now: string = new Date().toISOString(),
): BuilderMissionRecord {
  if (record.status !== "failed") return record;

  const previousResults = [...record.previousResults];
  if (record.result) {
    previousResults.push({
      attempt: record.result.attempt,
      status: record.result.status,
      summary: record.result.summary,
      failureReason: record.result.artifacts?.failureReason ?? record.lastError,
      artifacts: record.result.artifacts,
      completedAt: record.result.completedAt,
    });
  }

  return {
    ...record,
    status: "queued",
    attempt: record.attempt + 1,
    result: undefined,
    lastError: undefined,
    startedAt: undefined,
    previousResults,
    updatedAt: now,
  };
}

/**
 * Deterministic fail signal for the stub runner — used by tests and the
 * fixture path. Not a production agent signal.
 */
export function missionShouldFail(mission: BuilderMission): boolean {
  const haystack = [
    mission.objective,
    mission.context?.researchSummary ?? "",
    ...mission.acceptanceCriteria,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes("[fail]") || haystack.includes("force-fail");
}

/**
 * Moves a queued mission to running. Idempotent only from queued;
 * returns the same record otherwise.
 */
export function startBuilderMission(
  record: BuilderMissionRecord,
  startedAt: string = new Date().toISOString(),
): BuilderMissionRecord {
  if (record.status !== "queued") return record;
  return {
    ...record,
    status: "running",
    startedAt,
    updatedAt: startedAt,
  };
}

/**
 * Produces a typed completed/failed result for a running mission.
 * Deterministic stub — no external LLM or shell. Completes unless the
 * mission payload opts into failure via missionShouldFail().
 */
export function completeBuilderMission(
  record: BuilderMissionRecord,
  completedAt: string = new Date().toISOString(),
): BuilderMissionRecord {
  if (record.status !== "running") return record;

  const { mission } = record;
  const fail = missionShouldFail(mission);

  if (fail) {
    const failureReason =
      "Deterministic stub failure — mission payload requested a fail path.";
    const result: BuilderMissionResult = {
      missionId: mission.missionId,
      status: "failed",
      summary: `Builder mission failed (attempt ${record.attempt}): ${mission.objective}`,
      attempt: record.attempt,
      artifacts: {
        failureReason,
        notes: "No external agent was invoked. Use Retry Builder mission to try again.",
      },
      completedAt,
    };
    return {
      ...record,
      status: "failed",
      result,
      lastError: failureReason,
      updatedAt: completedAt,
    };
  }

  const branchSlug = mission.workStoryId.replace(/^ws-build-/, "build/");
  const result: BuilderMissionResult = {
    missionId: mission.missionId,
    status: "completed",
    summary: `Builder completed (attempt ${record.attempt}): ${mission.objective}`,
    attempt: record.attempt,
    artifacts: {
      branchName: `builder/${branchSlug}`,
      testsSummary: "Stub run — lint/test/build not invoked in this slice.",
      notes:
        mission.context?.evidenceSummary &&
        mission.context.evidenceSummary !== "none linked (needs PR/issue)"
          ? `Evidence carried forward: ${mission.context.evidenceSummary}`
          : "Completed under approved Chief mission contract.",
    },
    completedAt,
  };

  return {
    ...record,
    status: "completed",
    result,
    lastError: undefined,
    updatedAt: completedAt,
  };
}

/**
 * Full stub lifecycle: queued → running → completed|failed.
 * Pure function over a mission — no side effects, no I/O.
 */
export function runBuilderMission(
  mission: BuilderMission,
  now: () => string = () => new Date().toISOString(),
): BuilderMissionRecord {
  const queued = queueBuilderMission(mission, now());
  const running = startBuilderMission(queued, now());
  return completeBuilderMission(running, now());
}

/**
 * Same lifecycle as runBuilderMission, but yields each transition so
 * callers (Chief context, tests) can log or observe queued → running →
 * completed|failed without re-deriving intermediate states.
 */
export function runBuilderMissionSteps(
  mission: BuilderMission,
  now: () => string = () => new Date().toISOString(),
): {
  queued: BuilderMissionRecord;
  running: BuilderMissionRecord;
  final: BuilderMissionRecord;
} {
  const queued = queueBuilderMission(mission, now());
  const running = startBuilderMission(queued, now());
  const final = completeBuilderMission(running, now());
  return { queued, running, final };
}

/**
 * Apply a start decision to produce the next queued record (launch or retry).
 * Returns null for reuse/blocked — those do not create new work.
 */
export function materializeQueuedMission(
  decision: BuilderMissionStartDecision,
  now: string = new Date().toISOString(),
): BuilderMissionRecord | null {
  if (decision.kind === "launch") {
    const mission = createBuilderMissionFromProposal(
      decision.proposal,
      decision.policy,
      now,
    );
    return queueBuilderMission(mission, now);
  }
  if (decision.kind === "retry") {
    return prepareBuilderMissionRetry(decision.previous, now);
  }
  return null;
}

/**
 * Sync full-lifecycle launch used by unit tests. Production UI path uses
 * decideBuilderMissionStart + materializeQueuedMission + progressive runner.
 */
export function launchBuilderMissionFromProposal(
  proposal: ApprovalProposal,
  existingMissions: readonly BuilderMissionRecord[] = [],
  now: () => string = () => new Date().toISOString(),
): BuilderMissionLaunchResult {
  const decision = decideBuilderMissionStart(proposal, existingMissions);
  if (decision.kind === "blocked") {
    return { outcome: "blocked", reason: decision.reason };
  }
  if (decision.kind === "reuse_existing") {
    return {
      outcome: "reused",
      record: decision.record,
      reason: decision.reason,
    };
  }
  if (decision.kind === "retry") {
    // Sync helper does not implicit-retry — require explicit path.
    return { outcome: "blocked", reason: "not_retryable" };
  }

  const mission = createBuilderMissionFromProposal(
    decision.proposal,
    decision.policy,
    now(),
  );
  const steps = runBuilderMissionSteps(mission, now);
  return { outcome: "launched", record: steps.final, steps };
}

/**
 * Explicit retry path (sync). Used by tests; UI uses progressive runner.
 */
export function retryBuilderMissionFromProposal(
  proposal: ApprovalProposal,
  existingMissions: readonly BuilderMissionRecord[],
  now: () => string = () => new Date().toISOString(),
): BuilderMissionLaunchResult {
  const decision = decideBuilderMissionStart(proposal, existingMissions, {
    explicitRetry: true,
  });
  if (decision.kind === "blocked") {
    return { outcome: "blocked", reason: decision.reason };
  }
  if (decision.kind === "reuse_existing") {
    return {
      outcome: "reused",
      record: decision.record,
      reason: decision.reason,
    };
  }
  if (decision.kind !== "retry") {
    return { outcome: "blocked", reason: "not_retryable" };
  }

  const queued = prepareBuilderMissionRetry(decision.previous, now());
  const running = startBuilderMission(queued, now());
  const final = completeBuilderMission(running, now());
  return {
    outcome: "retried",
    record: final,
    steps: { queued, running, final },
  };
}

/**
 * Eligibility + create a queued mission only (attempt 1). Respects
 * idempotency — returns reused/blocked instead of duplicating.
 */
export function queueBuilderMissionFromProposal(
  proposal: ApprovalProposal,
  existingMissions: readonly BuilderMissionRecord[] = [],
  now: () => string = () => new Date().toISOString(),
): BuilderMissionLaunchResult {
  const decision = decideBuilderMissionStart(proposal, existingMissions);
  if (decision.kind === "blocked") {
    return { outcome: "blocked", reason: decision.reason };
  }
  if (decision.kind === "reuse_existing") {
    return {
      outcome: "reused",
      record: decision.record,
      reason: decision.reason,
    };
  }
  if (decision.kind === "retry") {
    return { outcome: "blocked", reason: "not_retryable" };
  }

  const queued = materializeQueuedMission(decision, now());
  if (!queued) return { outcome: "blocked", reason: "not_forwardable" };
  return { outcome: "launched", record: queued };
}

/** Perceptible stub delays so queued/running are visible in the UI. */
export const BUILDER_MISSION_START_DELAY_MS = 450;
export const BUILDER_MISSION_COMPLETE_DELAY_MS = 700;

/**
 * Upsert a mission record by missionId — keeps launch/progress updates
 * from duplicating rows on the Agents board.
 */
export function upsertBuilderMission(
  missions: readonly BuilderMissionRecord[],
  next: BuilderMissionRecord,
): BuilderMissionRecord[] {
  const idx = missions.findIndex((m) => m.mission.missionId === next.mission.missionId);
  if (idx === -1) return [next, ...missions];
  const copy = [...missions];
  copy[idx] = next;
  return copy;
}

/**
 * Maps a mission record onto the Agents-tab AgentWorkItem vocabulary so
 * the existing board can show lifecycle without a new console.
 */
export function missionStatusToAgentWorkStatus(
  status: BuilderMissionStatus,
): "queued" | "active" | "blocked" | "completed" {
  switch (status) {
    case "queued":
      return "queued";
    case "running":
      return "active";
    case "failed":
      return "blocked";
    case "completed":
      return "completed";
  }
}

export function missionRecordToAgentWorkNote(record: BuilderMissionRecord): string {
  const attemptLabel = `attempt ${record.attempt}`;
  const retryable = record.status === "failed" ? " · retryable" : "";

  if (record.status === "failed") {
    const reason =
      record.lastError ??
      record.result?.artifacts?.failureReason ??
      record.result?.summary ??
      "Builder mission failed.";
    return `${attemptLabel}${retryable}: ${reason}`;
  }
  if (record.status === "completed") {
    const artifacts = record.result?.artifacts;
    const bits = [
      record.result?.summary,
      artifacts?.branchName ? `branch ${artifacts.branchName}` : null,
      artifacts?.testsSummary,
    ].filter(Boolean);
    return `${attemptLabel}: ${bits.join(" — ") || "Builder mission completed."}`;
  }
  if (record.status === "running") {
    return `${attemptLabel}: Running — ${record.mission.objective}`;
  }
  return `${attemptLabel}: Queued from approval ${record.mission.proposalId}`;
}

/** Compact detail lines for approval-card / agent inspection. */
export function describeBuilderMissionDetails(record: BuilderMissionRecord): string[] {
  const lines: string[] = [
    `Status: ${record.status}`,
    `Attempt: ${record.attempt}`,
    `Mission: ${record.mission.missionId}`,
    `Created: ${record.createdAt}`,
    `Updated: ${record.updatedAt}`,
  ];
  if (record.startedAt) lines.push(`Started: ${record.startedAt}`);
  if (record.lastError) lines.push(`Last error: ${record.lastError}`);
  if (record.result?.artifacts?.branchName) {
    lines.push(`Branch: ${record.result.artifacts.branchName}`);
  }
  if (record.result?.artifacts?.testsSummary) {
    lines.push(`Tests: ${record.result.artifacts.testsSummary}`);
  }
  if (record.previousResults.length > 0) {
    lines.push(`Prior attempts: ${record.previousResults.length}`);
    for (const prior of record.previousResults) {
      lines.push(
        `  · #${prior.attempt} ${prior.status}${prior.failureReason ? ` — ${prior.failureReason}` : ""}`,
      );
    }
  }
  if (record.status === "failed") {
    lines.push("Retryable: yes (use Retry Builder mission)");
  }
  return lines;
}
