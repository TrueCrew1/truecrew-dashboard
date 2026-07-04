/**
 * Reserved for Chief Approvals Roadmap Phase 4 (Alerts & Escalation) — not
 * currently imported anywhere. The shipped stale-pending badge in
 * `ApprovalStatusDashboard` (see `approvalStatus.ts`) is a simpler, single-
 * threshold indicator built for an earlier, smaller slice; it does not use
 * this three-tier urgency model. Wire this in (or fold the two together)
 * when Phase 4 is actually scheduled — don't delete casually, but don't
 * treat it as already-shipped behavior either.
 */

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
