import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMaintenanceTaskPayloadFromProposal,
  enqueueMaintenanceTask,
  fetchMaintenanceWorkItems,
  maintenanceTaskIdempotencyKey,
} from "@/lib/api/maintenanceRuntime";

describe("maintenanceTaskIdempotencyKey", () => {
  it("builds a stable, namespaced key from a proposal id", () => {
    expect(maintenanceTaskIdempotencyKey("apr-1")).toBe("maintenance:maintenance_task:apr-1");
  });
});

describe("buildMaintenanceTaskPayloadFromProposal", () => {
  it("maps proposal fields into a MaintenanceTaskPayload", () => {
    const payload = buildMaintenanceTaskPayloadFromProposal({
      proposalId: "apr-1",
      title: "Replace HVAC filter — Unit 4",
      summary: "Flagged during weekly walkthrough.",
      recommendedAction: "Swap the filter before next shift.",
      riskNote: "Low risk — routine PM item.",
      decisionLabel: "Approved",
    });

    expect(payload).toEqual({
      title: "Replace HVAC filter — Unit 4",
      description: "Approved. Swap the filter before next shift.",
      context: "Flagged during weekly walkthrough.",
      notes: "Low risk — routine PM item.",
    });
  });
});

describe("fetchMaintenanceWorkItems / enqueueMaintenanceTask", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("fetchMaintenanceWorkItems sends the internal auth header and returns workItems", async () => {
    vi.stubEnv("VITE_INTERNAL_KEY", "test-secret");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workItems: [{ id: "maint-1" }] }),
    });

    const items = await fetchMaintenanceWorkItems(10);

    expect(items).toEqual([{ id: "maint-1" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/runtime/maintenance/work-items?limit=10",
      { headers: { "x-internal-key": "test-secret" } },
    );
  });

  it("fetchMaintenanceWorkItems throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(fetchMaintenanceWorkItems()).rejects.toThrow(
      /Maintenance work items API returned 500/,
    );
  });

  it("enqueueMaintenanceTask POSTs the payload and returns the created work item", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workItem: { id: "maint-2" }, created: true }),
    });

    const result = await enqueueMaintenanceTask({
      chiefProposalId: "apr-2",
      idempotencyKey: "maintenance:maintenance_task:apr-2",
      inputPayload: { title: "Swap belt", description: "Belt is worn." },
    });

    expect(result).toEqual({ workItem: { id: "maint-2" }, created: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/runtime/maintenance/work-items",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("enqueueMaintenanceTask throws the API error message when the response is not ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "maintenance_task payload requires title" }),
    });

    await expect(
      enqueueMaintenanceTask({
        chiefProposalId: "apr-3",
        idempotencyKey: "maintenance:maintenance_task:apr-3",
        inputPayload: { title: "", description: "" },
      }),
    ).rejects.toThrow(/maintenance_task payload requires title/);
  });
});
