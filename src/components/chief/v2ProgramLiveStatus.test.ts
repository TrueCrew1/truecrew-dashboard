import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveV2CardStatus } from "./v2ProgramLiveStatus.ts";
import { V2_PROGRAM_CARDS, type V2ProgramCard } from "../../data/v2Program.ts";
import { ADAPTER_RESEARCH_REQUESTS } from "../../lib/research/adapterRequests.ts";
import type { ResearchRequest } from "../../lib/research/types.ts";

const linkedCard = V2_PROGRAM_CARDS.find((card) => card.id === "v2-market-scan");
const staticCard = V2_PROGRAM_CARDS.find((card) => card.id === "v2-debranding-audit");

function requestFixture(overrides: Partial<ResearchRequest> = {}): ResearchRequest {
  return {
    id: "req-ms-painting-v2-market-scan",
    topic: "Painter SaaS market scan",
    whyItMatters: "test",
    suggestedOutcome: "test",
    createdAt: "2026-07-22T13:00:00.000Z",
    updatedAt: "2026-07-22T13:00:00.000Z",
    source: "adapter",
    status: "queued",
    ...overrides,
  };
}

test("card without researchRequestId keeps its static status", () => {
  assert.ok(staticCard);
  const derived = deriveV2CardStatus(staticCard, [requestFixture()]);
  assert.equal(derived.status, staticCard.status);
  assert.equal(derived.statusTone, staticCard.statusTone);
});

test("linked card with no matching row falls back to static status", () => {
  assert.ok(linkedCard);
  const derived = deriveV2CardStatus(linkedCard, []);
  assert.equal(derived.status, linkedCard.status);
  assert.equal(derived.statusTone, linkedCard.statusTone);
});

test("linked card derives queued status from the queue row", () => {
  assert.ok(linkedCard);
  const derived = deriveV2CardStatus(linkedCard, [requestFixture({ status: "queued" })]);
  assert.equal(derived.status, "Research queued");
  assert.equal(derived.statusTone, "steel");
});

test("in-progress row turns the badge yellow", () => {
  assert.ok(linkedCard);
  const derived = deriveV2CardStatus(linkedCard, [requestFixture({ status: "in_progress" })]);
  assert.equal(derived.status, "Research in progress");
  assert.equal(derived.statusTone, "yellow");
});

test("done row shows the filed path and goes green", () => {
  assert.ok(linkedCard);
  const derived = deriveV2CardStatus(linkedCard, [
    requestFixture({
      status: "done",
      filedPath: "knowledge/findings/m-and-s/painter-saas-market-scan.md",
    }),
  ]);
  assert.match(derived.status, /^Research done — filed knowledge\/findings/);
  assert.equal(derived.statusTone, "green");
});

test("blocked row surfaces the blocker note", () => {
  assert.ok(linkedCard);
  const derived = deriveV2CardStatus(linkedCard, [
    requestFixture({ status: "blocked", blockerNote: "waiting on operator" }),
  ]);
  assert.equal(derived.status, "Research blocked — waiting on operator");
  assert.equal(derived.statusTone, "yellow");
});

test("every card researchRequestId resolves to a real adapter request", () => {
  const realIds = new Set(ADAPTER_RESEARCH_REQUESTS.map((request) => request.id));
  const linked = V2_PROGRAM_CARDS.filter(
    (card): card is V2ProgramCard & { researchRequestId: string } =>
      card.researchRequestId !== undefined,
  );
  assert.ok(linked.length >= 2);
  for (const card of linked) {
    assert.ok(
      realIds.has(card.researchRequestId),
      `Card "${card.id}" references unknown research request "${card.researchRequestId}"`,
    );
  }
});
