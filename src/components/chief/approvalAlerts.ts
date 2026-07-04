import { getUrgency } from "./chiefApprovalUrgency";
import type { ApprovalProposal, ChiefSpecialist } from "./types";

export type ApprovalAlertSeverity = "at_risk" | "overdue";

export interface ApprovalAlert {
  proposalId: string;
  title: string;
  summary: string;
  severity: ApprovalAlertSeverity;
  /** Timestamp the proposal has been pending since — same value used to derive severity. */
  pendingSince: string;
  routeTo?: string;
  routeLabel?: string;
  specialist?: Exclude<ChiefSpecialist, "Chief">;
}

/**
 * Derive at-risk/overdue alerts from pending approval proposals only — decided proposals
 * (approved/rejected/sent_back) never surface as alerts. Pure and client-side, reusing the
 * same pending-age thresholds as the rest of Chief approvals (chiefApprovalUrgency.ts).
 */
export function deriveApprovalAlerts(
  proposals: ApprovalProposal[],
  now: Date = new Date(),
): ApprovalAlert[] {
  const alerts: ApprovalAlert[] = [];

  for (const proposal of proposals) {
    if (proposal.status !== "pending") continue;

    const urgency = getUrgency(proposal.createdAt, now);
    if (urgency === "recent") continue;

    alerts.push({
      proposalId: proposal.id,
      title: proposal.title,
      summary: proposal.summary,
      severity: urgency === "overdue" ? "overdue" : "at_risk",
      pendingSince: proposal.createdAt,
      routeTo: proposal.routeTo,
      routeLabel: proposal.routeLabel,
      specialist: proposal.specialist,
    });
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "overdue" ? -1 : 1;
    return new Date(a.pendingSince).getTime() - new Date(b.pendingSince).getTime();
  });
}
