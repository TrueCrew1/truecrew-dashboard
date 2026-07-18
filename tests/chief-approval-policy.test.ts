import { describe, expect, it } from "vitest";
import {
  evaluateApprovalPolicy,
  applyPolicyToProposal,
  hasMinimumConfidence,
  canForwardProposal,
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

function makeContext(
  proposal: ApprovalProposal,
  overrides: Partial<ApprovalPolicyContext> = {},
): ApprovalPolicyContext {
  return {
    proposal,
    linkedPr: 123,
    testStatus: "pass",
    buildStatusKnown: true,
    evidenceRef: "knowledge/decisions/test.md",
    ...overrides,
  };
}

describe("CHIEF_CONFIDENCE_THRESHOLD", () => {
  it("is set to 0.9 (90%)", () => {
    expect(CHIEF_CONFIDENCE_THRESHOLD).toBe(0.9);
  });
});

describe("evaluateApprovalPolicy", () => {
  describe("high confidence with all checks passing", () => {
    it("approves at 0.91 confidence with all checklist items passing", () => {
      const proposal = makeProposal({ confidence: 0.91 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.disposition).toBe("forwarded");
      expect(result.missingSignals).toHaveLength(0);
      expect(result.refinementGuidance).toBeUndefined();
    });

    it("approves at exactly 0.9 confidence", () => {
      const proposal = makeProposal({ confidence: 0.9 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
      expect(result.disposition).toBe("forwarded");
    });

    it("approves at 0.95 confidence", () => {
      const proposal = makeProposal({ confidence: 0.95 });
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
  });

  describe("low confidence returns for refinement", () => {
    it("returns for refinement at 0.89 confidence", () => {
      const proposal = makeProposal({ confidence: 0.89 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("confidence_below_threshold");
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

    it("returns for refinement at 0.5 confidence", () => {
      const proposal = makeProposal({ confidence: 0.5 });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
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
      const proposal = makeProposal({
        confidence: 0.95,
        checklist: [],
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });

    it("approves when checklist is undefined", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        checklist: undefined,
      });
      const ctx = makeContext(proposal);

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });
  });

  describe("code-related context requirements", () => {
    it("returns for refinement when code-related proposal has no linked PR or task", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        source: "agent_build",
      });
      const ctx = makeContext(proposal, { linkedPr: undefined, linkedTask: undefined });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.disposition).toBe("needs_refinement");
      expect(result.missingSignals).toContain("missing_linked_pr_or_task");
      expect(result.refinementGuidance).toContain("Link this proposal");
    });

    it("approves when code-related proposal has a linked PR", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        source: "agent_build",
      });
      const ctx = makeContext(proposal, { linkedPr: 456, linkedTask: undefined });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });

    it("approves when code-related proposal has a linked task", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        source: "agent_build",
      });
      const ctx = makeContext(proposal, { linkedPr: undefined, linkedTask: "task-123" });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });

    it("returns for refinement when tests are failing for code-related proposal", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        source: "pr",
      });
      const ctx = makeContext(proposal, { testStatus: "fail", buildStatusKnown: true });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("missing_test_status");
      expect(result.refinementGuidance).toContain("tests/lint/build pass");
    });

    it("approves non-code-related proposals without PR/task requirement", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        source: "planner_agent",
        routeTo: "/roadmap",
      });
      const ctx = makeContext(proposal, { linkedPr: undefined, linkedTask: undefined });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
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

  describe("evidence requirements", () => {
    it("returns for refinement when missing evidence and routeTo", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        routeTo: undefined,
      });
      const ctx = makeContext(proposal, { evidenceRef: undefined });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("missing_evidence_or_reference");
    });

    it("approves when evidenceRef is provided", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        routeTo: undefined,
      });
      const ctx = makeContext(proposal, { evidenceRef: "docs/decision.md" });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
    });

    it("approves when routeTo is provided as evidence alternative", () => {
      const proposal = makeProposal({
        confidence: 0.95,
        routeTo: "/builds/123",
      });
      const ctx = makeContext(proposal, { evidenceRef: undefined });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(true);
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
      const ctx = makeContext(proposal, {
        linkedPr: undefined,
        linkedTask: undefined,
        evidenceRef: undefined,
      });

      const result = evaluateApprovalPolicy(ctx);

      expect(result.canApprove).toBe(false);
      expect(result.missingSignals).toContain("confidence_below_threshold");
      expect(result.missingSignals).toContain("checklist_items_failing");
      expect(result.missingSignals).toContain("missing_linked_pr_or_task");
      expect(result.missingSignals).toContain("missing_evidence_or_reference");
      expect(result.missingSignals).toContain("risk_level_too_high");
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
    const proposal = makeProposal({ confidence: 0.9 });
    expect(hasMinimumConfidence(proposal)).toBe(true);
  });

  it("returns true at 0.95 confidence", () => {
    const proposal = makeProposal({ confidence: 0.95 });
    expect(hasMinimumConfidence(proposal)).toBe(true);
  });

  it("returns false at 0.89 confidence", () => {
    const proposal = makeProposal({ confidence: 0.89 });
    expect(hasMinimumConfidence(proposal)).toBe(false);
  });

  it("returns false when confidence is undefined", () => {
    const proposal = makeProposal({ confidence: undefined });
    expect(hasMinimumConfidence(proposal)).toBe(false);
  });
});

describe("canForwardProposal", () => {
  it("returns true for fully valid proposal", () => {
    const proposal = makeProposal({
      confidence: 0.95,
      checklist: [{ label: "Tests", status: "pass" }],
      routeTo: "/builds",
      riskNote: "Risk level: low.",
      source: "planner_agent",
    });

    expect(canForwardProposal(proposal)).toBe(true);
  });

  it("returns false for low confidence proposal", () => {
    const proposal = makeProposal({
      confidence: 0.5,
      routeTo: "/builds",
      source: "planner_agent",
    });

    expect(canForwardProposal(proposal)).toBe(false);
  });

  it("returns false for high risk proposal", () => {
    const proposal = makeProposal({
      confidence: 0.95,
      riskNote: "Risk level: high.",
      routeTo: "/builds",
      source: "planner_agent",
    });

    expect(canForwardProposal(proposal)).toBe(false);
  });
});

describe("example decision records", () => {
  it("approved: 0.91+ confidence with all checklist items passing", () => {
    const proposal = makeProposal({
      id: "example-approved",
      title: "Build: Code change merging to main",
      confidence: 0.92,
      riskNote: "Risk level: low. Isolated fix.",
      checklist: [
        { label: "Tests pass", status: "pass" },
        { label: "Lint clean", status: "pass" },
        { label: "PR reviewed", status: "pass" },
      ],
      routeTo: "/builds/pr-123",
    });
    const ctx = makeContext(proposal);

    const result = evaluateApprovalPolicy(ctx);

    expect(result).toMatchObject({
      canApprove: true,
      disposition: "forwarded",
      missingSignals: [],
    });
    expect(result.reason).toContain("92%");
  });

  it("returned: 0.89 confidence - below threshold", () => {
    const proposal = makeProposal({
      id: "example-returned-confidence",
      title: "Research: New tool adoption",
      confidence: 0.89,
      riskNote: "Risk level: medium.",
      checklist: [
        { label: "Alternatives evaluated", status: "pass" },
        { label: "Cost analysis", status: "pass" },
      ],
      routeTo: "/knowledge",
    });
    const ctx = makeContext(proposal);

    const result = evaluateApprovalPolicy(ctx);

    expect(result).toMatchObject({
      canApprove: false,
      disposition: "needs_refinement",
    });
    expect(result.missingSignals).toContain("confidence_below_threshold");
    expect(result.reason).toContain("89%");
    expect(result.reason).toContain("below");
  });

  it("returned: missing context - no linked PR for code change", () => {
    const proposal = makeProposal({
      id: "example-returned-context",
      title: "Build: Database migration",
      confidence: 0.94,
      riskNote: "Risk level: medium.",
      source: "agent_build",
      routeTo: undefined,
    });
    const ctx: ApprovalPolicyContext = {
      proposal,
      linkedPr: undefined,
      linkedTask: undefined,
      buildStatusKnown: true,
      testStatus: "pass",
    };

    const result = evaluateApprovalPolicy(ctx);

    expect(result).toMatchObject({
      canApprove: false,
      disposition: "needs_refinement",
    });
    expect(result.missingSignals).toContain("missing_linked_pr_or_task");
    expect(result.missingSignals).toContain("missing_evidence_or_reference");
  });
});
