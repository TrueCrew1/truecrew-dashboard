import { describe, expect, it } from "vitest";
import {
  evaluateApprovalPolicy,
  applyPolicyToProposal,
  hasMinimumConfidence,
  canForwardProposal,
  getEvidenceCategory,
  describeEvidence,
  CHIEF_CONFIDENCE_THRESHOLD,
  type ApprovalPolicyContext,
} from "@/components/chief/chiefApprovalPolicy";
import type { ApprovalProposal } from "@/components/chief/types";

function makeProposal(overrides: Partial<ApprovalProposal> = {}): ApprovalProposal {
  return {
    id: "test-proposal-1",
    title: "Test proposal",
    summary: "A test proposal for unit tests",
    recommendedAction: "Approve this test",
    riskNote: "Risk level: low. No production impact.",
    status: "pending",
    createdAt: new Date().toISOString(),
    source: "agent_build",
    confidence: 0.95,
    checklist: [
      { label: "Tests pass", status: "pass" },
      { label: "Lint clean", status: "pass" },
    ],
    routeTo: "/builds",
    ...overrides,
  };
}

/** Full context: linked PR + passing tests (code evidence) plus a generic reference — the "everything checks out" baseline most tests start from and then deliberately break one field at a time. */
function makeContext(
  proposal: ApprovalProposal,
  overrides: Partial<ApprovalPolicyContext> = {},
): ApprovalPolicyContext {
  return {
    proposal,
    linkedPr: 123,
    testStatus: "pass",
    evidenceRef: "knowledge/decisions/test.md",
    ...overrides,
  };
}

describe("CHIEF_CONFIDENCE_THRESHOLD", () => {
  it("is set to 0.9 (90%)", () => {
    expect(CHIEF_CONFIDENCE_THRESHOLD).toBe(0.9);
  });
});

describe("getEvidenceCategory", () => {
  it("classifies pr/agent_build/repo_change sources as code", () => {
    expect(getEvidenceCategory(makeProposal({ source: "pr" }))).toBe("code");
    expect(getEvidenceCategory(makeProposal({ source: "agent_build" }))).toBe("code");
    expect(getEvidenceCategory(makeProposal({ source: "repo_change" }))).toBe("code");
  });

  it("classifies planner/research/content/ops_change sources as governance", () => {
    expect(getEvidenceCategory(makeProposal({ source: "planner_agent" }))).toBe("governance");
    expect(getEvidenceCategory(makeProposal({ source: "research_agent" }))).toBe("governance");
    expect(getEvidenceCategory(makeProposal({ source: "content_agent" }))).toBe("governance");
    expect(getEvidenceCategory(makeProposal({ source: "ops_change" }))).toBe("governance");
  });

  it("defaults to governance for a proposal with no source", () => {
    expect(getEvidenceCategory(makeProposal({ source: undefined }))).toBe("governance");
  });
});

describe("evaluateApprovalPolicy", () => {
  describe("high confidence with all checks passing (including evidence)", () => {
    it("approves at 0.91 confidence with a linked PR and passing checklist", () => {
      const proposal = makeProposal({ confidence: 0.91 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.disposition).toBe("forwarded");
      expect(result.missingSignals).toHaveLength(0);
      expect(result.refinementGuidance).toBeUndefined();
      expect(result.hasAuthoritativeEvidence).toBe(true);
    });

    it("approves at exactly 0.9 confidence", () => {
      const proposal = makeProposal({ confidence: 0.9 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.disposition).toBe("forwarded");
    });

    it("approves at 1.0 (100%) confidence", () => {
      const proposal = makeProposal({ confidence: 1.0 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.disposition).toBe("forwarded");
    });

    it("approves a governance proposal at high confidence with a linked runbook", () => {
      const proposal = makeProposal({
        confidence: 0.93,
        source: "planner_agent",
        checklist: [{ label: "Reviewed", status: "pass" }],
      });
      const ctx: ApprovalPolicyContext = {
        proposal,
        linkedRunbook: "knowledge/decisions/roadmap-phase4.md",
      };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.disposition).toBe("forwarded");
      expect(result.evidenceCategory).toBe("governance");
      expect(result.hasAuthoritativeEvidence).toBe(true);
    });
  });

  describe("low confidence returns for refinement", () => {
    it("returns for refinement at 0.89 confidence even with evidence present", () => {
      const proposal = makeProposal({ confidence: 0.89 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("confidence_below_threshold");
      // Evidence is present, so no evidence-related signal should fire.
      expect(result.missingSignals).not.toContain("missing_linked_pr_or_issue");
      expect(result.missingSignals).not.toContain("high_confidence_without_evidence");
      expect(result.refinementGuidance).toBeDefined();
      expect(result.refinementGuidance).toContain("90%");
    });

    it("returns for refinement at 0.75 confidence", () => {
      const proposal = makeProposal({ confidence: 0.75 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("confidence_below_threshold");
    });

    it("returns for refinement when confidence is 0", () => {
      const proposal = makeProposal({ confidence: 0 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("confidence_below_threshold");
    });

    it("returns for refinement when confidence is undefined", () => {
      const proposal = makeProposal({ confidence: undefined });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("confidence_below_threshold");
    });

    it("medium confidence (<0.9) WITH evidence is still returned, but only for the confidence gap", () => {
      const proposal = makeProposal({
        confidence: 0.85,
        source: "research_agent",
        checklist: [{ label: "Alternatives reviewed", status: "pass" }],
      });
      const ctx: ApprovalPolicyContext = {
        proposal,
        linkedRunbook: "knowledge/research/vendor-comparison.md",
      };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toEqual(["confidence_below_threshold"]);
      expect(result.hasAuthoritativeEvidence).toBe(true);
      expect(result.refinementGuidance).toContain("Increase confidence");
      // Guidance should be about raising confidence, not about linking evidence — it's already linked.
      expect(result.refinementGuidance).not.toContain("Attach the relevant runbook");
      expect(result.refinementGuidance).not.toContain("Link this proposal to a PR");
    });
  });

  describe("checklist requirements", () => {
    it("returns for refinement when checklist items are failing", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        checklist: [
          { label: "Tests pass", status: "fail" },
          { label: "Lint clean", status: "pass" },
        ],
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("checklist_items_failing");
      expect(result.refinementGuidance).toContain("checklist");
    });

    it("returns for refinement when checklist items are pending", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        checklist: [
          { label: "Tests pass", status: "pass" },
          { label: "Security review", status: "pending" },
        ],
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("checklist_items_failing");
    });

    it("approves when all checklist items pass", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        checklist: [
          { label: "Tests pass", status: "pass" },
          { label: "Lint clean", status: "pass" },
          { label: "Code review", status: "pass" },
        ],
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.disposition).toBe("forwarded");
    });

    it("approves when checklist is empty", () => {
      const proposal = makeProposal({ confidence: 0.95, checklist: [] });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });

    it("approves when checklist is undefined", () => {
      const proposal = makeProposal({ confidence: 0.95, checklist: undefined });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });
  });

  describe("evidence requirements — code category (PR/issue)", () => {
    it("cannot reach forwardable state at >= 0.9 without a linked PR or issue", () => {
      const proposal = makeProposal({ confidence: 0.95, source: "agent_build" });
      const ctx: ApprovalPolicyContext = { proposal, testStatus: "pass" };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("missing_linked_pr_or_issue");
      expect(result.missingSignals).toContain("high_confidence_without_evidence");
      expect(result.hasAuthoritativeEvidence).toBe(false);
      expect(result.refinementGuidance).toContain("Link this proposal to a PR or issue before claiming high confidence");
    });

    it("does not accept a bare task reference as code evidence", () => {
      const proposal = makeProposal({ confidence: 0.95, source: "agent_build" });
      const ctx: ApprovalPolicyContext = { proposal, linkedTask: "task-123", testStatus: "pass" };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("missing_linked_pr_or_issue");
      expect(result.missingSignals).toContain("high_confidence_without_evidence");
    });

    it("approves when a linked PR is present", () => {
      const proposal = makeProposal({ confidence: 0.95, source: "agent_build" });
      const ctx: ApprovalPolicyContext = { proposal, linkedPr: 456, testStatus: "pass" };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.hasAuthoritativeEvidence).toBe(true);
    });

    it("approves when a linked issue is present (no PR needed)", () => {
      const proposal = makeProposal({ confidence: 0.95, source: "agent_build" });
      const ctx: ApprovalPolicyContext = { proposal, linkedIssue: "ISSUE-42", testStatus: "pass" };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.hasAuthoritativeEvidence).toBe(true);
    });

    it("returns for refinement when tests are failing despite a linked PR", () => {
      const proposal = makeProposal({ confidence: 0.95, source: "pr" });
      const ctx: ApprovalPolicyContext = { proposal, linkedPr: 58, testStatus: "fail" };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("missing_test_status");
      expect(result.refinementGuidance).toContain("tests/lint/build pass");
      // The PR link itself is still valid evidence — this is a test-status gap, not an evidence gap.
      expect(result.hasAuthoritativeEvidence).toBe(true);
      expect(result.missingSignals).not.toContain("high_confidence_without_evidence");
    });

    it("reads authoritative evidence already stored on the proposal (no ctx needed)", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        source: "agent_build",
        evidence: { linkedPrId: 789, testStatusSummary: "pass" },
      });

      const result = evaluateApprovalPolicy({ proposal });

      expect(result.canApprove).toBe(true);
      expect(result.hasAuthoritativeEvidence).toBe(true);
      expect(result.evidenceSummary).toContain("PR 789");
    });
  });

  describe("evidence requirements — governance category (runbook/doc)", () => {
    it("cannot reach forwardable state at >= 0.9 without a linked runbook or doc", () => {
      const proposal = makeProposal({
        confidence: 0.94,
        source: "content_agent",
        checklist: [{ label: "Tone reviewed", status: "pass" }],
      });
      const ctx: ApprovalPolicyContext = { proposal };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("missing_linked_runbook_or_doc");
      expect(result.missingSignals).toContain("high_confidence_without_evidence");
      expect(result.hasAuthoritativeEvidence).toBe(false);
      expect(result.refinementGuidance).toContain("Attach the relevant runbook or governance document for this change");
    });

    it("a generic evidenceRef alone does not satisfy the governance evidence bar", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        source: "planner_agent",
        checklist: [{ label: "Scoped", status: "pass" }],
      });
      const ctx: ApprovalPolicyContext = { proposal, evidenceRef: "some/loose/note.md" };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("missing_linked_runbook_or_doc");
      expect(result.missingSignals).toContain("high_confidence_without_evidence");
    });

    it("approves when a linked runbook is present", () => {
      const proposal = makeProposal({
        confidence: 0.94,
        source: "content_agent",
        checklist: [{ label: "Tone reviewed", status: "pass" }],
      });
      const ctx: ApprovalPolicyContext = { proposal, linkedRunbook: "knowledge/content/hero-copy.md" };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.hasAuthoritativeEvidence).toBe(true);
    });

    it("proposals with no recognized source are treated as governance and need a runbook", () => {
      const proposal = makeProposal({ confidence: 0.95, source: undefined });
      const ctx: ApprovalPolicyContext = { proposal };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.evidenceCategory).toBe("governance");
      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("missing_linked_runbook_or_doc");
    });
  });

  describe("risk level requirements", () => {
    it("returns for refinement when risk level is high", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        riskNote: "Risk level: high. Production database changes.",
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("risk_level_too_high");
      expect(result.refinementGuidance).toContain("High-risk");
    });

    it("approves when risk level is medium", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        riskNote: "Risk level: medium. Some impact expected.",
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });

    it("approves when risk level is low", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        riskNote: "Risk level: low. No production impact.",
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });
  });

  describe("generic evidence-or-reference fallback", () => {
    it("returns for refinement when there is no reference at all and no category evidence", () => {
      const proposal = makeProposal({ confidence: 0.5, routeTo: undefined });
      const ctx: ApprovalPolicyContext = { proposal };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("missing_evidence_or_reference");
    });

    it("does not fire when category evidence is already present", () => {
      const proposal = makeProposal({ confidence: 0.95, routeTo: undefined, source: "agent_build" });
      const ctx: ApprovalPolicyContext = { proposal, linkedPr: 1, testStatus: "pass" };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.missingSignals).not.toContain("missing_evidence_or_reference");
    });

    it("does not fire when routeTo is present as a generic reference", () => {
      const proposal = makeProposal({ confidence: 0.5, routeTo: "/builds/123" });
      const ctx: ApprovalPolicyContext = { proposal };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.missingSignals).not.toContain("missing_evidence_or_reference");
    });
  });

  describe("multiple issues", () => {
    it("collects all missing signals when multiple issues exist", () => {
      const proposal = makeProposal({
        confidence: 0.5,
        riskNote: "Risk level: high.",
        checklist: [{ label: "Tests", status: "fail" }],
        routeTo: undefined,
        source: "agent_build",
      });
      const ctx: ApprovalPolicyContext = { proposal };

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("confidence_below_threshold");
      expect(result.missingSignals).toContain("checklist_items_failing");
      expect(result.missingSignals).toContain("missing_linked_pr_or_issue");
      expect(result.missingSignals).toContain("missing_evidence_or_reference");
      expect(result.missingSignals).toContain("risk_level_too_high");
      // Confidence is below threshold here, so the high-confidence-specific signal should not fire.
      expect(result.missingSignals).not.toContain("high_confidence_without_evidence");
    });

    it("provides guidance for all issues", () => {
      const proposal = makeProposal({
        confidence: 0.5,
        checklist: [{ label: "Tests", status: "fail" }],
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.refinementGuidance).toBeDefined();
      expect(result.refinementGuidance).toContain("90%");
      expect(result.refinementGuidance).toContain("checklist");
    });
  });
});

describe("describeEvidence", () => {
  it("lists each populated evidence field on its own line", () => {
    const proposal = makeProposal({
      source: "agent_build",
      evidence: { linkedPrId: 58, testStatusSummary: "pass" },
    });

    const lines = describeEvidence(proposal);

    expect(lines).toContain("PR: 58");
    expect(lines).toContain("Tests/build: pass");
  });

  it("reports a category-specific empty message when no evidence is linked", () => {
    const codeProposal = makeProposal({ source: "agent_build", evidence: undefined });
    const governanceProposal = makeProposal({ source: "planner_agent", evidence: undefined });

    expect(describeEvidence(codeProposal)).toEqual(["No PR or issue linked yet."]);
    expect(describeEvidence(governanceProposal)).toEqual([
      "No runbook or governance document linked yet.",
    ]);
  });
});

describe("applyPolicyToProposal", () => {
  it("applies forwarded disposition to proposal", () => {
    const proposal = makeProposal({ confidence: 0.95 });
    const ctx = makeContext(proposal);
    const result = evaluateApprovalPolicy(ctx);

    const updated = applyPolicyToProposal(proposal, result);

    expect(updated.routingDisposition).toBe("forwarded");
    expect(updated.missingSignals).toBeUndefined();
    expect(updated.refinementGuidance).toBeUndefined();
  });

  it("applies needs_refinement disposition with guidance", () => {
    const proposal = makeProposal({ confidence: 0.5 });
    const ctx = makeContext(proposal);
    const result = evaluateApprovalPolicy(ctx);

    const updated = applyPolicyToProposal(proposal, result);

    expect(updated.routingDisposition).toBe("needs_refinement");
    expect(updated.missingSignals).toContain("confidence_below_threshold");
    expect(updated.refinementGuidance).toBeDefined();
  });
});

describe("hasMinimumConfidence", () => {
  it("returns true at 0.9 confidence", () => {
    expect(hasMinimumConfidence(makeProposal({ confidence: 0.9 }))).toBe(true);
  });

  it("returns true at 0.95 confidence", () => {
    expect(hasMinimumConfidence(makeProposal({ confidence: 0.95 }))).toBe(true);
  });

  it("returns false at 0.89 confidence", () => {
    expect(hasMinimumConfidence(makeProposal({ confidence: 0.89 }))).toBe(false);
  });

  it("returns false when confidence is undefined", () => {
    expect(hasMinimumConfidence(makeProposal({ confidence: undefined }))).toBe(false);
  });

  it("returns true regardless of evidence — this check is confidence-only", () => {
    const proposal = makeProposal({ confidence: 0.95, source: "agent_build", evidence: undefined });
    expect(hasMinimumConfidence(proposal)).toBe(true);
  });
});

describe("canForwardProposal", () => {
  it("returns true for a fully valid proposal with evidence stored on it", () => {
    const proposal = makeProposal({
      confidence: 0.95,
      checklist: [{ label: "Tests", status: "pass" }],
      routeTo: "/builds",
      riskNote: "Risk level: low.",
      source: "agent_build",
      evidence: { linkedPrId: 1, testStatusSummary: "pass" },
    });

    expect(canForwardProposal(proposal)).toBe(true);
  });

  it("returns false for a low confidence proposal", () => {
    const proposal = makeProposal({
      confidence: 0.5,
      routeTo: "/builds",
      source: "planner_agent",
    });

    expect(canForwardProposal(proposal)).toBe(false);
  });

  it("returns false for a high risk proposal", () => {
    const proposal = makeProposal({
      confidence: 0.95,
      riskNote: "Risk level: high.",
      routeTo: "/builds",
      source: "planner_agent",
      evidence: { linkedRunbookSlug: "docs/x.md" },
    });

    expect(canForwardProposal(proposal)).toBe(false);
  });

  it("returns false for a high-confidence proposal with no evidence attached", () => {
    const proposal = makeProposal({
      confidence: 0.95,
      routeTo: "/builds",
      source: "agent_build",
      evidence: undefined,
    });

    expect(canForwardProposal(proposal)).toBe(false);
  });
});

describe("example decision records", () => {
  it("approved: 0.91+ confidence, checklist passing, and a linked PR", () => {
    const proposal = makeProposal({
      id: "example-approved",
      title: "Build: Code change merging to main",
      confidence: 0.92,
      riskNote: "Risk level: low. Isolated fix.",
      source: "agent_build",
      checklist: [
        { label: "Tests pass", status: "pass" },
        { label: "Lint clean", status: "pass" },
        { label: "PR reviewed", status: "pass" },
      ],
      routeTo: "/builds/pr-123",
      evidence: { linkedPrId: 123, testStatusSummary: "pass" },
    });

    const result = evaluateApprovalPolicy({ proposal });

    expect(result).toMatchObject({
      canApprove: true,
      disposition: "forwarded",
      missingSignals: [],
      hasAuthoritativeEvidence: true,
    });
    expect(result.reason).toContain("92%");
  });

  it("returned: 0.89 confidence — below threshold, evidence not the issue", () => {
    const proposal = makeProposal({
      id: "example-returned-confidence",
      title: "Research: New tool adoption",
      confidence: 0.89,
      riskNote: "Risk level: medium.",
      source: "research_agent",
      checklist: [
        { label: "Alternatives evaluated", status: "pass" },
        { label: "Cost analysis", status: "pass" },
      ],
      evidence: { linkedRunbookSlug: "knowledge/research/tool-comparison.md" },
    });

    const result = evaluateApprovalPolicy({ proposal });

    expect(result).toMatchObject({ canApprove: false, disposition: "needs_refinement" });
    expect(result.missingSignals).toEqual(["confidence_below_threshold"]);
    expect(result.reason).toContain("89%");
    expect(result.reason).toContain("below");
  });

  it("returned: high confidence but no linked PR/issue for a code change", () => {
    const proposal = makeProposal({
      id: "example-returned-context",
      title: "Build: Database migration",
      confidence: 0.94,
      riskNote: "Risk level: medium.",
      source: "agent_build",
      routeTo: undefined,
    });

    const result = evaluateApprovalPolicy({ proposal, testStatus: "pass" });

    expect(result).toMatchObject({ canApprove: false, disposition: "needs_refinement" });
    expect(result.missingSignals).toContain("missing_linked_pr_or_issue");
    expect(result.missingSignals).toContain("high_confidence_without_evidence");
    expect(result.missingSignals).toContain("missing_evidence_or_reference");
  });

  it("returned: high confidence but no runbook/doc for a governance change", () => {
    const proposal = makeProposal({
      id: "example-returned-governance",
      title: "Content: External-facing copy shipped to clients",
      confidence: 0.92,
      riskNote: "Risk level: low.",
      source: "content_agent",
      checklist: [{ label: "Tone reviewed", status: "pass" }],
      routeTo: undefined,
    });

    const result = evaluateApprovalPolicy({ proposal });

    expect(result).toMatchObject({ canApprove: false, disposition: "needs_refinement" });
    expect(result.missingSignals).toContain("missing_linked_runbook_or_doc");
    expect(result.missingSignals).toContain("high_confidence_without_evidence");
    expect(result.refinementGuidance).toContain(
      "Attach the relevant runbook or governance document for this change",
    );
  });
});
