import { useMemo } from "react";
import { ApprovalSectionHeader, ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";
import { AGENT_WORK_ITEMS, AGENT_WORK_STATUS_CONFIG } from "./agentWorkBoardMock";
import { formatChiefTimestamp } from "./chiefMock";
import {
  deriveAgentAwaitingApprovalWorkItems,
  deriveBuildAgentWorkItems,
  deriveLibrarianAgentWorkItems,
  derivePlannerAgentWorkItems,
  deriveResearchAgentWorkItems,
  deriveWorkflowGateAgentWorkItems,
} from "./chiefLiveContext";
import { getApprovalUrgencyBadge, OVERDUE_HOURS } from "./chiefApprovalUrgency";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { useData } from "@/context/DataContext";
import { findLatestResearchSummaryByTitle, getLatestResearchSummary } from "@/lib/knowledge/latestResearchSource";
import { getResearchRequests } from "@/lib/research/requests";
import { getWorkStories } from "@/lib/chief/workStories";
import { useBuildTasks } from "./hooks/useBuildTasks";
import type { BuildGateTask } from "./hooks/useBuildTasks";
import { getPlannerChecklist } from "./plannerSuggestions";
import type { AgentWorkItem, AgentWorkStatus, ApprovalProposal } from "./types";
import type { TaskPriority } from "@/types";
import type { ResearchRequest } from "@/lib/research/requests";
import type { WorkStoryDefinition } from "@/lib/chief/workStories";

// Build-time read of knowledge/sources/ (see latestResearchSource.ts) — doesn't
// change per render, computed once when this module loads.
const LATEST_RESEARCH_SUMMARY = getLatestResearchSummary();

// Static example queue (see requests.ts) — manual, not agent-fulfilled.
const RESEARCH_REQUESTS = getResearchRequests();

// Reusable scenario config (see workStories.ts) — adding a scenario means adding
// an entry there, not touching this component's render logic.
const WORK_STORIES = getWorkStories();

const SPECIALIST_INITIALS: Record<AgentWorkItem["agent"], string> = {
  "Workflow Gate Agent": "WG",
  "Librarian Agent": "LB",
  "Research Agent": "RS",
  "Roadmap Agent": "RM",
  "Marketer Agent": "MK",
  "Build Agent": "BD",
  "Planner Agent": "PL",
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

/**
 * One scenario's story, rendered generically from a WorkStoryDefinition — the
 * only per-scenario logic is the lookups below (linked task, request, filed
 * note), everything else is the same for every story.
 */
function WorkStoryPanel({
  story,
  buildGateTasks,
  researchRequests,
}: {
  story: WorkStoryDefinition;
  buildGateTasks: BuildGateTask[];
  researchRequests: ResearchRequest[];
}) {
  const linkedTask = story.linkedTaskTitle
    ? buildGateTasks.find((task) => task.title === story.linkedTaskTitle)
    : undefined;
  const checklist = linkedTask ? getPlannerChecklist(linkedTask.pendingGates) : [];
  const request = researchRequests.find((candidate) => candidate.id === story.researchRequestId);
  const latestNote = findLatestResearchSummaryByTitle(story.noteMatchTitle);
  const isLive = Boolean(linkedTask);

  return (
    <section className="agent-work-story" aria-label={`Work story: ${story.title}`}>
      <div className="agent-work-story-header">
        <span className="agent-work-story-label">Work story: {story.title}</span>
        <span className={`badge ${isLive ? "badge-green" : "badge-steel"}`}>
          {isLive ? "Live" : "Structured"}
        </span>
      </div>
      <p className="agent-work-story-summary">{story.summary}</p>
      <ul className="agent-work-story-list">
        <li>
          <span className="agent-work-story-item-label">Chief (Board):</span>{" "}
          {linkedTask
            ? `${linkedTask.detail} — ${linkedTask.priorityReason}`
            : "No live Build gates task for this story yet."}
        </li>
        <li>
          <span className="agent-work-story-item-label">Planner checklist:</span>{" "}
          {checklist.length > 0
            ? checklist.join(" ")
            : linkedTask
              ? "No open gates."
              : "Not applicable — no live task to derive a checklist from."}
        </li>
        <li>
          <span className="agent-work-story-item-label">Research request:</span>{" "}
          {request ? request.topic : "Not queued."}
        </li>
        <li>
          <span className="agent-work-story-item-label">Latest filed research:</span>{" "}
          {latestNote
            ? `${latestNote.path} (${latestNote.createdDate})`
            : `Not filed yet — run npm run research:fulfill -- ${story.researchRequestId}.`}
        </li>
      </ul>
    </section>
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
  const plannerItems = useMemo(() => derivePlannerAgentWorkItems(data.tasks), [data.tasks]);
  const { buildGateTasks } = useBuildTasks();
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
      ...plannerItems,
      ...awaitingApprovalItems,
      ...AGENT_WORK_ITEMS,
    ],
    [buildItems, workflowGateItems, researchItems, librarianItems, plannerItems, awaitingApprovalItems],
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
        Librarian, Planner, and Awaiting approval rows marked{" "}
        <span className="badge badge-green">live</span> reflect real task/incident/artifact data
        or pending proposals from the shared Approvals queue; other agents are still mock for this
        slice. Read-only — no actions taken here.
      </p>

      {LATEST_RESEARCH_SUMMARY ? (
        <section className="agent-latest-research" aria-label="Latest research source">
          <span className="agent-latest-research-label">Latest research source</span>
          <p className="agent-latest-research-title">{LATEST_RESEARCH_SUMMARY.title}</p>
          {LATEST_RESEARCH_SUMMARY.summary ? (
            <p className="agent-latest-research-summary">{LATEST_RESEARCH_SUMMARY.summary}</p>
          ) : null}
          <p className="agent-latest-research-meta">
            {LATEST_RESEARCH_SUMMARY.createdDate} · {LATEST_RESEARCH_SUMMARY.path}
          </p>
        </section>
      ) : null}

      {RESEARCH_REQUESTS.length > 0 ? (
        <section className="agent-research-queue" aria-label="Research queue (manual)">
          <span className="agent-research-queue-label">Research queue (manual)</span>
          <p className="agent-research-queue-note">
            Chief-originated research requests waiting on a human or a future Research agent run
            — nothing here is auto-fulfilled or auto-filed.
          </p>
          <ul className="agent-research-queue-list">
            {RESEARCH_REQUESTS.map((request) => (
              <li key={request.id} className="agent-research-queue-item">
                <p className="agent-research-queue-topic">{request.topic}</p>
                <p className="agent-research-queue-why">{request.whyItMatters}</p>
                <time className="agent-research-queue-time" dateTime={request.createdAt}>
                  {formatChiefTimestamp(request.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {WORK_STORIES.map((story) => (
        <WorkStoryPanel
          key={story.id}
          story={story}
          buildGateTasks={buildGateTasks}
          researchRequests={RESEARCH_REQUESTS}
        />
      ))}

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
