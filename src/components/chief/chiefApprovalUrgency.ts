/**
 * Chief Approvals Roadmap Phase 4 (Alerts & Escalation) — first wiring.
 * Surfaces this three-tier urgency model as per-row badges (Approvals tab,
 * Chief Board's approval lane) and stale-first ordering. The shipped
 * stale-pending badge in `ApprovalStatusDashboard` (see `approvalStatus.ts`)
 * is a separate, simpler single-threshold indicator from an earlier, smaller
 * slice — left as-is here rather than folded together, to keep this a small,
 * additive change instead of touching already-shipped dashboard behavior.
 */
import type { ApprovalProposal } from "./types";

/** Hours pending before a proposal is considered due soon (no badge below this). */
export const DUE_SOON_HOURS = 24;

/** Hours pending before a proposal is considered overdue. */
export const OVERDUE_HOURS = 48;

export type ApprovalUrgency = "recent" | "dueSoon" | "overdue";

/**
 * Derive urgency from how long a proposal has been pending.
 * Uses the pending timestamp only — pure, client-side, no writes.
 */
export function getUrgency(
  pendingTimestamp: string | null | undefined,
  now: Date = new Date(),
): ApprovalUrgency {
  if (!pendingTimestamp) return "recent";

  const pendingMs = new Date(pendingTimestamp).getTime();
  if (Number.isNaN(pendingMs)) return "recent";

  const ageHours = (now.getTime() - pendingMs) / (1000 * 60 * 60);

  if (ageHours > OVERDUE_HOURS) return "overdue";
  if (ageHours >= DUE_SOON_HOURS) return "dueSoon";
  return "recent";
}

export function formatApprovalPendingSummary(
  pendingCount: number,
  overdueCount: number,
): string {
  const base = `Pending ${pendingCount}`;
  if (overdueCount <= 0) return base;
  return `${base} · ${overdueCount} overdue`;
}

const URGENCY_LABEL: Record<Exclude<ApprovalUrgency, "recent">, string> = {
  dueSoon: "Due soon",
  overdue: "Overdue",
};

const URGENCY_BADGE: Record<Exclude<ApprovalUrgency, "recent">, string> = {
  dueSoon: "badge-yellow",
  overdue: "badge-red",
};

export interface ApprovalUrgencyBadge {
  urgency: Exclude<ApprovalUrgency, "recent">;
  label: string;
  badgeClass: string;
  /** Overdue (48h+) and still pending — a candidate to escalate, not just review. */
  escalate: boolean;
}

/**
 * Badge for a pending proposal's queue urgency. Null once decided (aging
 * stops mattering — the decision already happened) or still "recent"
 * (nothing to flag yet).
 */
export function getApprovalUrgencyBadge(
  proposal: Pick<ApprovalProposal, "status" | "createdAt">,
  now?: Date,
): ApprovalUrgencyBadge | null {
  if (proposal.status !== "pending") return null;

  const urgency = getUrgency(proposal.createdAt, now);
  if (urgency === "recent") return null;

  return {
    urgency,
    label: URGENCY_LABEL[urgency],
    badgeClass: URGENCY_BADGE[urgency],
    escalate: urgency === "overdue",
  };
}

/**
 * Oldest-pending-first ("stale first") comparator, for pending-only lists —
 * ApprovalBoard and Chief Board's approval lane both apply this so the
 * longest-waiting proposals surface at the top.
 */
export function compareApprovalsByAge(
  a: Pick<ApprovalProposal, "createdAt">,
  b: Pick<ApprovalProposal, "createdAt">,
): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
