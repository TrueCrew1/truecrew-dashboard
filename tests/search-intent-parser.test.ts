import { describe, expect, it } from "vitest";
import { buildSuggestedActions } from "@/lib/search/intentParser";

describe("buildSuggestedActions", () => {
  it("returns nothing for a blank query", () => {
    expect(buildSuggestedActions("   ")).toEqual([]);
  });

  it("parses 'start research on X' into a run_chief_command action targeting chief", () => {
    const actions = buildSuggestedActions("Start research on MS Painting improvement plan");
    const research = actions.find((a) => a.id === "action-start-research");
    expect(research).toBeDefined();
    expect(research!.action).toEqual({
      type: "run_chief_command",
      command: "research MS Painting improvement plan",
      target: "chief",
    });
  });

  it("parses 'open <route keyword>' into a navigate action", () => {
    const actions = buildSuggestedActions("Open Monitor");
    expect(actions[0].action).toEqual({ type: "navigate", path: "/monitor" });
  });

  it("routes 'open <roadmap-ish text>' to Knowledge since there's no dedicated roadmap page", () => {
    const actions = buildSuggestedActions("Open the M&S roadmap");
    const navigateAction = actions.find((a) => a.action.type === "navigate");
    expect(navigateAction?.action).toEqual({ type: "navigate", path: "/knowledge" });
  });

  it("parses 'show agents working on X' into an open_chief_tab action with a filter", () => {
    const actions = buildSuggestedActions("Show agents working on ms-painting");
    const showAgents = actions.find((a) => a.id === "action-show-agents");
    expect(showAgents).toBeDefined();
    expect(showAgents!.action).toEqual({
      type: "open_chief_tab",
      tab: "agents",
      filter: "ms-painting",
    });
  });

  it("parses 'assign X to ecosystem' into a run_chief_command action targeting the ecosystem", () => {
    const actions = buildSuggestedActions("Assign security review to ecosystem");
    const assign = actions.find((a) => a.id === "action-assign-ecosystem");
    expect(assign).toBeDefined();
    expect(assign!.action).toEqual({
      type: "run_chief_command",
      command: "security review",
      target: "ecosystem",
    });
  });

  it("parses 'assign X to chief' into a run_chief_command action targeting chief", () => {
    const actions = buildSuggestedActions("Assign the deploy gate override to chief");
    const assign = actions.find((a) => a.id === "action-assign-chief");
    expect(assign).toBeDefined();
    expect(assign!.action).toMatchObject({ type: "run_chief_command", target: "chief" });
  });

  it("falls back to an 'ask Chief' action for a longer query with no other match", () => {
    const actions = buildSuggestedActions("Find QuickBooks integration tasks");
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe("action-ask-chief");
    expect(actions[0].action).toEqual({
      type: "run_chief_command",
      command: "Find QuickBooks integration tasks",
      target: "chief",
    });
  });

  it("parses 'create task X' into a run_chief_command action — there's no real write path yet", () => {
    const actions = buildSuggestedActions("Create task for replacing the compressor filter");
    const createTask = actions.find((a) => a.id === "action-create-task");
    expect(createTask).toBeDefined();
    expect(createTask!.action).toEqual({
      type: "run_chief_command",
      command: "new task: replacing the compressor filter",
      target: "chief",
    });
    expect(createTask!.subtitle).toMatch(/no task-creation write path/i);
  });

  it("parses 'new task: X' the same way", () => {
    const actions = buildSuggestedActions("New task: order replacement parts");
    const createTask = actions.find((a) => a.id === "action-create-task");
    expect(createTask?.action).toEqual({
      type: "run_chief_command",
      command: "new task: order replacement parts",
      target: "chief",
    });
  });

  it("does not force a fallback action for a short, unrecognized query", () => {
    // Two words or fewer with nothing recognized: leave this to entity
    // search results (or a genuine no-results state) instead of a low-value
    // "Ask Chief" suggestion for every stray keystroke.
    expect(buildSuggestedActions("zzz")).toEqual([]);
  });

  it("caps suggested actions at four", () => {
    const actions = buildSuggestedActions(
      "Start research on open monitor show agents working on assign x to chief and also more words",
    );
    expect(actions.length).toBeLessThanOrEqual(4);
  });
});
