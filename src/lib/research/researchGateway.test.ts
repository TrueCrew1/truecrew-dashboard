import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WORKFLOW_IDS,
  getWorkflowById,
  getWorkflowForScenario,
  isKnownWorkflowId,
  listWorkflows,
  summarizeWorkflowSteps,
} from "./researchGateway";

test("listWorkflows with no filter returns every workflow", () => {
  const all = listWorkflows();
  assert.ok(all.length >= 3);
  assert.ok(all.every((workflow) => typeof workflow.id === "string" && workflow.id.length > 0));
});

test("listWorkflows filters by lane, scenario, and risk level", () => {
  assert.deepEqual(
    listWorkflows({ scenario: "doc-drift" }).map((w) => w.id),
    ["wf-doc-drift"],
  );
  assert.deepEqual(
    listWorkflows({ lane: "reliability" }).map((w) => w.id),
    ["wf-prod-incident-triage"],
  );
  assert.deepEqual(
    listWorkflows({ riskLevel: "high" }).map((w) => w.id),
    ["wf-prod-incident-triage"],
  );
});

test("listWorkflows treats multiple filter fields as AND, not OR", () => {
  assert.equal(listWorkflows({ lane: "build", scenario: "doc-drift" }).length, 0);
  assert.equal(listWorkflows({ lane: "build", scenario: "gated-build-failure" }).length, 1);
});

test("getWorkflowById returns the workflow, or null for an unknown id", () => {
  assert.equal(getWorkflowById("wf-doc-drift")?.title, "Doc drift — reconcile a doc against real repo state");
  assert.equal(getWorkflowById("wf-does-not-exist"), null);
});

test("getWorkflowForScenario resolves a scenario to its playbook", () => {
  assert.equal(getWorkflowForScenario("prod-incident")?.id, "wf-prod-incident-triage");
});

test("every workflow has ordered, non-empty steps", () => {
  for (const workflow of listWorkflows()) {
    assert.ok(workflow.steps.length > 0, `${workflow.id} has no steps`);
    workflow.steps.forEach((step, index) => {
      assert.equal(step.order, index + 1, `${workflow.id} step ${index} is out of order`);
      assert.ok(step.what.length > 0, `${workflow.id} step ${step.order} has no action`);
    });
  }
});

test("workflow ids are unique", () => {
  const ids = listWorkflows().map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("summarizeWorkflowSteps renders 'who: what' lines and respects the limit", () => {
  const steps = summarizeWorkflowSteps("wf-doc-drift", 2);
  assert.equal(steps.length, 2);
  assert.ok(steps[0].startsWith("librarian: "));
});

test("summarizeWorkflowSteps returns an empty list for an unknown id", () => {
  assert.deepEqual(summarizeWorkflowSteps("wf-does-not-exist"), []);
});

test("summarizeWorkflowSteps returns a frozen array — callers can't mutate the library's guidance", () => {
  const steps = summarizeWorkflowSteps("wf-doc-drift");
  assert.ok(Object.isFrozen(steps));
  assert.throws(() => {
    // @ts-expect-error — steps is readonly string[]; this line exists to prove the runtime freeze.
    steps.push("tampered step");
  }, TypeError);
});

test("isKnownWorkflowId is the runtime counterpart to the WorkflowId union", () => {
  assert.equal(isKnownWorkflowId("wf-doc-drift"), true);
  assert.equal(isKnownWorkflowId("wf-does-not-exist"), false);
  assert.equal(isKnownWorkflowId(""), false);
});

test("WORKFLOW_IDS (the type-level source) and RESEARCH_WORKFLOWS (the data) never drift apart", () => {
  const dataIds = listWorkflows()
    .map((w) => w.id)
    .sort();
  const typeIds = [...WORKFLOW_IDS].sort();
  assert.deepEqual(
    dataIds,
    typeIds,
    "every id in WORKFLOW_IDS must have a RESEARCH_WORKFLOWS entry, and vice versa",
  );
});
