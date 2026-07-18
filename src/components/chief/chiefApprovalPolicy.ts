import type {
  ApprovalChecklistItem,
  ApprovalEvidence,
  ApprovalEvidenceCategory,
  ApprovalMissingSignal,
  ApprovalProposal,
  ApprovalSource,
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

/** Sources whose confidence claim is checked against the "code" evidence bar (PR/issue). Every other source falls back to "governance" (runbook/doc). */
const CODE_EVIDENCE_SOURCES: readonly ApprovalSource[] = ["pr", "agent_build", "repo_change"];

/**
 * Determines which authoritative-evidence bar a proposal's confidence claim
 * must clear. Every ApprovalSource maps to "code" or "governance"; a
 * proposal with no recognized source defaults to "governance" — the
 * doc-based bar — since Chief has no way to confirm a code-specific link
 * for it.
 */
export function getEvidenceCategory(proposal: ApprovalProposal): ApprovalEvidenceCategory {
  if (proposal.source && CODE_EVIDENCE_SOURCES.includes(proposal.source)) return "code";
  return "governance";
}

/**
 * Context available when evaluating a proposal for approval routing.
 * Extends the proposal with optional runtime signals that may not be
 * persisted on the proposal itself. Any field set here overrides the
 * matching field on `proposal.evidence` for this evaluation only.
 */
export interface ApprovalPolicyContext {
  proposal: ApprovalProposal;
  /** Linked PR number, key, or URL — authoritative evidence for code proposals. */
  linkedPr?: string | number;
  /** Linked issue/ticket number, key, or URL — alternative authoritative evidence for code proposals. */
  linkedIssue?: string | number;
  /** Linked runbook, policy, or governance-doc slug/path — authoritative evidence for governance proposals. */
  linkedRunbook?: string;
  /**
   * Tracking-only task reference. Deliberately NOT treated as authoritative
   * evidence — a task ID alone doesn't prove a code change is reviewable or
   * a decision is documented. Use linkedPr/linkedIssue/linkedRunbook for
   * anything that should count toward the confidence bar.
   */
  linkedTask?: string;
  /** URL or path to supporting evidence (workflow doc, second-brain note, etc.) — a soft fallback signal only; never sufficient on its own to justify confidence >= 0.9. */
  evidenceRef?: string;
  /** Known test/lint/build status: "pass", "fail", "pending", or "unknown". */
  testStatus?: "pass" | "fail" | "pending" | "unknown";
  /** Known environment/deploy status, when relevant to the proposal. */
  environmentStatus?: string;
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
  /** Which evidence bar this proposal's confidence claim was checked against. */
  evidenceCategory: ApprovalEvidenceCategory;
  /** Whether authoritative evidence for that category was present. */
  hasAuthoritativeEvidence: boolean;
  /** Human-readable one-line summary of the evidence actually found (e.g. "PR 58", "Runbook: docs/x.md", or "none linked"). */
  evidenceSummary: string;
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
 * Merges evaluation-time context signals with any evidence already stored
 * on the proposal — context wins on a per-field basis, so a fresher signal
 * (e.g. a just-fetched test status) can override a stale stored one.
 */
function resolveEvidence(ctx: ApprovalPolicyContext): ApprovalEvidence {
  const stored = ctx.proposal.evidence;
  return {
    linkedPrId: ctx.linkedPr ?? stored?.linkedPrId,
    linkedIssueId: ctx.linkedIssue ?? stored?.linkedIssueId,
    linkedRunbookSlug: ctx.linkedRunbook ?? stored?.linkedRunbookSlug,
    testStatusSummary: ctx.testStatus ?? stored?.testStatusSummary,
    environmentStatusSummary: ctx.environmentStatus ?? stored?.environmentStatusSummary,
  };
}

/**
 * Whether the resolved evidence clears the authoritative bar for a given
 * category. This is the machine-checkable core of the "no >= 90% confidence
 * without evidence" rule: code proposals need a linked PR or issue,
 * governance proposals need a linked runbook or policy document.
 */
function hasAuthoritativeEvidence(
  category: ApprovalEvidenceCategory,
  evidence: ApprovalEvidence,
): boolean {
  if (category === "code") {
    return Boolean(evidence.linkedPrId || evidence.linkedIssueId);
  }
  return Boolean(evidence.linkedRunbookSlug);
}

/**
 * One-line, human-readable description of the evidence actually found —
 * used in refinement guidance, logs, and the approval board UI.
 */
function summarizeEvidence(
  category: ApprovalEvidenceCategory,
  evidence: ApprovalEvidence,
): string {
  const parts: string[] = [];
  if (evidence.linkedPrId) parts.push(`PR ${evidence.linkedPrId}`);
  if (evidence.linkedIssueId) parts.push(`Issue ${evidence.linkedIssueId}`);
  if (evidence.linkedRunbookSlug) parts.push(`Runbook: ${evidence.linkedRunbookSlug}`);
  if (evidence.testStatusSummary) parts.push(`Tests: ${evidence.testStatusSummary}`);
  if (evidence.environmentStatusSummary) parts.push(`Env: ${evidence.environmentStatusSummary}`);

  if (parts.length === 0) {
    return category === "code" ? "none linked (needs PR/issue)" : "none linked (needs runbook/doc)";
  }
  return parts.join(", ");
}

/**
 * Multi-line, per-field breakdown of a proposal's evidence — one line per
 * populated field, or a single "not linked yet" line when empty. Intended
 * for the approval board's evidence panel, distinct from the terser
 * summarizeEvidence() used in guidance/log text.
 */
export function describeEvidence(proposal: ApprovalProposal): string[] {
  const category = getEvidenceCategory(proposal);
  const evidence = proposal.evidence ?? {};
  const lines: string[] = [];

  if (evidence.linkedPrId) lines.push(`PR: ${evidence.linkedPrId}`);
  if (evidence.linkedIssueId) lines.push(`Issue: ${evidence.linkedIssueId}`);
  if (evidence.linkedRunbookSlug) lines.push(`Runbook/doc: ${evidence.linkedRunbookSlug}`);
  if (evidence.testStatusSummary) lines.push(`Tests/build: ${evidence.testStatusSummary}`);
  if (evidence.environmentStatusSummary) lines.push(`Environment: ${evidence.environmentStatusSummary}`);

  if (lines.length === 0) {
    lines.push(
      category === "code"
        ? "No PR or issue linked yet."
        : "No runbook or governance document linked yet.",
    );
  }

  return lines;
}

/**
 * Evaluates a proposal against Chief's approval policy.
 *
 * Chief forwards a proposal for operator approval ONLY when:
 * 1. confidence >= 0.9 (CHIEF_CONFIDENCE_THRESHOLD)
 * 2. All checklist items pass (no "fail" or "pending" status)
 * 3. Required context is present (linked PR/issue for code changes, linked
 *    runbook/doc for governance changes)
 * 4. Risk level is within allowed band (not "high" unless explicitly reviewed)
 * 5. If confidence >= 0.9, that claim is backed by the authoritative evidence
 *    from (3) — a high confidence score is never accepted as "just a number".
 *
 * Otherwise, Chief returns the item to the originating agent with clear
 * guidance on what's missing.
 */
export function evaluateApprovalPolicy(ctx: ApprovalPolicyContext): ApprovalPolicyResult {
  const { proposal } = ctx;
  const missingSignals: ApprovalMissingSignal[] = [];
  const reasons: string[] = [];

  const confidence = proposal.confidence ?? 0;
  const meetsConfidenceThreshold = confidence >= CHIEF_CONFIDENCE_THRESHOLD;
  if (!meetsConfidenceThreshold) {
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

  const evidenceCategory = getEvidenceCategory(proposal);
  const evidence = resolveEvidence(ctx);
  const evidencePresent = hasAuthoritativeEvidence(evidenceCategory, evidence);
  const evidenceSummary = summarizeEvidence(evidenceCategory, evidence);

  if (evidenceCategory === "code") {
    if (!evidencePresent) {
      missingSignals.push("missing_linked_pr_or_issue");
      reasons.push("Code-related proposal missing an authoritative linked PR or issue reference");
    }
    if (evidence.testStatusSummary && evidence.testStatusSummary !== "pass") {
      missingSignals.push("missing_test_status");
      reasons.push(`Test/build status is "${evidence.testStatusSummary}", not passing`);
    }
  } else if (!evidencePresent) {
    missingSignals.push("missing_linked_runbook_or_doc");
    reasons.push("Governance/process proposal missing a linked runbook or policy document");
  }

  // Soft, category-agnostic traceability check — a weaker fallback signal
  // that never substitutes for the authoritative evidence check above.
  const hasGenericReference = Boolean(ctx.evidenceRef || proposal.routeTo);
  if (!hasGenericReference && !evidencePresent) {
    missingSignals.push("missing_evidence_or_reference");
    reasons.push("Missing any evidence or reference link");
  }

  const riskLevel = parseRiskLevel(proposal.riskNote);
  if (RISK_LEVELS_REQUIRING_REVIEW.includes(riskLevel)) {
    missingSignals.push("risk_level_too_high");
    reasons.push(`Risk level "${riskLevel}" requires explicit review before auto-forwarding`);
  }

  // Core hardening rule: a >= 90% confidence claim must be grounded in real,
  // authoritative evidence for its category. Confidence is never "just a
  // number" — this is checked independently of (and in addition to) the
  // category evidence checks above so the gap is unambiguously auditable.
  if (meetsConfidenceThreshold && !evidencePresent) {
    missingSignals.push("high_confidence_without_evidence");
    reasons.push(
      `Confidence ${(confidence * 100).toFixed(0)}% claimed without authoritative evidence (${evidenceSummary}) — high confidence must be backed by a linked ${
        evidenceCategory === "code" ? "PR or issue" : "runbook or governance document"
      }`,
    );
  }

  const canApprove = missingSignals.length === 0;
  const disposition: ChiefRoutingDisposition = canApprove ? "forwarded" : "needs_refinement";

  let refinementGuidance: string | undefined;
  if (!canApprove) {
    refinementGuidance = buildRefinementGuidance(missingSignals, evidenceCategory);
  }

  return {
    canApprove,
    disposition,
    reason: canApprove
      ? `Proposal meets all criteria: confidence ${(confidence * 100).toFixed(0)}%, checklist passed, evidence: ${evidenceSummary}`
      : reasons.join("; "),
    missingSignals,
    refinementGuidance,
    evidenceCategory,
    hasAuthoritativeEvidence: evidencePresent,
    evidenceSummary,
  };
}

/**
 * Builds actionable guidance for the originating agent when a proposal
 * is returned for refinement.
 */
function buildRefinementGuidance(
  signals: ApprovalMissingSignal[],
  evidenceCategory: ApprovalEvidenceCategory,
): string {
  const guidance: string[] = [];

  if (signals.includes("confidence_below_threshold")) {
    guidance.push(
      `Increase confidence to at least ${CHIEF_CONFIDENCE_THRESHOLD * 100}% by gathering more evidence or clarifying scope`,
    );
  }

  if (signals.includes("checklist_items_failing")) {
    guidance.push("Address failing or pending checklist items before resubmitting");
  }

  if (signals.includes("missing_linked_pr_or_issue")) {
    guidance.push("Link this proposal to a PR or issue before claiming high confidence");
  }

  if (signals.includes("missing_linked_runbook_or_doc")) {
    guidance.push("Attach the relevant runbook or governance document for this change");
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

  if (
    signals.includes("high_confidence_without_evidence") &&
    !signals.includes("missing_linked_pr_or_issue") &&
    !signals.includes("missing_linked_runbook_or_doc")
  ) {
    // Defensive fallback — in practice one of the two category-specific
    // signals above always accompanies this one, but keep guidance
    // meaningful if that invariant ever changes.
    guidance.push(
      evidenceCategory === "code"
        ? "Link this proposal to a PR or issue before claiming high confidence"
        : "Attach the relevant runbook or governance document for this change",
    );
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
 * Useful for simple gates that only need the confidence check. Note this
 * does NOT check evidence — a proposal can pass this and still be returned
 * for refinement by evaluateApprovalPolicy() if it lacks authoritative
 * evidence for its category.
 */
export function hasMinimumConfidence(proposal: ApprovalProposal): boolean {
  return (proposal.confidence ?? 0) >= CHIEF_CONFIDENCE_THRESHOLD;
}

/**
 * Quick check: is this proposal ready for forwarding based on policy?
 * Full evaluation with default context (no extra runtime signals beyond
 * what's already stored on the proposal itself).
 */
export function canForwardProposal(proposal: ApprovalProposal): boolean {
  const result = evaluateApprovalPolicy({ proposal });
  return result.canApprove;
}
