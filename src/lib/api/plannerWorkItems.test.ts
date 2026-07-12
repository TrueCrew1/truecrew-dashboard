import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPlannerWorkItem,
  getLibrarianPlannerWorkItems,
  getMaintenancePlannerWorkItems,
  getPlannerWorkItems,
} from "@/lib/api/plannerWorkItems";

describe("plannerWorkItems client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("getPlannerWorkItems sends the internal auth header and hits /api/planner/work-items", async () => {
    vi.stubEnv("VITE_INTERNAL_KEY", "test-secret");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workItems: [{ id: "item-1" }] }),
    });

    const items = await getPlannerWorkItems(10);

    expect(items).toEqual([{ id: "item-1" }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/planner/work-items?limit=10", {
      headers: { "x-internal-key": "test-secret" },
    });
  });

  it("getPlannerWorkItems throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getPlannerWorkItems()).rejects.toThrow(/Planner work items API returned 500/);
  });

  it("getLibrarianPlannerWorkItems hits the librarian view route", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workItems: [{ id: "item-2" }] }),
    });

    const items = await getLibrarianPlannerWorkItems();

    expect(items).toEqual([{ id: "item-2" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/planner/work-items/librarian?limit=20",
      expect.anything(),
    );
  });

  it("getMaintenancePlannerWorkItems hits the maintenance view route", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workItems: [{ id: "item-3" }] }),
    });

    const items = await getMaintenancePlannerWorkItems();

    expect(items).toEqual([{ id: "item-3" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/planner/work-items/maintenance?limit=20",
      expect.anything(),
    );
  });

  it("createPlannerWorkItem POSTs the input and returns the created work item", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workItem: { id: "item-4" } }),
    });

    const result = await createPlannerWorkItem({ title: "Ship the thing", priority: "high" });

    expect(result).toEqual({ id: "item-4" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/planner/work-items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Ship the thing", priority: "high" }),
      }),
    );
  });

  it("createPlannerWorkItem throws the API error message when the response is not ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "title is required" }),
    });

    await expect(createPlannerWorkItem({ title: "" })).rejects.toThrow(/title is required/);
  });
});
