import { test } from "node:test";
import assert from "node:assert/strict";
import { draftBuildApprovalRequest } from "./buildPlanHelper";

test("draftBuildApprovalRequest: no advisory -> summary says none was available, riskLevel is medium", () => {
  const draft = draftBuildApprovalRequest("Add a missing test for stableChiefId", null);
  assert.equal(draft.riskLevel, "medium");
  assert.equal(draft.gate, "Code change merging to main");
  assert.match(draft.summary, /Add a missing test for stableChiefId/);
  assert.match(draft.summary, /No AI fallback was available/);
  assert.deepEqual(draft.filesOrAreas, []);
});

test("draftBuildApprovalRequest: with an advisory result -> summary includes source/model/suggestion", () => {
  const draft = draftBuildApprovalRequest("Tighten the ChiefHomePanel empty-state copy", {
    summary: "Shorten the empty-state line to one sentence.",
    source: "ollama",
    model: "llama3",
    category: "code",
    lane: "builder",
  });
  assert.match(draft.summary, /Tighten the ChiefHomePanel empty-state copy/);
  assert.match(draft.summary, /ollama\/llama3/);
  assert.match(draft.summary, /Shorten the empty-state line to one sentence\./);
  assert.match(draft.summary, /advisory only, unreviewed/);
});

test("draftBuildApprovalRequest: always leaves an unreviewed-AI checklist item and a not-submitted requestedAction", () => {
  const draft = draftBuildApprovalRequest("Improve a log message", null);
  assert.ok(
    draft.testsOrChecksDone.some(
      (item) => item.status === "pending" && /unreviewed/i.test(item.label),
    ),
  );
  assert.match(draft.requestedAction, /DRAFT only/);
  assert.match(draft.requestedAction, /nothing here has been submitted or approved/);
});
