import type { ApprovalProposal } from "./types";
import type { ApprovalActivitySnapshotInput } from "../../../lib/approvals/types";

export function buildApprovalActivitySnapshot(
  proposal: ApprovalProposal,
  decision: Pick<ApprovalActivitySnapshotInput, "decision" | "decidedAt" | "actor">,
): ApprovalActivitySnapshotInput {
  return {
    proposalId: proposal.id,
    title: proposal.title,
    summary: proposal.summary,
    decision: decision.decision,
    decidedAt: decision.decidedAt,
    actor: decision.actor,
    source: proposal.source,
    category: proposal.category,
    missionKind: proposal.missionKind,
  };
}

export function approvalActivitySourceLabel(source?: string): string | null {
  if (!source?.trim()) return null;
  return source.replace(/_/g, " ");
}

export function approvalActivityCategoryLabel(category?: string): string | null {
  if (!category?.trim()) return null;
  return category.replace(/_/g, " ");
}

export const APPROVAL_ACTIVITY_MOCK_MODE_NOTE =
  "Session only — approval activity is not persisted to the server or vault in mock mode.";

export const APPROVAL_ACTIVITY_LIVE_NOTE =
  "Recent Chief approval decisions from vault activity records (live mode).";

export const APPROVAL_ACTIVITY_DEV_UNAVAILABLE_NOTE =
  "Approval activity unavailable in this dev mode — the live endpoint is not returning JSON. Use vercel dev, or set VITE_USE_LIVE_API=false.";

export function isApprovalActivityDevUnavailable(error: string | null): boolean {
  if (!error) return false;
  return /not wired in this dev mode|non-JSON|VITE_USE_LIVE_API/i.test(error);
}
