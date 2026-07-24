import { useData } from "@/context/DataContext";
import { isLiveApiEnabled } from "@/lib/api/client";
import { useMonitorHealth } from "@/hooks/useMonitorHealth";
import { useProjectSummaryHandoffMissions } from "@/hooks/useProjectSummaryHandoffMissions";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { deriveLibrarianAgentWorkItems } from "./chiefLiveContext";
import { useBuildTasks } from "./hooks/useBuildTasks";
import { BUILD_AGENT_TEST_PROPOSAL_ID } from "./buildAgentTestProposal";
import {
  agentStripHealthClass,
  deriveAgentStatusStrip,
  type AgentStripRow,
} from "./agentStatusStrip";

export function AgentStatusStrip() {
  const liveApi = isLiveApiEnabled();
  const { loading: dataLoading, error: dataError, refresh: refreshData } = useData();
  const { chiefData, approvals } = useChiefApprovals();
  const {
    missions,
    loading: missionsLoading,
    error: handoffError,
    refresh: refreshMissions,
  } = useProjectSummaryHandoffMissions(15_000);
  const platformHealth = useMonitorHealth();
  const { buildGateTasks } = useBuildTasks();

  const librarianItems = deriveLibrarianAgentWorkItems(chiefData.tasks, chiefData.notes);
  const pendingBuildApprovals = approvals.filter(
    (proposal) =>
      proposal.status === "pending" &&
      (proposal.source === "agent_build" || proposal.id === BUILD_AGENT_TEST_PROPOSAL_ID),
  ).length;

  const rows = deriveAgentStatusStrip({
    liveApi,
    handoffMissions: missions,
    handoffMissionsError: handoffError,
    buildGateTaskCount: buildGateTasks.length,
    pendingBuildApprovals,
    librarianItems,
    platformHealth,
  });

  const showSkeleton = liveApi && dataLoading && !dataError;
  const stripError = dataError ?? handoffError;

  return (
    <section className="agent-status-strip" aria-label="Agent status">
      <header className="agent-status-strip-header">
        <h3 className="agent-status-strip-title">Agent status</h3>
        <p className="agent-status-strip-subtitle">
          Live-derived from handoff missions, build gates, librarian filing signals, and Monitor
          probes.
        </p>
      </header>

      {stripError ? (
        <div className="agent-work-board-banner agent-work-board-banner--warn" role="status">
          <p className="agent-work-board-banner-lead">Status may be incomplete</p>
          <p className="agent-work-board-banner-detail">{stripError}</p>
          <button
            type="button"
            className="chief-ops-status-retry"
            onClick={() => {
              void refreshData();
              void refreshMissions();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {showSkeleton && missionsLoading ? (
        <p className="agent-status-strip-loading" role="status">
          Loading agent status…
        </p>
      ) : null}

      <ul className="agent-status-strip-list">
        {rows.map((row) => (
          <AgentStatusStripRow key={row.agent} row={row} />
        ))}
      </ul>
    </section>
  );
}

function AgentStatusStripRow({ row }: { row: AgentStripRow }) {
  return (
    <li className={`agent-status-strip-row ${agentStripHealthClass(row.health)}`}>
      <div className="agent-status-strip-row-header">
        <span className="agent-status-strip-agent">{row.agent}</span>
        <span className="agent-status-strip-label">{row.label}</span>
      </div>
      <p className="agent-status-strip-detail">{row.detail}</p>
    </li>
  );
}
