import { describe, expect, it, vi } from "vitest";
import { buildChiefLiveContext } from "@/components/chief/chiefLiveContext";
import { runSearchAction, type ActionRouterDeps } from "@/lib/search/actionRouter";
import type { MockData } from "@/data/mockData";

const EMPTY_DATA: MockData = {
  tasks: [],
  workflows: [],
  incidents: [],
  tools: [],
  deploys: [],
  customers: [],
  runbooks: [],
  prompts: [],
  notes: [],
  alerts: [],
  focusItems: [],
};

function buildDeps(): ActionRouterDeps & {
  navigate: ReturnType<typeof vi.fn>;
  requestChiefTab: ReturnType<typeof vi.fn>;
  addHistoryEntry: ReturnType<typeof vi.fn>;
  addCommandApproval: ReturnType<typeof vi.fn>;
} {
  const navigate = vi.fn();
  const requestChiefTab = vi.fn();
  const addHistoryEntry = vi.fn();
  const addCommandApproval = vi.fn();

  return {
    navigate,
    requestChiefTab,
    chief: {
      data: EMPTY_DATA,
      liveContext: buildChiefLiveContext(EMPTY_DATA),
      approvals: [],
      addHistoryEntry,
      addCommandApproval,
    },
    addHistoryEntry,
    addCommandApproval,
  };
}

describe("runSearchAction", () => {
  it("navigates for a navigate action", () => {
    const deps = buildDeps();
    const outcome = runSearchAction({ type: "navigate", path: "/monitor" }, deps);
    expect(deps.navigate).toHaveBeenCalledWith("/monitor");
    expect(outcome.tone).toBe("info");
  });

  it("requests the Chief tab (with filter) for an open_chief_tab action", () => {
    const deps = buildDeps();
    runSearchAction({ type: "open_chief_tab", tab: "agents", filter: "ms-painting" }, deps);
    expect(deps.requestChiefTab).toHaveBeenCalledWith("agents", "ms-painting");
  });

  it("runs the command through Chief and reveals the Command tab when targeting chief", () => {
    const deps = buildDeps();
    const outcome = runSearchAction(
      { type: "run_chief_command", command: "what is at risk today?", target: "chief" },
      deps,
    );
    expect(deps.addHistoryEntry).toHaveBeenCalledTimes(1);
    expect(deps.requestChiefTab).toHaveBeenCalledWith("command");
    expect(outcome.message).toContain("Routed to Chief");
  });

  it("runs the command through Chief and reveals the Agents tab when targeting the ecosystem", () => {
    const deps = buildDeps();
    const outcome = runSearchAction(
      { type: "run_chief_command", command: "security review", target: "ecosystem" },
      deps,
    );
    expect(deps.addHistoryEntry).toHaveBeenCalledTimes(1);
    expect(deps.requestChiefTab).toHaveBeenCalledWith("agents");
    expect(outcome.message).toContain("Routed to the ecosystem");
  });
});
