import { describe, expect, it } from "vitest";
import {
  buildBuilderReportFromApproval,
  builderReportToBuildLogEntry,
} from "../lib/build/recordBuilderReport.js";
import {
  createBuilderReport,
  deriveBuilderReportStatus,
  formatBuilderReportSummary,
} from "../lib/build/builderReport.js";
import { BUILD_AGENT_TEST_PROPOSAL_ID } from "../src/components/chief/buildAgentTestProposal.js";

describe("builderReport", () => {
  it("marks success only when build, test, and lint pass", () => {
    expect(
      deriveBuilderReportStatus([
        { step: "build", outcome: "pass" },
        { step: "test", outcome: "pass" },
        { step: "lint", outcome: "pass" },
      ]),
    ).toBe("success");

    expect(
      deriveBuilderReportStatus([
        { step: "build", outcome: "pass" },
        { step: "test", outcome: "fail" },
        { step: "lint", outcome: "pass" },
      ]),
    ).toBe("failed");

    expect(
      deriveBuilderReportStatus([
        { step: "build", outcome: "pass" },
        { step: "test", outcome: "pass" },
        { step: "lint", outcome: "not_run" },
      ]),
    ).toBe("partial");
  });

  it("builds a report from an approved build card with verification results", () => {
    const report = buildBuilderReportFromApproval({
      approvalId: BUILD_AGENT_TEST_PROPOSAL_ID,
      summary: "Docs-only Build Agent QA proposal",
      filesOrAreas: ["docs/build-agent-approval-test.md"],
      branch: "cursor/builder-v1-report-0eaa",
      prUrl: "https://github.com/TrueCrew1/truecrew-dashboard/pull/999",
      verification: [
        { step: "build", outcome: "pass" },
        { step: "test", outcome: "pass" },
        { step: "lint", outcome: "pass" },
      ],
      completedAt: "2026-07-20T13:00:00.000Z",
    });

    expect(report.status).toBe("success");
    expect(report.sourceKind).toBe("build_approval");
    expect(report.sourceId).toBe(BUILD_AGENT_TEST_PROPOSAL_ID);
    expect(formatBuilderReportSummary(report)).toContain("Builder report");
    expect(formatBuilderReportSummary(report)).toContain("build: pass");
  });

  it("maps a builder report into the existing build log entry shape", () => {
    const report = createBuilderReport({
      id: "builder-report-example",
      sourceKind: "manual",
      sourceId: "manual-001",
      summary: "Scoped Builder prove-out slice",
      verification: [
        { step: "build", outcome: "pass" },
        { step: "test", outcome: "pass" },
        { step: "lint", outcome: "skipped", detail: "not requested for doc-only change" },
      ],
    });

    const entry = builderReportToBuildLogEntry(report);

    expect(report.status).toBe("partial");
    expect(entry.result).toBe("unknown");
    expect(entry.notes).toContain("Builder V1 report");
    expect(entry.notes).toContain("lint=skipped");
  });
});
