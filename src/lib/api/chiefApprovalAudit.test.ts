import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchChiefApprovalAuditEvents } from "@/lib/api/chiefApprovalAudit";

describe("fetchChiefApprovalAuditEvents", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("sends the internal auth header and returns events", async () => {
    vi.stubEnv("VITE_INTERNAL_KEY", "test-secret");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ events: [{ id: "evt-1", proposalId: "apr-1" }] }),
    });

    const events = await fetchChiefApprovalAuditEvents(25);

    expect(events).toEqual([{ id: "evt-1", proposalId: "apr-1" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chief/approvals/audit?limit=25",
      { headers: { "x-internal-key": "test-secret" } },
    );
  });

  it("defaults to a limit of 50", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) });

    await fetchChiefApprovalAuditEvents();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chief/approvals/audit?limit=50",
      expect.any(Object),
    );
  });

  it("returns an empty array when the response has no events field", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    const events = await fetchChiefApprovalAuditEvents();

    expect(events).toEqual([]);
  });

  it("throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(fetchChiefApprovalAuditEvents()).rejects.toThrow(
      /Chief approval audit API returned 500/,
    );
  });
});
