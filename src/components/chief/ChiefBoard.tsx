import { Link } from "react-router-dom";
import { ChiefApprovalActions } from "./ChiefApprovalActions";
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
  return (
    <article
      className={`chief-board-card chief-board-card--actionable chief-board-card--${item.tone}`}
    >
      <div className="chief-board-card-header">
        <span className="chief-board-card-title">{item.title}</span>
        {item.meta ? <span className="chief-board-card-meta">{item.meta}</span> : null}
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

  if (totalSignal === 0) {
    return (
      <div className="chief-board">
        <div className="chief-section-header">
          <h2 className="chief-section-title">Operations board</h2>
          <span className="chief-brief-status chief-brief-status--clear">Queue stable</span>
        </div>
        <div className="chief-section-empty">
          <p className="chief-section-empty-lead">Nothing needs attention</p>
          <p className="chief-section-empty-desc">
            At-risk work, gate blocks, context gaps, and approval candidates are all clear
            against current dashboard state.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chief-board">
      <div className="chief-section-header">
        <h2 className="chief-section-title">Operations board</h2>
        <span className="chief-section-count">{totalSignal} item{totalSignal === 1 ? "" : "s"}</span>
      </div>

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
    </div>
  );
}
