import { useMemo, useState } from "react";
import { ApprovalSectionHeader, ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";
import {
  AGENT_DIRECTORY,
  type AgentDirectoryEntry,
} from "./agentWorkBoardMock";
import { deriveAgentAwaitingApprovalWorkItems } from "./chiefLiveContext";
import { recentActivityForAgent } from "./agentActivityFeed";
import { useAgentWorkData } from "@/hooks/useAgentWorkData";
import { getApprovalUrgencyBadge } from "./chiefApprovalUrgency";
import { AgentDetailDrawer } from "./AgentDetailDrawer";
import {
  AgentWorkCard,
  LivenessBadge,
  SPECIALIST_INITIALS,
  classifyAgentLiveness,
  resolveOpenAgentEntry,
  sortByStatusThenRecency,
  summarizeStatusCounts,
} from "./agentWorkPresentation";
import type { AgentWorkAgentName, AgentWorkItem, ApprovalProposal } from "./types";

type LiveFilter = "all" | "live" | "mock";

function AgentOverviewPill({
  entry,
  items,
  selected,
  onToggleVisibility,
  onOpenDetail,
}: {
  entry: AgentDirectoryEntry;
  items: AgentWorkItem[];
  selected: boolean;
  onToggleVisibility: () => void;
  onOpenDetail: () => void;
}) {
  const liveness = classifyAgentLiveness(items, entry);

  return (
    <div className={`stage-pill agent-overview-pill${selected ? " active" : ""}`}>
      <label className="agent-overview-pill-visibility" title={`Show or hide the ${entry.agent} lane`}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleVisibility}
          aria-label={`Show ${entry.agent} lane`}
        />
      </label>
      <button
        type="button"
        className="agent-overview-pill-open"
        onClick={onOpenDetail}
        title={`View ${entry.agent} details`}
      >
        <span className="agent-work-card-avatar" aria-hidden="true">
          {SPECIALIST_INITIALS[entry.agent]}
        </span>
        <span className="agent-overview-pill-body">
          <span className="agent-overview-pill-name">{entry.agent}</span>
          <span className="agent-overview-pill-summary">{summarizeStatusCounts(items)}</span>
        </span>
        <LivenessBadge liveness={liveness} />
      </button>
    </div>
  );
}

function AgentLane({
  entry,
  items,
  proposalByAwaitingWorkId,
  onReviewInApprovals,
  onOpenDetail,
}: {
  entry: AgentDirectoryEntry;
  items: AgentWorkItem[];
  proposalByAwaitingWorkId: Map<string, ApprovalProposal>;
  onReviewInApprovals: (proposalId: string) => void;
  onOpenDetail: () => void;
}) {
  const liveness = classifyAgentLiveness(items, entry);
  const sortedItems = useMemo(() => sortByStatusThenRecency(items), [items]);

  return (
    <section className="agent-work-lane" aria-label={entry.agent}>
      <header className="agent-work-lane-header">
        <button
          type="button"
          className="agent-work-lane-heading"
          onClick={onOpenDetail}
          title={`View ${entry.agent} details`}
        >
          <span className="agent-work-card-avatar" aria-hidden="true">
            {SPECIALIST_INITIALS[entry.agent]}
          </span>
          <span className="agent-work-lane-heading-text">
            <h3 className="agent-work-lane-title">{entry.agent}</h3>
            <p className="agent-work-lane-description">{entry.description}</p>
          </span>
        </button>
        <div className="agent-work-lane-meta">
          <LivenessBadge liveness={liveness} />
          <span className="agent-work-lane-count">{items.length}</span>
        </div>
      </header>

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
    </section>
  );
}

const ALL_AGENT_NAMES = AGENT_DIRECTORY.map((entry) => entry.agent);

export function AgentWorkBoard() {
  const { items, activity, proposalByAwaitingWorkId, approvals, navigation } = useAgentWorkData();
  const awaitingApprovalItems = useMemo(
    () => deriveAgentAwaitingApprovalWorkItems(approvals),
    [approvals],
  );

  const itemsByAgent = useMemo(() => {
    const map = new Map<AgentWorkAgentName, AgentWorkItem[]>();
    for (const entry of AGENT_DIRECTORY) map.set(entry.agent, []);
    for (const item of items) {
      map.set(item.agent, [...(map.get(item.agent) ?? []), item]);
    }
    return map;
  }, [items]);

  const [selectedAgents, setSelectedAgents] = useState<Set<AgentWorkAgentName>>(
    () => new Set(ALL_AGENT_NAMES),
  );
  const [liveFilter, setLiveFilter] = useState<LiveFilter>("all");
  const [openAgent, setOpenAgent] = useState<AgentWorkAgentName | null>(null);

  const toggleAgentVisibility = (agent: AgentWorkAgentName) => {
    setLiveFilter("all");
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agent)) {
        next.delete(agent);
      } else {
        next.add(agent);
      }
      return next;
    });
  };

  const applyLiveFilter = (filter: LiveFilter) => {
    setLiveFilter(filter);
    if (filter === "all") {
      setSelectedAgents(new Set(ALL_AGENT_NAMES));
      return;
    }
    setSelectedAgents(
      new Set(
        AGENT_DIRECTORY.filter(
          (entry) => classifyAgentLiveness(itemsByAgent.get(entry.agent) ?? [], entry) === filter,
        ).map((entry) => entry.agent),
      ),
    );
  };

  const overdueAwaitingCount = useMemo(
    () =>
      awaitingApprovalItems.filter((item) => {
        const linked = proposalByAwaitingWorkId.get(item.id);
        return linked ? getApprovalUrgencyBadge(linked)?.escalate : false;
      }).length,
    [awaitingApprovalItems, proposalByAwaitingWorkId],
  );

  const handleReviewInApprovals = (proposalId: string) => {
    navigation?.openApprovals({ filter: "pending", focusProposalId: proposalId });
  };

  const handleOpenApprovalsFromEscalation = () => {
    navigation?.openApprovals({ filter: "pending" });
  };

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

  const visibleAgents = AGENT_DIRECTORY.filter((entry) => selectedAgents.has(entry.agent));
  const openAgentEntry = resolveOpenAgentEntry(openAgent, AGENT_DIRECTORY);
  const openAgentIsFilteredOut = openAgent ? !selectedAgents.has(openAgent) : false;

  return (
    <ApprovalSectionShell
      className="agent-work-board"
      title="Agent work board"
      count={`${items.length} item${items.length === 1 ? "" : "s"}`}
    >
      <p className="agent-work-board-note">
        One control tower for every agent. Rows marked <span className="badge badge-green">live</span>{" "}
        reflect real data or the shared Approvals queue; rows marked{" "}
        <span className="badge badge-steel">mock</span> are still local/mock for this slice. Click
        an agent's name or avatar to open its detail view. Read-only — no actions taken here.
      </p>

      {overdueAwaitingCount > 0 ? (
        <button
          type="button"
          className="chief-board-lane-note chief-board-lane-note--escalate chief-board-lane-note--link"
          onClick={handleOpenApprovalsFromEscalation}
        >
          {overdueAwaitingCount} proposal{overdueAwaitingCount === 1 ? "" : "s"} awaiting operator
          decision{overdueAwaitingCount === 1 ? " is" : "s are"} overdue — review on the Approvals
          tab.
        </button>
      ) : null}

      <div className="agent-overview-filters" role="group" aria-label="Filter agents by data source">
        {(["all", "live", "mock"] as LiveFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`stage-pill${liveFilter === filter ? " active" : ""}`}
            aria-pressed={liveFilter === filter}
            onClick={() => applyLiveFilter(filter)}
          >
            {filter === "all" ? "All agents" : filter === "live" ? "Live only" : "Mock only"}
          </button>
        ))}
      </div>

      <div className="agent-overview-row" role="group" aria-label="Toggle or open individual agents">
        {AGENT_DIRECTORY.map((entry) => (
          <AgentOverviewPill
            key={entry.agent}
            entry={entry}
            items={itemsByAgent.get(entry.agent) ?? []}
            selected={selectedAgents.has(entry.agent)}
            onToggleVisibility={() => toggleAgentVisibility(entry.agent)}
            onOpenDetail={() => setOpenAgent(entry.agent)}
          />
        ))}
      </div>

      <div className="agent-work-lanes">
        {visibleAgents.length === 0 ? (
          <p className="agent-work-lane-empty">No agents match the current filter.</p>
        ) : (
          visibleAgents.map((entry) => (
            <AgentLane
              key={entry.agent}
              entry={entry}
              items={itemsByAgent.get(entry.agent) ?? []}
              proposalByAwaitingWorkId={proposalByAwaitingWorkId}
              onReviewInApprovals={handleReviewInApprovals}
              onOpenDetail={() => setOpenAgent(entry.agent)}
            />
          ))
        )}
      </div>

      {openAgentEntry ? (
        <AgentDetailDrawer
          entry={openAgentEntry}
          items={itemsByAgent.get(openAgentEntry.agent) ?? []}
          activity={recentActivityForAgent(activity, openAgentEntry.agent)}
          isFilteredOut={openAgentIsFilteredOut}
          proposalByAwaitingWorkId={proposalByAwaitingWorkId}
          onReviewInApprovals={handleReviewInApprovals}
          onClose={() => setOpenAgent(null)}
        />
      ) : null}
    </ApprovalSectionShell>
  );
}
