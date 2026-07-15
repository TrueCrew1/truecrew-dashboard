import { afterEach, describe, expect, it, vi } from "vitest";
import { mockData } from "@/data/mockData";
import { buildChiefLiveContext, deriveApprovalCandidates } from "./chiefLiveContext";
import { resolveChiefCommandWithAiFallback } from "./chiefAiFallback";

const UNMATCHED_QUERY = "zzz totally unrecognized gibberish zzz";

describe("resolveChiefCommandWithAiFallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("never calls the AI endpoint when VITE_CHIEF_AI_UI_ENABLED is off, even for an unmatched query", async () => {
    vi.stubEnv("VITE_CHIEF_AI_UI_ENABLED", "false");
    const fetchSpy = vi.spyOn(global, "fetch");
    const ctx = buildChiefLiveContext(mockData);
    const approvals = deriveApprovalCandidates(mockData, ctx);

    const result = await resolveChiefCommandWithAiFallback(UNMATCHED_QUERY, mockData, ctx, approvals);

    expect(result.aiRoute).toBe("deterministic");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never calls the AI endpoint for a query deterministic routing specifically answered", async () => {
    vi.stubEnv("VITE_CHIEF_AI_UI_ENABLED", "true");
    const fetchSpy = vi.spyOn(global, "fetch");
    const ctx = buildChiefLiveContext(mockData);
    const approvals = deriveApprovalCandidates(mockData, ctx);

    const result = await resolveChiefCommandWithAiFallback("what's blocked?", mockData, ctx, approvals);

    expect(result.aiRoute).toBe("deterministic");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls the AI endpoint and merges its answer in for an unmatched query when the UI flag is on", async () => {
    vi.stubEnv("VITE_CHIEF_AI_UI_ENABLED", "true");
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: "AI-generated summary.",
        recommendedAction: "AI-assisted response — advisory only.",
        route: "azure_gpt5_mini",
        degraded: false,
      }),
    } as unknown as Response);

    const ctx = buildChiefLiveContext(mockData);
    const approvals = deriveApprovalCandidates(mockData, ctx);

    const result = await resolveChiefCommandWithAiFallback(UNMATCHED_QUERY, mockData, ctx, approvals);

    expect(result.aiRoute).toBe("azure_gpt5_mini");
    expect(result.summary).toBe("AI-generated summary.");
  });

  it("falls back to the deterministic response, marked degraded, if the AI request itself throws", async () => {
    vi.stubEnv("VITE_CHIEF_AI_UI_ENABLED", "true");
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const ctx = buildChiefLiveContext(mockData);
    const approvals = deriveApprovalCandidates(mockData, ctx);

    const result = await resolveChiefCommandWithAiFallback(UNMATCHED_QUERY, mockData, ctx, approvals);

    expect(result.aiRoute).toBe("deterministic");
    expect(result.aiDegraded).toBe(true);
  });
});
