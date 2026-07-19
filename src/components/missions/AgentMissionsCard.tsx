import { Link } from "react-router-dom";
import { Panel } from "@/components/ui";
import { formatChiefTimestamp } from "@/components/chief/chiefMock";
import { isLiveApiEnabled } from "@/lib/api/client";
import { useProjectSummaryHandoffMissions } from "@/hooks/useProjectSummaryHandoffMissions";
import {
  countHandoffMissionsByStatus,
  HANDOFF_MISSION_STATUSES,
  recentHandoffMissions,
} from "./projectSummaryHandoffSummary";

const RECENT_MISSION_LIMIT = 5;

export function AgentMissionsCard() {
  const liveApi = isLiveApiEnabled();
  const { missions, loading, error } = useProjectSummaryHandoffMissions(30_000);

  if (!liveApi) {
    return (
      <Panel title="Agent missions">
        <p className="cell-muted" role="status">
          Live mission status unavailable in mock mode.
        </p>
      </Panel>
    );
  }

  const statusCounts = countHandoffMissionsByStatus(missions);
  const recent = recentHandoffMissions(missions, RECENT_MISSION_LIMIT);

  return (
    <Panel
      title="Agent missions"
      action={
        <Link to="/builds" className="empty-state-link">
          Open Builds
        </Link>
      }
    >
      <p className="cell-muted">
        Project summary handoff missions (`research:project-summary-handoff`) — live status from
        vault mission records.
      </p>

      {error ? (
        <p className="cell-muted" role="alert">
          Could not load missions: {error}
        </p>
      ) : null}

      {loading && missions.length === 0 ? (
        <p className="cell-muted" role="status">
          Loading mission status…
        </p>
      ) : null}

      <div className="agent-missions-status-strip">
        {HANDOFF_MISSION_STATUSES.map((status) => (
          <div key={status} className="agent-missions-status-chip">
            <span className="agent-missions-status-label">{status}</span>
            <span className="agent-missions-status-value">{statusCounts[status]}</span>
          </div>
        ))}
      </div>

      {!loading && missions.length === 0 && !error ? (
        <p className="cell-muted" role="status">
          No project handoff missions yet.
        </p>
      ) : null}

      {recent.length > 0 ? (
        <ul className="agent-missions-list">
          {recent.map((mission) => (
            <li key={mission.id} className="agent-missions-list-item">
              <div className="agent-missions-list-main">
                <span className="agent-missions-list-title">
                  {mission.projectTitle || mission.projectId}
                </span>
                <span className={`badge badge-${missionStatusBadge(mission.status)}`}>
                  {mission.status}
                </span>
              </div>
              <span className="agent-missions-list-meta">
                Updated {formatChiefTimestamp(mission.updatedAt)}
                {mission.error ? ` · ${mission.error}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

function missionStatusBadge(
  status: (typeof HANDOFF_MISSION_STATUSES)[number],
): "steel" | "yellow" | "green" | "orange" | "red" {
  switch (status) {
    case "completed":
      return "green";
    case "running":
      return "yellow";
    case "queued":
      return "steel";
    case "blocked":
      return "orange";
    case "failed":
      return "red";
    default:
      return "steel";
  }
}
