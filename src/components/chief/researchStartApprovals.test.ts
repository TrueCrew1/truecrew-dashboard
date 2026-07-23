import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveResearchStartApprovals,
  researchStartApprovalId,
} from "./researchStartApprovals.ts";
import type { ResearchRequest } from "../../lib/research/types.ts";

function requestFixture(overrides: Partial<ResearchRequest> = {}): ResearchRequest {
  return {
    id: "req-ms-painting-v2-market-scan",
    topic: "Painter SaaS market scan",
    whyItMatters: "Ground V2 scope in market reality.",
    suggestedOutcome: "Findings note under knowledge/findings/m-and-s/.",
    createdAt: "2026-07-22T13:00:00.000Z",
    updatedAt: "2026-07-22T13:00:00.000Z",
    source: "adapter",
    status: "queued",
    ...overrides,
  };
}

test("queued requests each derive one pending research-start card", () => {
  const cards = deriveResearchStartApprovals([
    requestFixture(),
    requestFixture({ id: "req-two", topic: "Second topic" }),
  ]);

  assert.equal(cards.length, 2);
  const [first] = cards;
  assert.equal(first.id, researchStartApprovalId("req-ms-painting-v2-market-scan"));
  assert.equal(first.status, "pending");
  assert.equal(first.researchRequestId, "req-ms-painting-v2-market-scan");
  assert.equal(first.category, "research_start");
  assert.equal(first.specialist, "Research Agent");
  assert.match(first.title, /Start research: Painter SaaS market scan/);
});

test("non-queued requests derive no cards — they were already released or finished", () => {
  const cards = deriveResearchStartApprovals([
    requestFixture({ status: "in_progress" }),
    requestFixture({ id: "req-done", status: "done", filedPath: "knowledge/findings/x.md" }),
    requestFixture({ id: "req-blocked", status: "blocked", blockerNote: "waiting" }),
  ]);
  assert.equal(cards.length, 0);
});

test("derivation is deterministic — same ids and timestamps on every pass", () => {
  const requests = [requestFixture()];
  const first = deriveResearchStartApprovals(requests);
  const second = deriveResearchStartApprovals(requests);
  assert.deepEqual(first, second);
});

test("card copy never claims execution — approval only releases the row", () => {
  const [card] = deriveResearchStartApprovals([requestFixture()]);
  assert.match(card.riskNote, /nothing executes on approval/i);
  assert.match(card.recommendedAction, /move this request to in progress/i);
});

test("include predicate filters which queued requests get a card", () => {
  const requests = [
    requestFixture({ id: "req-a", topic: "M&S Painting estimating roadmap" }),
    requestFixture({ id: "req-b", topic: "Generic tooling research" }),
  ];
  const onlyA = deriveResearchStartApprovals(requests, (r) => r.id === "req-a");
  assert.equal(onlyA.length, 1);
  assert.equal(onlyA[0].researchRequestId, "req-a");
});
