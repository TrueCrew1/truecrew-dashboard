/**
 * Research request status vocabulary and transition rules — the single source
 * of truth shared by the client session store (src/lib/research/sessionStore.ts),
 * the API route (api/research/*), and the Supabase queries layer. Framework-free
 * on purpose: no React, no Supabase client, no side effects.
 */

export const RESEARCH_STATUS_VALUES = ["queued", "in_progress", "done", "blocked"] as const;

export type ResearchRequestStatus = (typeof RESEARCH_STATUS_VALUES)[number];

export function isResearchRequestStatus(value: string): value is ResearchRequestStatus {
  return (RESEARCH_STATUS_VALUES as readonly string[]).includes(value);
}

export const ALLOWED_RESEARCH_TRANSITIONS: Record<
  ResearchRequestStatus,
  readonly ResearchRequestStatus[]
> = {
  queued: ["in_progress", "blocked"],
  in_progress: ["done", "blocked", "queued"],
  blocked: ["queued", "in_progress"],
  done: [],
};

export function canTransitionResearchStatus(
  from: ResearchRequestStatus,
  to: ResearchRequestStatus,
): boolean {
  return ALLOWED_RESEARCH_TRANSITIONS[from].includes(to);
}

/**
 * Validates a status change's required companions (blocker note for blocked,
 * filed path for done). Returns an error message, or null when valid. The
 * client throws on the message; the API returns it as a 400/409 body.
 */
export function researchStatusChangeError(
  from: ResearchRequestStatus,
  to: ResearchRequestStatus,
  options: { filedPath?: string | null; blockerNote?: string | null },
): string | null {
  if (!canTransitionResearchStatus(from, to)) {
    return `Cannot move research from ${from} to ${to}`;
  }
  if (to === "blocked" && !options.blockerNote?.trim()) {
    return "Blocked status requires a blocker note";
  }
  if (to === "done" && !options.filedPath?.trim()) {
    return "Done status requires a filed path";
  }
  return null;
}
