import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildResearchRequestCreatedResponse,
  buildResearchRequestFailedResponse,
  extractResearchTopic,
} from "./chiefResearchCommand.ts";
import { buildSessionResearchRequest } from "../../lib/research/sessionStore.ts";

test("extractResearchTopic: start research on <topic>", () => {
  assert.equal(
    extractResearchTopic("start research on M&S estimating roadmap"),
    "M&S estimating roadmap",
  );
});

test("extractResearchTopic: short-form research <topic>", () => {
  assert.equal(extractResearchTopic("research M&S estimating roadmap"), "M&S estimating roadmap");
});

test("extractResearchTopic: research on <topic>", () => {
  assert.equal(extractResearchTopic("research on tenant branding"), "tenant branding");
});

test("extractResearchTopic: case-insensitive with extra whitespace", () => {
  assert.equal(extractResearchTopic("  Start   Research   rollout gates  "), "rollout gates");
});

test("extractResearchTopic: bare research / start research yields null", () => {
  assert.equal(extractResearchTopic("research"), null);
  assert.equal(extractResearchTopic("start research"), null);
});

test("extractResearchTopic: non-research commands yield null", () => {
  assert.equal(extractResearchTopic("what's blocked?"), null);
  assert.equal(extractResearchTopic("researching options"), null);
  assert.equal(extractResearchTopic("show approvals I need to review"), null);
});

test("created response is truthful about session-only, operator-driven state", () => {
  const request = buildSessionResearchRequest("M&S estimating roadmap");
  const response = buildResearchRequestCreatedResponse(request);

  assert.equal(response.routedTo, "Research Agent");
  assert.match(response.summary, /M&S estimating roadmap/);
  assert.match(response.summary, /this browser only/i);
  assert.match(response.summary, /[Nn]othing auto-investigates/);
  assert.match(response.recommendedAction, /Research queue/);
  // No approval gate and no fake dispatch — the response must not claim one.
  assert.equal(response.approvalNeeded, undefined);
});

test("created response on the live rail says live queue, not browser-only", () => {
  const request = buildSessionResearchRequest("M&S estimating roadmap");
  const response = buildResearchRequestCreatedResponse(request, "live");

  assert.match(response.summary, /live queue/i);
  assert.doesNotMatch(response.summary, /this browser only/i);
  assert.equal(response.routedTo, "Research Agent");
});

test("failed response names the topic and routes back to Chief", () => {
  const response = buildResearchRequestFailedResponse("estimating roadmap");
  assert.equal(response.routedTo, "Chief");
  assert.match(response.summary, /estimating roadmap/);
  assert.match(response.summary, /Could not create/i);
});
