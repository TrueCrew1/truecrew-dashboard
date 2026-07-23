import test from "node:test";
import assert from "node:assert/strict";
import { parseCommand } from "./commandParser.ts";
import { executeUnifiedSearch } from "./unifiedSearch.ts";
import { buildSearchDataContext } from "./context.ts";
import { mockData } from "../../data/mockData.ts";
import { dispatchAction } from "./actionRouter.ts";
import { searchProjects } from "./providers/index.ts";
import { CHIEF_ROUTES } from "../../components/chief/chiefRoutes.ts";

test("parseCommand: start research", () => {
  const intent = parseCommand("start research on MS Painting improvement plan");
  assert.equal(intent.mode, "action");
  assert.equal(intent.action, "start_research");
  assert.equal(intent.topic, "MS Painting improvement plan");
  assert.equal(intent.assignmentTarget, "ecosystem");
});

test("parseCommand: assign to ecosystem", () => {
  const intent = parseCommand("assign security review to ecosystem");
  assert.equal(intent.action, "assign_agent");
  assert.equal(intent.assignmentTarget, "ecosystem");
});

test("parseCommand: open roadmap", () => {
  const intent = parseCommand("open M&S roadmap");
  assert.equal(intent.action, "open_entity");
  assert.match(intent.searchQuery, /M&S roadmap/i);
});

test("parseCommand: show agents on project", () => {
  const intent = parseCommand("show agents working on ms-painting");
  assert.equal(intent.mode, "search");
  assert.deepEqual(intent.filters?.types, ["agent", "task", "project"]);
});

test("parseCommand: continue work", () => {
  const intent = parseCommand("continue previous work on QuickBooks");
  assert.equal(intent.action, "continue_work");
  assert.match(intent.searchQuery, /QuickBooks/i);
});

test("executeUnifiedSearch returns grouped results", () => {
  const ctx = buildSearchDataContext(mockData);
  const response = executeUnifiedSearch("billing", ctx);
  assert.ok(response.totalResults > 0);
  assert.ok(response.groups.some((group) => group.type === "task"));
});

test("dispatchAction routes chief queries", () => {
  const ctx = buildSearchDataContext(mockData, { dataRail: "mock" });
  const response = executeUnifiedSearch("what is blocked", ctx);
  let focused = "";
  const result = dispatchAction(response.intent, response, {
    focusChief: (query) => {
      focused = query;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.assignmentTarget, "chief");
  assert.equal(focused, "what is blocked");
});

test("dispatchAction routes research to ecosystem", () => {
  const intent = parseCommand("start research on notification vendor");
  const ctx = buildSearchDataContext(mockData, { dataRail: "mock" });
  const response = executeUnifiedSearch(intent.rawQuery, ctx);
  let route = "";
  const result = dispatchAction(intent, response, {
    navigate: (path) => {
      route = path;
    },
    createResearchRequest: (topic) => ({
      id: "req-session-test",
      topic,
    }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.action, "start_research");
  assert.equal(result.assignmentTarget, "Research Agent");
  assert.equal(route, `${CHIEF_ROUTES.knowledge}?highlight=req-session-test`);
  assert.match(result.message ?? "", /Session research request created/i);
  assert.equal(result.createdEntityId, "req-session-test");
});

test("parseCommand: start research on M&S Painting", () => {
  const intent = parseCommand("start research on M&S Painting V2 debranding");
  assert.equal(intent.action, "start_research");
  assert.equal(intent.topic, "M&S Painting V2 debranding");
});

test("parseCommand: start research on M&S Painting brand rollout", () => {
  const intent = parseCommand("start research on M&S Painting brand rollout");
  assert.equal(intent.action, "start_research");
  assert.equal(intent.topic, "M&S Painting brand rollout");
});

test("dispatchAction: M&S Painting research creates session request and opens Knowledge", () => {
  const intent = parseCommand("start research on M&S Painting");
  const ctx = buildSearchDataContext(mockData, { dataRail: "mock" });
  const response = executeUnifiedSearch(intent.rawQuery, ctx);
  let route = "";
  let createdTopic = "";
  const result = dispatchAction(intent, response, {
    navigate: (path) => {
      route = path;
    },
    createResearchRequest: (topic) => {
      createdTopic = topic;
      return { id: "req-session-ms-painting", topic };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(createdTopic, "M&S Painting");
  assert.match(route, /^\/knowledge\?highlight=/);
  assert.match(result.message ?? "", /saved in this browser/i);
  assert.equal(result.createdEntityId, "req-session-ms-painting");
});

test("parseCommand: start research on M&S estimating roadmap", () => {
  const intent = parseCommand("start research on M&S estimating roadmap");
  assert.equal(intent.action, "start_research");
  assert.equal(intent.topic, "M&S estimating roadmap");
});

test("dispatchAction: M&S estimating roadmap creates session request and opens Knowledge", () => {
  const intent = parseCommand("start research on M&S estimating roadmap");
  const ctx = buildSearchDataContext(mockData, { dataRail: "mock" });
  const response = executeUnifiedSearch(intent.rawQuery, ctx);
  let route = "";
  let createdTopic = "";
  const result = dispatchAction(intent, response, {
    navigate: (path) => {
      route = path;
    },
    createResearchRequest: (topic) => {
      createdTopic = topic;
      return { id: "req-session-ms-estimating-roadmap", topic };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(createdTopic, "M&S estimating roadmap");
  assert.match(route, /^\/knowledge\?highlight=/);
  assert.match(result.message ?? "", /saved in this browser/i);
  assert.equal(result.createdEntityId, "req-session-ms-estimating-roadmap");
});

test("parseCommand: short-form research command", () => {
  const intent = parseCommand("research M&S estimating roadmap");
  assert.equal(intent.mode, "action");
  assert.equal(intent.action, "start_research");
  assert.equal(intent.topic, "M&S estimating roadmap");
});

test("parseCommand: short-form research on <topic>", () => {
  const intent = parseCommand("research on tenant branding options");
  assert.equal(intent.action, "start_research");
  assert.equal(intent.topic, "tenant branding options");
});

test("parseCommand: bare research word is not an action", () => {
  const intent = parseCommand("research");
  assert.equal(intent.mode, "search");
  assert.equal(intent.action, undefined);
});

test("suggested Start research action round-trips through dispatch", () => {
  const ctx = buildSearchDataContext(mockData, { dataRail: "mock" });
  // Free-text query that merely mentions research — pressing Enter would just
  // search, but clicking the suggested action must still create a request.
  const first = executeUnifiedSearch("M&S estimating research notes", ctx);
  const action = first.suggestedActions.find((entry) => entry.action === "start_research");
  assert.ok(action, "expected a Start research suggested action");
  // CommandBar.onSelectAction re-dispatches payload.query, so it must be a
  // parseable research command.
  const replay = action.payload?.query ?? "";
  assert.match(replay, /^start research on /i);
  const second = executeUnifiedSearch(replay, ctx);
  let createdTopic = "";
  const result = dispatchAction(second.intent, second, {
    createResearchRequest: (topic) => {
      createdTopic = topic;
      return { id: "req-session-roundtrip", topic };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.action, "start_research");
  assert.equal(createdTopic, "M&S estimating research notes");
  assert.equal(result.createdEntityId, "req-session-roundtrip");
});

test("dispatchAction start_research message reflects the live rail", () => {
  const intent = parseCommand("start research on estimating engine");
  const ctx = buildSearchDataContext(mockData, { dataRail: "mock" });
  const response = executeUnifiedSearch(intent.rawQuery, ctx);
  const result = dispatchAction(intent, response, {
    createResearchRequest: (topic) => ({ id: "req-live-test", topic, rail: "live" }),
  });
  assert.equal(result.ok, true);
  assert.match(result.message ?? "", /saved to the live queue/i);
  assert.doesNotMatch(result.message ?? "", /saved in this browser/i);
});

test("searchProjects marks adapter source", () => {
  const ctx = buildSearchDataContext(mockData, { dataRail: "mock" });
  const results = searchProjects(ctx, "painting");
  assert.ok(results.length > 0);
  assert.equal(results.every((r) => r.source === "adapter"), true);
});

test("rail-backed tasks are mock on default dev rail", () => {
  const ctx = buildSearchDataContext(mockData, { dataRail: "mock" });
  const response = executeUnifiedSearch("billing", ctx);
  const tasks = response.groups.find((g) => g.type === "task")?.results ?? [];
  assert.ok(tasks.length > 0);
  assert.equal(tasks[0]?.source, "mock");
});
