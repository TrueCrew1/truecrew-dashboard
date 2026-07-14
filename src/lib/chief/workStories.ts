/**
 * Reusable Work Story definitions for Chief's Agents tab. Each entry ties one
 * scenario together across the Board's live Planner/priority context (if any
 * exists yet), the manual Research queue, and the deterministic Research →
 * Filing path. This is config, not scattered per-scenario UI constants — adding
 * a new scenario means adding one entry here, not touching render logic.
 */
export interface WorkStoryDefinition {
  id: string;
  title: string;
  /** Short, human summary shown regardless of how much live backing exists. */
  summary: string;
  /** Matching ResearchRequest.id in src/lib/research/requests.ts. */
  researchRequestId: string;
  /**
   * Task.title to look up in live Build-gate data (useBuildTasks) for Planner
   * checklist / priority-reason context. Omit if no live task backs this story
   * yet — the UI shows that honestly rather than faking a live status.
   */
  linkedTaskTitle?: string;
  /** Case-insensitive substring matched against a filed research note's title. */
  noteMatchTitle: string;
}

export const WORK_STORIES: WorkStoryDefinition[] = [
  {
    id: "story-billing-rate-limiter",
    title: "Billing API rate limiter",
    summary:
      "Per-tenant rate limiting for the Billing API — one required gate (\"PR opened\") still open.",
    researchRequestId: "req-billing-rate-limiter",
    linkedTaskTitle: "Billing API rate limiter",
    noteMatchTitle: "billing api rate limiter",
  },
  {
    id: "story-notification-vendor",
    title: "Transactional email vendor for notification hooks",
    summary:
      "ChiefPanel's card-created/card-resolved notification hooks are stubbed with no vendor wired " +
      "in yet — no live Build task tracks this, so there's no live Planner checklist for it either.",
    researchRequestId: "req-notification-vendor",
    noteMatchTitle: "notification",
  },
  {
    id: "story-webhook-retries",
    title: "Billing API webhook retries",
    summary:
      "Retry/backoff handling for webhook delivery — the Webhook Worker (tool-003) has an open " +
      "incident (queue backlog) this build directly addresses. One required gate " +
      "(\"GitHub branch linked\") still open.",
    researchRequestId: "req-webhook-retries",
    linkedTaskTitle: "Billing API webhook retries",
    noteMatchTitle: "webhook retries",
  },
];

export function getWorkStories(): WorkStoryDefinition[] {
  return WORK_STORIES;
}
