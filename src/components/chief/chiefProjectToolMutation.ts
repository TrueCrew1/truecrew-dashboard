/**
 * Shared hardening for Chief project-tool mutations that already exist:
 * - Obsidian note draft → approve → write
 * - GitHub PR comment draft → approve → post
 *
 * Provides one small audit shape, idempotent execution registry, and
 * consistent operator-facing messages. Session-local only — no new infra.
 */
import type { ApprovalProposal } from "./types";
import {
  GITHUB_PR_COMMENT_DRAFT_KIND,
  OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
} from "./types";

export type ChiefProjectToolMutationAction =
  | "obsidian_note_write"
  | "github_pr_comment_post";

export type ChiefProjectToolMutationOutcomeStatus =
  | "executed"
  | "skipped_offline"
  | "failed"
  | "duplicate_skipped";

export interface ChiefProjectToolMutationAudit {
  proposalId: string;
  action: ChiefProjectToolMutationAction;
  missionKind: string;
  projectId: string;
  projectName: string;
  /** Vault path or `owner/repo#pr`. */
  target: string;
  approvalDecision: "approved";
  attemptedAt: string;
  outcome: ChiefProjectToolMutationOutcomeStatus;
  liveApi: boolean;
  /** Error text, comment URL, prior outcome, etc. */
  detail?: string;
}

export type ChiefProjectToolMutationOutcome =
  | { handled: false }
  | {
      handled: true;
      ok: boolean;
      status: ChiefProjectToolMutationOutcomeStatus;
      message: string;
      audit: ChiefProjectToolMutationAudit;
    };

/** Terminal outcomes that must not re-run the side effect. */
const TERMINAL_OUTCOMES: ReadonlySet<ChiefProjectToolMutationOutcomeStatus> = new Set([
  "executed",
  "skipped_offline",
]);

const completedByProposalId = new Map<string, ChiefProjectToolMutationAudit>();
const inFlightProposalIds = new Set<string>();

export function isProjectToolDraftProposal(proposal: ApprovalProposal): boolean {
  return (
    proposal.missionKind === OBSIDIAN_PROJECT_NOTE_DRAFT_KIND ||
    proposal.missionKind === GITHUB_PR_COMMENT_DRAFT_KIND
  );
}

export function getProjectToolMutationAudit(
  proposalId: string,
): ChiefProjectToolMutationAudit | null {
  return completedByProposalId.get(proposalId) ?? null;
}

/** Test helper — clears session registry between cases. */
export function resetProjectToolMutationRegistryForTests(): void {
  completedByProposalId.clear();
  inFlightProposalIds.clear();
}

export function formatProjectToolMutationMessage(audit: ChiefProjectToolMutationAudit): string {
  const actionLabel =
    audit.action === "obsidian_note_write" ? "Obsidian vault write" : "GitHub PR comment post";

  switch (audit.outcome) {
    case "executed":
      return audit.action === "obsidian_note_write"
        ? `Wrote Obsidian note to ${audit.target}`
        : `Posted GitHub comment on ${audit.target}${audit.detail ? `: ${audit.detail}` : ""}`;
    case "skipped_offline":
      return `Approved — ${actionLabel} skipped (live API off). Target ${audit.target} was not changed.`;
    case "failed":
      return `Approved, but ${actionLabel} failed: ${audit.detail ?? "unknown error"}`;
    case "duplicate_skipped":
      return `Already executed — duplicate ${actionLabel} skipped for ${audit.target}. Prior outcome: ${audit.detail ?? "recorded"}.`;
  }
}

export function mutationOutcomeToActionPhase(
  outcome: Extract<ChiefProjectToolMutationOutcome, { handled: true }>,
): "success" | "error" {
  if (outcome.status === "failed") return "error";
  return "success";
}

function remember(audit: ChiefProjectToolMutationAudit): void {
  const existing = completedByProposalId.get(audit.proposalId);
  if (existing && TERMINAL_OUTCOMES.has(existing.outcome)) {
    return;
  }
  completedByProposalId.set(audit.proposalId, audit);
}

/**
 * Run a single project-tool mutation with in-flight + terminal duplicate protection.
 * `execute` must perform the real write/post (or throw / return failure detail).
 */
export async function runIdempotentProjectToolMutation(input: {
  proposalId: string;
  action: ChiefProjectToolMutationAction;
  missionKind: string;
  projectId: string;
  projectName: string;
  target: string;
  liveApi: boolean;
  now?: () => string;
  execute: () => Promise<{ ok: true; detail?: string } | { ok: false; error: string }>;
}): Promise<Extract<ChiefProjectToolMutationOutcome, { handled: true }>> {
  const attemptedAt = (input.now ?? (() => new Date().toISOString()))();
  const base = {
    proposalId: input.proposalId,
    action: input.action,
    missionKind: input.missionKind,
    projectId: input.projectId,
    projectName: input.projectName,
    target: input.target,
    approvalDecision: "approved" as const,
    attemptedAt,
    liveApi: input.liveApi,
  };

  const prior = completedByProposalId.get(input.proposalId);
  if (prior && TERMINAL_OUTCOMES.has(prior.outcome)) {
    const audit: ChiefProjectToolMutationAudit = {
      ...base,
      outcome: "duplicate_skipped",
      detail: prior.outcome,
    };
    const message = formatProjectToolMutationMessage(audit);
    return { handled: true, ok: true, status: "duplicate_skipped", message, audit };
  }

  if (inFlightProposalIds.has(input.proposalId)) {
    const audit: ChiefProjectToolMutationAudit = {
      ...base,
      outcome: "duplicate_skipped",
      detail: "in_progress",
    };
    return {
      handled: true,
      ok: true,
      status: "duplicate_skipped",
      message: formatProjectToolMutationMessage(audit),
      audit,
    };
  }

  if (!input.liveApi) {
    const audit: ChiefProjectToolMutationAudit = {
      ...base,
      outcome: "skipped_offline",
    };
    remember(audit);
    return {
      handled: true,
      ok: true,
      status: "skipped_offline",
      message: formatProjectToolMutationMessage(audit),
      audit,
    };
  }

  inFlightProposalIds.add(input.proposalId);
  try {
    const result = await input.execute();
    if (!result.ok) {
      const audit: ChiefProjectToolMutationAudit = {
        ...base,
        outcome: "failed",
        detail: result.error,
      };
      remember(audit);
      return {
        handled: true,
        ok: false,
        status: "failed",
        message: formatProjectToolMutationMessage(audit),
        audit,
      };
    }

    const audit: ChiefProjectToolMutationAudit = {
      ...base,
      outcome: "executed",
      detail: result.detail,
    };
    remember(audit);
    return {
      handled: true,
      ok: true,
      status: "executed",
      message: formatProjectToolMutationMessage(audit),
      audit,
    };
  } finally {
    inFlightProposalIds.delete(input.proposalId);
  }
}
