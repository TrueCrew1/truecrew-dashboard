/**
 * Manual, in-repo research queue — Chief-originated requests waiting for a human
 * (or a future Research agent run) to investigate. Read-only and non-fulfilling:
 * nothing here auto-runs research or auto-files a finding. Actual filing still
 * goes through lib/research/fileFinding.ts once someone does the work.
 */
export interface ResearchRequest {
  id: string;
  topic: string;
  whyItMatters: string;
  suggestedOutcome: string;
  createdAt: string; // ISO
}

export const RESEARCH_REQUESTS: ResearchRequest[] = [
  {
    id: "req-notification-vendor",
    topic: "Transactional email vendor for notification hooks",
    whyItMatters:
      "ChiefPanel already has card-created/card-resolved notification hooks stubbed but no vendor wired in.",
    suggestedOutcome: "A short vendor comparison filed as a knowledge/sources/ finding.",
    createdAt: "2026-07-10T09:00:00.000Z",
  },
  {
    id: "req-obsidian-sync-cost",
    topic: "Obsidian Sync cost/latency for the Phase C knowledge-vault rollout",
    whyItMatters:
      "README lists Obsidian Sync as Phase C but no cost or reliability data has been gathered yet.",
    suggestedOutcome: "A findings note on pricing tiers and expected sync latency at this team's size.",
    createdAt: "2026-07-12T14:30:00.000Z",
  },
  {
    id: "req-billing-rate-limiter",
    topic: "Billing API rate limiter — what's still open before the gate can close",
    whyItMatters:
      "task-001's \"PR opened\" gate is still unpassed even though a githubRef (truecrew/billing-api#142) " +
      "already exists, and Planner's checklist on the Build gates card flags it as the task's one blocker.",
    suggestedOutcome:
      "A findings note listing the specific open questions (per-tenant limit value, burst allowance, " +
      "which billing endpoints are in scope) that need answering before PR #142 can merge.",
    createdAt: "2026-07-13T11:00:00.000Z",
  },
];

export function getResearchRequests(): ResearchRequest[] {
  return RESEARCH_REQUESTS;
}
