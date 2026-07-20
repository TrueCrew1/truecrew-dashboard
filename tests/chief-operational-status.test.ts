import { describe, expect, it } from "vitest";
import type { OperationalReadinessSummary } from "@/lib/ops/operationalReadinessTypes";
import {
  deriveOperationalStatusView,
  formatReadinessStatusLabel,
  OPERATIONAL_STATUS_MOCK_MODE_NOTE,
  overallStatusHeadline,
  readinessStatusTone,
} from "@/lib/ops/operationalReadinessView";

function buildSummary(
  overrides: Partial<OperationalReadinessSummary> = {},
): OperationalReadinessSummary {
  return {
    generatedAt: "2026-07-20T00:00:00.000Z",
    overallStatus: "partial",
    domains: [
      {
        id: "chief",
        label: "Chief",
        status: "ready",
        summary: "Governed approvals wired.",
        blockers: [],
        warnings: ["Chief: vault unset"],
        partialNotes: [],
      },
      {
        id: "reporting",
        label: "Reporting",
        status: "not_wired",
        summary: "No reporting modules on branch.",
        blockers: [],
        warnings: [],
        partialNotes: ["Reporting: turnover missing"],
      },
    ],
    blockers: [],
    warnings: ["Chief: vault unset"],
    partialOrNotWired: ["Reporting: turnover missing"],
    sources: ["lib/chief/operationalReadiness.ts"],
    ...overrides,
  };
}

describe("operationalReadinessView", () => {
  it("maps readiness statuses to tones and labels", () => {
    expect(readinessStatusTone("ready")).toBe("neutral");
    expect(readinessStatusTone("partial")).toBe("warn");
    expect(readinessStatusTone("blocked")).toBe("critical");
    expect(readinessStatusTone("not_wired")).toBe("muted");
    expect(formatReadinessStatusLabel("not_wired")).toBe("Not wired");
    expect(overallStatusHeadline("partial")).toBe("V1 partially ready");
  });

  it("returns mock-mode unavailable view when live API is disabled", () => {
    const view = deriveOperationalStatusView({
      liveApi: false,
      loading: false,
      error: null,
      summary: null,
    });

    expect(view.kind).toBe("unavailable");
    if (view.kind === "unavailable") {
      expect(view.headline).toMatch(/demo mode/i);
      expect(view.detail).toBe(OPERATIONAL_STATUS_MOCK_MODE_NOTE);
    }
  });

  it("returns error unavailable view when fetch fails", () => {
    const view = deriveOperationalStatusView({
      liveApi: true,
      loading: false,
      error: "Operational readiness API returned 503",
      summary: null,
    });

    expect(view.kind).toBe("unavailable");
    if (view.kind === "unavailable") {
      expect(view.tone).toBe("critical");
      expect(view.detail).toContain("503");
    }
  });

  it("returns summary view with blocked and partial domains", () => {
    const summary = buildSummary({
      overallStatus: "blocked",
      blockers: ["Repo hygiene: CI workflow file missing."],
    });

    const view = deriveOperationalStatusView({
      liveApi: true,
      loading: false,
      error: null,
      summary,
    });

    expect(view.kind).toBe("summary");
    if (view.kind === "summary") {
      expect(view.summary.overallStatus).toBe("blocked");
      expect(view.summary.domains).toHaveLength(2);
      expect(view.summary.domains[1]?.status).toBe("not_wired");
      expect(view.summary.blockers[0]).toMatch(/Repo hygiene/);
    }
  });

  it("shows loading unavailable state before first payload", () => {
    const view = deriveOperationalStatusView({
      liveApi: true,
      loading: true,
      error: null,
      summary: null,
    });

    expect(view.kind).toBe("unavailable");
    if (view.kind === "unavailable") {
      expect(view.headline).toMatch(/Loading/i);
    }
  });
});
