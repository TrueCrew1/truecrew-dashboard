import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import {
  buildOperationalReadinessSummary,
  type OperationalReadinessDomainId,
} from "../lib/chief/operationalReadiness.js";
import { buildRepoHygieneSummary } from "../lib/ops/repoHygieneSummary.js";
import { detectV1CapabilityPresence } from "../lib/ops/capabilityPresence.js";

const { requireInternalAuthMock } = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  requireInternalAuth: requireInternalAuthMock,
}));

import handler from "../api/chief/approvals/index.js";

const DOMAIN_IDS: OperationalReadinessDomainId[] = [
  "chief",
  "builder",
  "librarian",
  "repo-hygiene",
  "integrations",
  "reporting",
];

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("operational readiness summary", () => {
  it("builds a deterministic summary with required domains", () => {
    const summary = buildOperationalReadinessSummary(process.cwd(), "2026-07-20T00:00:00.000Z");

    expect(summary.generatedAt).toBe("2026-07-20T00:00:00.000Z");
    expect(summary.domains.map((domain) => domain.id)).toEqual(DOMAIN_IDS);
    expect(summary.sources).toContain("lib/ops/toolGovernanceCatalog.ts");
    expect(summary.sources).toContain("lib/ops/integrationsInventory.ts");
    expect(["ready", "partial", "blocked", "not_wired"]).toContain(summary.overallStatus);
  });

  it("marks reporting not_wired when turnover and builder report modules are absent", () => {
    const capabilities = detectV1CapabilityPresence(process.cwd());
    const summary = buildOperationalReadinessSummary();
    const reporting = summary.domains.find((domain) => domain.id === "reporting");

    expect(reporting).toBeDefined();
    if (!capabilities.dailyTurnover && !capabilities.builderReport) {
      expect(reporting?.status).toBe("not_wired");
    }
  });

  it("reports repo hygiene as partial when CI exists but in-app signals do not", () => {
    const hygiene = buildRepoHygieneSummary(process.cwd());
    const summary = buildOperationalReadinessSummary();
    const repoHygiene = summary.domains.find((domain) => domain.id === "repo-hygiene");

    expect(hygiene.ciWorkflowPresent).toBe(true);
    expect(hygiene.inAppSignalsWired).toBe(false);
    expect(hygiene.status).toBe("partial");
    expect(repoHygiene?.status).toBe("partial");
  });

  it("keeps chief ready while surfacing env warnings when vault is unset", () => {
    const summary = buildOperationalReadinessSummary();
    const chief = summary.domains.find((domain) => domain.id === "chief");

    expect(chief?.status).toBe("ready");
    expect(chief?.warnings.some((warning) => warning.includes("vault"))).toBe(true);
  });

  it("lists partial and not_wired integration notes", () => {
    const summary = buildOperationalReadinessSummary();

    expect(summary.partialOrNotWired.some((note) => note.includes("google-drive-workspace"))).toBe(
      true,
    );
    expect(summary.partialOrNotWired.some((note) => note.includes("slack"))).toBe(true);
  });
});

describe("GET /api/chief/approvals?view=operational-readiness", () => {
  it("returns the operational readiness summary", async () => {
    requireInternalAuthMock.mockReturnValue(true);
    const req = {
      method: "GET",
      query: { view: "operational-readiness" },
      headers: {},
    } as unknown as VercelRequest;
    const res = createMockResponse() as unknown as VercelResponse;

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as ReturnType<typeof buildOperationalReadinessSummary>;
    expect(body.overallStatus).toBeDefined();
    expect(body.domains).toHaveLength(6);
  });
});
