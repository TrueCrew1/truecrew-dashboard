import { fileResearchFinding, type ResearchFinding } from "./fileFinding";
import { getResearchRequests, type ResearchRequest } from "../../src/lib/research/requests";
import { getWorkStories } from "../../src/lib/chief/workStories";

type FindingBuilder = (request: ResearchRequest) => ResearchFinding;

/**
 * Supervised, deterministic fulfillment — one hand-authored builder per known
 * Research queue request id. No AI generation, no autonomy: a human explicitly
 * invokes fulfillResearchRequest (see scripts/fulfill-research-request.ts) for a
 * specific, already-queued request.
 */
const FINDING_BUILDERS: Record<string, FindingBuilder> = {
  "req-billing-rate-limiter": (request) => ({
    topic: "Billing API rate limiter — gate-closure research",
    origin:
      `Chief Research queue request \`${request.id}\` — raised because Planner's checklist on the ` +
      "Build gates card (Board tab) flags task-001's one remaining gate.",
    summary:
      "task-001 (\"Billing API rate limiter\") has 2 of 3 required gates passed (acceptance criteria " +
      "written, GitHub branch linked) and 1 open: \"PR opened\". A githubRef (truecrew/billing-api#142) " +
      "is already recorded on the task, and it's linked to a deploy entity (Billing API v2.4.1) — so the " +
      "gate isn't waiting on a missing PR, it's waiting on that PR actually being confirmed open/ready.",
    facts: [
      "task-001's required gates: \"Acceptance criteria written\" (passed), \"GitHub branch linked\" " +
        "(passed), \"PR opened\" (not passed).",
      "task-001.githubRef is already set to truecrew/billing-api#142, and task-001 is linked to a " +
        "deploy entity (\"Billing API v2.4.1\") — Chief's Board card surfaces this as " +
        "\"Blocks deploy: Billing API v2.4.1\".",
      "Planner's checklist for this task (getPlannerChecklist, Board tab) currently reads: " +
        "\"Close: PR opened\" then \"Confirm evidence and hand back to Chief for approval.\"",
    ],
    nextStep: request.suggestedOutcome,
    relatedPages: [],
  }),
  "req-notification-vendor": (request) => ({
    topic: "Transactional email vendor for notification hooks — current state",
    origin:
      `Chief Research queue request \`${request.id}\` — raised because ChiefPanel's notification ` +
      "hooks are stubbed with no vendor wired in.",
    summary:
      "This is a structural placeholder, not vendor research: it exists to prove the Work Story " +
      "model is reusable across more than one scenario, not to claim a vendor decision has been " +
      "made. No vendor names, pricing, or benchmarks are asserted anywhere in this note — that " +
      "comparison is exactly what a real Research agent pass still needs to produce.",
    facts: [
      "ChiefPanel.tsx's handleSubmit has an extension-point comment noting a future \"card created\" " +
        "notification hook alongside real approval sources, but no outbound-email vendor call exists " +
        "anywhere in the repo yet.",
      "No workflowType:\"build\" task in mockData.ts represents this work — unlike the Billing API " +
        "rate limiter story, this scenario has no live Board card or Planner checklist yet.",
      "Chief's Work Story panel (Agents tab) marks this story \"Structured\" rather than \"Live\" for " +
        "exactly this reason.",
    ],
    nextStep: request.suggestedOutcome,
    relatedPages: [],
  }),
  "req-webhook-retries": (request) => ({
    topic: "Billing API webhook retries — gate-closure research",
    origin:
      `Chief Research queue request \`${request.id}\` — raised because Planner's checklist on the ` +
      "Build gates card (Board tab) flags task-005's one remaining gate.",
    summary:
      "task-005 (\"Billing API webhook retries\") has 1 of 2 required gates passed (acceptance " +
      "criteria written) and 1 open: \"GitHub branch linked\". It's linked to the Webhook Worker " +
      "tool (tool-003, status: degraded) and to an open incident (inc-002, \"Webhook delivery " +
      "backlog\" — queue depth above 5k for 45 minutes) that this build is meant to resolve.",
    facts: [
      "task-005's required gates: \"Acceptance criteria written\" (passed), \"GitHub branch linked\" " +
        "(not passed).",
      "task-005 is linked to tool-003 (Webhook Worker, status: degraded) and inc-002 (\"Webhook " +
        "delivery backlog\", severity 3, status: open).",
      "Planner's checklist for this task (getPlannerChecklist, Board tab) currently reads: " +
        "\"Close: GitHub branch linked\" then \"Confirm evidence and hand back to Chief for approval.\"",
    ],
    nextStep: request.suggestedOutcome,
    relatedPages: [],
  }),
};

/**
 * Builds and files a finding for a known, already-queued Research request.
 * Returns the written path, or null if the request id isn't queued or has no
 * fulfillment builder yet.
 *
 * The Work Story id is derived here, generically, from whichever
 * WorkStoryDefinition links to this request (via researchRequestId) — builders
 * above don't need to know or hardcode their own story id.
 */
export function fulfillResearchRequest(requestId: string): string | null {
  const request = getResearchRequests().find((candidate) => candidate.id === requestId);
  if (!request) return null;

  const builder = FINDING_BUILDERS[requestId];
  if (!builder) return null;

  const story = getWorkStories().find((candidate) => candidate.researchRequestId === requestId);
  const finding = builder(request);

  return fileResearchFinding({ ...finding, workStoryId: story?.id ?? finding.workStoryId });
}
