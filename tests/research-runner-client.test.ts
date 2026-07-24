import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertRunnerMayMutate,
  countByStatus,
  findRequestById,
  listResearchRequestsViaApi,
  mutateReleasedRequestViaApi,
  pickOldestInProgress,
  resolveResearchRunnerEnv,
  type RunnerResearchRequest,
} from "../lib/research/runnerClient";
import { deriveResearchStartApprovals } from "../src/components/chief/researchStartApprovals";
import { applyResearchStatus } from "../src/lib/research/sessionStore";
import {
  applyStatusOverrides,
  deriveResearchRailMode,
  pruneStatusOverridesMatchingServer,
  resolveResearchRequestForUpdate,
  shouldPatchWhileLoading,
  shouldPostCreateWhileLoading,
  simulateApproveRelease,
} from "../src/lib/research/requestResolution";
import type { ResearchRequest } from "../src/lib/research/types";

function runnerRow(
  partial: Partial<RunnerResearchRequest> & Pick<RunnerResearchRequest, "id" | "status" | "updatedAt">,
): RunnerResearchRequest {
  return {
    topic: "Topic",
    whyItMatters: "Why",
    suggestedOutcome: "Outcome",
    createdAt: "2026-07-22T12:00:00.000Z",
    source: "adapter",
    ...partial,
  };
}

function clientRow(partial: Partial<ResearchRequest> & Pick<ResearchRequest, "id" | "status">): ResearchRequest {
  return {
    topic: "Painter SaaS market scan",
    whyItMatters: "Ground V2 scope",
    suggestedOutcome: "Findings note",
    createdAt: "2026-07-22T13:00:00.000Z",
    updatedAt: "2026-07-22T13:00:00.000Z",
    source: "adapter",
    ...partial,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("research runner client", () => {
  it("resolveResearchRunnerEnv fails closed with missing names listed", () => {
    const result = resolveResearchRunnerEnv({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(["TRUECREW_API_URL", "TRUECREW_INTERNAL_KEY"]);
    expect(result.error).toMatch(/TRUECREW_API_URL/);
  });

  it("resolveResearchRunnerEnv strips trailing slash from API URL", () => {
    const result = resolveResearchRunnerEnv({
      TRUECREW_API_URL: "https://example.vercel.app/",
      TRUECREW_INTERNAL_KEY: "secret",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.env.apiUrl).toBe("https://example.vercel.app");
    expect(result.env.internalKey).toBe("secret");
  });

  it("pickOldestInProgress returns the earliest updated in_progress row", () => {
    const requests = [
      runnerRow({ id: "a", status: "queued", updatedAt: "2026-07-22T10:00:00.000Z" }),
      runnerRow({ id: "b", status: "in_progress", updatedAt: "2026-07-22T12:00:00.000Z" }),
      runnerRow({ id: "c", status: "in_progress", updatedAt: "2026-07-22T11:00:00.000Z" }),
      runnerRow({ id: "d", status: "done", updatedAt: "2026-07-22T09:00:00.000Z" }),
    ];
    expect(pickOldestInProgress(requests)?.id).toBe("c");
  });

  it("pickOldestInProgress ignores queued rows entirely", () => {
    expect(
      pickOldestInProgress([
        runnerRow({ id: "a", status: "queued", updatedAt: "2026-07-22T10:00:00.000Z" }),
      ]),
    ).toBeNull();
  });

  it("countByStatus tallies the four statuses", () => {
    expect(
      countByStatus([
        runnerRow({ id: "1", status: "queued", updatedAt: "2026-07-22T10:00:00.000Z" }),
        runnerRow({ id: "2", status: "in_progress", updatedAt: "2026-07-22T10:00:00.000Z" }),
        runnerRow({ id: "3", status: "in_progress", updatedAt: "2026-07-22T10:00:00.000Z" }),
        runnerRow({ id: "4", status: "blocked", updatedAt: "2026-07-22T10:00:00.000Z" }),
      ]),
    ).toEqual({ queued: 1, in_progress: 2, done: 0, blocked: 1 });
  });

  it("assertRunnerMayMutate refuses queued rows", () => {
    expect(() =>
      assertRunnerMayMutate(
        runnerRow({ id: "q", status: "queued", updatedAt: "2026-07-22T10:00:00.000Z" }),
        "done",
      ),
    ).toThrow(/refuses to done queued/);
  });

  it("assertRunnerMayMutate allows in_progress", () => {
    expect(() =>
      assertRunnerMayMutate(
        runnerRow({ id: "p", status: "in_progress", updatedAt: "2026-07-22T10:00:00.000Z" }),
        "done",
      ),
    ).not.toThrow();
  });
});

describe("research request resolve order (approve path)", () => {
  it("prefers override → server → session → adapter", () => {
    const override = clientRow({ id: "req-1", status: "in_progress", topic: "override" });
    const server = clientRow({ id: "req-1", status: "queued", topic: "server" });
    const session = clientRow({ id: "req-1", status: "queued", topic: "session", source: "session" });
    const adapter = clientRow({ id: "req-1", status: "queued", topic: "adapter" });

    expect(
      resolveResearchRequestForUpdate({ override, server, session, adapter })?.topic,
    ).toBe("override");
    expect(resolveResearchRequestForUpdate({ server, session, adapter })?.topic).toBe("server");
    expect(resolveResearchRequestForUpdate({ session, adapter })?.topic).toBe("session");
    expect(resolveResearchRequestForUpdate({ adapter })?.topic).toBe("adapter");
    expect(resolveResearchRequestForUpdate({})).toBeNull();
  });

  it("approve during loading resolves adapter-only ids", () => {
    const adapter = clientRow({ id: "req-ms-painting-v2-market-scan", status: "queued" });
    const resolved = resolveResearchRequestForUpdate({ adapter });
    const release = simulateApproveRelease(resolved);
    expect(release).toEqual({ ok: true, nextStatus: "in_progress" });
  });

  it("deriveResearchStartApprovals only emits cards for queued rows", () => {
    const cards = deriveResearchStartApprovals([
      clientRow({ id: "q", status: "queued" }),
      clientRow({ id: "p", status: "in_progress" }),
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.researchRequestId).toBe("q");
  });

  it("rail mode: loading while live fetch pending; live once server rows exist", () => {
    expect(
      deriveResearchRailMode({ liveApiEnabled: true, liveLoading: true, hasServerRows: false }),
    ).toBe("loading");
    expect(
      deriveResearchRailMode({ liveApiEnabled: true, liveLoading: false, hasServerRows: true }),
    ).toBe("live");
    expect(shouldPatchWhileLoading(true)).toBe(true);
    expect(shouldPostCreateWhileLoading(true)).toBe(true);
  });

  it("pruneStatusOverridesMatchingServer clears only matching statuses", () => {
    const overrides = {
      a: clientRow({ id: "a", status: "in_progress" }),
      b: clientRow({ id: "b", status: "in_progress" }),
    };
    const pruned = pruneStatusOverridesMatchingServer(overrides, [
      clientRow({ id: "a", status: "in_progress" }),
      clientRow({ id: "b", status: "queued" }),
    ]);
    expect(pruned.a).toBeUndefined();
    expect(pruned.b?.status).toBe("in_progress");
  });

  it("applyStatusOverrides overlays optimistic status onto merged rows", () => {
    const merged = [clientRow({ id: "a", status: "queued" })];
    const withOverride = applyStatusOverrides(merged, {
      a: clientRow({ id: "a", status: "in_progress" }),
    });
    expect(withOverride[0]?.status).toBe("in_progress");
  });
});

describe("approve → pickup → done lifecycle (mocked network)", () => {
  it("simulates Chief approve then runner pickup/done without mutating other queued rows", async () => {
    const queuedA = runnerRow({
      id: "req-ms-painting-v2-market-scan",
      status: "queued",
      updatedAt: "2026-07-22T10:00:00.000Z",
    });
    const queuedB = runnerRow({
      id: "req-other",
      status: "queued",
      updatedAt: "2026-07-22T09:00:00.000Z",
    });

    // 1) Card derivation for queued ids
    const cards = deriveResearchStartApprovals([
      clientRow({ id: queuedA.id, status: "queued" }),
      clientRow({ id: queuedB.id, status: "queued" }),
    ]);
    expect(cards.map((c) => c.researchRequestId).sort()).toEqual([queuedA.id, queuedB.id].sort());

    // 2) Approve during loading: resolve adapter id → in_progress
    const resolved = resolveResearchRequestForUpdate({
      adapter: clientRow({ id: queuedA.id, status: "queued" }),
    });
    expect(simulateApproveRelease(resolved).ok).toBe(true);
    const released = applyResearchStatus(resolved!, "in_progress");
    expect(released.status).toBe("in_progress");

    // 3) Soft-poll merge: override shows in_progress until server catches up
    const withOverride = applyStatusOverrides(
      [clientRow({ id: queuedA.id, status: "queued" }), clientRow({ id: queuedB.id, status: "queued" })],
      { [queuedA.id]: clientRow({ id: queuedA.id, status: "in_progress" }) },
    );
    expect(withOverride.find((r) => r.id === queuedA.id)?.status).toBe("in_progress");
    expect(withOverride.find((r) => r.id === queuedB.id)?.status).toBe("queued");

    // 4) Runner list + pickup (mocked GET)
    const afterApprove: RunnerResearchRequest[] = [
      { ...queuedA, status: "in_progress", updatedAt: "2026-07-22T11:00:00.000Z" },
      queuedB,
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/research") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ requests: afterApprove }), { status: 200 });
      }
      if (url.includes(`/api/research/${queuedA.id}`) && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as { status: string; filedPath?: string };
        expect(body.status).toBe("done");
        return new Response(
          JSON.stringify({
            request: {
              ...afterApprove[0],
              status: "done",
              filedPath: body.filedPath,
              updatedAt: "2026-07-22T12:00:00.000Z",
            },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: `unexpected ${url}` }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const env = { apiUrl: "https://app.example", internalKey: "secret" };
    const listed = await listResearchRequestsViaApi(env);
    expect(pickOldestInProgress(listed)?.id).toBe(queuedA.id);
    expect(findRequestById(listed, queuedB.id)?.status).toBe("queued");

    // 5) done refuses if still queued; succeeds for released row
    await expect(
      mutateReleasedRequestViaApi(env, queuedB.id, "done", {
        filedPath: "knowledge/findings/m-and-s/x.md",
      }),
    ).rejects.toThrow(/refuses to done queued/);

    const done = await mutateReleasedRequestViaApi(env, queuedA.id, "done", {
      filedPath: "knowledge/findings/m-and-s/painter-saas-market-scan.md",
    });
    expect(done.status).toBe("done");
    expect(done.filedPath).toMatch(/painter-saas-market-scan/);

    // queued B never patched
    const patchCalls = fetchMock.mock.calls.filter(
      (call) => String(call[1]?.method) === "PATCH",
    );
    expect(patchCalls).toHaveLength(1);
    expect(String(patchCalls[0]?.[0])).toContain(queuedA.id);
  });
});
