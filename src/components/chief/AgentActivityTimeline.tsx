import { useMemo, useState } from "react";
import { ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";
import { deriveAgentActivityTimeline, recentActivityForAgent, type AgentActivityItem, type AgentActivityType } from "./agentActivityFeed";
import { formatChiefTimestamp } from "./chiefMock";
import { useLibrarianWorkItems } from "@/hooks/useLibrarianWorkItems";
import { usePlannerWorkItems } from "@/hooks/usePlannerWorkItems";
import { useData } from "@/context/DataContext";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { AgentDetailDrawer } from "./AgentDetailDrawer";
import { combineAgentWorkItems } from "./agentWorkItems";
import { AGENT_DIRECTORY } from "./agentWorkBoardMock";
import { resolveOpenAgentEntry } from "./agentWorkPresentation";
import type { AgentWorkAgentName, ApprovalProposal } from "./types";

/** The five agents this timeline covers — matches the Agents-tab roster minus Workflow Gate/Research. */
const FILTER_AGENTS: AgentWorkAgentName[] = [
  "Roadmap Agent",
  "Build Agent",
  "Librarian Agent",
  "Competitive Research Agent",
  "Marketer Agent",
];

const AGENT_INITIALS: Record<AgentWorkAgentName, string> = {
  "Workflow Gate Agent": "WG",
  "Librarian Agent": "LB",
  "Research Agent": "RS",
  "Roadmap Agent": "RM",
  "Marketer Agent": "MK",
  "Build Agent": "BD",
  "Competitive Research Agent": "CR",
};

const ACTIVITY_LABEL: Record<AgentActivityType, string> = {
  created: "Created",
  queued: "Queued",
  active: "Started",
  blocked: "Blocked",
  awaiting_approval: "Awaiting approval",
  completed: "Completed",
};

const ACTIVITY_BADGE_VARIANT: Record<AgentActivityType, "steel" | "blue" | "yellow" | "green"> = {
  created: "steel",
  queued: "steel",
  active: "blue",
  blocked: "yellow",
  awaiting_approval: "yellow",
  completed: "green",
};

function formatDayHeader(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

interface DayGroup {
  dayKey: string;
  label: string;
  items: AgentActivityItem[];
}

function groupByDay(items: AgentActivityItem[]): DayGroup[] {
  const groups = new Map<string, AgentActivityItem[]>();
  for (const item of items) {
    const key = new Date(item.timestamp).toDateString();
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return Array.from(groups.entries()).map(([key, groupItems]) => ({
    dayKey: key,
    label: formatDayHeader(groupItems[0].timestamp),
    items: groupItems,
  }));
}

/** Also reused (read-only, no onOpenDetail) by AgentDetailDrawer's "Recent activity" list. */
export function AgentActivityCard({
  item,
  onOpenDetail,
}: {
  item: AgentActivityItem;
  onOpenDetail?: (agent: AgentWorkAgentName) => void;
}) {
  return (
    <article className="chief-audit-card">
      <header className="chief-audit-card-header">
        {onOpenDetail ? (
          <button
            type="button"
            className="agent-work-card-agent agent-work-card-agent--clickable"
            onClick={() => onOpenDetail(item.agent)}
            title={`View ${item.agent} details`}
          >
            <span className="agent-work-card-avatar" aria-hidden="true">
              {AGENT_INITIALS[item.agent]}
            </span>
            <span className="agent-work-card-agent-name">{item.agent}</span>
          </button>
        ) : (
          <span className="agent-work-card-agent">
            <span className="agent-work-card-avatar" aria-hidden="true">
              {AGENT_INITIALS[item.agent]}
            </span>
            <span className="agent-work-card-agent-name">{item.agent}</span>
          </span>
        )}
        <time className="chief-audit-card-time" dateTime={item.timestamp}>
          {formatChiefTimestamp(item.timestamp)}
        </time>
      </header>
      <p className="chief-audit-card-target">{item.description}</p>
      <span className="agent-work-card-badges">
        <span className={`badge badge-${ACTIVITY_BADGE_VARIANT[item.activityType]}`}>
          {ACTIVITY_LABEL[item.activityType]}
        </span>
        {item.source === "mock" ? <span className="badge badge-steel">mock</span> : null}
      </span>
    </article>
  );
}

export function AgentActivityTimeline() {
  const { data } = useData();
  const { approvals, navigation } = useChiefApprovals();
  const { items: plannerWorkItems } = usePlannerWorkItems();
  const { items: librarianWorkItems } = useLibrarianWorkItems();

  const allActivity = useMemo(
    () =>
      deriveAgentActivityTimeline({
        tasks: data.tasks,
        plannerWorkItems,
        librarianWorkItems,
      }),
    [data.tasks, plannerWorkItems, librarianWorkItems],
  );

  const workItems = useMemo(
    () =>
      combineAgentWorkItems({
        tasks: data.tasks,
        incidents: data.incidents,
        plannerWorkItems,
        librarianWorkItems,
        approvals,
      }),
    [data.tasks, data.incidents, plannerWorkItems, librarianWorkItems, approvals],
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

  const handleReviewInApprovals = (proposalId: string) => {
    navigation?.openApprovals({ filter: "pending", focusProposalId: proposalId });
  };

  const [selectedAgents, setSelectedAgents] = useState<Set<AgentWorkAgentName>>(
    () => new Set(FILTER_AGENTS),
  );
  const [openAgent, setOpenAgent] = useState<AgentWorkAgentName | null>(null);

  const toggleAgent = (agent: AgentWorkAgentName) => {
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

  const visibleActivity = useMemo(
    () => allActivity.filter((item) => selectedAgents.has(item.agent)),
    [allActivity, selectedAgents],
  );

  const groups = useMemo(() => groupByDay(visibleActivity), [visibleActivity]);

  const openAgentEntry = resolveOpenAgentEntry(openAgent, AGENT_DIRECTORY);
  const openAgentIsFilteredOut = openAgent ? !selectedAgents.has(openAgent) : false;

  if (allActivity.length === 0) {
    return (
      <ApprovalSectionShell className="agent-activity-timeline" title="Agent activity timeline">
        <ApprovalSurfaceEmpty
          variant="audit"
          lead="No agent activity yet"
          description="Activity will appear here as agents create, queue, and complete work."
        />
      </ApprovalSectionShell>
    );
  }

  return (
    <>
      <ApprovalSectionShell
        className="agent-activity-timeline"
        title="Agent activity timeline"
        count={`${visibleActivity.length} of ${allActivity.length} event${allActivity.length === 1 ? "" : "s"}`}
      >
        <p className="agent-work-board-note">
          Chronological feed across every agent, newest first. Click an agent's name or avatar to
          open its detail view. Entries marked <span className="badge badge-steel">mock</span>{" "}
          (Marketer, Competitive Research) are local-only; everything else reflects real task and
          work-item data. Read-only.
        </p>

        <div className="agent-overview-filters" role="group" aria-label="Filter timeline by agent">
          {FILTER_AGENTS.map((agent) => (
            <button
              key={agent}
              type="button"
              className={`stage-pill${selectedAgents.has(agent) ? " active" : ""}`}
              aria-pressed={selectedAgents.has(agent)}
              onClick={() => toggleAgent(agent)}
            >
              {agent}
            </button>
          ))}
        </div>

        {visibleActivity.length === 0 ? (
          <p className="agent-work-lane-empty">No activity matches the current filter.</p>
        ) : (
          groups.map((group) => (
            <section key={group.dayKey} className="agent-activity-day-group">
              <h3 className="agent-activity-day-header">{group.label}</h3>
              <ol className="chief-audit-list">
                {group.items.map((item) => (
                  <li key={item.id} className="chief-audit-item">
                    <div className="chief-audit-item-marker" aria-hidden="true" />
                    <AgentActivityCard item={item} onOpenDetail={setOpenAgent} />
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </ApprovalSectionShell>

      {openAgentEntry ? (
        <AgentDetailDrawer
          entry={openAgentEntry}
          items={workItems.filter((item) => item.agent === openAgentEntry.agent)}
          activity={recentActivityForAgent(allActivity, openAgentEntry.agent)}
          isFilteredOut={openAgentIsFilteredOut}
          proposalByAwaitingWorkId={proposalByAwaitingWorkId}
          onReviewInApprovals={handleReviewInApprovals}
          onClose={() => setOpenAgent(null)}
        />
      ) : null}
    </>
  );
}
