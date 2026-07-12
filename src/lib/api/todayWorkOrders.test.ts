import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { todayWorkOrdersMock } from "@/data/todayWorkOrdersMock";
import { loadTodayWorkOrders } from "@/lib/api/todayWorkOrders";

describe("loadTodayWorkOrders", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("returns the mock fixture when live API is disabled", async () => {
    vi.stubEnv("VITE_USE_LIVE_API", "");

    const result = await loadTodayWorkOrders();

    expect(result).toBe(todayWorkOrdersMock);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches and validates the live endpoint when live API is enabled", async () => {
    vi.stubEnv("VITE_USE_LIVE_API", "true");
    vi.stubEnv("VITE_INTERNAL_KEY", "test-secret");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => todayWorkOrdersMock,
    });

    const result = await loadTodayWorkOrders();

    expect(fetchMock).toHaveBeenCalledWith("/api/today/work-orders", {
      headers: { "x-internal-key": "test-secret" },
    });
    expect(result.org_context.org_name).toBe("Demo Field Services");
  });

  it("surfaces API error messages in live mode", async () => {
    vi.stubEnv("VITE_USE_LIVE_API", "true");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Database not configured" }),
    });

    await expect(loadTodayWorkOrders()).rejects.toThrow("Database not configured");
  });
});
