import { useEffect } from "react";
import type { AgentDirectoryEntry } from "./agentWorkBoardMock";
import { AgentActivityCard } from "./AgentActivityTimeline";
import type { AgentActivityItem } from "./agentActivityFeed";
import {
  AgentWorkCard,
  LivenessBadge,
  SPECIALIST_INITIALS,
  classifyAgentLiveness,
  computeStatusCounts,
  sortByStatusThenRecency,
} from "./agentWorkPresentation";
import type { AgentWorkItem, ApprovalProposal } from "./types";

interface AgentDetailDrawerProps {
  entry: AgentDirectoryEntry;
  items: AgentWorkItem[];
  /** This agent's recent activity, newest first — already filtered/capped by the caller. */
  activity: AgentActivityItem[];
  /** True when the host tab's own agent filter currently hides this agent's lane/entries. */
  isFilteredOut: boolean;
  proposalByAwaitingWorkId: Map<string, ApprovalProposal>;
  onReviewInApprovals: (proposalId: string) => void;
  onClose: () => void;
}

/**
 * Click-through detail view for one agent — opened from a lane header on
 * the Agents tab, an overview pill's detail button, or an agent name/avatar
 * on the Timeline tab. Reuses the exact same items, sorting, and card
 * rendering as those surfaces; adds a "recent activity" slice on top.
 *
 * If the host tab's own filter currently hides this agent, the drawer stays
 * open (rather than auto-closing) and shows a note instead — simpler than
 * tracking filter changes to decide whether to clear the selection, and it
 * avoids the drawer vanishing out from under someone mid-read.
 */
export function AgentDetailDrawer({
  entry,
  items,
  activity,
  isFilteredOut,
  proposalByAwaitingWorkId,
  onReviewInApprovals,
  onClose,
}: AgentDetailDrawerProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const liveness = classifyAgentLiveness(items, entry);
  const statusCounts = computeStatusCounts(items);
  const sortedItems = sortByStatusThenRecency(items);

  return (
    <>
      <div className="agent-detail-drawer-backdrop" onClick={onClose} />
      <aside
        className="agent-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${entry.agent} detail`}
      >
        <header className="agent-detail-drawer-header">
          <div className="agent-detail-drawer-identity">
            <span className="agent-work-card-avatar agent-detail-drawer-avatar" aria-hidden="true">
              {SPECIALIST_INITIALS[entry.agent]}
            </span>
            <div>
              <h3 className="agent-detail-drawer-title">{entry.agent}</h3>
              <p className="agent-detail-drawer-description">{entry.description}</p>
            </div>
          </div>
          <button
            type="button"
            className="agent-detail-drawer-close"
            onClick={onClose}
            aria-label="Close agent detail"
          >
            ×
          </button>
        </header>

        <div className="agent-detail-drawer-body">
          <div className="agent-detail-drawer-meta">
            <LivenessBadge liveness={liveness} />
            <span className="agent-work-lane-count">{items.length} total</span>
          </div>

          {isFilteredOut ? (
            <p className="chief-board-lane-note agent-detail-drawer-filtered-note">
              {entry.agent} is currently hidden by your active filter — showing details anyway.
            </p>
          ) : null}

          {statusCounts.length > 0 ? (
            <div className="agent-detail-drawer-counts">
              {statusCounts.map((part) => (
                <span key={part.status} className="badge badge-steel">
                  {part.count} {part.label.toLowerCase()}
                </span>
              ))}
            </div>
          ) : null}

          <h4 className="agent-detail-drawer-section-title">Current work</h4>
          {sortedItems.length === 0 ? (
            <p className="agent-work-lane-empty">No work tracked for this agent yet.</p>
          ) : (
            <ul className="agent-work-list">
              {sortedItems.map((item) => (
                <li key={item.id}>
                  <AgentWorkCard
                    item={item}
                    proposal={
                      item.status === "awaiting_approval"
                        ? proposalByAwaitingWorkId.get(item.id)
                        : undefined
                    }
                    onReviewInApprovals={
                      item.status === "awaiting_approval" ? onReviewInApprovals : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <h4 className="agent-detail-drawer-section-title">Recent activity</h4>
          {activity.length === 0 ? (
            <p className="agent-work-lane-empty">
              No timeline activity tracked for this agent yet.
            </p>
          ) : (
            <ol className="chief-audit-list">
              {activity.map((item) => (
                <li key={item.id} className="chief-audit-item">
                  <div className="chief-audit-item-marker" aria-hidden="true" />
                  <AgentActivityCard item={item} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </>
  );
}
