/**
 * Research Workflow Library — the Research lane's codified "how agents should
 * be working" store.
 *
 * Static, hand-authored, versioned-in-git data. No LLM call, no network, no DB:
 * a workflow here is a *playbook an agent reads*, never a script anything runs.
 * Nothing in this file executes a step, and the gateway that reads it
 * (src/lib/research/researchGateway.ts) is read-only by construction.
 *
 * These three playbooks encode workflows this repo already describes in prose
 * (docs/AGENT_RUNBOOK.md) — this file makes them queryable by agent code
 * instead of only readable by humans. Extension point: add a new entry to
 * RESEARCH_WORKFLOWS as the Research lane studies and codifies another
 * pattern — and add its id to WORKFLOW_IDS first, since `ResearchWorkflow.id`
 * is typed against it and a new entry won't compile until you do.
 */

/**
 * The lanes a step can be assigned to. Matches the agent sections in
 * docs/AGENT_RUNBOOK.md — Chief plus the six specialist lanes. This is
 * deliberately the runbook's vocabulary, not a parallel one, so a `who` on a
 * step names an agent that actually exists in this repo.
 *
 * Note this is broader than `AgentRole` in src/components/chief/agentApprovalGates.ts
 * ("planner" | "build" | "research" | "content"), which is narrower on purpose:
 * that union lists only the lanes that can raise an *approval request*, whereas
 * a workflow step can be owned by Chief, Librarian, or Reliability too.
 */
export type WorkflowLane =
  | "chief"
  | "planner"
  | "build"
  | "research"
  | "librarian"
  | "content"
  | "reliability";

/**
 * Mirrors `AgentApprovalRiskLevel` in src/components/chief/agentApprovalGates.ts
 * so a workflow's risk level drops straight into a `*ApprovalRequest.riskLevel`.
 * Declared here rather than imported to keep src/data/ free of imports from
 * src/components/ — the dependency runs components -> data, never the reverse.
 */
export type WorkflowRiskLevel = "low" | "medium" | "high";

/**
 * Situations a workflow answers. Kept as a closed union so a caller can't
 * silently attach a workflow for a scenario that has no playbook.
 */
export type WorkflowScenario = "prod-incident" | "gated-build-failure" | "doc-drift";

/** A pointer to supporting material. `href` is a repo-relative path or an Obsidian vault path. */
export interface WorkflowLink {
  label: string;
  href: string;
}

export interface WorkflowStep {
  /** 1-based position. Steps are stored in order; this makes the order explicit when rendered. */
  order: number;
  /** Which lane owns this step. */
  who: WorkflowLane;
  /** What that lane does. Imperative, one action. */
  what: string;
}

export const WORKFLOW_IDS = ["wf-prod-incident-triage", "wf-gated-build-failure", "wf-doc-drift"] as const;

/**
 * Closed union of every real workflow id, derived from `WORKFLOW_IDS` so the
 * type and the runtime list can never drift apart — there is exactly one
 * place to add an id when a new playbook is added.
 *
 * This is the type-level boundary the rest of the app attaches a workflow
 * through: `ResearchWorkflow.id` below, `ResearchApprovalRequest.workflowId`,
 * and `SuggestedWorkflow.id` (src/components/chief/types.ts) all use this
 * type instead of plain `string`. A typo'd or invented id fails `tsc` at the
 * call site instead of silently resolving to nothing at runtime — free text
 * cannot reach `workflowId` at all, only one of these three literals.
 */
export type WorkflowId = (typeof WORKFLOW_IDS)[number];

export interface ResearchWorkflow {
  id: WorkflowId;
  title: string;
  /** The lane that owns the workflow overall (individual steps may belong to other lanes). */
  lane: WorkflowLane;
  scenario: WorkflowScenario;
  steps: WorkflowStep[];
  riskLevel: WorkflowRiskLevel;
  links: WorkflowLink[];
}

export const RESEARCH_WORKFLOWS: readonly ResearchWorkflow[] = [
  {
    id: "wf-prod-incident-triage",
    title: "Production incident triage and hand-back",
    lane: "reliability",
    scenario: "prod-incident",
    riskLevel: "high",
    steps: [
      {
        order: 1,
        who: "reliability",
        what: "Stop the failing action. Do not retry silently and do not work around the blocker.",
      },
      {
        order: 2,
        who: "reliability",
        what: "Capture the blast radius before changing anything: what is broken, since when, and which surfaces are affected.",
      },
      {
        order: 3,
        who: "librarian",
        what: "Log the incident in the Obsidian Build Log with what happened, what is blocked, and why.",
      },
      {
        order: 4,
        who: "research",
        what: "Check knowledge/reference/tool-fallbacks.md before leaning on any external tool during triage; if a fallback was used because the primary was DEGRADED/BLOCKED, say so in the write-up.",
      },
      {
        order: 5,
        who: "chief",
        what: "If a decision is needed, take the matching *ApprovalRequest so it surfaces as a card in Chief -> Approvals. If it is purely informational, the Build Log entry alone is enough — do not force a card.",
      },
    ],
    links: [
      { label: "Incidents, Pauses, and Escalation", href: "docs/AGENT_RUNBOOK.md" },
      { label: "Obsidian logging path", href: "docs/OBSIDIAN_LOGGING.md" },
    ],
  },
  {
    id: "wf-gated-build-failure",
    title: "Gated build failure — diagnose before requesting an override",
    lane: "build",
    scenario: "gated-build-failure",
    riskLevel: "medium",
    steps: [
      {
        order: 1,
        who: "build",
        what: "Reproduce the failure locally with npm run qa (lint + build + test) before reading anything into CI output.",
      },
      {
        order: 2,
        who: "build",
        what: "Decide whether the cause is a trivial, obvious fix. If it is not, stop and escalate to Chief rather than iterating on the gate.",
      },
      {
        order: 3,
        who: "research",
        what: "If the failure turns on an external tool or vendor behaviour, compare at least two options and check claims against actual docs, not memory.",
      },
      {
        order: 4,
        who: "build",
        what: "Record what was actually checked in testsOrChecksDone, marking each item pass/fail/pending honestly — a pending check stays pending.",
      },
      {
        order: 5,
        who: "chief",
        what: "Route the BuildApprovalRequest through createApprovalCardFromBuildRequest(). Never ask the operator for the override directly.",
      },
    ],
    links: [
      { label: "Build Agent gates", href: "docs/AGENT_RUNBOOK.md" },
      { label: "Approval routing rule", href: "docs/AGENT_WORKFLOW.md" },
    ],
  },
  {
    id: "wf-doc-drift",
    title: "Doc drift — reconcile a doc against real repo state",
    lane: "librarian",
    scenario: "doc-drift",
    riskLevel: "low",
    steps: [
      {
        order: 1,
        who: "librarian",
        what: "Verify every file path, route, and script the doc names actually exists in the repo today. Treat a named-but-missing path as the finding, not as a typo to quietly fix.",
      },
      {
        order: 2,
        who: "research",
        what: "For each mismatch, establish which side is stale — the doc or the code — from repo state, not from what the doc claims.",
      },
      {
        order: 3,
        who: "librarian",
        what: "Correct the doc to describe what is true now, including saying plainly when something does not exist yet.",
      },
      {
        order: 4,
        who: "chief",
        what: "If the drift changes what agents may do without approval, open it as a Build approval request under the 'Changes to approval-related UX or logic' gate before it takes effect.",
      },
    ],
    links: [
      { label: "Change Control", href: "docs/AGENT_RUNBOOK.md" },
      { label: "Source note template", href: "knowledge/templates/source-template.md" },
    ],
  },
];
