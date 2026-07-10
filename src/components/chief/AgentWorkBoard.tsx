import { useMemo } from "react";
import { ApprovalSectionHeader, ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";
import { AGENT_WORK_ITEMS, AGENT_WORK_STATUS_CONFIG } from "./agentWorkBoardMock";
import { formatChiefTimestamp } from "./chiefMock";
import {
  deriveAgentAwaitingApprovalWorkItems,
  deriveBuildAgentWorkItems,
  deriveLibrarianAgentWorkItems,
  deriveResearchAgentWorkItems,
  deriveRoadmapAgentWorkItems,
  deriveWorkflowGateAgentWorkItems,
} from "./chiefLiveContext";
import { getApprovalUrgencyBadge, OVERDUE_HOURS } from "./chiefApprovalUrgency";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { useData } from "@/context/DataContext";
import type { AgentWorkItem, AgentWorkStatus, ApprovalProposal } from "./types";
import type { TaskPriority } from "@/types";

const SPECIALIST_INITIALS: Record<AgentWorkItem["agent"], string> = {
  "Workflow Gate Agent": "WG",
  "Librarian Agent": "LB",
  "Research Agent": "RS",
  "Roadmap Agent": "RM",
  "Marketer Agent": "MK",
  "Build Agent": "BD",
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

function itemsForStatus(items: AgentWorkItem[], status: AgentWorkStatus): AgentWorkItem[] {
  return items.filter((item) => item.status === status);
}

function AgentWorkCard({
  item,
  proposal,
}: {
  item: AgentWorkItem;
  proposal?: ApprovalProposal;
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
          {item.source === "live" ? (
            <span className="badge badge-green">live</span>
          ) : (
            <span className="badge badge-steel">mock</span>
          )}
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
      <footer className="agent-work-card-footer">
        <time className="agent-work-card-time" dateTime={item.updatedAt}>
          {formatChiefTimestamp(item.updatedAt)}
        </time>
      </footer>
    </article>
  );
}

export function AgentWorkBoard() {
  const { data } = useData();
  const { approvals } = useChiefApprovals();
  const buildItems = useMemo(() => deriveBuildAgentWorkItems(data.tasks), [data.tasks]);
  const workflowGateItems = useMemo(
    () => deriveWorkflowGateAgentWorkItems(data.tasks),
    [data.tasks],
  );
  const researchItems = useMemo(
    () => deriveResearchAgentWorkItems(data.incidents),
    [data.incidents],
  );
  const librarianItems = useMemo(
    () => deriveLibrarianAgentWorkItems(data.tasks, data.notes),
    [data.tasks, data.notes],
  );
  const roadmapItems = useMemo(
    () => deriveRoadmapAgentWorkItems(data.tasks),
    [data.tasks],
  );
  const awaitingApprovalItems = useMemo(
    () => deriveAgentAwaitingApprovalWorkItems(approvals),
    [approvals],
  );
  const proposalByAwaitingWorkId = useMemo(() => {
    const map = new Map<string, ApprovalProposal>();
    for (const proposal of approvals) {
      if (proposal.status === "pending") {
        map.set(`agentwork-awaiting-${proposal.id}`, proposal);
      }
    }
    return map;
  }, [approvals]);
  const items = useMemo(
    () => [
      ...buildItems,
      ...workflowGateItems,
      ...researchItems,
      ...librarianItems,
      ...roadmapItems,
      ...awaitingApprovalItems,
      ...AGENT_WORK_ITEMS,
    ],
    [
      buildItems,
      workflowGateItems,
      researchItems,
      librarianItems,
      roadmapItems,
      awaitingApprovalItems,
    ],
  );

  if (items.length === 0) {
    return (
      <ApprovalSectionShell className="agent-work-board">
        <ApprovalSectionHeader title="Agent work board" />
        <ApprovalSurfaceEmpty
          lead="No agent work tracked"
          description="Queued, active, blocked, awaiting-approval, and completed work will appear here once agents pick up tasks."
        />
      </ApprovalSectionShell>
    );
  }

  return (
    <ApprovalSectionShell
      className="agent-work-board"
      title="Agent work board"
      count={`${items.length} item${items.length === 1 ? "" : "s"}`}
    >
      <p className="agent-work-board-note">
        Snapshot of what each agent is carrying right now. Build, Workflow Gate, Research,
        Librarian, Roadmap, and Awaiting approval rows marked{" "}
        <span className="badge badge-green">live</span> reflect real task/incident/artifact data
        or pending proposals from the shared Approvals queue; Marketer is still mock for this
        slice. Read-only — no actions taken here.
      </p>

      <div className="agent-work-lanes">
        {AGENT_WORK_STATUS_CONFIG.map((laneConfig) => {
          const laneItems = itemsForStatus(items, laneConfig.status);
          const isAwaitingLane = laneConfig.status === "awaiting_approval";
          const awaitingOverdueCount = isAwaitingLane
            ? laneItems.filter((item) => {
                const linked = proposalByAwaitingWorkId.get(item.id);
                return linked ? getApprovalUrgencyBadge(linked)?.escalate : false;
              }).length
            : 0;

          return (
            <section
              key={laneConfig.status}
              className="agent-work-lane"
              aria-label={laneConfig.label}
            >
              <header className="agent-work-lane-header">
                <h3 className="agent-work-lane-title">{laneConfig.label}</h3>
                <span className="agent-work-lane-count">{laneItems.length}</span>
              </header>

              {isAwaitingLane && awaitingOverdueCount > 0 ? (
                <p className="chief-board-lane-note chief-board-lane-note--escalate">
                  {awaitingOverdueCount} of {laneItems.length} awaiting operator decisions are
                  overdue — review on the Approvals tab.
                </p>
              ) : null}

              {laneItems.length === 0 ? (
                <p className="agent-work-lane-empty">{laneConfig.emptyMessage}</p>
              ) : (
                <ul className="agent-work-list">
                  {laneItems.map((item) => (
                    <li key={item.id}>
                      <AgentWorkCard
                        item={item}
                        proposal={
                          isAwaitingLane ? proposalByAwaitingWorkId.get(item.id) : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </ApprovalSectionShell>
  );
}
