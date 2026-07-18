import type {
  ApprovalChecklistItem,
  ApprovalMissingSignal,
  ApprovalProposal,
  ChiefRoutingDisposition,
} from "./types";
import type { AgentApprovalRiskLevel } from "./agentApprovalGates";

/**
 * Chief's confidence threshold for forwarding proposals. Below this,
 * proposals are returned to the originating agent for refinement.
 */
export const CHIEF_CONFIDENCE_THRESHOLD = 0.9;

/**
 * Risk levels that Chief will not auto-forward even with high confidence.
 * High-risk items always need explicit human review of the risk itself.
 */
export const RISK_LEVELS_REQUIRING_REVIEW: readonly AgentApprovalRiskLevel[] = ["high"];

/**
 * Context available when evaluating a proposal for approval routing.
 * Extends the proposal with optional runtime signals that may not be
 * persisted on the proposal itself.
 */
export interface ApprovalPolicyContext {
  proposal: ApprovalProposal;
  /** Linked PR number or URL, if this proposal relates to a code change. */
  linkedPr?: string | number;
  /** Linked task ID, if this proposal relates to a tracked task. */
  linkedTask?: string;
  /** URL or path to supporting evidence (workflow doc, second-brain note, etc.). */
  evidenceRef?: string;
  /** Known test/lint/build status: "pass", "fail", "pending", or "unknown". */
  testStatus?: "pass" | "fail" | "pending" | "unknown";
  /** True if build/lint status is known and relevant for this proposal type. */
  buildStatusKnown?: boolean;
}

/**
 * Result of Chief's approval policy evaluation.
 */
export interface ApprovalPolicyResult {
  /** Whether Chief can forward this proposal for operator approval. */
  canApprove: boolean;
  /** Chief's routing disposition for this proposal. */
  disposition: ChiefRoutingDisposition;
  /** Human-readable reason for the routing decision. */
  reason: string;
  /** Machine-readable list of missing signals when canApprove is false. */
  missingSignals: ApprovalMissingSignal[];
  /** Guidance for the originating agent when returned for refinement. */
  refinementGuidance?: string;
}

/**
 * Checks whether all required checklist items pass.
 * Returns the list of failing item labels.
 */
function getFailingChecklistItems(checklist?: ApprovalChecklistItem[]): string[] {
  if (!checklist || checklist.length === 0) return [];
  return checklist
    .filter((item) => item.status === "fail")
    .map((item) => item.label);
}

/**
 * Checks whether any checklist items are still pending.
 */
function hasPendingChecklistItems(checklist?: ApprovalChecklistItem[]): boolean {
  if (!checklist || checklist.length === 0) return false;
  return checklist.some((item) => item.status === "pending");
}

/**
 * Determines whether a proposal's source typically requires code-related
 * signals (PR link, test status).
 */
function isCodeRelatedSource(proposal: ApprovalProposal): boolean {
  return (
    proposal.source === "pr" ||
    proposal.source === "agent_build" ||
    proposal.source === "repo_change"
  );
}

/**
 * Maps a risk level string to the typed union, with fallback.
 */
function parseRiskLevel(riskNote?: string): AgentApprovalRiskLevel {
  if (!riskNote) return "medium";
  const lower = riskNote.toLowerCase();
  if (lower.includes("high")) return "high";
  if (lower.includes("low")) return "low";
  return "medium";
}

/**
 * Evaluates a proposal against Chief's approval policy.
 *
 * Chief forwards a proposal for operator approval ONLY when:
 * 1. confidence >= 0.9 (CHIEF_CONFIDENCE_THRESHOLD)
 * 2. All checklist items pass (no "fail" status)
 * 3. Required context is present (linked PR/task for code changes)
 * 4. Risk level is within allowed band (not "high" unless explicitly reviewed)
 *
 * Otherwise, Chief returns the item to the originating agent with clear
 * guidance on what's missing.
 */
export function evaluateApprovalPolicy(ctx: ApprovalPolicyContext): ApprovalPolicyResult {
  const { proposal } = ctx;
  const missingSignals: ApprovalMissingSignal[] = [];
  const reasons: string[] = [];

  const confidence = proposal.confidence ?? 0;
  if (confidence < CHIEF_CONFIDENCE_THRESHOLD) {
    missingSignals.push("confidence_below_threshold");
    reasons.push(
      `Confidence ${(confidence * 100).toFixed(0)}% is below the ${CHIEF_CONFIDENCE_THRESHOLD * 100}% threshold`,
    );
  }

  const failingChecklist = getFailingChecklistItems(proposal.checklist);
  if (failingChecklist.length > 0) {
    missingSignals.push("checklist_items_failing");
    reasons.push(`Checklist items failing: ${failingChecklist.join(", ")}`);
  }

  const hasPending = hasPendingChecklistItems(proposal.checklist);
  if (hasPending && !missingSignals.includes("checklist_items_failing")) {
    missingSignals.push("checklist_items_failing");
    reasons.push("Some checklist items are still pending");
  }

  const isCodeRelated = isCodeRelatedSource(proposal);
  if (isCodeRelated) {
    if (!ctx.linkedPr && !ctx.linkedTask) {
      missingSignals.push("missing_linked_pr_or_task");
      reasons.push("Code-related proposal missing linked PR or task reference");
    }

    if (ctx.buildStatusKnown && ctx.testStatus !== "pass") {
      missingSignals.push("missing_test_status");
      reasons.push(`Test/build status is "${ctx.testStatus ?? "unknown"}", not passing`);
    }
  }

  if (!ctx.evidenceRef && !proposal.routeTo) {
    missingSignals.push("missing_evidence_or_reference");
    reasons.push("Missing evidence or reference link");
  }

  const riskLevel = parseRiskLevel(proposal.riskNote);
  if (RISK_LEVELS_REQUIRING_REVIEW.includes(riskLevel)) {
    missingSignals.push("risk_level_too_high");
    reasons.push(`Risk level "${riskLevel}" requires explicit review before auto-forwarding`);
  }

  const canApprove = missingSignals.length === 0;
  const disposition: ChiefRoutingDisposition = canApprove ? "forwarded" : "needs_refinement";

  let refinementGuidance: string | undefined;
  if (!canApprove) {
    refinementGuidance = buildRefinementGuidance(missingSignals);
  }

  return {
    canApprove,
    disposition,
    reason: canApprove
      ? `Proposal meets all criteria: confidence ${(confidence * 100).toFixed(0)}%, checklist passed, context complete`
      : reasons.join("; "),
    missingSignals,
    refinementGuidance,
  };
}

/**
 * Builds actionable guidance for the originating agent when a proposal
 * is returned for refinement.
 */
function buildRefinementGuidance(signals: ApprovalMissingSignal[]): string {
  const guidance: string[] = [];

  if (signals.includes("confidence_below_threshold")) {
    guidance.push(
      `Increase confidence to at least ${CHIEF_CONFIDENCE_THRESHOLD * 100}% by gathering more evidence or clarifying scope`,
    );
  }

  if (signals.includes("checklist_items_failing")) {
    guidance.push("Address failing or pending checklist items before resubmitting");
  }

  if (signals.includes("missing_linked_pr_or_task")) {
    guidance.push("Link this proposal to a PR or task for traceability");
  }

  if (signals.includes("missing_test_status")) {
    guidance.push("Ensure tests/lint/build pass before resubmitting");
  }

  if (signals.includes("missing_evidence_or_reference")) {
    guidance.push("Add a reference to supporting evidence (workflow doc, second-brain note, etc.)");
  }

  if (signals.includes("risk_level_too_high")) {
    guidance.push("High-risk items require explicit review; consider breaking into smaller, lower-risk steps");
  }

  return guidance.length > 0
    ? `To proceed:\n${guidance.map((g) => `• ${g}`).join("\n")}`
    : "Review and address the issues above before resubmitting.";
}

/**
 * Convenience function to apply the policy result to a proposal,
 * returning a new proposal with routing disposition set.
 */
export function applyPolicyToProposal(
  proposal: ApprovalProposal,
  result: ApprovalPolicyResult,
): ApprovalProposal {
  return {
    ...proposal,
    routingDisposition: result.disposition,
    missingSignals: result.missingSignals.length > 0 ? result.missingSignals : undefined,
    refinementGuidance: result.refinementGuidance,
  };
}

/**
 * Quick check: does this proposal have sufficient confidence?
 * Useful for simple gates that only need the confidence check.
 */
export function hasMinimumConfidence(proposal: ApprovalProposal): boolean {
  return (proposal.confidence ?? 0) >= CHIEF_CONFIDENCE_THRESHOLD;
}

/**
 * Quick check: is this proposal ready for forwarding based on policy?
 * Full evaluation with default context.
 */
export function canForwardProposal(proposal: ApprovalProposal): boolean {
  const result = evaluateApprovalPolicy({ proposal });
  return result.canApprove;
}
