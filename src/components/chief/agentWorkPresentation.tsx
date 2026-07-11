import { AGENT_WORK_STATUS_CONFIG, type AgentDirectoryEntry } from "./agentWorkBoardMock";
import { formatChiefTimestamp } from "./chiefMock";
import { getApprovalUrgencyBadge, OVERDUE_HOURS } from "./chiefApprovalUrgency";
import type { AgentWorkItem, AgentWorkStatus, ApprovalProposal } from "./types";
import type { TaskPriority } from "@/types";

/**
 * Shared presentation pieces for the Agents-tab oversight UI — used by both
 * AgentWorkBoard (the lanes) and AgentDetailDrawer (the per-agent drill-in),
 * so the two stay visually and behaviorally identical without duplicating
 * logic.
 */

export const SPECIALIST_INITIALS: Record<AgentWorkItem["agent"], string> = {
  "Workflow Gate Agent": "WG",
  "Librarian Agent": "LB",
  "Research Agent": "RS",
  "Roadmap Agent": "RM",
  "Marketer Agent": "MK",
  "Build Agent": "BD",
  "Competitive Research Agent": "CR",
};

const PRIORITY_BADGE_VARIANT: Record<TaskPriority, "red" | "orange" | "yellow" | "steel"> = {
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "steel",
};

const STATUS_NOTE_LABEL: Record<AgentWorkStatus, string> = {
  queued: "Next",
  active: "Next",
  blocked: "Blocker",
  awaiting_approval: "Blocker",
  completed: "Result",
};

/** Same labels as AGENT_WORK_STATUS_CONFIG, for the per-card status chip. */
export const STATUS_LABEL: Record<AgentWorkStatus, string> = {
  queued: "Queued",
  active: "Active",
  blocked: "Blocked",
  awaiting_approval: "Awaiting approval",
  completed: "Completed",
};

export const STATUS_BADGE_VARIANT: Record<AgentWorkStatus, "steel" | "blue" | "yellow" | "green"> = {
  queued: "steel",
  active: "blue",
  blocked: "yellow",
  awaiting_approval: "yellow",
  completed: "green",
};

/** Most-urgent-first, for ordering cards within an agent's lane or drawer. */
const STATUS_SORT_ORDER: AgentWorkStatus[] = [
  "blocked",
  "awaiting_approval",
  "active",
  "queued",
  "completed",
];

export function itemsForStatus(items: AgentWorkItem[], status: AgentWorkStatus): AgentWorkItem[] {
  return items.filter((item) => item.status === status);
}

export function sortByStatusThenRecency(items: AgentWorkItem[]): AgentWorkItem[] {
  return [...items].sort((a, b) => {
    const statusDelta = STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status);
    if (statusDelta !== 0) return statusDelta;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

/** Non-zero status counts, in status order — the shared basis for the pill summary and drawer chips. */
export function computeStatusCounts(
  items: AgentWorkItem[],
): Array<{ status: AgentWorkStatus; label: string; count: number }> {
  return AGENT_WORK_STATUS_CONFIG.map((config) => ({
    status: config.status,
    label: config.label,
    count: itemsForStatus(items, config.status).length,
  })).filter((part) => part.count > 0);
}

/** "3 queued · 1 active · 2 completed" — only non-zero counts, in status order. */
export function summarizeStatusCounts(items: AgentWorkItem[]): string {
  const parts = computeStatusCounts(items);
  if (parts.length === 0) return "No work tracked yet.";
  return parts.map((part) => `${part.count} ${part.label.toLowerCase()}`).join(" · ");
}

/**
 * An agent with any items infers live/mock from those items directly; an
 * agent with none falls back to its directory-level liveCapable flag so it
 * still gets a meaningful badge before it ever has work.
 */
export function classifyAgentLiveness(
  items: AgentWorkItem[],
  entry: AgentDirectoryEntry,
): "live" | "mock" {
  if (items.length > 0) {
    return items.some((item) => item.source === "live") ? "live" : "mock";
  }
  return entry.liveCapable ? "live" : "mock";
}

/** Which directory entry (if any) the detail drawer should show — null agent means the drawer is closed. */
export function resolveOpenAgentEntry(
  openAgent: AgentWorkItem["agent"] | null,
  directory: AgentDirectoryEntry[],
): AgentDirectoryEntry | null {
  if (!openAgent) return null;
  return directory.find((entry) => entry.agent === openAgent) ?? null;
}

export function LivenessBadge({ liveness }: { liveness: "live" | "mock" }) {
  return (
    <span className={`badge ${liveness === "live" ? "badge-green" : "badge-steel"}`}>
      {liveness}
    </span>
  );
}

export function AgentWorkCard({
  item,
  proposal,
  onReviewInApprovals,
}: {
  item: AgentWorkItem;
  proposal?: ApprovalProposal;
  onReviewInApprovals?: (proposalId: string) => void;
}) {
  const urgencyBadge = proposal ? getApprovalUrgencyBadge(proposal) : null;

  return (
    <article className={`agent-work-card agent-work-card--${item.status}`}>
      <div className="agent-work-card-header">
        <div className="agent-work-card-agent">
          <span className="agent-work-card-avatar" aria-hidden="true">
            {SPECIALIST_INITIALS[item.agent]}
          </span>
          <span className="agent-work-card-agent-name">{item.agent}</span>
        </div>
        <span className="agent-work-card-badges">
          <span className={`badge badge-${STATUS_BADGE_VARIANT[item.status]}`}>
            {STATUS_LABEL[item.status]}
          </span>
          {item.source === "live" ? (
            <span className="badge badge-green">live</span>
          ) : item.source === "mock" ? (
            <span className="badge badge-steel">mock</span>
          ) : null}
          {urgencyBadge ? (
            <span
              className={`badge ${urgencyBadge.badgeClass}`}
              title={
                urgencyBadge.escalate
                  ? `Pending ${OVERDUE_HOURS}h+ — consider escalating to the operator.`
                  : proposal
                    ? `Pending since ${formatChiefTimestamp(proposal.createdAt)}.`
                    : undefined
              }
            >
              {urgencyBadge.label}
            </span>
          ) : null}
          <span className={`badge badge-${PRIORITY_BADGE_VARIANT[item.priority]}`}>
            {item.priority}
          </span>
        </span>
      </div>
      <p className="agent-work-card-task">{item.task}</p>
      <p className="agent-work-card-note">
        <span className="agent-work-card-note-label">{STATUS_NOTE_LABEL[item.status]}:</span>{" "}
        {item.note}
      </p>
      {item.status === "awaiting_approval" && proposal && onReviewInApprovals ? (
        <button
          type="button"
          className="chief-approval-link"
          onClick={() => onReviewInApprovals(proposal.id)}
        >
          Review in Approvals
        </button>
      ) : null}
      <footer className="agent-work-card-footer">
        <time className="agent-work-card-time" dateTime={item.updatedAt}>
          {formatChiefTimestamp(item.updatedAt)}
        </time>
      </footer>
    </article>
  );
}
