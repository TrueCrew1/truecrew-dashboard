import { Link } from "react-router-dom";
import { ChiefApprovalActions } from "./ChiefApprovalActions";
import {
  ApprovalSectionHeader,
  ApprovalSectionShell,
  ApprovalSurfaceEmpty,
} from "./approvalWrappers";
import { getApprovalUrgencyBadge, OVERDUE_HOURS } from "./chiefApprovalUrgency";
import { formatChiefTimestamp } from "./chiefMock";
import { CHIEF_BOARD_LANES } from "./chiefApprovalBoard";
import { useBuildTasks } from "./hooks/useBuildTasks";
import { BuildTaskApprovalCard } from "./BuildTaskApprovalCard";
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
      className={`chief-board-card chief-board-card--${item.tone}${
        item.needsAttention ? " chief-board-card--needs-attention" : ""
      }`}
    >
      <div className="chief-board-card-header">
        <span className="chief-board-card-title">{item.title}</span>
        <span className="chief-board-card-header-right">
          {item.needsAttention ? (
            <span className="badge badge-red" title="Most overdue open task — promoted to the top of At-risk work.">
              Needs attention
            </span>
          ) : null}
          {item.meta ? <span className="chief-board-card-meta">{item.meta}</span> : null}
        </span>
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
  const { buildGateTasks, isLoading, error } = useBuildTasks();
  const totalSignal = items.length + buildGateTasks.length;
  const approvalLaneCount = itemsForLane(items, "approval").length;
  const overduePendingCount = [...proposalsById.values()].filter(
    (proposal) => getApprovalUrgencyBadge(proposal)?.escalate,
  ).length;

  if (totalSignal === 0 && !isLoading) {
    return (
      <ApprovalSectionShell className="chief-board">
        <ApprovalSectionHeader
          title="Operations board"
          status={<span className="chief-brief-status chief-brief-status--clear">Queue stable</span>}
        />
        <ApprovalSurfaceEmpty
          lead="Nothing needs attention"
          description="At-risk work, gate blocks, context gaps, approval candidates, and build gate tasks are all clear against current dashboard state."
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
        At-risk, blocked, context, and build gate lanes are read-only. Approve, reject, or send back directly
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

        {/* Build Gates Lane - Visibility Only */}
        <section
          className="chief-board-lane"
          aria-label="Build gates"
        >
          <header className="chief-board-lane-header">
            <h3 className="chief-board-lane-title">Build gates</h3>
            <span className="chief-board-lane-count">{buildGateTasks.length}</span>
          </header>

          {isLoading ? (
            <p className="chief-board-lane-empty">Loading build gate tasks…</p>
          ) : error ? (
            <p className="chief-board-lane-empty chief-board-lane-empty--error">
              Failed to load build gate tasks: {error}
            </p>
          ) : buildGateTasks.length === 0 ? (
            <p className="chief-board-lane-empty">No build tasks waiting on required gates</p>
          ) : (
            <ul className="chief-board-list">
              {buildGateTasks.map((task) => (
                <li key={task.id}>
                  <BuildTaskApprovalCard task={task} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ApprovalSectionShell>
  );
}
