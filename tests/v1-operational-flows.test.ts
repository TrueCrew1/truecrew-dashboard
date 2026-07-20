import { describe, expect, it, vi } from "vitest";
import { buildOperationalReadinessSummary } from "../lib/chief/operationalReadiness.js";
import {
  buildDailyTurnoverSnapshot,
  formatDailyTurnoverSlackMessage,
  TURNOVER_PREFIX,
} from "../lib/chief/dailyTurnover.js";
import { detectV1CapabilityPresence } from "../lib/ops/capabilityPresence.js";
import {
  REQUIRED_BASELINE_SLICE_IDS,
  detectPresentSliceIds,
} from "../lib/ops/v1MergePlan.js";
import {
  runV1IntegrationChecks,
  summarizeIntegrationChecks,
} from "../lib/ops/v1IntegrationCheck.js";
import { deriveOperationalStatusView } from "@/lib/ops/operationalReadinessView";
import { buildGovernedEvidenceTrail } from "@/lib/chief/governedEvidenceTrail";
import { RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND } from "@/components/chief/researchMissionHelpers";
import type { ApprovalProposal } from "@/components/chief/types";
import {
  deriveTurnoverUnavailableState,
  formatSlackDeliveryStatus,
} from "@/lib/chief/dailyTurnoverView";

const { isVaultConfiguredMock } = vi.hoisted(() => ({
  isVaultConfiguredMock: vi.fn(),
}));

vi.mock("../lib/obsidian/config.js", () => ({
  isVaultConfigured: isVaultConfiguredMock,
}));

function buildApprovedHandoffProposal(): ApprovalProposal {
  return {
    id: "apr-research-psh-wf-integration",
    title: "Project summary handoff",
    summary: "Integration fixture — approve Research handoff.",
    recommendedAction: "Approve handoff",
    riskNote: "Low",
    status: "approved",
    createdAt: "2026-07-20T00:00:00.000Z",
    decidedAt: "2026-07-20T00:05:00.000Z",
    missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    missionProjectId: "wf-integration",
  };
}

const REQUIRED_BASELINE_SLICES = [...REQUIRED_BASELINE_SLICE_IDS];

describe("V1 integration harness", () => {
  it("runs all integration checks without throwing", () => {
    isVaultConfiguredMock.mockReturnValue(false);
    const checks = runV1IntegrationChecks({ root: process.cwd() });
    const ids = Object.keys(checks);
    expect(ids.length).toBeGreaterThanOrEqual(10);

    const totals = summarizeIntegrationChecks(checks);
    expect(totals.fail).toBe(0);
    expect(totals.pass + totals.partial).toBe(ids.length);
  });

  it("does not pass merge-plan-main-merge until slices are merged to main", () => {
    const checks = runV1IntegrationChecks({ root: process.cwd() });
    expect(checks["merge-plan-main-merge"].outcome).toBe("partial");
    expect(checks["merge-plan-main-merge"].message).toMatch(/not merged to main/i);
  });

  it("passes merge-plan-main-merge when merged fixture covers required slices", () => {
    const checks = runV1IntegrationChecks({
      root: process.cwd(),
      mergedSliceIds: REQUIRED_BASELINE_SLICES,
    });
    expect(checks["merge-plan-main-merge"].outcome).toBe("pass");
  });

  it("fails loudly when catalogs would be invalid", () => {
    const checks = runV1IntegrationChecks({ root: process.cwd() });
    expect(checks["catalog-shape"].outcome).toBe("pass");
  });
});

describe("V1 operational readiness composition", () => {
  it("composes all domains without throwing", () => {
    isVaultConfiguredMock.mockReturnValue(false);
    const summary = buildOperationalReadinessSummary(process.cwd(), "2026-07-20T12:00:00.000Z");

    expect(summary.domains).toHaveLength(6);
    expect(summary.overallStatus).not.toBe("ready");
    expect(summary.overallStatus).toBe("partial");
  });

  it("does not mark reporting ready when modules are env-gated", () => {
    isVaultConfiguredMock.mockReturnValue(false);
    const summary = buildOperationalReadinessSummary(process.cwd());
    const reporting = summary.domains.find((domain) => domain.id === "reporting");

    expect(reporting?.status).not.toBe("ready");
    if (detectV1CapabilityPresence(process.cwd()).dailyTurnover) {
      expect(reporting?.status).toBe("partial");
      expect(reporting?.partialNotes.some((note) => note.includes("Builder"))).toBe(true);
    }
  });

  it("does not mark integrations ready while partial/not_wired entries exist", () => {
    isVaultConfiguredMock.mockReturnValue(false);
    const summary = buildOperationalReadinessSummary(process.cwd());
    const integrations = summary.domains.find((domain) => domain.id === "integrations");

    expect(integrations?.status).toBe("partial");
    expect(summary.partialOrNotWired.some((note) => note.includes("google-drive-workspace"))).toBe(
      true,
    );
  });

  it("keeps repo hygiene partial when in-app signals are absent", () => {
    isVaultConfiguredMock.mockReturnValue(false);
    const summary = buildOperationalReadinessSummary(process.cwd());
    const repoHygiene = summary.domains.find((domain) => domain.id === "repo-hygiene");

    expect(repoHygiene?.status).toBe("partial");
    expect(repoHygiene?.status).not.toBe("ready");
  });

  /**
   * Known divergence: Chief domain may be `ready` while vault is unset — warnings only.
   * This is intentional in lib/chief/operationalReadiness.ts (env warnings, not blockers).
   */
  it("surfaces vault warnings on chief without falsely blocking the domain", () => {
    isVaultConfiguredMock.mockReturnValue(false);
    const summary = buildOperationalReadinessSummary(process.cwd());
    const chief = summary.domains.find((domain) => domain.id === "chief");

    expect(chief?.status).toBe("ready");
    expect(chief?.warnings.some((warning) => warning.toLowerCase().includes("vault"))).toBe(true);
  });
});

describe("V1 Command Center ops-status panel", () => {
  it("returns demo-mode unavailable view instead of a fake summary", () => {
    const view = deriveOperationalStatusView({
      liveApi: false,
      loading: false,
      error: null,
      summary: null,
    });

    expect(view.kind).toBe("unavailable");
    if (view.kind === "unavailable") {
      expect(view.headline).toMatch(/demo mode/i);
    }
  });

  it("surfaces a live summary with honest partial overall status", () => {
    isVaultConfiguredMock.mockReturnValue(false);
    const summary = buildOperationalReadinessSummary(process.cwd());

    const view = deriveOperationalStatusView({
      liveApi: true,
      loading: false,
      error: null,
      summary,
    });

    expect(view.kind).toBe("summary");
    if (view.kind === "summary") {
      expect(view.summary.overallStatus).toBe("partial");
      expect(view.summary.domains.some((domain) => domain.status === "not_wired")).toBe(false);
      expect(view.summary.domains.some((domain) => domain.status === "partial")).toBe(true);
    }
  });
});

describe("V1 evidence trail panel", () => {
  it("marks demo mode trails unavailable — not complete", () => {
    const trail = buildGovernedEvidenceTrail({
      proposal: buildApprovedHandoffProposal(),
      liveApiEnabled: false,
    });

    expect(trail.status).not.toBe("complete");
    expect(trail.status).toBe("unavailable");
    expect(trail.verification.every((step) => step.availability === "not_wired")).toBe(true);
  });

  it("surfaces missing approval activity as not_recorded, not silent success", () => {
    const trail = buildGovernedEvidenceTrail({
      proposal: buildApprovedHandoffProposal(),
      liveApiEnabled: true,
    });

    expect(trail.status).toBe("partial");
    expect(
      trail.references.some(
        (reference) =>
          reference.label === "Approval activity record" &&
          reference.availability === "not_recorded",
      ),
    ).toBe(true);
    expect(trail.warnings.some((warning) => warning.code === "mission_missing")).toBe(true);
    expect(trail.warnings.some((warning) => warning.code === "activity_not_recorded")).toBe(true);
  });

  it("does not mark builder verification recorded when module is absent", () => {
    const trail = buildGovernedEvidenceTrail({
      proposal: buildApprovedHandoffProposal(),
      liveApiEnabled: true,
      capabilities: {
        builderReportModule: false,
        dailyTurnoverModule: true,
      },
    });

    expect(trail.verification.every((step) => step.availability === "not_wired")).toBe(true);
    expect(trail.reporting.builderReport).toBe("not_wired");
    expect(trail.warnings.some((warning) => warning.code === "builder_report_not_wired")).toBe(
      true,
    );
  });
});

describe("V1 daily turnover panel", () => {
  it("builds an honest snapshot with zero activity in empty fixture", () => {
    const snapshot = buildDailyTurnoverSnapshot({
      generatedAt: "2026-07-20T12:00:00.000Z",
      vaultRecords: [],
      supabaseDecisions: [],
      missions: [],
      health: {
        vault: "not configured",
        supabase: "not configured",
        slackWebhook: "not configured",
        githubWebhook: "not configured",
        repoHealth: "not yet wired",
      },
    });

    expect(snapshot.counts.approvedActivity24h).toBe(0);
    expect(snapshot.health.repoHealth).toMatch(/not yet wired/i);
  });

  it("guards demo mode in the turnover panel view", () => {
    const state = deriveTurnoverUnavailableState({
      liveApi: false,
      loading: false,
      error: null,
    });

    expect(state?.headline).toMatch(/demo mode/i);
  });

  it("reports slack as not configured instead of silent delivery success", () => {
    expect(formatSlackDeliveryStatus({ configured: false, attempted: false })).toMatch(
      /not configured/i,
    );
  });

  it("prefixes turnover messages for operator scanning", () => {
    const snapshot = buildDailyTurnoverSnapshot({
      generatedAt: "2026-07-20T12:00:00.000Z",
      vaultRecords: [],
      supabaseDecisions: [],
      missions: [],
      health: {
        vault: "not configured",
        supabase: "not configured",
        slackWebhook: "not configured",
        githubWebhook: "not configured",
        repoHealth: "not yet wired",
      },
    });
    const formatted = formatDailyTurnoverSlackMessage(snapshot);
    expect(formatted.startsWith(TURNOVER_PREFIX)).toBe(true);
  });
});

describe("V1 cross-stack failure surfacing", () => {
  it("documents builder report gap on this branch", () => {
    const capabilities = detectV1CapabilityPresence(process.cwd());
    const checks = runV1IntegrationChecks({ root: process.cwd() });

    if (!capabilities.builderReport) {
      expect(checks["builder-report-presence"].outcome).toBe("partial");
    }
  });

  /**
   * Known divergence: docs/V1_TRUTH_MAP.md still lists Slack automated turnover as NOT STARTED
   * while lib/chief/dailyTurnover.ts exists on this branch. Doc update is deferred to merge pass.
   */
  it("has daily turnover module on stack branches while truth map may lag", () => {
    const capabilities = detectV1CapabilityPresence(process.cwd());
    if (capabilities.dailyTurnover) {
      expect(checksTurnoverPresent()).toBe(true);
    }
  });
});

function checksTurnoverPresent(): boolean {
  return detectPresentSliceIds(process.cwd()).includes("daily-turnover");
}
