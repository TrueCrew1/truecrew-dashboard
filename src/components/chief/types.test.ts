import { test } from "node:test";
import assert from "node:assert/strict";
import { createSuggestedWorkflow, type SuggestedWorkflow } from "./types";

test("createSuggestedWorkflow returns an object with the expected public fields", () => {
  const workflow = createSuggestedWorkflow({
    id: "wf-doc-drift",
    title: "Doc drift — reconcile a doc against real repo state",
    steps: ["librarian: verify every path the doc names"],
  });

  assert.equal(workflow.id, "wf-doc-drift");
  assert.equal(workflow.title, "Doc drift — reconcile a doc against real repo state");
  assert.deepEqual(workflow.steps, ["librarian: verify every path the doc names"]);
});

test("the brand is invisible to normal use — Object.keys and JSON.stringify see only id/title/steps", () => {
  const workflow = createSuggestedWorkflow({
    id: "wf-doc-drift",
    title: "Doc drift",
    steps: ["a"],
  });

  assert.deepEqual(Object.keys(workflow).sort(), ["id", "steps", "title"]);
  assert.deepEqual(JSON.parse(JSON.stringify(workflow)), {
    id: "wf-doc-drift",
    title: "Doc drift",
    steps: ["a"],
  });
});

test("a hand-written object literal cannot satisfy SuggestedWorkflow — only createSuggestedWorkflow can produce one", () => {
  // Compile-time proof, not a runtime one: this object has the right public
  // shape (id/title/steps) but no way to supply the private brand symbol
  // declared in types.ts, so `tsc` rejects the assignment below. If branding
  // is ever accidentally loosened — the brand field made optional, or the
  // symbol exported — this directive goes unused and `tsc -b` fails the
  // build, catching the regression before it ships.
  // @ts-expect-error — SuggestedWorkflow requires the private brand from createSuggestedWorkflow(); a plain literal can't provide it.
  const handWritten: SuggestedWorkflow = { id: "wf-doc-drift", title: "invented", steps: [] };
  assert.equal(typeof handWritten, "object");
});
