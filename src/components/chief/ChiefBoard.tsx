import { Link } from "react-router-dom";
import { ChiefApprovalActions } from "./ChiefApprovalActions";
import {
  ApprovalSectionHeader,
  ApprovalSectionShell,
  ApprovalSurfaceEmpty,
} from "./approvalWrappers";
import { getApprovalUrgencyBadge, OVERDUE_HOURS } from "./chiefApprovalUrgency";
import { formatChiefTimestamp } from "./chiefMock";
import { CHIEF_BOARD_LANES } from "./chiefLiveContext";
import type { ApprovalActionState } from "./chiefApproval";
import type { ApprovalAction, ApprovalProposal, ChiefBoardItem, ChiefBoardLane } from "./types";

interface ChiefBoardProps {
  items: ChiefBoardItem[];
  pendingApprovalCount: number;
  proposalsById: Map<string, ApprovalProposal>;
  approvalActionStates: Record<string, ApprovalActionState>;
  onApprovalAction: (proposalId: string, action: ApprovalAction) => void;
  onOpenApprovals?: () => void;
}

function itemsForLane(items: ChiefBoardItem[], lane: ChiefBoardLane): ChiefBoardItem[] {
  return items.filter((item) => item.lane === lane);
}

function ReadOnlyBoardCard({ item }: { item: ChiefBoardItem }) {
  return (
    <Link
      to={item.routeTo}
      className={`chief-board-card chief-board-card--${item.tone}`}
    >
      <div className="chief-board-card-header">
        <span className="chief-board-card-title">{item.title}</span>
        {item.meta ? <span className="chief-board-card-meta">{item.meta}</span> : null}
      </div>
      <p className="chief-board-card-detail">{item.detail}</p>
      <footer className="chief-board-card-footer">
        <span className="chief-board-card-route">Open {item.routeLabel}</span>
        {item.timestamp ? (
          <time className="chief-board-card-time" dateTime={item.timestamp}>
            {formatChiefTimestamp(item.timestamp)}
          </time>
        ) : null}
      </footer>
    </Link>
  );
}

function ApprovalBoardCard({
  item,
  proposal,
  actionState,
  onApprovalAction,
}: {
  item: ChiefBoardItem;
  proposal: ApprovalProposal;
  actionState?: ApprovalActionState;
  onApprovalAction: (proposalId: string, action: ApprovalAction) => void;
}) {
  const urgencyBadge = getApprovalUrgencyBadge(proposal);

  return (
    <article
      className={`chief-board-card chief-board-card--actionable chief-board-card--${item.tone}`}
    >
      <div className="chief-board-card-header">
        <span className="chief-board-card-title">{item.title}</span>
        <span className="chief-board-card-header-right">
          {urgencyBadge ? (
            <span
              className={`badge ${urgencyBadge.badgeClass}`}
              title={
                urgencyBadge.escalate
                  ? `Pending ${OVERDUE_HOURS}h+ — consider escalating to the operator.`
                  : undefined
              }
            >
              {urgencyBadge.label}
            </span>
          ) : null}
          {item.meta ? <span className="chief-board-card-meta">{item.meta}</span> : null}
        </span>
      </div>
      <p className="chief-board-card-detail">{item.detail}</p>
      <footer className="chief-board-card-footer">
        <Link to={item.routeTo} className="chief-board-card-route">
          Open {item.routeLabel}
        </Link>
        {item.timestamp ? (
          <time className="chief-board-card-time" dateTime={item.timestamp}>
            {formatChiefTimestamp(item.timestamp)}
          </time>
        ) : null}
      </footer>
      <ChiefApprovalActions
        proposal={proposal}
        actionState={actionState}
        onAction={onApprovalAction}
        variant="board"
      />
    </article>
  );
}

export function ChiefBoard({
  items,
  pendingApprovalCount,
  proposalsById,
  approvalActionStates,
  onApprovalAction,
  onOpenApprovals,
}: ChiefBoardProps) {
  const totalSignal = items.length;
  const approvalLaneCount = itemsForLane(items, "approval").length;
  // Counted across all pending proposals (not just what's shown on this
  // lane) to match pendingApprovalCount's own scope, just below.
  const overduePendingCount = [...proposalsById.values()].filter(
    (proposal) => getApprovalUrgencyBadge(proposal)?.escalate,
  ).length;

  if (totalSignal === 0) {
    return (
      <ApprovalSectionShell className="chief-board">
        <ApprovalSectionHeader
          title="Operations board"
          status={<span className="chief-brief-status chief-brief-status--clear">Queue stable</span>}
        />
        <ApprovalSurfaceEmpty
          lead="Nothing needs attention"
          description="At-risk work, gate blocks, context gaps, and approval candidates are all clear against current dashboard state."
        />
      </ApprovalSectionShell>
    );
  }

  return (
    <ApprovalSectionShell
      className="chief-board"
      title="Operations board"
      count={`${totalSignal} item${totalSignal === 1 ? "" : "s"}`}
    >
      <p className="chief-board-note">
        At-risk, blocked, and context lanes are read-only. Approve, reject, or send back directly
        in Needs approval — same decisions as the Approvals tab.
      </p>

      <div className="chief-board-lanes">
        {CHIEF_BOARD_LANES.map((laneConfig) => {
          const laneItems = itemsForLane(items, laneConfig.lane);
          const isApprovalLane = laneConfig.lane === "approval";

          return (
            <section
              key={laneConfig.lane}
              className="chief-board-lane"
              aria-label={laneConfig.label}
            >
              <header className="chief-board-lane-header">
                <h3 className="chief-board-lane-title">{laneConfig.label}</h3>
                <span className="chief-board-lane-count">
                  {isApprovalLane ? pendingApprovalCount : laneItems.length}
                </span>
              </header>

              {isApprovalLane && overduePendingCount > 0 ? (
                <p className="chief-board-lane-note chief-board-lane-note--escalate">
                  {overduePendingCount} of {pendingApprovalCount} pending{" "}
                  {overduePendingCount === 1 ? "is" : "are"} overdue — consider escalating.
                </p>
              ) : null}

              {isApprovalLane && pendingApprovalCount > approvalLaneCount ? (
                <p className="chief-board-lane-note">
                  Showing {approvalLaneCount} on the board — {pendingApprovalCount} total on Approvals.
                </p>
              ) : null}

              {laneItems.length === 0 ? (
                <p className="chief-board-lane-empty">{laneConfig.emptyMessage}</p>
              ) : (
                <ul className="chief-board-list">
                  {laneItems.map((item) => {
                    const proposal =
                      item.proposalId !== undefined
                        ? proposalsById.get(item.proposalId)
                        : undefined;

                    return (
                      <li key={item.id}>
                        {isApprovalLane && proposal ? (
                          <ApprovalBoardCard
                            item={item}
                            proposal={proposal}
                            actionState={approvalActionStates[proposal.id]}
                            onApprovalAction={onApprovalAction}
                          />
                        ) : (
                          <ReadOnlyBoardCard item={item} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {isApprovalLane && pendingApprovalCount > 0 && onOpenApprovals ? (
                <button
                  type="button"
                  className="chief-board-lane-action"
                  onClick={onOpenApprovals}
                >
                  {`Review ${pendingApprovalCount} proposal${pendingApprovalCount === 1 ? "" : "s"} on Approvals`}
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </ApprovalSectionShell>
  );
}
