import { describe, expect, it } from "vitest";
import { subscribeToChiefGovernanceEvents } from "@/components/chief/chiefGovernanceEvents";
import { searchLog } from "@/lib/search/searchLog";

describe("searchLog", () => {
  it("emits a search_query governance event with per-group result counts", () => {
    const seen: unknown[] = [];
    const unsubscribe = subscribeToChiefGovernanceEvents((event) => seen.push(event));

    searchLog.queryRun("billing", { agents: 2, tasks: 1 });
    unsubscribe();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      type: "search_query",
      summary: 'Search "billing" — 3 results',
      detail: { query: "billing", resultCounts: { agents: 2, tasks: 1 } },
    });
  });

  it("emits a search_action_routed governance event", () => {
    const seen: unknown[] = [];
    const unsubscribe = subscribeToChiefGovernanceEvents((event) => seen.push(event));

    searchLog.actionRouted({ type: "navigate", path: "/monitor" }, "Opened /monitor");
    unsubscribe();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      type: "search_action_routed",
      summary: "Opened /monitor",
      detail: { action: { type: "navigate", path: "/monitor" } },
    });
  });

  it("emits a search_error governance event and never throws", () => {
    const seen: unknown[] = [];
    const unsubscribe = subscribeToChiefGovernanceEvents((event) => seen.push(event));

    expect(() => searchLog.error("zzz", new Error("boom"))).not.toThrow();
    unsubscribe();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      type: "search_error",
      summary: 'Search failed for "zzz"',
      detail: { query: "zzz", message: "boom" },
    });
  });
});
