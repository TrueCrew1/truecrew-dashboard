/**
 * Research gateway — the single read path into the Research Workflow Library
 * (src/data/researchWorkflows.ts).
 *
 * Read-only and advisory by construction. Every function here returns frozen
 * copies of static data; nothing mutates the store, executes a workflow step,
 * or calls out to a model or network. An agent uses this to *quote* a playbook
 * onto a task — the operator still decides whether to follow it.
 *
 * Safe to import from both UI code and agent/script code: no React, no DOM, no
 * Node built-ins, no side effects at module load beyond building the id index.
 */
import {
  RESEARCH_WORKFLOWS,
  type ResearchWorkflow,
  type WorkflowId,
  type WorkflowLane,
  type WorkflowRiskLevel,
  type WorkflowScenario,
} from "@/data/researchWorkflows";

export type {
  ResearchWorkflow,
  WorkflowId,
  WorkflowLane,
  WorkflowLink,
  WorkflowRiskLevel,
  WorkflowScenario,
  WorkflowStep,
} from "@/data/researchWorkflows";
export { WORKFLOW_IDS } from "@/data/researchWorkflows";

export interface WorkflowFilter {
  lane?: WorkflowLane;
  scenario?: WorkflowScenario;
  riskLevel?: WorkflowRiskLevel;
}

const BY_ID: ReadonlyMap<string, ResearchWorkflow> = new Map(
  RESEARCH_WORKFLOWS.map((workflow) => [workflow.id, workflow]),
);

const KNOWN_WORKFLOW_IDS: ReadonlySet<string> = new Set(BY_ID.keys());

/**
 * All workflows matching `filter`, in store order. An omitted field is not a
 * constraint; an empty/omitted filter returns everything. Unknown lane or
 * scenario values can't be passed — the unions are closed — so a caller that
 * type-checks can only ever get an empty result from a real absence.
 */
export function listWorkflows(filter: WorkflowFilter = {}): ResearchWorkflow[] {
  return RESEARCH_WORKFLOWS.filter((workflow) => {
    if (filter.lane !== undefined && workflow.lane !== filter.lane) return false;
    if (filter.scenario !== undefined && workflow.scenario !== filter.scenario) return false;
    if (filter.riskLevel !== undefined && workflow.riskLevel !== filter.riskLevel) return false;
    return true;
  });
}

/**
 * One workflow by id, or `null` when no playbook has that id. Returns `null`
 * rather than throwing so a call site can degrade to "no workflow attached"
 * instead of failing a task that is otherwise fine.
 *
 * Deliberately takes a plain `string`, not `WorkflowId` — this is the runtime
 * boundary for ids that haven't gone through compile-time checking (e.g. a
 * future non-TS integration, or a stale value from a caller that predates a
 * removed playbook). Well-typed call sites should prefer a value already
 * narrowed to `WorkflowId`; use `isKnownWorkflowId` to narrow an arbitrary
 * string before trusting it further.
 */
export function getWorkflowById(id: string): ResearchWorkflow | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Type guard: is `id` one of the ids `RESEARCH_WORKFLOWS` actually has an
 * entry for? Narrows a plain string to `WorkflowId`. This is the runtime
 * counterpart to the `WorkflowId` union — useful at any boundary where a
 * workflow id arrives without static typing (e.g. deserialized data) and
 * needs validating before it's trusted as real.
 */
export function isKnownWorkflowId(id: string): id is WorkflowId {
  return KNOWN_WORKFLOW_IDS.has(id);
}

/**
 * The workflow that covers `scenario`, or `null` if none does. Convenience for
 * the common case — an agent knows the situation it is in, not a workflow id.
 * If more than one workflow ever shares a scenario this returns the first;
 * use `listWorkflows({ scenario })` when you need all of them.
 */
export function getWorkflowForScenario(scenario: WorkflowScenario): ResearchWorkflow | null {
  return RESEARCH_WORKFLOWS.find((workflow) => workflow.scenario === scenario) ?? null;
}

/**
 * The first `limit` steps of a workflow, rendered as "who: what" lines for
 * attaching to a task or card. Returns a frozen `[]` for an unknown id.
 *
 * The returned array is frozen — a `SuggestedWorkflow` built from it can't be
 * mutated after the fact by a downstream consumer, so a card's advisory
 * guidance stays exactly what the library actually says.
 */
export function summarizeWorkflowSteps(id: string, limit = 3): readonly string[] {
  const workflow = getWorkflowById(id);
  if (workflow === null) return [];
  return Object.freeze(workflow.steps.slice(0, limit).map((step) => `${step.who}: ${step.what}`));
}
