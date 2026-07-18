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
  /** Approval card this mission was launched from. */
  proposalId: string;
  objective: string;
  acceptanceCriteria: string[];
  /** Bounded context from the approved card — evidence / research / playbook when available. */
  context?: {
    evidenceSummary?: string;
    researchSummary?: string;
    playbookId?: string;
  };
  /** When the mission was queued. */
  createdAt: string;
}

/**
 * Typed Builder output. Practical and UI-friendly — not a full agent transcript.
 */
export interface BuilderMissionResult {
  missionId: string;
  status: Extract<BuilderMissionStatus, "completed" | "failed">;
  summary: string;
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
 * In-session record of a mission through its lifecycle. Session-scoped —
 * same durability bar as proposal bodies (decisions may persist; missions
 * for this slice do not).
 */
export interface BuilderMissionRecord {
  mission: BuilderMission;
  status: BuilderMissionStatus;
  result?: BuilderMissionResult;
  startedAt?: string;
  updatedAt: string;
}

export type BuilderMissionLaunchBlockReason =
  | "not_builder_source"
  | "not_approved"
  | "not_forwardable"
  | "already_launched";

export type BuilderMissionLaunchResult =
  | {
      outcome: "launched";
      record: BuilderMissionRecord;
      /** Intermediate lifecycle snapshots for logging/UI — queued → running → final. */
      steps: {
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

/**
 * Whether a proposal is eligible to launch a Builder mission.
 * Requires: Builder source, operator-approved status, and Chief policy
 * forwardable (confidence + evidence + checklist). Does not bypass
 * evidence checks.
 */
export function canLaunchBuilderMission(
  proposal: ApprovalProposal,
  existingMissions: readonly BuilderMissionRecord[] = [],
): { ok: true } | { ok: false; reason: BuilderMissionLaunchBlockReason } {
  if (!proposal.source || !BUILDER_MISSION_SOURCES.has(proposal.source)) {
    return { ok: false, reason: "not_builder_source" };
  }

  if (proposal.status !== "approved") {
    return { ok: false, reason: "not_approved" };
  }

  // Prefer the disposition already stamped by Chief; fall back to a fresh
  // policy eval so launch still respects evidence/confidence when a card
  // somehow lacks a disposition.
  const forwardable =
    proposal.routingDisposition === "forwarded" ||
    evaluateApprovalPolicy({ proposal }).canApprove;

  if (!forwardable) {
    return { ok: false, reason: "not_forwardable" };
  }

  const missionId = builderMissionIdForProposal(proposal.id);
  if (existingMissions.some((record) => record.mission.missionId === missionId)) {
    return { ok: false, reason: "already_launched" };
  }

  return { ok: true };
}

/**
 * Builds a typed BuilderMission from an approved proposal. Caller must
 * have already passed canLaunchBuilderMission.
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
 * Queues a mission record (status: queued). Does not run it.
 */
export function queueBuilderMission(
  mission: BuilderMission,
  updatedAt: string = mission.createdAt,
): BuilderMissionRecord {
  return {
    mission,
    status: "queued",
    updatedAt,
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
    const result: BuilderMissionResult = {
      missionId: mission.missionId,
      status: "failed",
      summary: `Builder mission failed: ${mission.objective}`,
      artifacts: {
        failureReason:
          "Deterministic stub failure — mission payload requested a fail path.",
        notes: "No external agent was invoked. Re-run after adjusting the objective.",
      },
      completedAt,
    };
    return {
      ...record,
      status: "failed",
      result,
      updatedAt: completedAt,
    };
  }

  const branchSlug = mission.workStoryId.replace(/^ws-build-/, "build/");
  const result: BuilderMissionResult = {
    missionId: mission.missionId,
    status: "completed",
    summary: `Builder completed: ${mission.objective}`,
    artifacts: {
      branchName: `builder/${branchSlug}`,
      testsSummary: "Stub run — lint/test/build not invoked in this slice.",
      notes:
        mission.context?.evidenceSummary && mission.context.evidenceSummary !== "none linked (needs PR/issue)"
          ? `Evidence carried forward: ${mission.context.evidenceSummary}`
          : "Completed under approved Chief mission contract.",
    },
    completedAt,
  };

  return {
    ...record,
    status: "completed",
    result,
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
 * Launch path used by Chief after an approve decision: eligibility check,
 * mission creation, stub run. Returns blocked reasons without throwing.
 * Pure — logging is the caller's job (see ChiefApprovalsContext).
 *
 * For the operator-visible progressive path (queued → running → final with
 * delays), use queueBuilderMissionFromProposal + start/complete instead.
 */
export function launchBuilderMissionFromProposal(
  proposal: ApprovalProposal,
  existingMissions: readonly BuilderMissionRecord[] = [],
  now: () => string = () => new Date().toISOString(),
): BuilderMissionLaunchResult {
  const eligibility = canLaunchBuilderMission(proposal, existingMissions);
  if (!eligibility.ok) {
    return { outcome: "blocked", reason: eligibility.reason };
  }

  const policy = evaluateApprovalPolicy({ proposal });
  const mission = createBuilderMissionFromProposal(proposal, policy, now());
  const steps = runBuilderMissionSteps(mission, now);
  return { outcome: "launched", record: steps.final, steps };
}

/**
 * Eligibility + create a queued mission only. Used by the Chief context so
 * the operator can actually see queued → running → completed|failed instead
 * of jumping straight to the final state in one render.
 */
export function queueBuilderMissionFromProposal(
  proposal: ApprovalProposal,
  existingMissions: readonly BuilderMissionRecord[] = [],
  now: () => string = () => new Date().toISOString(),
):
  | { outcome: "launched"; record: BuilderMissionRecord }
  | { outcome: "blocked"; reason: BuilderMissionLaunchBlockReason } {
  const eligibility = canLaunchBuilderMission(proposal, existingMissions);
  if (!eligibility.ok) {
    return { outcome: "blocked", reason: eligibility.reason };
  }

  const policy = evaluateApprovalPolicy({ proposal });
  const mission = createBuilderMissionFromProposal(proposal, policy, now());
  return { outcome: "launched", record: queueBuilderMission(mission, now()) };
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
  if (record.status === "failed") {
    return (
      record.result?.artifacts?.failureReason ??
      record.result?.summary ??
      "Builder mission failed."
    );
  }
  if (record.status === "completed") {
    const artifacts = record.result?.artifacts;
    const bits = [
      record.result?.summary,
      artifacts?.branchName ? `branch ${artifacts.branchName}` : null,
      artifacts?.testsSummary,
    ].filter(Boolean);
    return bits.join(" — ") || "Builder mission completed.";
  }
  if (record.status === "running") {
    return `Running: ${record.mission.objective}`;
  }
  return `Queued from approval ${record.mission.proposalId}`;
}
