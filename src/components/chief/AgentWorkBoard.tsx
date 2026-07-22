import { useMemo } from "react";
import { ApprovalSectionHeader, ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";
import { AGENT_WORK_ITEMS, AGENT_WORK_STATUS_CONFIG } from "./agentWorkBoardMock";
import { formatChiefTimestamp } from "./chiefMock";
import {
  deriveAgentAwaitingApprovalWorkItems,
  deriveBuildAgentWorkItems,
  deriveLibrarianAgentWorkItems,
  deriveResearchAgentWorkItems,
  deriveWorkflowGateAgentWorkItems,
} from "./chiefApprovalBoard";
import { getApprovalUrgencyBadge, OVERDUE_HOURS } from "./chiefApprovalUrgency";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { useData } from "@/context/DataContext";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import { ResearchQueuePanel } from "@/components/research/ResearchQueuePanel";
import { useBuildTasks } from "./hooks/useBuildTasks";
import type { BuildGateTask } from "./hooks/useBuildTasks";
import {
  findLatestResearchSummaryByTitle,
  findLatestResearchSummaryByWorkStoryId,
  getAllResearchSummaries,
  getLatestResearchSummary,
} from "@/lib/knowledge/latestResearchSource";
import type { ResearchRequest } from "@/lib/research/types";
import { getWorkStories } from "@/lib/chief/workStories";
import type { WorkStoryDefinition } from "@/lib/chief/workStories";
import type { AgentWorkItem, AgentWorkStatus, ApprovalProposal } from "./types";
import type { TaskPriority } from "@/types";

// Build-time read of knowledge/sources/ (see latestResearchSource.ts) and the
// static manual queue (see requests.ts) — neither changes per render.
const LATEST_RESEARCH_SUMMARY = getLatestResearchSummary();
const HAS_FILED_RESEARCH = getAllResearchSummaries().length > 0;

// Reusable Work Story scenarios (see workStories.ts) — adding a scenario means
// adding an entry there, not touching this component's render logic.
const WORK_STORIES = getWorkStories();

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
  dataSource,
}: {
  item: AgentWorkItem;
  proposal?: ApprovalProposal;
  dataSource: "mock" | "supabase" | "mock-fallback";
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
            dataSource === "supabase" ? (
              <span className="badge badge-green">live</span>
            ) : (
              <span className="badge badge-steel">mock rail</span>
            )
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

/**
 * One Work Story, rendered generically from a WorkStoryDefinition — the only
 * per-scenario logic is the lookups below (linked task, request, filed note);
 * everything else is identical for every story. "Live" vs "Structured" reflects
 * whether a real Build task backs this story yet, not wishful status.
 */
function WorkStoryPanel({
  story,
  buildGateTasks,
  buildGateTasksLoading,
  researchRequests,
}: {
  story: WorkStoryDefinition;
  buildGateTasks: BuildGateTask[];
  buildGateTasksLoading: boolean;
  researchRequests: ResearchRequest[];
}) {
  const linkedTask = story.linkedTaskTitle
    ? buildGateTasks.find((task) => task.title === story.linkedTaskTitle)
    : undefined;
  const request = researchRequests.find((candidate) => candidate.id === story.researchRequestId);
  // Stable id-based resolution first; title match is only a compatibility
  // fallback for notes filed before work_story_id existed.
  const latestNote =
    findLatestResearchSummaryByWorkStoryId(story.id) ?? findLatestResearchSummaryByTitle(story.noteMatchTitle);
  const isLive = Boolean(linkedTask);

  return (
    <section className="agent-work-story" aria-label={`Work story: ${story.title}`}>
      <div className="agent-work-story-header">
        <span className="agent-work-story-label">Work story: {story.title}</span>
        {/* Same isLoading source and honesty rule as ChiefBoard's Build gates lane
            (useBuildTasks) — don't assert Live/Structured off placeholder data. */}
        <span className={`badge ${isLive ? "badge-green" : "badge-steel"}`}>
          {story.linkedTaskTitle && buildGateTasksLoading ? "Checking…" : isLive ? "Live" : "Structured"}
        </span>
      </div>
      <p className="agent-work-story-summary">{story.summary}</p>
      <ul className="agent-work-story-list">
        <li>
          <span className="agent-work-story-item-label">Planner:</span>{" "}
          {story.linkedTaskTitle && buildGateTasksLoading
            ? "Checking Planner status…"
            : linkedTask
              ? linkedTask.plannerChecklist.join(" ")
              : "No Planner checklist yet — no live Build task backs this story."}
        </li>
        <li>
          <span className="agent-work-story-item-label">Research request:</span>{" "}
          {request ? request.topic : "Not queued."}
        </li>
        <li>
          <span className="agent-work-story-item-label">Latest filed research:</span>{" "}
          {latestNote
            ? `${latestNote.title} — updated ${latestNote.createdDate} (${latestNote.path})`
            : request
              ? "Queued, but no research note filed yet."
              : "Not filed yet."}
        </li>
      </ul>
    </section>
  );
}

type LaneActivityStatus = "active" | "idle" | "loading";

function AgentActivityStatusRow({
  plannerStatus,
  researchStatus,
  librarianStatus,
}: {
  plannerStatus: LaneActivityStatus;
  researchStatus: LaneActivityStatus;
  librarianStatus: LaneActivityStatus;
}) {
  const lanes: Array<{ label: string; status: LaneActivityStatus }> = [
    { label: "Planner", status: plannerStatus },
    { label: "Research", status: researchStatus },
    { label: "Librarian", status: librarianStatus },
  ];

  return (
    <ul className="agent-activity-status-row" aria-label="Agent lane status">
      {lanes.map((lane) => (
        <li key={lane.label} className="agent-activity-status-item">
          <span className="agent-activity-status-label">{lane.label}</span>
          <span className={`badge ${lane.status === "active" ? "badge-green" : "badge-steel"}`}>
            {lane.status === "active" ? "Active" : lane.status === "loading" ? "Loading…" : "Idle"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AgentWorkBoard() {
  const { data, source } = useData();
  const { approvals } = useChiefApprovals();
  const { allRequests: researchRequests } = useResearchRequests();
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
  // Same useData()-backed loading flag ChiefBoard's Build gates lane already
  // guards on for this exact hook — Planner/Librarian below derive from the
  // same underlying task/note data, so they share the same "don't assert a
  // status off placeholder data" rule.
  const { buildGateTasks, isLoading: buildGateTasksLoading } = useBuildTasks();
  const anyWorkStoryHasLiveTask = WORK_STORIES.some(
    (story) => story.linkedTaskTitle && buildGateTasks.some((task) => task.title === story.linkedTaskTitle),
  );
  const plannerLaneStatus: LaneActivityStatus = buildGateTasksLoading
    ? "loading"
    : anyWorkStoryHasLiveTask
      ? "active"
      : "idle";
  const researchLaneStatus: LaneActivityStatus =
    researchRequests.length > 0 || HAS_FILED_RESEARCH ? "active" : "idle";
  const librarianLaneStatus: LaneActivityStatus = buildGateTasksLoading
    ? "loading"
    : librarianItems.length > 0
      ? "active"
      : "idle";
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
      ...awaitingApprovalItems,
      ...AGENT_WORK_ITEMS,
    ],
    [buildItems, workflowGateItems, researchItems, librarianItems, awaitingApprovalItems],
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
        Snapshot of what each agent is carrying right now. Rows marked{" "}
        <span className="badge badge-green">live</span> use the Supabase data rail;{" "}
        <span className="badge badge-steel">mock rail</span> means derived from the current mock
        dataset; <span className="badge badge-steel">mock</span> rows are static placeholders.
        Read-only — no actions taken here.
      </p>

      <section className="agent-activity-panel" aria-label="Agent activity">
        <div className="agent-activity-panel-header">
          <span className="agent-activity-panel-label">Agent activity</span>
          <AgentActivityStatusRow
            plannerStatus={plannerLaneStatus}
            researchStatus={researchLaneStatus}
            librarianStatus={librarianLaneStatus}
          />
        </div>

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

        <ResearchQueuePanel />

        {WORK_STORIES.map((story) => (
          <WorkStoryPanel
            key={story.id}
            story={story}
            buildGateTasks={buildGateTasks}
            buildGateTasksLoading={buildGateTasksLoading}
            researchRequests={researchRequests}
          />
        ))}
      </section>

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
                        dataSource={source}
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
