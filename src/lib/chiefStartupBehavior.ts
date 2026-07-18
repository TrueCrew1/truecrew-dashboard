import { MEMORY_REVIEW_PASS_ID } from "@/components/chief/memoryReviewProposal";
import type { ApprovalProposal } from "@/components/chief/types";

export type MemoryReviewPassStatus = "not_run" | "ok" | "due";

export interface ChiefStartupSummary {
  status: MemoryReviewPassStatus;
  lastRunAt: string | null;
  detail: string;
}

/**
 * Chief's Startup Behavior (docs/AGENT_RUNBOOK.md § Chief Intake Rule +
 * docs/AGENT_LANES_INTERNAL.md § Chief) calls for knowing whether a Memory
 * Review Pass is outstanding before acting. This app has no live read
 * access to knowledge/lessons/*.md or GitHub PRs (no backend route exists
 * for either, and none is added here) — so this derives status only from
 * the one real, in-session record a Memory Review Pass run leaves behind:
 * its own ApprovalCard in the shared approvals queue (see
 * memoryReviewProposal.ts). It does not infer "due" from elapsed time —
 * AGENT_RUNBOOK's trigger for this workflow is explicit request only, never
 * a timer, and this helper doesn't add one.
 */
export function getChiefStartupSummary(approvals: ApprovalProposal[]): ChiefStartupSummary {
  const proposal = approvals.find((candidate) => candidate.id === MEMORY_REVIEW_PASS_ID);

  if (!proposal) {
    return {
      status: "not_run",
      lastRunAt: null,
      detail: "No Memory Review Pass recorded yet this session.",
    };
  }

  if (proposal.status === "approved") {
    const lastRunAt = proposal.decidedAt ?? proposal.createdAt;
    return { status: "ok", lastRunAt, detail: `Last run recorded and approved.` };
  }

  if (proposal.status === "sent_back" || proposal.status === "rejected") {
    return {
      status: "due",
      lastRunAt: proposal.decidedAt ?? proposal.createdAt,
      detail: `Last attempt was ${proposal.status === "sent_back" ? "sent back" : "rejected"} — re-run needed.`,
    };
  }

  return {
    status: "due",
    lastRunAt: null,
    detail: "Awaiting your decision on the current Memory Review Pass card.",
  };
}
