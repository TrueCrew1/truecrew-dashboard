import { useMemo } from "react";
import {
  compareApprovalsByAge,
  summarizePendingApprovalUrgency,
} from "./chiefApprovalUrgency";
import { APPROVAL_STATUS_LABEL } from "./chiefApproval";
import type { ApprovalProposal } from "./types";

const RECENT_LIMIT = 3;

interface ChiefQueueStripProps {
  approvals: ApprovalProposal[];
  pendingApprovalCount: number;
  onOpenApprovals: (proposalId?: string) => void;
  overdueTaskCount: number;
  onOpenBoard?: () => void;
}

function compareResolvedRecency(a: ApprovalProposal, b: ApprovalProposal): number {
  const aTime = a.decidedAt ? new Date(a.decidedAt).getTime() : 0;
  const bTime = b.decidedAt ? new Date(b.decidedAt).getTime() : 0;
  return bTime - aTime;
}

/**
 * Always-visible strip above the Chief tabs — gives an at-a-glance read on
 * the queue (current task, pending count, last few resolved) regardless of
 * which tab is active, so Chief reads as a live control plane rather than
 * something you have to open the Approvals tab to check.
 */
export function ChiefQueueStrip({
  approvals,
  pendingApprovalCount,
  onOpenApprovals,
  overdueTaskCount,
  onOpenBoard,
}: ChiefQueueStripProps) {
  const currentTask = useMemo(() => {
    const pending = approvals.filter((proposal) => proposal.status === "pending");
    // Oldest pending item first — same stale-first ordering the Approvals
    // tab and Board use, so "current task" matches what the operator would
    // hit first if they opened the queue right now.
    pending.sort(compareApprovalsByAge);
    return pending[0] ?? null;
  }, [approvals]);

  const recentResolved = useMemo(() => {
    return approvals
      .filter((proposal) => proposal.status !== "pending" && proposal.decidedAt)
      .sort(compareResolvedRecency)
      .slice(0, RECENT_LIMIT);
  }, [approvals]);

  // Same urgency tiers as the Approvals tab's summary strip and per-card
  // badges — reused here so the always-visible strip agrees with the
  // detailed board instead of deriving its own thresholds.
  const pendingUrgency = useMemo(
    () => summarizePendingApprovalUrgency(approvals),
    [approvals],
  );

  return (
    <section className="chief-queue-strip" aria-label="Chief queue at a glance">
      <div className="chief-queue-strip-row">
        <div className="chief-queue-strip-current">
          <span className="chief-queue-strip-label">Current</span>
          {currentTask ? (
            <button
              type="button"
              className="chief-queue-strip-current-title"
              onClick={() => onOpenApprovals(currentTask.id)}
              title={currentTask.summary}
            >
              {currentTask.title}
            </button>
          ) : (
            <span className="chief-queue-strip-current-title chief-queue-strip-current-title--empty">
              Queue clear
            </span>
          )}
        </div>

        <button
          type="button"
          className="chief-queue-strip-pending"
          onClick={() => onOpenApprovals()}
          disabled={pendingApprovalCount === 0}
        >
          <span className="chief-queue-strip-pending-count">{pendingApprovalCount}</span>
          <span className="chief-queue-strip-pending-label">Pending</span>
        </button>
      </div>

      {approvals.length > 0 ? (
        pendingUrgency.pending > 0 ? (
          <button
            type="button"
            className="chief-queue-strip-health"
            onClick={() => onOpenApprovals()}
            title="Open the Approvals tab."
          >
            Approvals: <strong>{pendingUrgency.pending}</strong> pending
            {pendingUrgency.overdue > 0 ? (
              <>
                {" "}
                · <strong>{pendingUrgency.overdue}</strong> overdue
              </>
            ) : null}
            {pendingUrgency.dueSoon > 0 ? (
              <>
                {" "}
                · <strong>{pendingUrgency.dueSoon}</strong> due soon
              </>
            ) : null}
          </button>
        ) : (
          <p className="chief-queue-strip-health chief-queue-strip-health--empty" role="status">
            Approvals: <strong>0</strong> pending
          </p>
        )
      ) : null}

      {overdueTaskCount > 0 && onOpenBoard ? (
        <button
          type="button"
          className="chief-queue-strip-health"
          onClick={onOpenBoard}
          title="Open the Board tab."
        >
          Work: <strong>{overdueTaskCount}</strong> task{overdueTaskCount === 1 ? "" : "s"} overdue
        </button>
      ) : (
        <p className="chief-queue-strip-health chief-queue-strip-health--empty" role="status">
          Work: <strong>{overdueTaskCount}</strong> task{overdueTaskCount === 1 ? "" : "s"} overdue
        </p>
      )}

      {recentResolved.length > 0 ? (
        <ul className="chief-queue-strip-recent">
          {recentResolved.map((proposal) => (
            <li key={proposal.id} className="chief-queue-strip-recent-item">
              <span className="chief-queue-strip-recent-status">
                {APPROVAL_STATUS_LABEL[proposal.status]}
              </span>
              <span className="chief-queue-strip-recent-title">{proposal.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
