import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_APPROVAL_CARDS,
  EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST,
  EXAMPLE_RESEARCH_REQUEST,
  createApprovalCardFromResearchRequest,
  type ResearchApprovalRequest,
} from "./agentApprovalGates";

test("a request with no workflowId produces a card with no suggestedWorkflow", () => {
  const card = createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_REQUEST);
  assert.equal(card.suggestedWorkflow, undefined);
});

test("riskNote carries only risk and alternatives — workflow text is not packed into it", () => {
  const card = createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST);
  assert.ok(card.riskNote.startsWith("Risk level: low."));
  assert.ok(card.riskNote.includes("Alternatives considered:"));
  assert.ok(!card.riskNote.includes("Suggested workflow"));
  assert.ok(!card.riskNote.includes("wf-doc-drift"));
});

test("riskNote never carries workflow text on any shipped agent card", () => {
  for (const card of AGENT_APPROVAL_CARDS) {
    assert.ok(!card.riskNote.includes("Suggested workflow"), `${card.id} leaked workflow text into riskNote`);
    assert.ok(!card.riskNote.includes("advisory only"), `${card.id} leaked workflow text into riskNote`);
  }
});

test("a request with a resolvable workflowId attaches structured guidance", () => {
  const card = createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST);
  const workflow = card.suggestedWorkflow;

  assert.ok(workflow !== undefined);
  assert.equal(workflow.id, "wf-doc-drift");
  assert.equal(workflow.title, "Doc drift — reconcile a doc against real repo state");
  assert.ok(workflow.steps.length > 0);
  assert.ok(workflow.steps.every((step) => typeof step === "string" && step.length > 0));
});

test("the branded suggestedWorkflow on a real card still reads and serializes like a plain id/title/steps object", () => {
  const card = createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST);
  const workflow = card.suggestedWorkflow;
  assert.ok(workflow !== undefined);

  // Branding is an internal integrity mechanism, not something ApprovalBoard.tsx
  // (or anything else reading this card) should ever have to know about.
  assert.deepEqual(Object.keys(workflow).sort(), ["id", "steps", "title"]);
  assert.deepEqual(JSON.parse(JSON.stringify(workflow)), {
    id: workflow.id,
    title: workflow.title,
    steps: [...workflow.steps],
  });
});

test("workflowId only accepts real workflow-library ids — free text can't reach it", () => {
  // Compile-time proof lives at the call site: `workflowId: "not-a-real-id"` on a
  // ResearchApprovalRequest literal fails `tsc` (verified while building this
  // test — the string had to be cast through `unknown` to even assign here).
  // This test covers the runtime backstop for the one case the type system
  // can't: a WorkflowId that typechecked when a request was authored but whose
  // playbook has since been removed from RESEARCH_WORKFLOWS, or a value that
  // arrives from outside compile-time-checked code (e.g. a future non-TS
  // integration). Either way it must degrade to "no workflow attached", never throw.
  const requestWithGoneId = {
    ...EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST,
    workflowId: "wf-does-not-exist",
  } as unknown as ResearchApprovalRequest;

  const card = createApprovalCardFromResearchRequest(requestWithGoneId);
  assert.equal(card.suggestedWorkflow, undefined);
});

test("attaching a workflow leaves every other card field untouched", () => {
  const withWorkflow = createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST);
  const withoutWorkflow = createApprovalCardFromResearchRequest({
    ...EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST,
    workflowId: undefined,
  });

  const { suggestedWorkflow, ...restWithWorkflow } = withWorkflow;
  assert.ok(suggestedWorkflow !== undefined);
  assert.deepEqual(restWithWorkflow, withoutWorkflow);
});

test("a workflow never alters gating: status and recommendedDecision track risk alone", () => {
  const withWorkflow = createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST);
  const withoutWorkflow = createApprovalCardFromResearchRequest({
    ...EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST,
    workflowId: undefined,
  });

  assert.equal(withWorkflow.status, "pending");
  assert.equal(withWorkflow.recommendedDecision, withoutWorkflow.recommendedDecision);
  assert.deepEqual(withWorkflow.checklist, withoutWorkflow.checklist);
});

test("a suggestedWorkflow is frozen — neither the block nor its steps can be mutated after attach", () => {
  const card = createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST);
  const workflow = card.suggestedWorkflow;
  assert.ok(workflow !== undefined);

  assert.throws(() => {
    // @ts-expect-error — title is readonly; this line exists to prove the runtime freeze, not to typecheck.
    workflow.title = "tampered";
  }, TypeError);
  assert.throws(() => {
    // @ts-expect-error — steps is a readonly array; this line exists to prove the runtime freeze.
    workflow.steps.push("tampered step");
  }, TypeError);
});

test("only the doc-drift example ships workflow guidance; other agent cards are unchanged", () => {
  const withGuidance = AGENT_APPROVAL_CARDS.filter((card) => card.suggestedWorkflow !== undefined);
  assert.deepEqual(
    withGuidance.map((card) => card.id),
    ["apr-research-example-doc-drift"],
  );
});

test("every rendered card still has the fields the panel reads unconditionally", () => {
  for (const card of AGENT_APPROVAL_CARDS) {
    assert.ok(card.riskNote.length > 0, `${card.id} has no riskNote`);
    assert.ok(card.summary.length > 0, `${card.id} has no summary`);
    assert.ok(card.recommendedAction.length > 0, `${card.id} has no recommendedAction`);
  }
});
