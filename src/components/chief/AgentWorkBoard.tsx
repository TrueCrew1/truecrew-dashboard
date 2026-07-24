import { useCallback, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { isLiveApiEnabled } from "@/lib/api/client";
import { ApprovalSectionHeader, ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";
import { AGENT_WORK_ITEMS, AGENT_WORK_STATUS_CONFIG } from "./agentWorkBoardMock";
import { formatChiefTimestamp } from "./chiefMock";
import {
  deriveAgentAwaitingApprovalWorkItems,
  deriveBuildAgentWorkItems,
  deriveLibrarianAgentWorkItems,
  deriveProjectSummaryHandoffWorkItems,
  deriveResearchAgentWorkItems,
  deriveRoadmapAgentWorkItems,
  deriveWorkflowGateAgentWorkItems,
} from "./chiefLiveContext";
import { getApprovalUrgencyBadge, OVERDUE_HOURS } from "./chiefApprovalUrgency";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { useChiefContext } from "@/context/ChiefContextProvider";
import { useProjectSummaryHandoffMissions } from "@/hooks/useProjectSummaryHandoffMissions";
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
          {item.source === "live" ? <span className="badge badge-green">live</span> : null}
          {item.source !== "live" ? <span className="badge badge-steel">mock</span> : null}
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

function AgentWorkBoardSkeleton() {
  return (
    <div className="agent-work-board-skeleton" aria-hidden="true">
      {AGENT_WORK_STATUS_CONFIG.map((lane) => (
        <div key={lane.status} className="agent-work-lane agent-work-lane--skeleton">
          <div className="agent-work-skeleton-line agent-work-skeleton-line--title" />
          <div className="agent-work-skeleton-line" />
          <div className="agent-work-skeleton-line agent-work-skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}

export function AgentWorkBoard() {
  const liveApi = isLiveApiEnabled();
  const { loading: dataLoading, error: dataError, refresh: refreshData } = useData();
  const { chiefData, approvals } = useChiefApprovals();
  const { activeContext } = useChiefContext();
  const {
    missions: handoffMissions,
    error: missionsError,
    refresh: refreshMissions,
  } = useProjectSummaryHandoffMissions();

  const scopedHandoffMissions = useMemo(() => {
    if (activeContext === "global") return handoffMissions;
    const workflowIds = new Set(chiefData.workflows.map((workflow) => workflow.id));
    return handoffMissions.filter((mission) => workflowIds.has(mission.projectId));
  }, [handoffMissions, activeContext, chiefData.workflows]);

  const buildItems = useMemo(() => deriveBuildAgentWorkItems(chiefData.tasks), [chiefData.tasks]);
  const workflowGateItems = useMemo(
    () => deriveWorkflowGateAgentWorkItems(chiefData.tasks),
    [chiefData.tasks],
  );
  const roadmapItems = useMemo(
    () => deriveRoadmapAgentWorkItems(chiefData.tasks),
    [chiefData.tasks],
  );
  const researchItems = useMemo(
    () => deriveResearchAgentWorkItems(chiefData.incidents),
    [chiefData.incidents],
  );
  const handoffItems = useMemo(
    () => deriveProjectSummaryHandoffWorkItems(scopedHandoffMissions),
    [scopedHandoffMissions],
  );
  const librarianItems = useMemo(
    () => deriveLibrarianAgentWorkItems(chiefData.tasks, chiefData.notes),
    [chiefData.tasks, chiefData.notes],
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

  // Marketer mock rows only: Roadmap is live-derived. Drop mocks in live API
  // mode and outside the global context.
  const mockAgentItems = useMemo(() => {
    if (liveApi || activeContext !== "global") return [];
    return AGENT_WORK_ITEMS;
  }, [liveApi, activeContext]);

  const items = useMemo(
    () => [
      ...buildItems,
      ...workflowGateItems,
      ...roadmapItems,
      ...researchItems,
      ...handoffItems,
      ...librarianItems,
      ...awaitingApprovalItems,
      ...mockAgentItems,
    ],
    [
      buildItems,
      workflowGateItems,
      roadmapItems,
      researchItems,
      handoffItems,
      librarianItems,
      awaitingApprovalItems,
      mockAgentItems,
    ],
  );

  const showLoadingSkeleton = liveApi && dataLoading && !dataError;
  const degraded =
    Boolean(dataError) || (liveApi && Boolean(missionsError) && items.length > 0);
  const hardError = Boolean(dataError) && items.length === 0 && !dataLoading;

  const handleRetry = useCallback(() => {
    void refreshData();
    void refreshMissions();
  }, [refreshData, refreshMissions]);

  if (showLoadingSkeleton) {
    return (
      <ApprovalSectionShell className="agent-work-board" title="Agent work board">
        <p className="agent-work-board-note" role="status">
          Loading agent status…
        </p>
        <AgentWorkBoardSkeleton />
      </ApprovalSectionShell>
    );
  }

  if (hardError) {
    return (
      <ApprovalSectionShell className="agent-work-board">
        <ApprovalSectionHeader title="Agent work board" />
        <div className="agent-work-board-banner agent-work-board-banner--error" role="alert">
          <p className="agent-work-board-banner-lead">Could not load agent data</p>
          <p className="agent-work-board-banner-detail">{dataError}</p>
          <button type="button" className="chief-ops-status-retry" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </ApprovalSectionShell>
    );
  }

  if (items.length === 0) {
    return (
      <ApprovalSectionShell className="agent-work-board">
        <ApprovalSectionHeader title="Agent work board" />
        {missionsError ? (
          <div className="agent-work-board-banner agent-work-board-banner--warn" role="status">
            <p className="agent-work-board-banner-lead">Handoff missions unavailable</p>
            <p className="agent-work-board-banner-detail">{missionsError}</p>
            <button type="button" className="chief-ops-status-retry" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : null}
        <ApprovalSurfaceEmpty
          lead="No agents yet in this workspace"
          description={
            activeContext === "global"
              ? "Queued, active, blocked, awaiting-approval, and completed work will appear here once agents pick up tasks or incidents."
              : "No agent work is scoped to this context yet. Switch to Global, or add tasks/workflows for this workspace."
          }
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
      {degraded ? (
        <div className="agent-work-board-banner agent-work-board-banner--warn" role="status">
          <p className="agent-work-board-banner-lead">Partial agent status</p>
          <p className="agent-work-board-banner-detail">
            {[dataError, missionsError].filter(Boolean).join(" · ")} Showing the latest data that
            loaded.
          </p>
          <button type="button" className="chief-ops-status-retry" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : null}

      <p className="agent-work-board-note">
        Live snapshot of what each agent is carrying. Rows marked{" "}
        <span className="badge badge-green">live</span> come from tasks, incidents, artifacts,
        handoff missions, or pending Approvals
        {mockAgentItems.length > 0 ? (
          <>
            ; <span className="badge badge-steel">mock</span> rows are demo-only (Marketer)
          </>
        ) : null}
        . Updates about every 30s in live mode. Read-only — no actions taken here.
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
