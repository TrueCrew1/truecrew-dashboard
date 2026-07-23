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
  const { chiefData, approvals } = useChiefApprovals();
  const { missions, error: handoffError } = useProjectSummaryHandoffMissions(null);
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

  return (
    <section className="agent-status-strip" aria-label="Agent status">
      <header className="agent-status-strip-header">
        <h3 className="agent-status-strip-title">Agent status</h3>
        <p className="agent-status-strip-subtitle">
          Live-derived from handoff missions, repo gates, librarian filing signals, and Monitor
          probes.
        </p>
      </header>
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
